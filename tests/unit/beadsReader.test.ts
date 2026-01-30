import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { readBeadsData, readBeadsDataFromSqlite, beadsDirectoryExists } from '@server/utils/beadsReader';

describe('readBeadsData', () => {
  let tempDir: string;
  let beadsDir: string;
  let issuesFile: string;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beads-test-'));
    beadsDir = path.join(tempDir, '.beads');
    issuesFile = path.join(beadsDir, 'issues.jsonl');
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns empty array when .beads/issues.jsonl does not exist', async () => {
    const result = await readBeadsData(tempDir);
    expect(result).toEqual([]);
  });

  it('reads and parses valid JSONL file', async () => {
    // Create .beads directory and issues file
    fs.mkdirSync(beadsDir);
    const issues = [
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

    const result = await readBeadsData(tempDir);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('test-1');
    expect(result[1].id).toBe('test-2');
  });

  it('handles empty lines in JSONL file', async () => {
    fs.mkdirSync(beadsDir);
    const content = `{"id":"test-1","title":"Test","status":"open","issue_type":"task","priority":2,"created_at":"2024-01-01T00:00:00Z"}

{"id":"test-2","title":"Test 2","status":"open","issue_type":"task","priority":2,"created_at":"2024-01-02T00:00:00Z"}`;

    fs.writeFileSync(issuesFile, content);

    const result = await readBeadsData(tempDir);
    expect(result).toHaveLength(2);
  });

  it('skips malformed JSON lines and logs error', async () => {
    fs.mkdirSync(beadsDir);
    const content = `{"id":"test-1","title":"Valid","status":"open","issue_type":"task","priority":2,"created_at":"2024-01-01T00:00:00Z"}
{invalid json}
{"id":"test-2","title":"Also Valid","status":"open","issue_type":"task","priority":2,"created_at":"2024-01-02T00:00:00Z"}`;

    fs.writeFileSync(issuesFile, content);

    // Capture console.error output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await readBeadsData(tempDir);
    expect(result).toHaveLength(2); // Should have 2 valid issues
    expect(result[0].id).toBe('test-1');
    expect(result[1].id).toBe('test-2');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error parsing line in issues.jsonl:',
      expect.stringContaining('JSON')
    );

    consoleSpy.mockRestore();
  });

  it('handles file with only whitespace', async () => {
    fs.mkdirSync(beadsDir);
    fs.writeFileSync(issuesFile, '   \n   \n   ');

    const result = await readBeadsData(tempDir);
    expect(result).toEqual([]);
  });

  it('reads fixture file correctly', async () => {
    const fixtureDir = path.join(process.cwd(), 'tests', 'fixtures');
    const testDir = path.join(tempDir, 'project');
    const testBeadsDir = path.join(testDir, '.beads');

    // Copy fixture to temp location
    fs.mkdirSync(testDir);
    fs.mkdirSync(testBeadsDir);
    fs.copyFileSync(
      path.join(fixtureDir, 'sample-issues.jsonl'),
      path.join(testBeadsDir, 'issues.jsonl')
    );

    const result = await readBeadsData(testDir);
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Add dark mode support');
    expect(result[1].title).toBe('Fix crash on startup');
    expect(result[2].title).toBe('Add unit tests');
  });

  it('prefers SQLite over JSONL when both exist', async () => {
    fs.mkdirSync(beadsDir);

    // Create JSONL with 1 issue
    fs.writeFileSync(
      issuesFile,
      JSON.stringify({
        id: 'jsonl-1',
        title: 'From JSONL',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: '2024-01-01T00:00:00Z',
      })
    );

    // Create SQLite with a different issue
    const dbPath = path.join(beadsDir, 'beads.db');
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        issue_type TEXT NOT NULL DEFAULT 'task',
        priority INTEGER NOT NULL DEFAULT 2,
        created_at DATETIME NOT NULL,
        updated_at DATETIME,
        closed_at DATETIME,
        assignee TEXT,
        owner TEXT DEFAULT '',
        design TEXT DEFAULT '',
        acceptance_criteria TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        external_ref TEXT,
        estimated_minutes INTEGER,
        created_by TEXT DEFAULT '',
        due_at DATETIME,
        defer_until DATETIME
      );
      CREATE TABLE labels (
        issue_id TEXT NOT NULL,
        label TEXT NOT NULL,
        PRIMARY KEY (issue_id, label)
      );
      CREATE TABLE dependencies (
        issue_id TEXT NOT NULL,
        depends_on_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'blocks',
        created_at TIMESTAMP,
        created_by TEXT NOT NULL,
        PRIMARY KEY (issue_id, depends_on_id, type)
      );
    `);
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('sqlite-1', 'From SQLite', 'open', 'task', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.close();

    const result = await readBeadsData(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sqlite-1');
    expect(result[0].title).toBe('From SQLite');
  });
});

describe('readBeadsDataFromSqlite', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beads-sqlite-test-'));
    dbPath = path.join(tempDir, 'beads.db');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createTestDb() {
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        issue_type TEXT NOT NULL DEFAULT 'task',
        priority INTEGER NOT NULL DEFAULT 2,
        created_at DATETIME NOT NULL,
        updated_at DATETIME,
        closed_at DATETIME,
        assignee TEXT,
        owner TEXT DEFAULT '',
        design TEXT DEFAULT '',
        acceptance_criteria TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        external_ref TEXT,
        estimated_minutes INTEGER,
        created_by TEXT DEFAULT '',
        due_at DATETIME,
        defer_until DATETIME
      );
      CREATE TABLE labels (
        issue_id TEXT NOT NULL,
        label TEXT NOT NULL,
        PRIMARY KEY (issue_id, label)
      );
      CREATE TABLE dependencies (
        issue_id TEXT NOT NULL,
        depends_on_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'blocks',
        created_at TIMESTAMP,
        created_by TEXT NOT NULL,
        PRIMARY KEY (issue_id, depends_on_id, type)
      );
    `);
    return db;
  }

  it('reads basic issue fields', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, description, status, issue_type, priority, created_at, updated_at)
      VALUES ('test-1', 'Test Issue', 'A description', 'open', 'bug', 1, '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'test-1',
      title: 'Test Issue',
      description: 'A description',
      status: 'open',
      issue_type: 'bug',
      priority: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });
  });

  it('excludes tombstone issues', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('live-1', 'Live Issue', 'open', 'task', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('dead-1', 'Deleted Issue', 'tombstone', 'task', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('live-1');
  });

  it('maps renamed fields: estimated_minutes -> estimate, due_at -> due, defer_until -> defer', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at, estimated_minutes, due_at, defer_until)
      VALUES ('test-1', 'Test', 'open', 'task', 2, '2024-01-01T00:00:00Z', 120, '2024-06-01T00:00:00Z', '2024-03-01T00:00:00Z')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    expect(result[0].estimate).toBe(120);
    expect(result[0].due).toBe('2024-06-01T00:00:00Z');
    expect(result[0].defer).toBe('2024-03-01T00:00:00Z');
  });

  it('falls back owner to assignee when assignee is empty', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at, assignee, owner)
      VALUES ('test-1', 'Has assignee', 'open', 'task', 2, '2024-01-01T00:00:00Z', 'alice', 'bob')
    `).run();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at, assignee, owner)
      VALUES ('test-2', 'No assignee', 'open', 'task', 2, '2024-01-01T00:00:00Z', '', 'charlie')
    `).run();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at, assignee, owner)
      VALUES ('test-3', 'Neither', 'open', 'task', 2, '2024-01-01T00:00:00Z', '', '')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    const byId = Object.fromEntries(result.map((i) => [i.id, i]));
    expect(byId['test-1'].assignee).toBe('alice');
    expect(byId['test-2'].assignee).toBe('charlie');
    expect(byId['test-3'].assignee).toBeUndefined();
  });

  it('reads labels from labels table', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('test-1', 'Labeled Issue', 'open', 'task', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.prepare(`INSERT INTO labels (issue_id, label) VALUES ('test-1', 'frontend')`).run();
    db.prepare(`INSERT INTO labels (issue_id, label) VALUES ('test-1', 'urgent')`).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    expect(result[0].labels).toEqual(expect.arrayContaining(['frontend', 'urgent']));
    expect(result[0].labels).toHaveLength(2);
  });

  it('reads dependencies from dependencies table', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('issue-a', 'Issue A', 'open', 'task', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('issue-b', 'Issue B', 'open', 'task', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.prepare(`
      INSERT INTO dependencies (issue_id, depends_on_id, type, created_by)
      VALUES ('issue-a', 'issue-b', 'blocks', 'test-user')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    const issueA = result.find((i) => i.id === 'issue-a')!;
    expect(issueA.dependencies).toHaveLength(1);
    expect(issueA.dependencies![0]).toMatchObject({
      issue_id: 'issue-a',
      depends_on_id: 'issue-b',
      type: 'blocks',
      created_by: 'test-user',
    });
  });

  it('derives parent_id from parent-child dependency', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('epic-1', 'Parent Epic', 'open', 'epic', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at)
      VALUES ('task-1', 'Child Task', 'open', 'task', 2, '2024-01-01T00:00:00Z')
    `).run();
    db.prepare(`
      INSERT INTO dependencies (issue_id, depends_on_id, type, created_by)
      VALUES ('task-1', 'epic-1', 'parent-child', 'test-user')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    const task = result.find((i) => i.id === 'task-1')!;
    expect(task.parent_id).toBe('epic-1');
  });

  it('handles empty database', () => {
    const db = createTestDb();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    expect(result).toEqual([]);
  });

  it('includes closed issues with closed_at', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at, closed_at)
      VALUES ('closed-1', 'Done Task', 'closed', 'task', 2, '2024-01-01T00:00:00Z', '2024-01-05T00:00:00Z')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    expect(result).toHaveLength(1);
    expect(result[0].closed_at).toBe('2024-01-05T00:00:00Z');
  });

  it('includes design, acceptance_criteria, and notes fields', () => {
    const db = createTestDb();
    db.prepare(`
      INSERT INTO issues (id, title, status, issue_type, priority, created_at, design, acceptance_criteria, notes)
      VALUES ('test-1', 'Rich Issue', 'open', 'feature', 1, '2024-01-01T00:00:00Z', '# Design doc', '- [ ] Must pass', 'Some notes here')
    `).run();
    db.close();

    const result = readBeadsDataFromSqlite(dbPath);
    expect(result[0].design).toBe('# Design doc');
    expect(result[0].acceptance_criteria).toBe('- [ ] Must pass');
    expect(result[0].notes).toBe('Some notes here');
  });
});

describe('beadsDirectoryExists', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beads-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns false when .beads directory does not exist', () => {
    expect(beadsDirectoryExists(tempDir)).toBe(false);
  });

  it('returns true when .beads directory exists', () => {
    fs.mkdirSync(path.join(tempDir, '.beads'));
    expect(beadsDirectoryExists(tempDir)).toBe(true);
  });
});
