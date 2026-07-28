import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readBeadsData, parseIssuesJsonl } from './beadsReader.js';
import type { BeadsHealth, BeadsHealthIssue, Issue, IssueStatus, Priority, UpdateIssueRequest } from '@shared/types';

const execFileAsync = promisify(execFile);

export interface CreateIssueInput {
  title: string;
  description?: string;
  issue_type: string;
  priority: Priority;
}

export interface BeadsClient {
  getHealth(): Promise<BeadsHealth>;
  listIssues(): Promise<Issue[]>;
  updateDescription(id: string, description: string): Promise<void>;
  updateStatus(id: string, status: IssueStatus): Promise<void>;
  updatePriority(id: string, priority: Priority): Promise<void>;
  updateIssue(id: string, updates: UpdateIssueRequest): Promise<string[]>;
  createIssue(input: CreateIssueInput): Promise<string | null>;
}

export class BdCliBeadsClient implements BeadsClient {
  constructor(private readonly getProjectRoot: () => string) {}

  async getHealth(): Promise<BeadsHealth> {
    const safeCommands = {
      backup: 'bd export --all -o .beads/pre-migration-backup.jsonl',
      designatedMigrator: [
        'bd export --all -o .beads/pre-migration-backup.jsonl',
        'BD_ALLOW_REMOTE_MIGRATE=1 bd migrate',
        'bd dolt push',
      ],
      adoptRemote: [
        'bd export --all -o .beads/pre-bootstrap-backup.jsonl',
        'bd bootstrap',
      ],
    };

    let bdVersion: string | undefined;
    let migrationInspection: string | undefined;
    const issues: BeadsHealthIssue[] = [];

    try {
      const { stdout } = await this.runBd(['--version']);
      bdVersion = stdout.trim();
    } catch (error) {
      return {
        status: 'error',
        readOnly: true,
        issues: [{
          code: 'bd_unavailable',
          severity: 'error',
          title: 'bd CLI is unavailable',
          message: 'The dashboard cannot find or run the bd command. Reads and writes may fail until PATH or the installation is fixed.',
          details: error instanceof Error ? error.message : String(error),
        }],
        safeCommands,
      };
    }

    try {
      const { stdout, stderr } = await this.runBd(['migrate', '--inspect']);
      migrationInspection = [stdout, stderr].filter(Boolean).join('\n').trim();
      issues.push(...classifyMigrationOutput(migrationInspection));
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      migrationInspection = details;
      issues.push(...classifyMigrationOutput(details));
      if (issues.length === 0) {
        issues.push({
          code: 'unknown',
          severity: 'warning',
          title: 'Could not inspect Beads database migrations',
          message: 'The dashboard could not inspect the local Beads database state. Writes may still work, but the database health state is unknown.',
          details,
        });
      }
    }

    const status = issues.some((issue) => issue.severity === 'error')
      ? 'error'
      : issues.some((issue) => issue.severity === 'warning')
      ? 'warning'
      : 'ok';

    return {
      status,
      readOnly: issues.some((issue) => issue.code === 'remote_schema_migration_required'),
      bdVersion,
      migrationInspection,
      issues,
      safeCommands,
    };
  }

  async listIssues(): Promise<Issue[]> {
    try {
      const { stdout } = await this.runBd(['export'], 50 * 1024 * 1024);
      return parseIssuesJsonl(stdout);
    } catch (error) {
      console.error('bd export failed, falling back to legacy read-only sources:', error);
      return readBeadsData(this.getProjectRoot());
    }
  }

  async updateDescription(id: string, description: string): Promise<void> {
    await this.updateFileField(id, 'body-file', description, 'desc');
  }

  async updateStatus(id: string, status: IssueStatus): Promise<void> {
    await this.runBd(['update', id, '--status', status]);
  }

  async updatePriority(id: string, priority: Priority): Promise<void> {
    await this.runBd(['update', id, '--priority', String(priority)]);
  }

  async updateIssue(id: string, updates: UpdateIssueRequest): Promise<string[]> {
    const errors: string[] = [];
    const currentIssue = updates.labels !== undefined
      ? (await this.listIssues()).find((issue) => issue.id === id)
      : undefined;

    await this.tryField(errors, 'title', updates.title, async (title) => {
      await this.runBd(['update', id, '--title', title]);
    });

    await this.tryField(errors, 'status', updates.status, async (status) => {
      await this.runBd(['update', id, '--status', status]);
    });

    await this.tryField(errors, 'priority', updates.priority, async (priority) => {
      await this.runBd(['update', id, '--priority', String(priority)]);
    });

    await this.tryField(errors, 'issue_type', updates.issue_type, async (issueType) => {
      await this.runBd(['update', id, '--type', issueType]);
    });

    await this.tryField(errors, 'assignee', updates.assignee, async (assignee) => {
      await this.runBd(['update', id, '--assignee', assignee]);
    });

    await this.tryField(errors, 'description', updates.description, async (description) => {
      await this.updateDescription(id, description);
    });

    if (updates.labels !== undefined && currentIssue) {
      const currentLabels = new Set<string>(currentIssue.labels || []);
      const newLabels = new Set<string>(updates.labels);

      for (const label of newLabels) {
        if (!currentLabels.has(label)) {
          await this.capture(errors, `label add '${label}'`, () => this.runBd(['label', 'add', id, label]));
        }
      }

      for (const label of currentLabels) {
        if (!newLabels.has(label)) {
          await this.capture(errors, `label remove '${label}'`, () => this.runBd(['label', 'remove', id, label]));
        }
      }
    }

    await this.tryField(errors, 'parent_id', updates.parent_id, async (parentId) => {
      await this.runBd(['update', id, '--parent', parentId ?? '']);
    });

    await this.tryField(errors, 'external_ref', updates.external_ref, async (externalRef) => {
      await this.runBd(['update', id, '--external-ref', externalRef]);
    });

    await this.tryField(errors, 'estimate', updates.estimate, async (estimate) => {
      await this.runBd(['update', id, '--estimate', String(estimate)]);
    });

    await this.tryField(errors, 'design', updates.design, async (design) => {
      await this.updateFileField(id, 'design-file', design, 'design_file');
    });

    await this.tryField(errors, 'acceptance_criteria', updates.acceptance_criteria, async (acceptanceCriteria) => {
      await this.updateFileField(id, 'acceptance-criteria-file', acceptanceCriteria, 'acceptance_criteria_file');
    });

    await this.tryField(errors, 'notes', updates.notes, async (notes) => {
      await this.updateFileField(id, 'notes-file', notes, 'notes_file');
    });

    await this.tryField(errors, 'due', updates.due, async (due) => {
      await this.runBd(['update', id, '--due', due ?? '']);
    });

    await this.tryField(errors, 'defer', updates.defer, async (defer) => {
      await this.runBd(['update', id, '--defer', defer ?? '']);
      if (defer && updates.status === undefined) {
        await this.runBd(['update', id, '--status', 'deferred']);
      }
    });

    return errors;
  }

  async createIssue(input: CreateIssueInput): Promise<string | null> {
    const { stdout } = await this.runBd([
      'create',
      '--title', input.title,
      '--type', input.issue_type,
      '--priority', String(input.priority),
    ]);

    const idMatch = stdout.match(/Created issue:\s*(\S+)/i);
    const issueId = idMatch ? idMatch[1] : null;

    if (input.description && input.description.trim().length > 0 && issueId) {
      try {
        await this.updateDescription(issueId, input.description);
      } catch (error) {
        console.error('Failed to set description:', error);
      }
    }

    return issueId;
  }

  private async updateFileField(id: string, flag: string, content: string, tempPrefix: string): Promise<void> {
    const tempFile = generateTempFilePath(tempPrefix);
    try {
      fs.writeFileSync(tempFile, content);
      await this.runBd(['update', id, `--${flag}`, tempFile]);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  private async tryField<T>(
    errors: string[],
    field: string,
    value: T | undefined,
    action: (value: T) => Promise<void>,
  ): Promise<void> {
    if (value === undefined) return;
    await this.capture(errors, field, () => action(value));
  }

  private async capture(errors: string[], field: string, action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      errors.push(`${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async runBd(args: string[], maxBuffer = 10 * 1024 * 1024): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execFileAsync('bd', args, {
        cwd: this.getProjectRoot(),
        maxBuffer,
      });

      if (typeof result === 'string') {
        return { stdout: result, stderr: '' };
      }

      return result;
    } catch (error) {
      const maybeError = error as Error & { stderr?: string };
      throw new Error(maybeError.stderr || maybeError.message);
    }
  }
}

function generateTempFilePath(prefix: string): string {
  const uniqueId = cryptoRandomHex();
  return path.join(os.tmpdir(), `${prefix}-${uniqueId}.txt`);
}

function cryptoRandomHex(): string {
  return crypto.randomBytes(8).toString('hex');
}

function classifyMigrationOutput(output: string): BeadsHealthIssue[] {
  const normalized = output.toLowerCase();
  const issues: BeadsHealthIssue[] = [];

  if (
    normalized.includes('refusing to auto-apply') &&
    normalized.includes('remote-backed') &&
    normalized.includes('forks the schema')
  ) {
    issues.push({
      code: 'remote_schema_migration_required',
      severity: 'error',
      title: 'Remote-backed database needs a designated schema migration',
      message: 'This Beads database syncs with a remote and has pending schema migrations. Writes are disabled here until one clone migrates and pushes, or this clone is re-bootstrapped from an already migrated remote.',
      details: output,
    });
  } else if (normalized.includes('schema version mismatch')) {
    issues.push({
      code: 'schema_mismatch',
      severity: 'warning',
      title: 'Beads schema version mismatch',
      message: 'The local Beads database schema does not match the current bd CLI expectation. Some reads or writes may fail until the database is migrated or refreshed.',
      details: output,
    });
  }

  return issues;
}
