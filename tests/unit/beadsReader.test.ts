import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readBeadsData, beadsDirectoryExists } from '@server/utils/beadsReader';

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
