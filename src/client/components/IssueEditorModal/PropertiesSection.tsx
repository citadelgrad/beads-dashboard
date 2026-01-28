import { useState, useCallback, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import type { Issue, IssueStatus, Priority } from '@shared/types';
import CollapsibleSection from './CollapsibleSection';

// All 14 issue types supported by Beads
const ISSUE_TYPES = [
  'bug',
  'feature',
  'task',
  'epic',
  'chore',
  'merge-request',
  'molecule',
  'gate',
  'agent',
  'role',
  'rig',
  'convoy',
  'event',
  'slot',
] as const;

// All 8 statuses supported by Beads
const ISSUE_STATUSES: IssueStatus[] = [
  'open',
  'in_progress',
  'blocked',
  'closed',
  'deferred',
  'pinned',
  'hooked',
  'tombstone',
];

// Priority options with labels
const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 0, label: 'Critical (0)' },
  { value: 1, label: 'High (1)' },
  { value: 2, label: 'Medium (2)' },
  { value: 3, label: 'Low (3)' },
  { value: 4, label: 'Lowest (4)' },
];

interface PropertiesSectionProps {
  values: Partial<Issue>;
  allIssues?: Issue[];
  onChange: (field: string, value: unknown) => void;
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
 * Properties section containing Type, Status, Priority dropdowns,
 * and Assignee/Parent text inputs. Wrapped in a CollapsibleSection.
 */
function PropertiesSection({ values, allIssues = [], onChange }: PropertiesSectionProps) {
  const [parentInput, setParentInput] = useState('');
  const [parentError, setParentError] = useState<string | null>(null);

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

  // Get parent issue details
  const parentIssue = values.parent_id ? allIssues.find((i) => i.id === values.parent_id) : undefined;

  // Set parent issue
  const setParentIssue = useCallback(
    (targetId: string) => {
      const trimmed = targetId.trim();
      if (!trimmed) return;

      const targetIssue = findIssue(trimmed);
      if (!targetIssue) {
        setParentError('Issue not found');
        setTimeout(() => setParentError(null), 2000);
        return;
      }

      onChange('parent_id', targetIssue.id);
      setParentInput('');
      setParentError(null);
    },
    [findIssue, onChange]
  );

  // Clear parent issue
  const clearParent = useCallback(() => {
    onChange('parent_id', '');
  }, [onChange]);

  // Handle keydown for parent input
  const handleParentKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setParentIssue(parentInput);
      }
    },
    [parentInput, setParentIssue]
  );
  // Common select styling
  const selectClassName =
    'w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
    'hover:border-slate-400 transition-colors cursor-pointer appearance-none ' +
    'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")] ' +
    'bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8';

  // Common input styling
  const inputClassName =
    'w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
    'hover:border-slate-400 transition-colors placeholder:text-slate-400';

  // Common label styling
  const labelClassName = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <CollapsibleSection title="Properties" defaultExpanded={true}>
      <div className="space-y-3">
        {/* Type Dropdown */}
        <div>
          <label htmlFor="issue-type" className={labelClassName}>
            Type
          </label>
          <select
            id="issue-type"
            value={values.issue_type || 'task'}
            onChange={(e) => onChange('issue_type', e.target.value)}
            className={selectClassName}
          >
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div>
          <label htmlFor="issue-status" className={labelClassName}>
            Status
          </label>
          <select
            id="issue-status"
            value={values.status || 'open'}
            onChange={(e) => onChange('status', e.target.value as IssueStatus)}
            className={selectClassName}
          >
            {ISSUE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Dropdown */}
        <div>
          <label htmlFor="issue-priority" className={labelClassName}>
            Priority
          </label>
          <select
            id="issue-priority"
            value={values.priority ?? 2}
            onChange={(e) => onChange('priority', Number(e.target.value) as Priority)}
            className={selectClassName}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Text Input */}
        <div>
          <label htmlFor="issue-assignee" className={labelClassName}>
            Assignee
          </label>
          <input
            type="text"
            id="issue-assignee"
            value={values.assignee || ''}
            onChange={(e) => onChange('assignee', e.target.value)}
            placeholder="Enter assignee name..."
            className={inputClassName}
          />
        </div>

        {/* Parent Issue - shows linked parent or input to set one */}
        <div>
          <label className={labelClassName}>Parent Issue</label>

          {/* Show linked parent when set */}
          {values.parent_id && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-100 rounded-md text-sm mb-2">
              <span className="font-mono text-xs text-purple-600 flex-shrink-0">
                {formatIssueId(values.parent_id)}
              </span>
              <span className="text-slate-700 truncate flex-1">
                {parentIssue ? truncate(parentIssue.title, 30) : 'Unknown issue'}
              </span>
              <button
                type="button"
                onClick={clearParent}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                aria-label="Clear parent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input to set/change parent */}
          <div className="flex gap-2">
            <input
              type="text"
              id="issue-parent"
              value={parentInput}
              onChange={(e) => setParentInput(e.target.value)}
              onKeyDown={handleParentKeyDown}
              placeholder={values.parent_id ? "Change parent..." : "Enter parent issue ID..."}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => setParentIssue(parentInput)}
              disabled={!parentInput.trim()}
              className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Set
            </button>
          </div>

          {parentError && <p className="text-xs text-red-600 mt-1">{parentError}</p>}
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default PropertiesSection;

// Export constants for reuse in other components
export { ISSUE_TYPES, ISSUE_STATUSES, PRIORITY_OPTIONS };
