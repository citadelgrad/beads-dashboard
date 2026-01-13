import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApiRouter } from '@server/routes/api';
import type { Issue } from '@shared/types';

// Mock child_process exec
vi.mock('child_process', () => {
  const execMock = vi.fn((cmd: string, options: any, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
    // Simulate successful command execution
    if (typeof callback === 'function') {
      setTimeout(() => {
        callback(null, 'success', '');
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
});
