import { useState, useCallback, type KeyboardEvent } from 'react';
import { X, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import type { Issue, IssueDependency } from '@shared/types';

interface DependenciesSectionProps {
  values: Partial<Issue>;
  allIssues: Issue[];
  onChange: (field: string, value: IssueDependency[]) => void;
  currentIssueId: string;
}

/**
 * Truncate a string to a max length with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format an issue ID for display (show just the hash part if it's a standard format)
 */
function formatIssueId(id: string): string {
  const parts = id.split('-');
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return id;
}

/**
 * Dependencies section for managing issue relationships.
 * - Two subsections: "Blocks" (issues this blocks) and "Blocked by" (issues blocking this)
 * - Shows dependency issue IDs with titles (truncated)
 * - X button to remove each dependency
 * - Text input + Add button to add new dependency by issue ID
 */
function DependenciesSection({
  values,
  allIssues,
  onChange,
  currentIssueId,
}: DependenciesSectionProps) {
  const [blocksInput, setBlocksInput] = useState('');
  const [blockedByInput, setBlockedByInput] = useState('');
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blockedByError, setBlockedByError] = useState<string | null>(null);

  const dependencies = values.dependencies || [];

  // In beads JSONL format:
  // - issue_id is the issue that DEPENDS ON depends_on_id
  // - depends_on_id is the issue that BLOCKS issue_id
  // - type "blocks" means a blocking dependency
  // - type "parent-child" is for parent-child relationships (shown separately)

  // Get issues that block this issue (where current issue depends on something)
  // Filter: issue_id === currentIssueId means "this issue depends on depends_on_id"
  const blockedByIssues = dependencies.filter(
    (d) => d.type === 'blocks' && d.issue_id === currentIssueId
  );

  // Get issues that this issue blocks (where something depends on current issue)
  // Filter: depends_on_id === currentIssueId means "issue_id depends on this issue"
  const blocksIssues = dependencies.filter(
    (d) => d.type === 'blocks' && d.depends_on_id === currentIssueId
  );

  // Find issue by ID (partial or full match)
  const findIssue = useCallback(
    (searchId: string): Issue | undefined => {
      const trimmed = searchId.trim().toLowerCase();
      if (!trimmed) return undefined;

      // Try exact match first
      let found = allIssues.find((i) => i.id.toLowerCase() === trimmed);
      if (found) return found;

      // Try partial match (just the hash part)
      found = allIssues.find((i) => i.id.toLowerCase().endsWith('-' + trimmed));
      if (found) return found;

      // Try contains match
      found = allIssues.find((i) => i.id.toLowerCase().includes(trimmed));
      return found;
    },
    [allIssues]
  );

  // Get issue title by ID
  const getIssueTitle = useCallback(
    (issueId: string): string => {
      const issue = allIssues.find((i) => i.id === issueId);
      return issue ? truncate(issue.title, 40) : 'Unknown issue';
    },
    [allIssues]
  );

  // Add a "blocks" dependency (this issue blocks another)
  // To express "currentIssue blocks targetIssue": targetIssue depends on currentIssue
  // So: issue_id = targetIssue, depends_on_id = currentIssue
  const addBlocksDependency = useCallback(
    (targetId: string) => {
      const trimmed = targetId.trim();
      if (!trimmed) return;

      const targetIssue = findIssue(trimmed);
      if (!targetIssue) {
        setBlocksError('Issue not found');
        setTimeout(() => setBlocksError(null), 2000);
        return;
      }

      if (targetIssue.id === currentIssueId) {
        setBlocksError('Cannot block itself');
        setTimeout(() => setBlocksError(null), 2000);
        return;
      }

      // Check if dependency already exists (targetIssue already depends on currentIssue)
      if (
        blocksIssues.some((d) => d.issue_id === targetIssue.id)
      ) {
        setBlocksError('Dependency already exists');
        setTimeout(() => setBlocksError(null), 2000);
        return;
      }

      // targetIssue depends on currentIssue (currentIssue blocks targetIssue)
      const newDep: IssueDependency = {
        issue_id: targetIssue.id,
        depends_on_id: currentIssueId,
        type: 'blocks',
        created_at: new Date().toISOString(),
      };

      onChange('dependencies', [...dependencies, newDep]);
      setBlocksInput('');
      setBlocksError(null);
    },
    [findIssue, currentIssueId, blocksIssues, dependencies, onChange]
  );

  // Add a "blocked by" dependency (this issue depends on another)
  // To express "currentIssue is blocked by targetIssue": currentIssue depends on targetIssue
  // So: issue_id = currentIssue, depends_on_id = targetIssue
  const addBlockedByDependency = useCallback(
    (targetId: string) => {
      const trimmed = targetId.trim();
      if (!trimmed) return;

      const targetIssue = findIssue(trimmed);
      if (!targetIssue) {
        setBlockedByError('Issue not found');
        setTimeout(() => setBlockedByError(null), 2000);
        return;
      }

      if (targetIssue.id === currentIssueId) {
        setBlockedByError('Cannot depend on itself');
        setTimeout(() => setBlockedByError(null), 2000);
        return;
      }

      // Check if dependency already exists
      if (
        blockedByIssues.some((d) => d.depends_on_id === targetIssue.id)
      ) {
        setBlockedByError('Dependency already exists');
        setTimeout(() => setBlockedByError(null), 2000);
        return;
      }

      // currentIssue depends on targetIssue (targetIssue blocks currentIssue)
      const newDep: IssueDependency = {
        issue_id: currentIssueId,
        depends_on_id: targetIssue.id,
        type: 'blocks',
        created_at: new Date().toISOString(),
      };

      onChange('dependencies', [...dependencies, newDep]);
      setBlockedByInput('');
      setBlockedByError(null);
    },
    [findIssue, currentIssueId, blockedByIssues, dependencies, onChange]
  );

  // Remove a dependency
  const removeDependency = useCallback(
    (depToRemove: IssueDependency) => {
      onChange(
        'dependencies',
        dependencies.filter(
          (d) =>
            !(
              d.issue_id === depToRemove.issue_id &&
              d.depends_on_id === depToRemove.depends_on_id &&
              d.type === depToRemove.type
            )
        )
      );
    },
    [dependencies, onChange]
  );

  // Handle keydown for blocks input
  const handleBlocksKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBlocksDependency(blocksInput);
      }
    },
    [blocksInput, addBlocksDependency]
  );

  // Handle keydown for blocked-by input
  const handleBlockedByKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBlockedByDependency(blockedByInput);
      }
    },
    [blockedByInput, addBlockedByDependency]
  );

  // Common input styling
  const inputClassName =
    'flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
    'hover:border-slate-400 transition-colors placeholder:text-slate-400';

  // Common add button styling
  const addButtonClassName =
    'px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md ' +
    'hover:bg-slate-50 hover:border-slate-400 transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1';

  return (
    <CollapsibleSection title="Dependencies" defaultExpanded={true}>
      <div className="space-y-4">
        {/* Blocks Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ArrowRight className="w-4 h-4 text-orange-500" />
            Blocks
          </div>

          {/* List of issues this blocks (show issue_id since depends_on_id is current issue) */}
          {blocksIssues.length > 0 && (
            <div className="space-y-1">
              {blocksIssues.map((dep) => (
                <div
                  key={`${dep.issue_id}-${dep.depends_on_id}`}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-md text-sm"
                >
                  <span className="font-mono text-xs text-orange-600 flex-shrink-0">
                    {formatIssueId(dep.issue_id)}
                  </span>
                  <span className="text-slate-700 truncate flex-1">
                    {getIssueTitle(dep.issue_id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDependency(dep)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    aria-label="Remove dependency"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input to add blocks dependency */}
          <div className="flex gap-2">
            <input
              type="text"
              value={blocksInput}
              onChange={(e) => setBlocksInput(e.target.value)}
              onKeyDown={handleBlocksKeyDown}
              placeholder="Issue ID..."
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => addBlocksDependency(blocksInput)}
              disabled={!blocksInput.trim()}
              className={addButtonClassName}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {blocksError && (
            <p className="text-xs text-red-600">{blocksError}</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* Blocked By Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ArrowLeft className="w-4 h-4 text-red-500" />
            Blocked By
          </div>

          {/* List of issues blocking this */}
          {blockedByIssues.length > 0 && (
            <div className="space-y-1">
              {blockedByIssues.map((dep) => (
                <div
                  key={`${dep.issue_id}-${dep.depends_on_id}`}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-md text-sm"
                >
                  <span className="font-mono text-xs text-red-600 flex-shrink-0">
                    {formatIssueId(dep.depends_on_id)}
                  </span>
                  <span className="text-slate-700 truncate flex-1">
                    {getIssueTitle(dep.depends_on_id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDependency(dep)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    aria-label="Remove dependency"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input to add blocked-by dependency */}
          <div className="flex gap-2">
            <input
              type="text"
              value={blockedByInput}
              onChange={(e) => setBlockedByInput(e.target.value)}
              onKeyDown={handleBlockedByKeyDown}
              placeholder="Issue ID..."
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => addBlockedByDependency(blockedByInput)}
              disabled={!blockedByInput.trim()}
              className={addButtonClassName}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {blockedByError && (
            <p className="text-xs text-red-600">{blockedByError}</p>
          )}
        </div>

        {/* Helper text when no dependencies */}
        {blocksIssues.length === 0 && blockedByIssues.length === 0 && (
          <p className="text-xs text-slate-500">
            Enter an issue ID (or partial ID) to add a dependency relationship
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default DependenciesSection;
