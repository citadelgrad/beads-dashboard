# PRD: Epics List View

## Overview

Add a new "Epics" tab to the beads-dashboard that displays epics with their subtasks organized hierarchically, providing visibility into epic progress and child issue status.

## Problem Statement

Currently, epics are displayed alongside all other issues in the "All Issues" table. Users cannot easily:
- See all epics at a glance
- Understand epic progress (how many children are complete)
- Navigate from an epic to its related subtasks
- Visualize the hierarchy between epics and their child issues

## Goals

1. Provide a dedicated view for epics with child issue visibility
2. Show epic progress through child completion metrics
3. Enable quick navigation between epics and their subtasks
4. Maintain consistency with existing UI patterns

## Non-Goals

- Drag-and-drop epic/subtask reordering
- Inline subtask creation from the epics view
- Epic-specific metrics/charts (future enhancement)
- Nested epics (epics containing other epics)

---

## Data Model

### Current Schema Limitations

The current `Issue` interface does not have explicit parent-child fields:

```typescript
interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  issue_type: IssueType;  // 'epic' | 'task' | 'bug' | 'feature'
  priority: Priority;
  created_at: string;
  updated_at?: string;
  assignee?: string;
  labels?: string[];
  dependencies?: string[];  // IDs of issues this depends on
  blocked_by?: string[];
}
```

### Parent-Child Relationship Strategy

**Option A (Recommended): Use `parent_id` field**

Add an optional `parent_id` field to the Issue interface:

```typescript
interface Issue {
  // ... existing fields
  parent_id?: string;  // ID of the parent epic
}
```

Advantages:
- Explicit relationship, easy to query
- Clear semantics (child belongs to parent)
- Single source of truth

**Option B: Convention via `dependencies`**

If a child issue includes an epic's ID in its `dependencies` array, it is considered a child of that epic.

Advantages:
- No schema change required
- Works with existing Beads data

Disadvantages:
- Semantically incorrect (dependency ≠ parent-child)
- Ambiguous when multiple epics in dependencies
- Harder to reason about

**Recommendation:** Implement Option A. Check if Beads core supports `parent_id`. If not, request the feature or use Option B as fallback.

---

## User Interface

### Tab Navigation

Add "Epics" as a third tab in the header navigation:

```
[ All Issues ]  [ Dashboard ]  [ Epics ]
```

### Epics List View Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Filter: Status ▼]  [Filter: Priority ▼]  [🔍 Search...]          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ▼ EPIC-001: User Authentication System                    P1  ◉   │
│    Progress: ████████░░ 8/10 (80%)           Status: in_progress   │
│    ├─ TASK-101: Implement login endpoint          ✓ closed         │
│    ├─ TASK-102: Add password hashing              ✓ closed         │
│    ├─ TASK-103: Create session management         ◉ in_progress    │
│    ├─ TASK-104: Build logout functionality        ○ open           │
│    └─ + 6 more...                                [Show all]        │
│                                                                     │
│  ▶ EPIC-002: Dashboard Analytics                           P2  ○   │
│    Progress: ░░░░░░░░░░ 0/5 (0%)              Status: open         │
│                                                                     │
│  ▼ EPIC-003: API Rate Limiting                             P1  ◉   │
│    Progress: ██████░░░░ 3/5 (60%)             Status: in_progress  │
│    ├─ TASK-301: Design rate limit strategy        ✓ closed         │
│    ├─ TASK-302: Implement middleware              ✓ closed         │
│    └─ TASK-303: Add monitoring                    ◉ in_progress    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key UI Elements

#### 1. Epic Row (Collapsed)

| Element | Description |
|---------|-------------|
| Expand/Collapse | `▶`/`▼` toggle to show/hide children |
| Epic ID | Shortened ID with copy button |
| Epic Title | Full title, clickable for detail modal |
| Priority Badge | P0-P4 with color coding |
| Status Indicator | Visual icon (○ open, ◉ in_progress, ✓ closed) |
| Progress Bar | Visual representation of completion |
| Progress Text | `{completed}/{total} ({percentage}%)` |

#### 2. Epic Row (Expanded)

Shows child issues indented under the epic:
- Tree connector lines (├─, └─)
- Child status icon
- Child title (truncated)
- Quick link to full issue

#### 3. Child Overflow

When epic has more than 5 children:
- Show first 5 children
- Display "+ N more..." link
- "Show all" expands to full list OR filters All Issues tab to this epic's children

### Interaction Behaviors

| Action | Result |
|--------|--------|
| Click epic title | Opens description modal (reuse from TableView) |
| Click expand/collapse | Toggle children visibility |
| Click child title | Opens child description modal |
| Click "Show all" | Navigates to All Issues tab filtered by `parent_id` |
| Click progress bar | Same as "Show all" |
| Hover epic row | Highlight row, show action buttons |

### Empty States

**No Epics:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     📦 No epics found                                          │
│                                                                 │
│     Create an epic using: bd create --type=epic --title="..."  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Epic with No Children:**
```
▼ EPIC-004: Future Planning                                P3  ○
  Progress: N/A                                    Status: open
  └─ No child issues yet
```

---

## Filtering & Sorting

### Filters

| Filter | Options | Default |
|--------|---------|---------|
| Status | open, in_progress, blocked, closed | All except closed |
| Priority | P0, P1, P2, P3, P4 | All |
| Search | Text search in epic title/description | Empty |

### Sorting

| Sort Option | Description |
|-------------|-------------|
| Priority (default) | P0 first, then P1, etc. |
| Progress | Least complete first |
| Created Date | Newest first |
| Updated Date | Most recently updated first |
| Child Count | Most children first |

### Filter Persistence

Store filter state in localStorage (consistent with TableView):
- `beads-epics-filter-status`
- `beads-epics-filter-priority`
- `beads-epics-expanded` (array of expanded epic IDs)

---

## Technical Implementation

### New Files

```
src/client/components/
├── EpicsListView.tsx      # Main epics tab component
├── EpicRow.tsx            # Individual epic with expand/collapse
├── ChildIssueRow.tsx      # Child issue display
└── ProgressBar.tsx        # Reusable progress visualization
```

### Modified Files

```
src/client/App.tsx         # Add 'epics' tab
src/shared/types.ts        # Add parent_id field, EpicWithChildren type
```

### New Types

```typescript
// src/shared/types.ts

interface Issue {
  // ... existing fields
  parent_id?: string;
}

interface EpicWithChildren {
  epic: Issue;
  children: Issue[];
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
}
```

### Utility Functions

```typescript
// src/client/utils/epicCalculations.ts

/**
 * Group issues into epics with their children
 */
function groupIssuesByEpic(issues: Issue[]): EpicWithChildren[];

/**
 * Calculate completion percentage for an epic
 */
function calculateEpicProgress(children: Issue[]): {
  completed: number;
  total: number;
  percentage: number;
};

/**
 * Get children for a specific epic
 */
function getEpicChildren(epicId: string, issues: Issue[]): Issue[];
```

### Data Flow

```
App.tsx
├─ Fetches issues from /api/data
├─ Passes issues to EpicsListView
│
EpicsListView.tsx
├─ Filters to issue_type === 'epic'
├─ Groups children by parent_id
├─ Calculates progress for each epic
├─ Renders EpicRow for each epic
│
EpicRow.tsx
├─ Manages expand/collapse state
├─ Renders epic info + progress bar
├─ Maps children to ChildIssueRow
```

### API Changes

**No new endpoints required** - all data available from existing `/api/data`.

Optional future enhancement:
```
GET /api/epics
Response: EpicWithChildren[]
```

Pre-calculated on server to improve performance for large issue sets.

---

## Testing Requirements

### Unit Tests

```typescript
// tests/unit/epicCalculations.test.ts

describe('groupIssuesByEpic', () => {
  it('returns empty array when no epics exist');
  it('groups children under their parent epic');
  it('handles epics with no children');
  it('excludes tombstone issues from children');
  it('handles issues with no parent_id');
});

describe('calculateEpicProgress', () => {
  it('returns 0% for empty children array');
  it('returns 100% when all children closed');
  it('calculates correct percentage for mixed statuses');
  it('treats only "closed" status as complete');
});

describe('getEpicChildren', () => {
  it('returns children matching parent_id');
  it('returns empty array for epic with no children');
  it('excludes children with different parent_id');
});
```

### Component Tests

```typescript
// tests/unit/EpicsListView.test.tsx

describe('EpicsListView', () => {
  it('renders message when no epics exist');
  it('renders all epics');
  it('filters epics by status');
  it('filters epics by priority');
  it('searches epic titles');
  it('expands/collapses epic children');
  it('persists expanded state to localStorage');
});

describe('EpicRow', () => {
  it('displays epic title and ID');
  it('shows correct progress bar');
  it('toggles children visibility on click');
  it('limits visible children to 5');
  it('shows "Show all" link when more than 5 children');
});

describe('ProgressBar', () => {
  it('renders 0% progress correctly');
  it('renders 100% progress correctly');
  it('renders partial progress correctly');
  it('displays correct text');
});
```

---

## Acceptance Criteria

### Must Have (P0)

- [ ] New "Epics" tab visible in navigation
- [ ] Epics displayed with title, ID, status, priority
- [ ] Child issues shown under each epic (expandable)
- [ ] Progress bar showing completion percentage
- [ ] Progress text showing `completed/total`
- [ ] Status and priority filters functional
- [ ] Text search filters epic titles
- [ ] Clicking epic title opens description modal
- [ ] Empty state when no epics exist
- [ ] Unit tests for calculation functions

### Should Have (P1)

- [ ] Filter state persists to localStorage
- [ ] Expand/collapse state persists to localStorage
- [ ] Sorting options (priority, progress, date)
- [ ] "Show all children" navigation to filtered All Issues
- [ ] Child count truncation (5 max, "show more" link)
- [ ] Component tests for EpicsListView

### Nice to Have (P2)

- [ ] Quick status update on epic from list view
- [ ] Keyboard navigation (up/down, enter to expand)
- [ ] Bulk actions on epics
- [ ] Epic-specific metrics chart

---

## Open Questions

1. **Beads Schema:** Does `parent_id` exist in Beads core? If not, should we request it or use `dependencies` convention?

2. **Nested Epics:** Should we support epics containing other epics? (Recommendation: No for v1)

3. **Cross-Project Epics:** Can an epic in one project have children in another? (Recommendation: No, scope to single project)

4. **Status Transitions:** Should completing all children auto-close the epic? (Recommendation: No, explicit action required)

5. **Performance:** At what issue count should we move progress calculation to server? (Recommendation: Evaluate if >500 issues)

---

## Timeline Estimate

| Phase | Scope |
|-------|-------|
| Phase 1 | Data model, utility functions, unit tests |
| Phase 2 | EpicsListView component, basic rendering |
| Phase 3 | Expand/collapse, progress bar, filters |
| Phase 4 | Polish, localStorage persistence, component tests |

---

## References

- Existing feature requests: `beads-dashboard-3nl`, `beads-dashboard-c30`
- TableView implementation: `src/client/components/TableView.tsx`
- Beads documentation: https://steveyegge.github.io/beads/llms.txt
