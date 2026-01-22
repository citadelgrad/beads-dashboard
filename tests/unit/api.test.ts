import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApiRouter } from '@server/routes/api';
import type { Issue } from '@shared/types';

// Track executed commands for verification
const executedCommands: string[] = [];

// Mock child_process exec
vi.mock('child_process', () => {
  const execMock = vi.fn((cmd: string, options: any, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
    // Track the command
    executedCommands.push(cmd);

    // Simulate successful command execution
    if (typeof callback === 'function') {
      setTimeout(() => {
        // Return appropriate output based on command
        if (cmd.includes('bd create')) {
          callback(null, 'Created issue: test-new-123', '');
        } else {
          callback(null, 'success', '');
        }
      }, 0);
    }
  });

  return {
    default: { exec: execMock },
    exec: execMock,
  };
});

describe('API Routes', () => {
  let app: express.Application;
  let tempDir: string;
  let beadsDir: string;
  let issuesFile: string;
  let emitRefreshSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beads-api-test-'));
    beadsDir = path.join(tempDir, '.beads');
    issuesFile = path.join(beadsDir, 'issues.jsonl');

    // Create .beads directory
    fs.mkdirSync(beadsDir);

    // Create Express app with API router
    app = express();
    app.use(express.json());

    emitRefreshSpy = vi.fn();
    const apiRouter = createApiRouter(tempDir, emitRefreshSpy);
    app.use('/api', apiRouter);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
    // Clear executed commands
    executedCommands.length = 0;
  });

  describe('GET /api/data', () => {
    it('returns empty array when no issues exist', async () => {
      // Remove issues file
      if (fs.existsSync(issuesFile)) {
        fs.unlinkSync(issuesFile);
      }

      const response = await request(app).get('/api/data');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns all issues from .beads/issues.jsonl', async () => {
      const issues: Partial<Issue>[] = [
        {
          id: 'test-1',
          title: 'Test Issue 1',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'test-2',
          title: 'Test Issue 2',
          status: 'closed',
          issue_type: 'bug',
          priority: 0,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
      ];

      fs.writeFileSync(issuesFile, issues.map((i) => JSON.stringify(i)).join('\n'));

      const response = await request(app).get('/api/data');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('test-1');
      expect(response.body[1].id).toBe('test-2');
    });

  });

  describe('POST /api/issues/:id', () => {
    it('returns 400 when description is missing', async () => {
      const response = await request(app)
        .post('/api/issues/test-123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Description is required');
    });

    it('accepts empty string as description', async () => {
      const response = await request(app)
        .post('/api/issues/test-123')
        .send({ description: '' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('updates issue description successfully', async () => {
      const response = await request(app)
        .post('/api/issues/test-123')
        .send({ description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(emitRefreshSpy).toHaveBeenCalled();
    });

    it('emits refresh event after successful update', async () => {
      await request(app)
        .post('/api/issues/test-123')
        .send({ description: 'New description' });

      expect(emitRefreshSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/issues/:id/status', () => {
    it('returns 400 when status is missing', async () => {
      const response = await request(app)
        .post('/api/issues/test-123/status')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Status is required');
    });

    it('updates issue status successfully', async () => {
      const response = await request(app)
        .post('/api/issues/test-123/status')
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(emitRefreshSpy).toHaveBeenCalled();
    });

    it('accepts valid status values', async () => {
      const validStatuses = ['open', 'in_progress', 'blocked', 'closed', 'deferred', 'pinned', 'hooked'];

      for (const status of validStatuses) {
        const response = await request(app)
          .post('/api/issues/test-123/status')
          .send({ status });

        expect(response.status).toBe(200);
      }
    });

    it('emits refresh event after successful status update', async () => {
      await request(app)
        .post('/api/issues/test-123/status')
        .send({ status: 'closed' });

      expect(emitRefreshSpy).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/issues/:id', () => {
    it('returns 400 when no fields provided', async () => {
      const response = await request(app)
        .patch('/api/issues/test-123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No fields to update');
    });

    describe('date field updates (due/defer) via bd update commands', () => {
      beforeEach(() => {
        // Create an issue in the JSONL file for label diffing
        const issue: Partial<Issue> = {
          id: 'test-date-issue',
          title: 'Test Date Issue',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: '2024-01-01T00:00:00Z',
        };
        fs.writeFileSync(issuesFile, JSON.stringify(issue));
      });

      it('calls bd update with --due flag when due date is provided', async () => {
        const dueDate = '2026-02-15T08:00:00.000Z';

        const response = await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ due: dueDate });

        expect(response.status).toBe(200);

        // Verify bd update --due command was called
        const dueCommand = executedCommands.find(cmd => cmd.includes('--due='));
        expect(dueCommand).toBeDefined();
        expect(dueCommand).toContain('bd update test-date-issue');
        expect(dueCommand).toContain(`--due="${dueDate}"`);
      });

      it('calls bd update with --defer flag when defer date is provided', async () => {
        const deferDate = '2026-01-30T08:00:00.000Z';

        const response = await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ defer: deferDate });

        expect(response.status).toBe(200);

        // Verify bd update --defer command was called
        const deferCommand = executedCommands.find(cmd => cmd.includes('--defer='));
        expect(deferCommand).toBeDefined();
        expect(deferCommand).toContain('bd update test-date-issue');
        expect(deferCommand).toContain(`--defer="${deferDate}"`);
      });

      it('calls bd update with both --due and --defer flags when both provided', async () => {
        const dueDate = '2026-02-15T08:00:00.000Z';
        const deferDate = '2026-01-30T08:00:00.000Z';

        const response = await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ due: dueDate, defer: deferDate });

        expect(response.status).toBe(200);

        // Verify both commands were called
        const dueCommand = executedCommands.find(cmd => cmd.includes('--due='));
        const deferCommand = executedCommands.find(cmd => cmd.includes('--defer='));

        expect(dueCommand).toBeDefined();
        expect(dueCommand).toContain(`--due="${dueDate}"`);

        expect(deferCommand).toBeDefined();
        expect(deferCommand).toContain(`--defer="${deferDate}"`);
      });

      it('calls bd update with empty --due= to clear due date', async () => {
        const response = await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ due: '' });

        expect(response.status).toBe(200);

        // Verify bd update --due= (empty) command was called
        const dueCommand = executedCommands.find(cmd => cmd.includes('--due='));
        expect(dueCommand).toBeDefined();
        expect(dueCommand).toContain('bd update test-date-issue --due=');
        // Should NOT have a value after --due=
        expect(dueCommand).not.toMatch(/--due="[^"]+"/);
      });

      it('calls bd update with empty --defer= to clear defer date', async () => {
        const response = await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ defer: '' });

        expect(response.status).toBe(200);

        // Verify bd update --defer= (empty) command was called
        const deferCommand = executedCommands.find(cmd => cmd.includes('--defer='));
        expect(deferCommand).toBeDefined();
        expect(deferCommand).toContain('bd update test-date-issue --defer=');
        // Should NOT have a value after --defer=
        expect(deferCommand).not.toMatch(/--defer="[^"]+"/);
      });

      it('setting due date does NOT call --defer (independent updates)', async () => {
        const dueDate = '2026-02-15T08:00:00.000Z';

        await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ due: dueDate });

        // Verify only --due was called, not --defer
        const dueCommand = executedCommands.find(cmd => cmd.includes('--due='));
        const deferCommand = executedCommands.find(cmd => cmd.includes('--defer='));

        expect(dueCommand).toBeDefined();
        expect(deferCommand).toBeUndefined();
      });

      it('setting defer date does NOT call --due (independent updates)', async () => {
        const deferDate = '2026-01-30T08:00:00.000Z';

        await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ defer: deferDate });

        // Verify only --defer was called, not --due
        const dueCommand = executedCommands.find(cmd => cmd.includes('--due='));
        const deferCommand = executedCommands.find(cmd => cmd.includes('--defer='));

        expect(deferCommand).toBeDefined();
        expect(dueCommand).toBeUndefined();
      });

      it('calls bd sync --flush-only after date updates', async () => {
        await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ due: '2026-02-15T08:00:00.000Z' });

        // Verify sync was called
        const syncCommand = executedCommands.find(cmd => cmd.includes('bd sync --flush-only'));
        expect(syncCommand).toBeDefined();
      });

      it('emits refresh event after successful date update', async () => {
        await request(app)
          .patch('/api/issues/test-date-issue')
          .send({ due: '2026-02-15T08:00:00.000Z' });

        expect(emitRefreshSpy).toHaveBeenCalled();
      });
    });

    describe('other field updates', () => {
      beforeEach(() => {
        const issue: Partial<Issue> = {
          id: 'test-issue',
          title: 'Test Issue',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: '2024-01-01T00:00:00Z',
        };
        fs.writeFileSync(issuesFile, JSON.stringify(issue));
      });

      it('calls bd update with --title flag', async () => {
        await request(app)
          .patch('/api/issues/test-issue')
          .send({ title: 'New Title' });

        const titleCommand = executedCommands.find(cmd => cmd.includes('--title='));
        expect(titleCommand).toBeDefined();
        expect(titleCommand).toContain('--title="New Title"');
      });

      it('calls bd update with --status flag', async () => {
        await request(app)
          .patch('/api/issues/test-issue')
          .send({ status: 'in_progress' });

        const statusCommand = executedCommands.find(cmd => cmd.includes('--status='));
        expect(statusCommand).toBeDefined();
        expect(statusCommand).toContain('--status=in_progress');
      });

      it('calls bd update with --priority flag', async () => {
        await request(app)
          .patch('/api/issues/test-issue')
          .send({ priority: 1 });

        const priorityCommand = executedCommands.find(cmd => cmd.includes('--priority='));
        expect(priorityCommand).toBeDefined();
        expect(priorityCommand).toContain('--priority=1');
      });
    });
  });

});
