import express, { Request, Response } from 'express';
import { BdCliBeadsClient } from '../utils/beadsClient.js';
import { getBeadsProjects, isValidBeadsProject } from '../utils/registryReader.js';
import type { ProjectManager } from '../utils/projectManager.js';
import type { UpdateIssueDescriptionRequest, UpdateIssueStatusRequest, UpdateIssuePriorityRequest, UpdateIssueRequest, IssueStatus, Priority } from '@shared/types';

/**
 * Validate that an issue ID is safe for shell commands.
 * Issue IDs should only contain alphanumeric chars, hyphens, underscores, and periods.
 * Example valid IDs: "beads-dashboard-abc123", "xqkm.23", "issue_1"
 */
function isValidIssueId(id: string): boolean {
  // Only allow alphanumeric, hyphens, underscores, and periods
  // Must be 1-100 characters
  return /^[a-zA-Z0-9._-]{1,100}$/.test(id);
}

function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/**
 * Validate status values against allowed list
 */
const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'blocked', 'closed', 'tombstone', 'deferred', 'pinned', 'hooked'];
function isValidStatus(status: string): status is IssueStatus {
  return VALID_STATUSES.includes(status as IssueStatus);
}

/**
 * Validate priority values (0-4)
 */
function isValidPriority(priority: number): priority is Priority {
  return Number.isInteger(priority) && priority >= 0 && priority <= 4;
}

export function createApiRouter(projectManager: ProjectManager, emitRefresh: () => void) {
  const router = express.Router();
  const beadsClient = new BdCliBeadsClient(() => projectManager.getProjectRoot());

  /**
   * GET /api/beads/health
   * Returns bd/database compatibility state for UI surfacing.
   */
  router.get('/beads/health', async (_req: Request, res: Response) => {
    try {
      const health = await beadsClient.getHealth();
      res.json(health);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to inspect Beads health' });
    }
  });

  /**
   * GET /api/data
   * Returns all issues through the Beads adapter.
   */
  router.get('/data', async (_req: Request, res: Response) => {
    try {
      const data = await beadsClient.listIssues();
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
    const id = getRouteParam(req.params.id);
    const { description } = req.body as UpdateIssueDescriptionRequest;

    // Validate issue ID to prevent command injection
    if (!isValidIssueId(id)) {
      return res.status(400).json({ error: 'Invalid issue ID format' });
    }

    if (!description && description !== '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    try {
      await beadsClient.updateDescription(id, description);

      res.json({ success: true });

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/status
   * Updates issue status via bd update command
   */
  router.post('/issues/:id/status', async (req: Request, res: Response) => {
    const id = getRouteParam(req.params.id);
    const { status } = req.body as UpdateIssueStatusRequest;

    // Validate issue ID to prevent command injection
    if (!isValidIssueId(id)) {
      return res.status(400).json({ error: 'Invalid issue ID format' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status value
    if (!isValidStatus(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
      await beadsClient.updateStatus(id, status);

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
    const id = getRouteParam(req.params.id);
    const { priority } = req.body as UpdateIssuePriorityRequest;

    // Validate issue ID to prevent command injection
    if (!isValidIssueId(id)) {
      return res.status(400).json({ error: 'Invalid issue ID format' });
    }

    if (priority === undefined || priority === null) {
      return res.status(400).json({ error: 'Priority is required' });
    }

    // Validate priority value
    if (!isValidPriority(priority)) {
      return res.status(400).json({ error: 'Invalid priority value (must be 0-4)' });
    }

    try {
      await beadsClient.updatePriority(id, priority);

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
    const id = getRouteParam(req.params.id);
    const updates = req.body as UpdateIssueRequest;

    // Validate issue ID to prevent command injection
    if (!isValidIssueId(id)) {
      return res.status(400).json({ error: 'Invalid issue ID format' });
    }

    // Check if any fields were provided
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Validate status if provided
    if (updates.status !== undefined && !isValidStatus(updates.status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Validate priority if provided
    if (updates.priority !== undefined && !isValidPriority(updates.priority)) {
      return res.status(400).json({ error: 'Invalid priority value (must be 0-4)' });
    }

    // Validate parent_id if provided (must be valid issue ID format or empty)
    if (updates.parent_id !== undefined && updates.parent_id !== '' && updates.parent_id !== null && !isValidIssueId(updates.parent_id)) {
      return res.status(400).json({ error: 'Invalid parent issue ID format' });
    }

    try {
      const errors = await beadsClient.updateIssue(id, updates);

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
   * Validate issue type against allowed values
   */
  const VALID_ISSUE_TYPES = ['task', 'bug', 'feature', 'epic', 'chore'];
  function isValidIssueType(type: string): boolean {
    return VALID_ISSUE_TYPES.includes(type);
  }

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

    // Validate issue_type if provided
    const type = issue_type || 'task';
    if (!isValidIssueType(type)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }

    // Validate priority if provided
    const prio = priority !== undefined ? priority : 2;
    if (!isValidPriority(prio)) {
      return res.status(400).json({ error: 'Invalid priority value (must be 0-4)' });
    }

    try {
      const issueId = await beadsClient.createIssue({
        title,
        description,
        issue_type: type,
        priority: prio,
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
