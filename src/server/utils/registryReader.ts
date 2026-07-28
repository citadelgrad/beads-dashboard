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
 * Scan directories for beads projects (directories containing .beads/).
 * Looks up to 3 levels deep in each scan path.
 *
 * Scan paths are derived from:
 * 1. Parent directories of existing registry entries
 * 2. BEADS_SCAN_PATHS env var (colon-separated list of directories)
 */
function scanForBeadsProjects(registryEntries: BeadsRegistryEntry[]): BeadsRegistryEntry[] {
  const scanPaths = new Set<string>();

  // Derive scan paths from registry entries' parent directories
  for (const entry of registryEntries) {
    scanPaths.add(path.dirname(entry.workspace_path));
  }

  // Add paths from BEADS_SCAN_PATHS env var
  const envPaths = process.env.BEADS_SCAN_PATHS;
  if (envPaths) {
    for (const p of envPaths.split(':')) {
      const trimmed = p.trim();
      if (trimmed && fs.existsSync(trimmed)) {
        scanPaths.add(trimmed);
      }
    }
  }

  // Collect known workspace paths to avoid duplicates
  const knownPaths = new Set(registryEntries.map((e) => e.workspace_path));
  const discovered: BeadsRegistryEntry[] = [];

  for (const basePath of scanPaths) {
    scanDirectory(basePath, 3, knownPaths, discovered);
  }

  return discovered;
}

/**
 * Recursively scan a directory for .beads/ subdirectories up to maxDepth levels.
 */
function scanDirectory(
  dir: string,
  maxDepth: number,
  knownPaths: Set<string>,
  results: BeadsRegistryEntry[],
): void {
  if (maxDepth < 0) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // Permission denied or doesn't exist
  }

  // Check if this directory itself is a beads project
  const beadsDir = path.join(dir, '.beads');
  if (fs.existsSync(beadsDir) && fs.statSync(beadsDir).isDirectory()) {
    if (!knownPaths.has(dir)) {
      knownPaths.add(dir);

      // Read version from .local_version if available
      let version: string | undefined;
      const versionFile = path.join(beadsDir, '.local_version');
      if (fs.existsSync(versionFile)) {
        try {
          version = fs.readFileSync(versionFile, 'utf-8').trim();
        } catch { /* ignore */ }
      }

      results.push({
        workspace_path: dir,
        version,
      });
    }
  }

  // Recurse into subdirectories
  if (maxDepth > 0) {
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip hidden dirs, node_modules, and .beads itself
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      scanDirectory(path.join(dir, entry.name), maxDepth - 1, knownPaths, results);
    }
  }
}

/**
 * Get all beads projects from registry + filesystem scan with status information.
 * Filters out projects that no longer exist or don't have a .beads directory.
 * @returns Promise<BeadsProject[]> - Array of valid projects with metadata
 */
export async function getBeadsProjects(): Promise<BeadsProject[]> {
  const registryEntries = await readBeadsRegistry();

  // Scan filesystem for additional projects not in registry
  const scannedEntries = scanForBeadsProjects(registryEntries);
  const allEntries = [...registryEntries, ...scannedEntries];

  // Filter out invalid projects (deleted or missing .beads directory)
  // and deduplicate by workspace_path
  const seen = new Set<string>();
  const validEntries = allEntries.filter((entry) => {
    if (seen.has(entry.workspace_path)) return false;
    seen.add(entry.workspace_path);

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

      return {
        name,
        path: entry.workspace_path,
        // Current Beads registry/daemon runtime fields are not stable enough to
        // infer liveness. Treat registry entries as project discovery only.
        isActive: false,
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
