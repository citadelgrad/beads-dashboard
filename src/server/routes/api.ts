import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { readBeadsData } from '../utils/beadsReader.js';
import { getBeadsProjects, isValidBeadsProject } from '../utils/registryReader.js';
import type { ProjectManager } from '../utils/projectManager.js';
import type { UpdateIssueDescriptionRequest, UpdateIssueStatusRequest, UpdateIssuePriorityRequest, UpdateIssueRequest } from '@shared/types';

export function createApiRouter(projectManager: ProjectManager, emitRefresh: () => void) {
  const router = express.Router();

  /**
   * GET /api/data
   * Returns all issues from .beads/issues.jsonl
   */
  router.get('/data', async (_req: Request, res: Response) => {
    try {
      const data = await readBeadsData(projectManager.getProjectRoot());
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  /**
   * POST /api/issues/:id
   * Updates issue description via bd update command
   */
  router.post('/issues/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description } = req.body as UpdateIssueDescriptionRequest;

    if (!description && description !== '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Write desc to temp file to avoid escaping issues
    const tempFile = path.join(process.cwd(), `desc-${Date.now()}.txt`);

    try {
      fs.writeFileSync(tempFile, description);

      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --body-file "${tempFile}"`, { cwd: projectManager.getProjectRoot() }, (error, _stdout, stderr) => {
          fs.unlinkSync(tempFile); // cleanup

          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }

          resolve();
        });
      });

      // Flush changes to JSONL file
      await new Promise<void>((resolve, _reject) => {
        exec('bd sync --flush-only', { cwd: projectManager.getProjectRoot() }, (syncError, _syncStdout, _syncStderr) => {
          if (syncError) {
            console.error(`sync error: ${syncError}`);
            // Don't fail the request if sync fails
          }
          resolve();
        });
      });

      res.json({ success: true });

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      // Clean up temp file if it still exists
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/status
   * Updates issue status via bd update command
   */
  router.post('/issues/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as UpdateIssueStatusRequest;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    try {
      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --status=${status}`, { cwd: projectManager.getProjectRoot() }, (error, _stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }
          resolve();
        });
      });

      // Flush changes to JSONL file
      await new Promise<void>((resolve, _reject) => {
        exec('bd sync --flush-only', { cwd: projectManager.getProjectRoot() }, (syncError, _syncStdout, _syncStderr) => {
          if (syncError) {
            console.error(`sync error: ${syncError}`);
            // Don't fail the request if sync fails
          }
          resolve();
        });
      });

      res.json({ success: true });

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/priority
   * Updates issue priority via bd update command
   */
  router.post('/issues/:id/priority', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority } = req.body as UpdateIssuePriorityRequest;

    if (priority === undefined || priority === null) {
      return res.status(400).json({ error: 'Priority is required' });
    }

    try {
      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --priority=${priority}`, { cwd: projectManager.getProjectRoot() }, (error, _stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }
          resolve();
        });
      });

      // Flush changes to JSONL file
      await new Promise<void>((resolve, _reject) => {
        exec('bd sync --flush-only', { cwd: projectManager.getProjectRoot() }, (syncError, _syncStdout, _syncStderr) => {
          if (syncError) {
            console.error(`sync error: ${syncError}`);
            // Don't fail the request if sync fails
          }
          resolve();
        });
      });

      res.json({ success: true });

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * PATCH /api/issues/:id
   * Updates multiple issue fields via bd update command
   * All fields are optional - only provided fields will be updated
   */
  router.patch('/issues/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body as UpdateIssueRequest;

    console.log('[DEBUG] PATCH /api/issues/' + id, JSON.stringify(updates, null, 2));

    // Check if any fields were provided
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const errors: string[] = [];

    // Helper function to execute a bd command
    const execBdCommand = (command: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        exec(command, { cwd: projectManager.getProjectRoot() }, (error, _stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            reject(new Error(stderr || error.message));
          } else {
            resolve();
          }
        });
      });
    };

    // Helper function to write content to temp file and update via file flag
    const updateViaFile = async (flag: string, content: string): Promise<void> => {
      const tempFile = path.join(process.cwd(), `${flag.replace(/-/g, '_')}-${Date.now()}.txt`);
      try {
        fs.writeFileSync(tempFile, content);
        await execBdCommand(`bd update ${id} --${flag}="${tempFile}"`);
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    };

    try {
      // Read current issue data for label diffing
      const allIssues = await readBeadsData(projectManager.getProjectRoot());
      const currentIssue = allIssues.find(issue => issue.id === id);

      // Process each field that has a direct bd update flag

      // Title: bd update <id> --title="..."
      if (updates.title !== undefined) {
        try {
          // Escape double quotes in title
          const escapedTitle = updates.title.replace(/"/g, '\\"');
          await execBdCommand(`bd update ${id} --title="${escapedTitle}"`);
        } catch (error) {
          errors.push(`title: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Status: bd update <id> --status=...
      if (updates.status !== undefined) {
        try {
          await execBdCommand(`bd update ${id} --status=${updates.status}`);
        } catch (error) {
          errors.push(`status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Priority: bd update <id> --priority=...
      if (updates.priority !== undefined) {
        try {
          await execBdCommand(`bd update ${id} --priority=${updates.priority}`);
        } catch (error) {
          errors.push(`priority: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Issue type: bd update <id> --type=...
      if (updates.issue_type !== undefined) {
        try {
          await execBdCommand(`bd update ${id} --type=${updates.issue_type}`);
        } catch (error) {
          errors.push(`issue_type: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Assignee: bd update <id> --assignee="..."
      if (updates.assignee !== undefined) {
        try {
          const escapedAssignee = updates.assignee.replace(/"/g, '\\"');
          await execBdCommand(`bd update ${id} --assignee="${escapedAssignee}"`);
        } catch (error) {
          errors.push(`assignee: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Description: bd update <id> --body-file=<tempfile>
      if (updates.description !== undefined) {
        try {
          const tempFile = path.join(process.cwd(), `desc-${Date.now()}.txt`);
          fs.writeFileSync(tempFile, updates.description);
          try {
            await execBdCommand(`bd update ${id} --body-file "${tempFile}"`);
          } finally {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          }
        } catch (error) {
          errors.push(`description: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Labels: bd label <id> add/remove <label>
      if (updates.labels !== undefined && currentIssue) {
        const currentLabels = new Set<string>(currentIssue.labels || []);
        const newLabels = new Set<string>(updates.labels);

        // Labels to add (in new but not in current)
        for (const label of newLabels) {
          if (!currentLabels.has(label)) {
            try {
              const escapedLabel = label.replace(/"/g, '\\"');
              await execBdCommand(`bd label ${id} add "${escapedLabel}"`);
            } catch (error) {
              errors.push(`label add '${label}': ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }

        // Labels to remove (in current but not in new)
        for (const label of currentLabels) {
          if (!newLabels.has(label)) {
            try {
              const escapedLabel = label.replace(/"/g, '\\"');
              await execBdCommand(`bd label ${id} remove "${escapedLabel}"`);
            } catch (error) {
              errors.push(`label remove '${label}': ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }

      // Parent: bd update <id> --parent=...
      if (updates.parent !== undefined) {
        try {
          if (updates.parent === '' || updates.parent === null) {
            await execBdCommand(`bd update ${id} --parent=`);
          } else {
            await execBdCommand(`bd update ${id} --parent=${updates.parent}`);
          }
        } catch (error) {
          errors.push(`parent: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // External ref: bd update <id> --external-ref="..."
      if (updates.external_ref !== undefined) {
        try {
          const escapedRef = updates.external_ref.replace(/"/g, '\\"');
          await execBdCommand(`bd update ${id} --external-ref="${escapedRef}"`);
        } catch (error) {
          errors.push(`external_ref: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Estimate: bd update <id> --estimate=...
      if (updates.estimate !== undefined) {
        try {
          await execBdCommand(`bd update ${id} --estimate=${updates.estimate}`);
        } catch (error) {
          errors.push(`estimate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Design: bd update <id> --design-file=<tempfile>
      if (updates.design !== undefined) {
        try {
          await updateViaFile('design-file', updates.design);
        } catch (error) {
          errors.push(`design: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Acceptance criteria: bd update <id> --acceptance-criteria-file=<tempfile>
      if (updates.acceptance_criteria !== undefined) {
        try {
          await updateViaFile('acceptance-criteria-file', updates.acceptance_criteria);
        } catch (error) {
          errors.push(`acceptance_criteria: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Notes: bd update <id> --notes-file=<tempfile>
      if (updates.notes !== undefined) {
        try {
          await updateViaFile('notes-file', updates.notes);
        } catch (error) {
          errors.push(`notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Due date: bd update <id> --due=...
      if (updates.due !== undefined) {
        try {
          if (updates.due === '' || updates.due === null) {
            await execBdCommand(`bd update ${id} --due=`);
          } else {
            await execBdCommand(`bd update ${id} --due="${updates.due}"`);
          }
        } catch (error) {
          errors.push(`due: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Defer date: bd update <id> --defer=...
      // Also auto-set status to "deferred" when setting a defer date
      if (updates.defer !== undefined) {
        try {
          if (updates.defer === '' || updates.defer === null) {
            await execBdCommand(`bd update ${id} --defer=`);
          } else {
            await execBdCommand(`bd update ${id} --defer="${updates.defer}"`);
            // Auto-set status to deferred if not explicitly being set to something else
            if (updates.status === undefined) {
              await execBdCommand(`bd update ${id} --status=deferred`);
            }
          }
        } catch (error) {
          errors.push(`defer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Flush changes to JSONL file
      await new Promise<void>((resolve, _reject) => {
        exec('bd sync --flush-only', { cwd: projectManager.getProjectRoot() }, (syncError, _syncStdout, _syncStderr) => {
          if (syncError) {
            console.error(`sync error: ${syncError}`);
            // Don't fail the request if sync fails
          }
          resolve();
        });
      });

      // If there were any errors, return them but still report partial success
      if (errors.length > 0) {
        res.json({ success: false, error: `Some fields failed to update: ${errors.join('; ')}` });
      } else {
        res.json({ success: true });
      }

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues
   * Creates a new issue via bd create command
   */
  router.post('/issues', async (req: Request, res: Response) => {
    const { title, description, issue_type, priority } = req.body as {
      title: string;
      description?: string;
      issue_type?: string;
      priority?: number;
    };

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    try {
      // Build the bd create command
      const escapedTitle = title.replace(/"/g, '\\"');
      const type = issue_type || 'task';
      const prio = priority !== undefined ? priority : 2;

      let createCommand = `bd create --title="${escapedTitle}" --type=${type} --priority=${prio}`;

      // Execute bd create
      const createResult = await new Promise<string>((resolve, reject) => {
        exec(createCommand, { cwd: projectManager.getProjectRoot() }, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }
          resolve(stdout);
        });
      });

      // Extract issue ID from output (format: "Created issue: <id>")
      const idMatch = createResult.match(/Created issue:\s*(\S+)/i);
      const issueId = idMatch ? idMatch[1] : null;

      // If description is provided, update it separately
      if (description && description.trim().length > 0 && issueId) {
        const tempFile = path.join(process.cwd(), `desc-${Date.now()}.txt`);
        try {
          fs.writeFileSync(tempFile, description);
          await new Promise<void>((resolve, reject) => {
            exec(`bd update ${issueId} --body-file "${tempFile}"`, { cwd: projectManager.getProjectRoot() }, (error, _stdout, stderr) => {
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
              if (error) {
                console.error(`exec error: ${error}`);
                return reject(new Error(stderr || error.message));
              }
              resolve();
            });
          });
        } catch (descError) {
          // Log but don't fail - issue was created, just description update failed
          console.error('Failed to set description:', descError);
        }
      }

      // Flush changes to JSONL file
      await new Promise<void>((resolve, _reject) => {
        exec('bd sync --flush-only', { cwd: projectManager.getProjectRoot() }, (syncError) => {
          if (syncError) {
            console.error(`sync error: ${syncError}`);
          }
          resolve();
        });
      });

      res.json({ success: true, id: issueId });

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /api/registry
   * Returns all beads projects from ~/.beads/registry.json
   */
  router.get('/registry', async (_req: Request, res: Response) => {
    try {
      const projects = await getBeadsProjects();
      res.json(projects);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to read registry' });
    }
  });

  /**
   * GET /api/project/current
   * Returns the current active project path
   */
  router.get('/project/current', (_req: Request, res: Response) => {
    try {
      const currentPath = projectManager.getProjectRoot();
      res.json({ path: currentPath });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to get current project' });
    }
  });

  /**
   * POST /api/project/switch
   * Switches to a different beads project
   */
  router.post('/project/switch', async (req: Request, res: Response) => {
    const { path: newPath } = req.body as { path: string };

    if (!newPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    // Validate the project exists and has .beads directory
    if (!isValidBeadsProject(newPath)) {
      return res.status(400).json({ error: 'Invalid beads project path' });
    }

    try {
      projectManager.setProjectRoot(newPath);
      res.json({ success: true, path: newPath });

      // Emit refresh to trigger data reload
      emitRefresh();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to switch project' });
    }
  });

  return router;
}
