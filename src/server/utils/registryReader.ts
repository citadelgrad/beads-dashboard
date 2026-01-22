import fs from 'fs';
import path from 'path';
import os from 'os';
import type { BeadsRegistryEntry, BeadsProject } from '@shared/types';

/**
 * Read the beads registry file from ~/.beads/registry.json
 * @returns Promise<BeadsRegistryEntry[]> - Array of registered projects
 */
export async function readBeadsRegistry(): Promise<BeadsRegistryEntry[]> {
  const registryPath = path.join(os.homedir(), '.beads', 'registry.json');

  if (!fs.existsSync(registryPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    const entries = JSON.parse(content) as BeadsRegistryEntry[];
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    console.error('Error reading registry:', error);
    return [];
  }
}

/**
 * Check if a process is running
 * @param pid - Process ID to check
 * @returns Promise<boolean> - True if process is running
 */
async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    // On Unix systems, kill with signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all beads projects from registry with status information
 * Filters out projects that no longer exist or don't have a .beads directory
 * @returns Promise<BeadsProject[]> - Array of valid projects with metadata
 */
export async function getBeadsProjects(): Promise<BeadsProject[]> {
  const registryEntries = await readBeadsRegistry();

  // Filter out invalid projects (deleted or missing .beads directory)
  const validEntries = registryEntries.filter((entry) => {
    const isValid = isValidBeadsProject(entry.workspace_path);
    if (!isValid) {
      console.log(`Filtering out invalid/deleted project: ${entry.workspace_path}`);
    }
    return isValid;
  });

  const projects: BeadsProject[] = await Promise.all(
    validEntries.map(async (entry) => {
      // Extract project name from workspace path (last directory)
      const name = path.basename(entry.workspace_path);

      // Check if daemon is still running
      const isActive = await isProcessRunning(entry.pid);

      return {
        name,
        path: entry.workspace_path,
        isActive,
        pid: entry.pid,
        version: entry.version,
        started_at: entry.started_at,
      };
    })
  );

  return projects;
}

/**
 * Validate that a project path exists and has a .beads directory
 * @param projectPath - Path to validate
 * @returns boolean - True if valid beads project
 */
export function isValidBeadsProject(projectPath: string): boolean {
  if (!fs.existsSync(projectPath)) {
    return false;
  }

  const beadsDir = path.join(projectPath, '.beads');
  return fs.existsSync(beadsDir);
}
