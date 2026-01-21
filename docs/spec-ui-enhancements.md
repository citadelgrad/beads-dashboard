# Technical Specification: Beads Dashboard UI Enhancements

**Status:** Draft
**Author:** Claude
**Created:** 2026-01-21
**PRD:** [prd-ui-enhancements.md](./prd-ui-enhancements.md)

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                           App.tsx                                 |
|  +------------------------------------------------------------+  |
|  |  Header                                                    |  |
|  |  +------------------------------------------------------+  |  |
|  |  | Tabs | SearchBar (with autocomplete) | NewIssueBtn   |  |  |
|  |  +------------------------------------------------------+  |  |
|  +------------------------------------------------------------+  |
|                              |                                    |
|         +--------------------+---------------------+              |
|         |                    |                     |              |
|    TableView            KanbanBoard         DashboardView         |
|    (uses CopyableId)   (uses CopyableId)                          |
|    (uses DateBadge)    (uses DateBadge)                           |
|         |                    |                                    |
|         +--------------------+                                    |
|                    |                                              |
|           IssueEditorModal (create/edit modes)                    |
|           (uses CopyableId in header)                             |
+------------------------------------------------------------------+
```

## New Components

### 1. SearchBar Component

**Location:** `src/client/components/SearchBar.tsx`

```tsx
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { Issue } from '@shared/types';

interface SearchBarProps {
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  placeholder?: string;
}

interface SearchBarState {
  query: string;
  isOpen: boolean;
  highlightedIndex: number;
}

function SearchBar({ issues, onSelectIssue, placeholder = "Search issues..." }: SearchBarProps) {
  const [state, setState] = useState<SearchBarState>({
    query: '',
    isOpen: false,
    highlightedIndex: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter issues based on query
  const filteredIssues = useMemo(() => {
    if (!state.query.trim()) return [];

    const searchLower = state.query.toLowerCase();
    return issues
      .filter((issue) => issue.status !== 'tombstone')
      .filter((issue) => {
        const idMatch = issue.id.toLowerCase().includes(searchLower);
        const titleMatch = (issue.title || '').toLowerCase().includes(searchLower);
        return idMatch || titleMatch;
      })
      .slice(0, 10); // Limit to 10 results
  }, [issues, state.query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!state.isOpen || filteredIssues.length === 0) {
      if (e.key === 'Enter' && filteredIssues.length > 0) {
        onSelectIssue(filteredIssues[0]);
        setState(prev => ({ ...prev, query: '', isOpen: false }));
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          highlightedIndex: Math.min(prev.highlightedIndex + 1, filteredIssues.length - 1)
        }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          highlightedIndex: Math.max(prev.highlightedIndex - 1, 0)
        }));
        break;
      case 'Enter':
        e.preventDefault();
        onSelectIssue(filteredIssues[state.highlightedIndex]);
        setState({ query: '', isOpen: false, highlightedIndex: 0 });
        break;
      case 'Escape':
        setState(prev => ({ ...prev, isOpen: false }));
        inputRef.current?.blur();
        break;
    }
  }, [state.isOpen, state.highlightedIndex, filteredIssues, onSelectIssue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setState(prev => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Expose focus method for keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={state.query}
          onChange={(e) => setState({
            query: e.target.value,
            isOpen: e.target.value.trim().length > 0,
            highlightedIndex: 0
          })}
          onFocus={() => state.query && setState(prev => ({ ...prev, isOpen: true }))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        {state.query && (
          <button
            onClick={() => setState({ query: '', isOpen: false, highlightedIndex: 0 })}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <span className="absolute right-10 top-2.5 text-xs text-slate-400 hidden sm:block">
          Cmd+K
        </span>
      </div>

      {/* Autocomplete dropdown */}
      {state.isOpen && filteredIssues.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg
                        shadow-lg max-h-[400px] overflow-y-auto">
          {filteredIssues.map((issue, index) => (
            <SearchResultItem
              key={issue.id}
              issue={issue}
              isHighlighted={index === state.highlightedIndex}
              onClick={() => {
                onSelectIssue(issue);
                setState({ query: '', isOpen: false, highlightedIndex: 0 });
              }}
            />
          ))}
        </div>
      )}

      {/* No results message */}
      {state.isOpen && state.query && filteredIssues.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg
                        shadow-lg p-4 text-center text-slate-500 text-sm">
          No issues found matching "{state.query}"
        </div>
      )}
    </div>
  );
}

export default SearchBar;
```

### 2. CopyableId Component

**Location:** `src/client/components/CopyableId.tsx`

```tsx
import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableIdProps {
  fullId: string;
  displayId?: string; // Optional shortened display version
  className?: string;
  showIcon?: boolean;
}

function CopyableId({ fullId, displayId, className = '', showIcon = true }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handlers

    try {
      await navigator.clipboard.writeText(fullId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [fullId]);

  const display = displayId || (fullId.includes('-') ? fullId.split('-').pop() : fullId);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 font-mono text-sm text-slate-500
                  hover:text-blue-600 transition-colors cursor-pointer ${className}`}
      title={copied ? 'Copied!' : `Click to copy: ${fullId}`}
    >
      <span>{display}</span>
      {showIcon && (
        <span className={`transition-all duration-200 ${copied ? 'text-green-500' : 'text-slate-400'}`}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </span>
      )}
    </button>
  );
}

export default CopyableId;
```

### 3. DateBadge Component

**Location:** `src/client/components/DateBadge.tsx`

```tsx
import { Calendar, Hourglass } from 'lucide-react';

interface DateBadgeProps {
  due?: string;
  defer?: string;
  compact?: boolean;
}

function DateBadge({ due, defer, compact = true }: DateBadgeProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate due date status
  const getDueBadge = () => {
    if (!due) return null;

    const dueDate = new Date(due);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let colorClass: string;
    let label: string;

    if (diffDays < 0) {
      // Overdue
      colorClass = 'bg-red-100 text-red-700 border-red-200';
      label = `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      // Due today
      colorClass = 'bg-orange-100 text-orange-700 border-orange-200';
      label = 'Today';
    } else if (diffDays <= 3) {
      // Due soon
      colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
      label = `${diffDays}d`;
    } else {
      // Future due date
      colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
      label = compact ? `${diffDays}d` : formatDate(dueDate);
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${colorClass}`}
        title={`Due: ${formatDate(dueDate)}`}
      >
        <Calendar className="w-3 h-3" />
        {label}
      </span>
    );
  };

  // Calculate defer badge
  const getDeferBadge = () => {
    if (!defer) return null;

    const deferDate = new Date(defer);
    deferDate.setHours(0, 0, 0, 0);

    // Only show if defer date is in the future
    if (deferDate <= today) return null;

    const label = compact
      ? deferDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : formatDate(deferDate);

    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
                   bg-purple-100 text-purple-700 border border-purple-200"
        title={`Deferred until: ${formatDate(deferDate)}`}
      >
        <Hourglass className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const dueBadge = getDueBadge();
  const deferBadge = getDeferBadge();

  if (!dueBadge && !deferBadge) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {dueBadge}
      {deferBadge}
    </span>
  );
}

// Helper function to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

export default DateBadge;
```

### 4. NewIssueButton Component

**Location:** `src/client/components/NewIssueButton.tsx`

```tsx
import { Plus } from 'lucide-react';

interface NewIssueButtonProps {
  onClick: () => void;
}

function NewIssueButton({ onClick }: NewIssueButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                 text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
      title="Create new issue (Cmd+N)"
    >
      <Plus className="w-4 h-4" />
      <span>New Issue</span>
      <span className="text-xs text-blue-200 hidden sm:block">Cmd+N</span>
    </button>
  );
}

export default NewIssueButton;
```

## API Endpoints

### New Endpoint: POST /api/issues

**Location:** `src/server/routes/api.ts`

Note: This endpoint should follow the existing pattern in the codebase, using execFile for safety.

```typescript
/**
 * POST /api/issues
 * Creates a new issue via bd create command
 */
router.post('/issues', async (req: Request, res: Response) => {
  const { title, description, issue_type, priority } = req.body as CreateIssueRequest;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    // Build bd create command arguments
    const args: string[] = ['create'];

    // Required
    args.push(`--title=${title}`);

    // Optional with defaults
    args.push(`--type=${issue_type || 'task'}`);
    args.push(`--priority=${priority ?? 2}`);

    // Execute bd create using execFile for safety
    const result = await new Promise<string>((resolve, reject) => {
      execFile('bd', args, { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error(`execFile error: ${error}`);
          return reject(new Error(stderr || error.message));
        }
        resolve(stdout);
      });
    });

    // Parse issue ID from output (bd create outputs: "Created issue: <id>")
    const idMatch = result.match(/Created issue:\s*(\S+)/);
    const newId = idMatch ? idMatch[1] : null;

    // If description provided, update it
    if (description && newId) {
      const tempFile = path.join(process.cwd(), `desc-${Date.now()}.txt`);
      try {
        fs.writeFileSync(tempFile, description);
        await new Promise<void>((resolve, reject) => {
          execFile('bd', ['update', newId, '--body-file', tempFile],
            { cwd: projectRoot },
            (error, _stdout, stderr) => {
              fs.unlinkSync(tempFile);
              if (error) return reject(new Error(stderr || error.message));
              resolve();
            }
          );
        });
      } catch (descError) {
        console.error('Failed to set description:', descError);
        // Don't fail the request, issue was created
      }
    }

    // Flush changes
    await new Promise<void>((resolve) => {
      execFile('bd', ['sync', '--flush-only'], { cwd: projectRoot }, () => resolve());
    });

    res.json({ success: true, id: newId });
    emitRefresh();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});
```

### Type Definition for Create Request

**Location:** `src/shared/types.ts` (add)

```typescript
export interface CreateIssueRequest {
  title: string;
  description?: string;
  issue_type?: ExtendedIssueType;
  priority?: Priority;
}
```

## Component Modifications

### App.tsx Modifications

1. Move search to header area below tabs
2. Add NewIssueButton next to search
3. Add keyboard shortcut for Cmd+N
4. Add state for create modal
5. Lift selectedIssue state to App level for search integration

```tsx
// New state
const [createModalOpen, setCreateModalOpen] = useState(false);
const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

// Keyboard shortcut effect
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Skip if in input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      setCreateModalOpen(true);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);

// Handler for search selection
const handleSearchSelect = useCallback((issue: Issue) => {
  setSelectedIssue(issue);
}, []);

// Handler for create
const handleCreateIssue = useCallback(async (data: CreateIssueRequest) => {
  const res = await fetch('/api/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create issue');
  }

  setCreateModalOpen(false);
  // Data will refresh via socket
}, []);
```

### IssueEditorModal Modifications

1. Add `mode` prop ('edit' | 'create')
2. Make ID header use CopyableId component (in edit mode)
3. Hide ID in create mode
4. Adjust save handler based on mode

```tsx
interface IssueEditorModalProps {
  issue?: Issue; // Optional for create mode
  mode: 'edit' | 'create';
  allIssues?: Issue[];
  onClose: () => void;
  onSave: (updates: Partial<Issue>) => Promise<void>;
  onCreate?: (data: CreateIssueRequest) => Promise<void>;
}

// In header section:
{mode === 'edit' && issue && (
  <CopyableId fullId={issue.id} className="text-sm" />
)}
{mode === 'create' && (
  <span className="text-sm text-slate-500">New Issue</span>
)}
```

### TableView Modifications

1. Replace ID text with CopyableId component
2. Add DateBadge after title
3. Ensure actions are always visible (already implemented, verify)
4. Remove internal search (moved to App.tsx)

```tsx
// In flat list row:
<div className="w-20 flex items-center gap-2">
  {typeInfo.icon}
  <CopyableId fullId={issue.id} displayId={shortId} showIcon={false} />
</div>

// After title:
<div className="flex-1 min-w-0 flex items-center gap-2">
  <button onClick={() => openIssueEditor(issue)} className="...">
    {issue.title || 'Untitled'}
  </button>
  <DateBadge due={issue.due} defer={issue.defer} compact />
  {isStale && <span className="text-xs text-red-600 font-medium">{ageInDays}d</span>}
</div>
```

### KanbanBoard Modifications

1. Replace ID in KanbanCard with CopyableId
2. Add DateBadge to card footer

```tsx
// In KanbanCard header:
<div className="flex items-center gap-2 text-slate-500 text-xs">
  {getTypeIcon(issue.issue_type)}
  <CopyableId fullId={issue.id} displayId={shortId} showIcon={false} />
</div>

// In KanbanCard footer, before age badge:
<DateBadge due={issue.due} defer={issue.defer} compact />
```

## File Structure Changes

```
src/client/components/
  SearchBar.tsx           (NEW)
  CopyableId.tsx          (NEW)
  DateBadge.tsx           (NEW)
  NewIssueButton.tsx      (NEW)
  TableView.tsx           (MODIFIED)
  KanbanBoard.tsx         (MODIFIED)
  IssueEditorModal/
    index.tsx             (MODIFIED)
    ...
src/client/App.tsx        (MODIFIED)
src/server/routes/api.ts  (MODIFIED)
src/shared/types.ts       (MODIFIED)
```

## Implementation Phases

### Phase 1: Core Components
- [ ] Create CopyableId component
- [ ] Create DateBadge component
- [ ] Add unit tests for date calculations

### Phase 2: Search Enhancement
- [ ] Create SearchBar component with autocomplete
- [ ] Move search to App.tsx header
- [ ] Add Cmd+K keyboard shortcut
- [ ] Update TableView to remove old search (or keep as filter)

### Phase 3: Copy ID Integration
- [ ] Integrate CopyableId into IssueEditorModal header
- [ ] Integrate CopyableId into TableView (flat list and epics)
- [ ] Integrate CopyableId into KanbanBoard cards

### Phase 4: Date Display Integration
- [ ] Integrate DateBadge into TableView
- [ ] Integrate DateBadge into KanbanBoard
- [ ] Ensure proper styling and spacing

### Phase 5: Issue Creation
- [ ] Create NewIssueButton component
- [ ] Add POST /api/issues endpoint
- [ ] Add CreateIssueRequest type to shared/types.ts
- [ ] Modify IssueEditorModal to support create mode
- [ ] Add Cmd+N keyboard shortcut
- [ ] Wire up in App.tsx

### Phase 6: Polish & Testing
- [ ] Verify list view actions are visible and working
- [ ] End-to-end testing of all features
- [ ] Performance testing with large issue counts
- [ ] Cross-browser testing of clipboard API

## Testing Strategy

### Unit Tests

1. **CopyableId**: Test clipboard API mock, copied state timing
2. **DateBadge**: Test all date scenarios (overdue, today, soon, future, deferred)
3. **SearchBar**: Test filtering logic, keyboard navigation, debounce

### Integration Tests

1. Search autocomplete with mock issues
2. Create issue flow with API mock
3. Copy ID across different views

### Manual Testing Checklist

- [ ] Cmd+K focuses search from any view
- [ ] Autocomplete shows correct results
- [ ] Enter opens first result
- [ ] Arrow keys navigate results
- [ ] Escape closes dropdown
- [ ] Click on result opens modal
- [ ] Cmd+N opens create modal
- [ ] Create modal submits correctly
- [ ] New issue appears in list
- [ ] Click ID copies to clipboard
- [ ] Copy animation shows and hides
- [ ] Due date badges show correct colors
- [ ] Overdue items are red
- [ ] Deferred items show correctly
- [ ] Actions visible in flat list view
