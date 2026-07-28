import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { createRequire } from 'module';
import type { Issue, IssueDependency } from '@shared/types';
import type DatabaseConstructor from 'better-sqlite3';

const require = createRequire(import.meta.url);

/**
 * Legacy read-only fallback for projects where `bd export` is unavailable.
 * Normal dashboard reads should go through BeadsClient, which calls bd first.
 */
export async function readBeadsData(projectRoot: string): Promise<Issue[]> {
  const beadsDir = path.join(projectRoot, '.beads');
  const issuesFile = path.join(beadsDir, 'issues.jsonl');

  // Current Beads exports .beads/issues.jsonl even when a legacy SQLite DB is present.
  // Prefer JSONL when available so the dashboard is not coupled to native SQLite
  // bindings or stale legacy DB schemas.
  if (fs.existsSync(issuesFile)) {
    return readBeadsDataFromJsonl(projectRoot);
  }

  // Check if project uses no-db mode but has no issues file yet.
  const configFile = path.join(beadsDir, 'config.yaml');
  if (fs.existsSync(configFile)) {
    try {
      const configContent = fs.readFileSync(configFile, 'utf-8');
      if (/^no-db:\s*true/m.test(configContent)) {
        return readBeadsDataFromJsonl(projectRoot);
      }
    } catch { /* fall through to default logic */ }
  }

  // Legacy path: try SQLite first, fall back to JSONL
  const dbFile = path.join(beadsDir, 'beads.db');
  if (fs.existsSync(dbFile)) {
    return readBeadsDataFromSqlite(dbFile);
  }

  return readBeadsDataFromJsonl(projectRoot);
}

/**
 * Read issues from SQLite database
 */
export function readBeadsDataFromSqlite(dbPath: string): Issue[] {
  // Load lazily: projects with JSONL should not fail just because the optional
  // native better-sqlite3 binding was compiled for a different Node runtime.
  const Database = require('better-sqlite3') as typeof DatabaseConstructor;
  const db = new Database(dbPath, { readonly: true });
  try {
    // Query all non-tombstone issues
    const rows = db.prepare(`
      SELECT
        id, title, description, status, issue_type, priority,
        created_at, updated_at, closed_at, assignee, owner,
        design, acceptance_criteria, notes, external_ref,
        estimated_minutes, created_by, due_at, defer_until
      FROM issues
      WHERE status != 'tombstone'
    `).all() as SqliteIssueRow[];

    // Build a map of issue_id -> labels
    const labelRows = db.prepare(`
      SELECT issue_id, label FROM labels
    `).all() as { issue_id: string; label: string }[];

    const labelsMap = new Map<string, string[]>();
    for (const row of labelRows) {
      const existing = labelsMap.get(row.issue_id);
      if (existing) {
        existing.push(row.label);
      } else {
        labelsMap.set(row.issue_id, [row.label]);
      }
    }

    // Build dependency data
    const depRows = db.prepare(`
      SELECT issue_id, depends_on_id, type, created_at, created_by
      FROM dependencies
    `).all() as SqliteDependencyRow[];

    const depsMap = new Map<string, IssueDependency[]>();
    const parentMap = new Map<string, string>(); // child_id -> parent_id
    for (const row of depRows) {
      if (row.type === 'parent-child') {
        // issue_id is the child, depends_on_id is the parent
        parentMap.set(row.issue_id, row.depends_on_id);
      }
      const dep: IssueDependency = {
        issue_id: row.issue_id,
        depends_on_id: row.depends_on_id,
        type: row.type as IssueDependency['type'],
        created_at: row.created_at || undefined,
        created_by: row.created_by || undefined,
      };
      const existing = depsMap.get(row.issue_id);
      if (existing) {
        existing.push(dep);
      } else {
        depsMap.set(row.issue_id, [dep]);
      }
    }

    return rows.map((row) => mapSqliteRowToIssue(row, labelsMap, depsMap, parentMap));
  } finally {
    db.close();
  }
}

interface SqliteIssueRow {
  id: string;
  title: string;
  description: string;
  status: string;
  issue_type: string;
  priority: number;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
  assignee: string | null;
  owner: string | null;
  design: string | null;
  acceptance_criteria: string | null;
  notes: string | null;
  external_ref: string | null;
  estimated_minutes: number | null;
  created_by: string | null;
  due_at: string | null;
  defer_until: string | null;
}

interface SqliteDependencyRow {
  issue_id: string;
  depends_on_id: string;
  type: string;
  created_at: string | null;
  created_by: string | null;
}

function mapSqliteRowToIssue(
  row: SqliteIssueRow,
  labelsMap: Map<string, string[]>,
  depsMap: Map<string, IssueDependency[]>,
  parentMap: Map<string, string>,
): Issue {
  const issue: Issue = {
    id: row.id,
    title: row.title,
    status: row.status as Issue['status'],
    issue_type: row.issue_type as Issue['issue_type'],
    priority: row.priority as Issue['priority'],
    created_at: row.created_at,
  };

  // Optional string fields
  if (row.description) issue.description = row.description;
  if (row.updated_at) issue.updated_at = row.updated_at;
  if (row.closed_at) issue.closed_at = row.closed_at;
  if (row.assignee) {
    issue.assignee = row.assignee;
  } else if (row.owner) {
    issue.assignee = row.owner;
  }
  if (row.design) issue.design = row.design;
  if (row.acceptance_criteria) issue.acceptance_criteria = row.acceptance_criteria;
  if (row.notes) issue.notes = row.notes;
  if (row.external_ref) issue.external_ref = row.external_ref;
  if (row.created_by) issue.created_by = row.created_by;

  // Renamed fields
  if (row.estimated_minutes != null) issue.estimate = row.estimated_minutes;
  if (row.due_at) issue.due = row.due_at;
  if (row.defer_until) issue.defer = row.defer_until;

  // Labels
  const labels = labelsMap.get(row.id);
  if (labels && labels.length > 0) issue.labels = labels;

  // Dependencies
  const deps = depsMap.get(row.id);
  if (deps && deps.length > 0) issue.dependencies = deps;

  // Parent ID (derived from parent-child dependency)
  const parentId = parentMap.get(row.id);
  if (parentId) issue.parent_id = parentId;

  return issue;
}

/**
 * Read and parse issues from .beads/issues.jsonl file.
 * This is the primary storage for beads 0.61+ with no-db mode,
 * and also serves as legacy fallback for older installations.
 */
async function readBeadsDataFromJsonl(projectRoot: string): Promise<Issue[]> {
  const beadsDir = path.join(projectRoot, '.beads');
  const issuesFile = path.join(beadsDir, 'issues.jsonl');

  if (!fs.existsSync(issuesFile)) {
    return [];
  }

  const fileStream = fs.createReadStream(issuesFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let content = '';
  for await (const line of rl) {
    content += `${line}\n`;
  }

  return parseIssuesJsonl(content);
}

export function parseIssuesJsonl(content: string): Issue[] {
  const allIssues: Issue[] = [];

  for (const line of content.split('\n')) {
    if (line.trim()) {
      try {
        const raw = JSON.parse(line) as Record<string, unknown>;

        // Filter out tombstone issues
        if (raw.status === 'tombstone') continue;

        // Normalize owner → assignee (beads 0.61+ uses owner in JSONL)
        if (raw.owner && !raw.assignee) {
          raw.assignee = raw.owner;
        }

        // Extract parent_id from dependencies if present
        if (Array.isArray(raw.dependencies)) {
          for (const dep of raw.dependencies as IssueDependency[]) {
            if (dep.type === 'parent-child' && dep.depends_on_id) {
              raw.parent_id = dep.depends_on_id;
              break;
            }
          }
        }

        allIssues.push(raw as unknown as Issue);
      } catch (e) {
        console.error(`Error parsing line in issues.jsonl:`, (e as Error).message);
      }
    }
  }

  return allIssues;
}

/**
 * Check if .beads directory exists
 */
export function beadsDirectoryExists(projectRoot: string): boolean {
  const beadsDir = path.join(projectRoot, '.beads');
  return fs.existsSync(beadsDir);
}
