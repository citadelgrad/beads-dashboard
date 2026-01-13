import fs from 'fs';
import readline from 'readline';
import path from 'path';
import type { Issue } from '@shared/types';

/**
 * Read and parse issues from .beads/issues.jsonl file
 * @param projectRoot - Root directory containing .beads folder
 * @returns Promise<Issue[]> - Array of parsed issues
 */
export async function readBeadsData(projectRoot: string): Promise<Issue[]> {
  const beadsDir = path.join(projectRoot, '.beads');
  const issuesFile = path.join(beadsDir, 'issues.jsonl');

  if (!fs.existsSync(issuesFile)) {
    return [];
  }

  const allIssues: Issue[] = [];
  const fileStream = fs.createReadStream(issuesFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const issue = JSON.parse(line) as Issue;
        allIssues.push(issue);
      } catch (e) {
        console.error(`Error parsing line in issues.jsonl:`, (e as Error).message);
      }
    }
  }

  return allIssues;
}

/**
 * Check if .beads directory exists
 * @param projectRoot - Root directory to check
 * @returns boolean
 */
export function beadsDirectoryExists(projectRoot: string): boolean {
  const beadsDir = path.join(projectRoot, '.beads');
  return fs.existsSync(beadsDir);
}
