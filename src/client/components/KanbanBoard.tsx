import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowDownFromLine,
  Bug,
  Box,
  Boxes,
  ListCheck,
  X,
  GripVertical,
} from 'lucide-react';
import type { Issue, IssueStatus, Priority } from '@shared/types';
import IssueEditorModal from './IssueEditorModal';
import CopyableId from './CopyableId';
import DateBadge from './DateBadge';

interface KanbanBoardProps {
  issues: Issue[];
}

// Kanban categories (different from IssueStatus)
type KanbanCategory = 'blocked' | 'ready' | 'in_progress' | 'closed';

// Column configuration - beads-style categories
const COLUMNS: { category: KanbanCategory; label: string; bgColor: string; headerColor: string }[] = [
  { category: 'blocked', label: 'Blocked', bgColor: 'bg-red-50', headerColor: 'bg-red-200' },
  { category: 'ready', label: 'Ready', bgColor: 'bg-slate-50', headerColor: 'bg-slate-200' },
  { category: 'in_progress', label: 'In Progress', bgColor: 'bg-blue-50', headerColor: 'bg-blue-200' },
  { category: 'closed', label: 'Closed', bgColor: 'bg-green-50', headerColor: 'bg-green-200' },
];

// Map kanban category to status for drag-and-drop updates
const CATEGORY_TO_STATUS: Record<KanbanCategory, IssueStatus> = {
  blocked: 'blocked',
  ready: 'open',
  in_progress: 'in_progress',
  closed: 'closed',
};

// Check if an issue is blocked by dependencies
function isBlockedByDependencies(issue: Issue, allIssues: Issue[]): boolean {
  // Check dependencies array (new format)
  if (issue.dependencies && Array.isArray(issue.dependencies)) {
    for (const dep of issue.dependencies) {
      if (typeof dep === 'object' && dep.depends_on_id) {
        const dependsOnIssue = allIssues.find((i) => i.id === dep.depends_on_id);
        // If the dependency exists and is not closed, this issue is blocked
        if (dependsOnIssue && dependsOnIssue.status !== 'closed') {
          return true;
        }
      }
    }
  }

  // Check blocked_by array (legacy format)
  if (issue.blocked_by && Array.isArray(issue.blocked_by)) {
    for (const blockerId of issue.blocked_by) {
      const blockerIssue = allIssues.find((i) => i.id === blockerId);
      if (blockerIssue && blockerIssue.status !== 'closed') {
        return true;
      }
    }
  }

  return false;
}

// Categorize an issue into a kanban column
function categorizeIssue(issue: Issue, allIssues: Issue[]): KanbanCategory {
  // Closed issues go to Closed column
  if (issue.status === 'closed') {
    return 'closed';
  }

  // In progress issues go to In Progress column
  if (issue.status === 'in_progress') {
    return 'in_progress';
  }

  // Explicitly blocked issues or dependency-blocked issues go to Blocked
  if (issue.status === 'blocked' || isBlockedByDependencies(issue, allIssues)) {
    return 'blocked';
  }

  // Everything else (open, deferred, pinned, hooked) goes to Ready
  // Note: tombstones are filtered out before display
  return 'ready';
}

// Priority border colors
const PRIORITY_BORDER_COLORS: Record<Priority, string> = {
  0: 'border-l-red-500', // Critical
  1: 'border-l-orange-500', // High
  2: 'border-l-yellow-500', // Medium
  3: 'border-l-blue-500', // Low
  4: 'border-l-gray-400', // Lowest
};

// Get age in days from created_at date
function getAgeInDays(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

// Get age badge color based on age
function getAgeBadgeColor(ageDays: number): string {
  if (ageDays < 7) return 'bg-green-100 text-green-800';
  if (ageDays < 30) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

// Get priority icon
function getPriorityIcon(priority: Priority): JSX.Element {
  switch (priority) {
    case 0: return <AlertOctagon className="w-3 h-3 text-red-600" />;
    case 1: return <AlertTriangle className="w-3 h-3 text-orange-600" />;
    case 2: return <ArrowUp className="w-3 h-3 text-yellow-600" />;
    case 3: return <ArrowDown className="w-3 h-3 text-blue-600" />;
    case 4: return <ArrowDownFromLine className="w-3 h-3 text-gray-500" />;
    default: return <ArrowUp className="w-3 h-3 text-gray-500" />;
  }
}

// Get type icon
function getTypeIcon(type: string): JSX.Element {
  const t = (type || '').toLowerCase();
  if (t === 'bug') return <Bug className="w-3 h-3" />;
  if (t === 'feature') return <Box className="w-3 h-3" />;
  if (t === 'epic') return <Boxes className="w-3 h-3" />;
  return <ListCheck className="w-3 h-3" />;
}

// Get initials from assignee name
function getInitials(assignee: string | undefined): string {
  if (!assignee) return '?';
  const parts = assignee.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface KanbanCardProps {
  issue: Issue;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, issue: Issue) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>, issue: Issue) => void;
  onCardClick: (issue: Issue) => void;
  isDragging: boolean;
}

function KanbanCard({ issue, onDragStart, onTouchStart, onCardClick, isDragging }: KanbanCardProps) {
  const ageDays = getAgeInDays(issue.created_at);
  const ageBadgeColor = getAgeBadgeColor(ageDays);
  const priorityBorderColor = PRIORITY_BORDER_COLORS[issue.priority];
  const shortId = issue.id.includes('-') ? issue.id.split('-').pop() : issue.id;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, issue)}
      onTouchStart={(e) => onTouchStart(e, issue)}
      onClick={() => onCardClick(issue)}
      className={`bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 ${priorityBorderColor} p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
      data-testid={`kanban-card-${issue.id}`}
    >
      {/* Header: Type icon, ID, Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          {getTypeIcon(issue.issue_type)}
          <CopyableId fullId={issue.id} displayId={shortId} showIcon={false} className="font-mono text-xs" />
        </div>
        <div className="flex items-center gap-1">
          {getPriorityIcon(issue.priority)}
          <GripVertical className="w-3 h-3 text-slate-300" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">
        {issue.title || 'Untitled'}
      </h3>

      {/* Footer: Assignee, Date badges, Age Badge */}
      <div className="flex items-center justify-between">
        {/* Assignee avatar/initials */}
        <div
          className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600"
          title={issue.assignee || 'Unassigned'}
        >
          {getInitials(issue.assignee)}
        </div>

        {/* Due/Defer badges + Age badge */}
        <div className="flex items-center gap-1">
          <DateBadge due={issue.due} defer={issue.defer} compact />
          <span className={`text-xs px-2 py-0.5 rounded-full ${ageBadgeColor}`}>
            {ageDays}d
          </span>
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  category: KanbanCategory;
  label: string;
  bgColor: string;
  headerColor: string;
  issues: Issue[];
  onDrop: (category: KanbanCategory) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, issue: Issue) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>, issue: Issue) => void;
  onCardClick: (issue: Issue) => void;
  draggingIssueId: string | null;
  isDropTarget: boolean;
}

function KanbanColumn({
  category,
  label,
  bgColor,
  headerColor,
  issues,
  onDrop,
  onDragOver,
  onDragStart,
  onTouchStart,
  onCardClick,
  draggingIssueId,
  isDropTarget,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex flex-col w-[calc(25%-12px)] min-w-[200px] flex-shrink-0 rounded-lg ${bgColor} border ${
        isDropTarget ? 'border-blue-400 border-2' : 'border-slate-200'
      }`}
      onDragOver={onDragOver}
      onDrop={() => onDrop(category)}
      data-testid={`kanban-column-${category}`}
    >
      {/* Sticky header */}
      <div className={`sticky top-0 z-10 p-3 ${headerColor} rounded-t-lg border-b border-slate-200`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm">{label}</h2>
          <span className="bg-white/80 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {issues.length}
          </span>
        </div>
      </div>

      {/* Cards container */}
      <div className="p-2 flex flex-col gap-2 flex-1 overflow-y-auto min-h-[200px]">
        {issues.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">
            No issues
          </div>
        ) : (
          issues.map((issue) => (
            <KanbanCard
              key={issue.id}
              issue={issue}
              onDragStart={onDragStart}
              onTouchStart={onTouchStart}
              onCardClick={onCardClick}
              isDragging={draggingIssueId === issue.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ issues }: KanbanBoardProps) {
  const [draggingIssue, setDraggingIssue] = useState<Issue | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanCategory | null>(null);
  const [optimisticIssues, setOptimisticIssues] = useState<Issue[]>(issues);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Touch drag state
  const touchRef = useRef<{ issue: Issue; startX: number; startY: number } | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  // Sync optimistic state with props
  useEffect(() => {
    setOptimisticIssues(issues);
  }, [issues]);

  // Filter out tombstones and group issues by kanban category
  const visibleIssues = optimisticIssues.filter((issue) => issue.status !== 'tombstone');
  const issuesByCategory = COLUMNS.reduce((acc, col) => {
    acc[col.category] = visibleIssues.filter(
      (issue) => categorizeIssue(issue, optimisticIssues) === col.category
    );
    return acc;
  }, {} as Record<KanbanCategory, Issue[]>);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, issue: Issue) => {
    setDraggingIssue(issue);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', issue.id);
  }, []);

  // Handle touch start (for mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, issue: Issue) => {
    const touch = e.touches[0];
    touchRef.current = {
      issue,
      startX: touch.clientX,
      startY: touch.clientY,
    };
    setDraggingIssue(issue);
  }, []);

  // Handle touch move
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchRef.current) return;
      e.preventDefault();

      const touch = e.touches[0];

      // Create/update ghost element
      if (!ghostRef.current) {
        ghostRef.current = document.createElement('div');
        ghostRef.current.className = 'fixed z-50 bg-white shadow-lg rounded-lg p-2 pointer-events-none opacity-80';
        ghostRef.current.textContent = touchRef.current.issue.title || 'Untitled';
        document.body.appendChild(ghostRef.current);
      }

      ghostRef.current.style.left = `${touch.clientX - 50}px`;
      ghostRef.current.style.top = `${touch.clientY - 20}px`;

      // Find drop target
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      for (const el of elements) {
        const testId = el.getAttribute('data-testid');
        if (testId?.startsWith('kanban-column-')) {
          const category = testId.replace('kanban-column-', '') as KanbanCategory;
          setDropTarget(category);
          return;
        }
      }
      setDropTarget(null);
    };

    const handleTouchEnd = () => {
      if (touchRef.current && dropTarget) {
        handleDrop(dropTarget);
      }

      // Cleanup ghost
      if (ghostRef.current) {
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;
      }

      touchRef.current = null;
      setDraggingIssue(null);
      setDropTarget(null);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dropTarget]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.currentTarget;
    const testId = target.getAttribute('data-testid');
    if (testId?.startsWith('kanban-column-')) {
      const category = testId.replace('kanban-column-', '') as KanbanCategory;
      setDropTarget(category);
    }
  }, []);

  // Handle drop - update status via API
  const handleDrop = useCallback(async (newCategory: KanbanCategory) => {
    if (!draggingIssue) {
      setDraggingIssue(null);
      setDropTarget(null);
      return;
    }

    const newStatus = CATEGORY_TO_STATUS[newCategory];
    const currentCategory = categorizeIssue(draggingIssue, optimisticIssues);

    // Don't do anything if dropping in the same category
    if (currentCategory === newCategory) {
      setDraggingIssue(null);
      setDropTarget(null);
      return;
    }

    const previousStatus = draggingIssue.status;
    const issueId = draggingIssue.id;

    // Optimistic update
    setOptimisticIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      )
    );

    setDraggingIssue(null);
    setDropTarget(null);
    setUpdating(issueId);
    setError(null);

    try {
      const res = await fetch(`/api/issues/${issueId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (err) {
      // Revert on error
      setOptimisticIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, status: previousStatus } : issue
        )
      );
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      console.error('Status update failed:', err);
    } finally {
      setUpdating(null);
    }
  }, [draggingIssue, optimisticIssues]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingIssue(null);
    setDropTarget(null);
  }, []);

  // Card click handler - open editor modal
  const handleCardClick = useCallback((issue: Issue) => {
    // Don't open modal if we're in the middle of a drag
    if (draggingIssue) return;
    setSelectedIssue(issue);
  }, [draggingIssue]);

  // Close the editor modal
  const handleCloseModal = useCallback(() => {
    setSelectedIssue(null);
  }, []);

  // Save handler for the editor modal - calls PATCH API
  const handleSaveIssue = useCallback(async (updates: Partial<Issue>) => {
    if (!selectedIssue) return;

    console.log('[DEBUG] Saving issue updates:', JSON.stringify(updates, null, 2));

    const res = await fetch(`/api/issues/${selectedIssue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update issue');
    }

    // The socket.io refresh will update the issues automatically
  }, [selectedIssue]);

  return (
    <div onDragEnd={handleDragEnd}>
      {/* Error notification */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Updating indicator */}
      {updating && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-600 text-sm rounded-lg text-center">
          Updating issue status...
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '600px' }}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.category}
            category={col.category}
            label={col.label}
            bgColor={col.bgColor}
            headerColor={col.headerColor}
            issues={issuesByCategory[col.category] || []}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onTouchStart={handleTouchStart}
            onCardClick={handleCardClick}
            draggingIssueId={draggingIssue?.id || null}
            isDropTarget={dropTarget === col.category}
          />
        ))}
      </div>

      {/* Issue Editor Modal */}
      {selectedIssue && (
        <IssueEditorModal
          issue={selectedIssue}
          allIssues={issues}
          onClose={handleCloseModal}
          onSave={handleSaveIssue}
        />
      )}
    </div>
  );
}

export default KanbanBoard;

// Export helper functions and constants for testing
export {
  getAgeInDays,
  getAgeBadgeColor,
  getInitials,
  COLUMNS,
  PRIORITY_BORDER_COLORS,
  CATEGORY_TO_STATUS,
  isBlockedByDependencies,
  categorizeIssue,
};

// Export type for testing
export type { KanbanCategory };
