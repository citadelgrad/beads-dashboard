# PRD: Enhanced Issue Editor Modal

## Overview

Replace the current minimal description-only modal with a comprehensive issue editor that supports viewing and editing all Beads fields, organized into logical collapsible sections with appropriate input controls for each field type.

## Problem Statement

The current modal only displays:
- Issue title (read-only)
- Issue ID (read-only)
- Description (editable markdown)

Users cannot:
- Edit core fields like status, priority, or type without using the CLI
- View or manage metadata (assignee, labels, due date, etc.)
- Access documentation fields (design, acceptance criteria, notes)
- See relationship information (dependencies, parent)
- Manage date-based fields with a proper date picker

## Goals

1. Expose all Beads fields in a user-friendly editor interface
2. Provide appropriate input controls for each field type (dropdowns, date pickers, etc.)
3. Organize fields into logical, collapsible sections
4. Maintain good UX with sensible defaults (some sections collapsed)
5. Enable efficient editing without requiring CLI knowledge

## Non-Goals

- Creating new issues from the modal (use `bd create`)
- Bulk editing multiple issues
- Real-time collaboration features
- Custom field definitions
- Issue deletion from the modal (use `bd delete`)

---

## Data Model

### Complete Issue Schema

```typescript
interface Issue {
  // Core Fields
  id: string;                    // Read-only
  title: string;                 // Editable
  description?: string;          // Editable, markdown
  status: IssueStatus;           // Dropdown
  issue_type: IssueType;         // Dropdown
  priority: Priority;            // Dropdown (0-4)

  // Relationships
  dependencies?: IssueDependency[];  // Managed list
  parent?: string;               // Editable (issue ID)

  // Metadata
  assignee?: string;             // Text input
  labels?: string[];             // Tag input
  external_ref?: string;         // Text input
  estimate?: number;             // Number input (minutes)
  due?: string;                  // Date picker
  defer?: string;                // Date picker

  // Documentation Fields
  design?: string;               // Editable, markdown
  acceptance_criteria?: string;  // Editable, markdown
  notes?: string;                // Editable, markdown

  // Timestamps (Read-only)
  created_at: string;
  updated_at?: string;
  closed_at?: string;
  created_by?: string;
}
```

### Enum Values

**Status:**
`open`, `in_progress`, `blocked`, `closed`, `deferred`, `pinned`, `hooked`, `tombstone`

**Issue Type:**
`bug`, `feature`, `task`, `epic`, `chore`, `merge-request`, `molecule`, `gate`, `agent`, `role`, `rig`, `convoy`, `event`, `slot`

**Priority:**
- 0: Critical
- 1: High
- 2: Medium
- 3: Low
- 4: Lowest

---

## User Interface

### Modal Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  beads-dashboard-4sa                                              [X] Close  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Title ────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Configure log retention and alerting                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ Main Content (2/3 width)            │  │ Sidebar (1/3 width)            │ │
│  │                                     │  │                                │ │
│  │ Description ──────────────────────  │  │ ▼ Properties ────────────────  │ │
│  │ ┌─────────────────────────────────┐ │  │   Type:     [Task      ▼]     │ │
│  │ │ Set up retention policies and   │ │  │   Status:   [Open      ▼]     │ │
│  │ │ alerting rules for log          │ │  │   Priority: [Low       ▼]     │ │
│  │ │ monitoring.                     │ │  │   Assignee: [__________ ]     │ │
│  │ │                                 │ │  │   Parent:   [__________ ]     │ │
│  │ │ ## Retention                    │ │  │                                │ │
│  │ │ - Configure 30-day retention    │ │  │ ▼ Dates ─────────────────────  │ │
│  │ │ - Set up compaction schedule    │ │  │   Due:   [📅 Select date   ]  │ │
│  │ │                                 │ │  │   Defer: [📅 Select date   ]  │ │
│  │ │ ## Alerting                     │ │  │                                │ │
│  │ │ - Error rate threshold alerts   │ │  │ ▸ Metadata (collapsed) ─────  │ │
│  │ │                                 │ │  │                                │ │
│  │ │           [Edit ✏️]             │ │  │ ▸ Timestamps (collapsed) ────  │ │
│  │ └─────────────────────────────────┘ │  │                                │ │
│  │                                     │  │ ▼ Labels ────────────────────  │ │
│  │ ▸ Design (click to expand) ───────  │  │   [backend] [logging] [+]     │ │
│  │                                     │  │                                │ │
│  │ ▸ Acceptance Criteria ────────────  │  │ ▼ Dependencies ─────────────   │ │
│  │                                     │  │   Blocks:                      │ │
│  │ ▸ Notes ──────────────────────────  │  │   [beads-xyz] [×]             │ │
│  │                                     │  │   [+ Add blocker]              │ │
│  │                                     │  │                                │ │
│  │                                     │  │   Blocked by:                  │ │
│  │                                     │  │   [beads-abc] [×]             │ │
│  │                                     │  │   [+ Add dependency]           │ │
│  └─────────────────────────────────────┘  └────────────────────────────────┘ │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                              [Cancel]  [Save Changes]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Section Organization

#### Left Panel (Main Content - ~65% width)

| Section | Default State | Contents |
|---------|---------------|----------|
| Title | Always visible | Editable text input |
| Description | Expanded | Markdown editor/viewer with toggle |
| Design | Collapsed | Markdown editor/viewer (show "Add design..." if empty) |
| Acceptance Criteria | Collapsed | Markdown editor/viewer (show "Add acceptance criteria..." if empty) |
| Notes | Collapsed | Markdown editor/viewer (show "Add notes..." if empty) |

#### Right Panel (Sidebar - ~35% width)

| Section | Default State | Contents |
|---------|---------------|----------|
| Properties | Expanded | Type, Status, Priority dropdowns; Assignee, Parent inputs |
| Dates | Expanded | Due and Defer date pickers |
| Metadata | Collapsed | External ref, Estimate |
| Timestamps | Collapsed | Created at, Updated at, Closed at, Created by (all read-only) |
| Labels | Expanded | Tag input with add/remove |
| Dependencies | Expanded | Blocks list, Blocked by list, add/remove controls |

### Input Controls by Field Type

| Field Type | Control | Behavior |
|------------|---------|----------|
| `string` (short) | Text input | Immediate state update |
| `string` (markdown) | Textarea with preview | Toggle between edit/view, render markdown |
| `enum` | Dropdown select | Options from enum values |
| `int` (priority) | Dropdown | Show label (e.g., "High") with value |
| `int` (estimate) | Number input | Suffix with "minutes", convert display to hours if > 60 |
| `datetime` | Date picker | Calendar popup, clear button, ISO 8601 storage |
| `array` (labels) | Tag input | Add via text + enter, remove via × button |
| `array` (dependencies) | Issue list | Show issue title, remove button, add via ID input |

---

## Date Picker Requirements

### Functionality

- Calendar popup with month/year navigation
- Clear button to remove date
- Support for both date-only and datetime selection
- Keyboard navigation (arrow keys, enter, escape)
- Click outside to dismiss

### Display Format

- Input shows: `Jan 18, 2026` or `Jan 18, 2026 3:00 PM` (if time set)
- Storage format: ISO 8601 (`2026-01-18T15:00:00Z`)

### Implementation Options

**Option A (Recommended): react-datepicker**
- Mature, widely used library
- Customizable styling
- Good accessibility
- ~50KB gzipped

**Option B: Native HTML date input**
- No additional dependency
- Inconsistent browser styling
- Limited customization
- No time support on some browsers

**Option C: Custom implementation**
- Full control
- Significant development effort
- Must handle edge cases (timezones, leap years, etc.)

**Recommendation:** Use `react-datepicker` with Tailwind styling to match existing UI.

---

## Interaction Behaviors

### Section Expand/Collapse

| Action | Result |
|--------|--------|
| Click section header | Toggle expanded/collapsed |
| Chevron icon | Rotates 90° when collapsed, points down when expanded |
| Animation | Smooth height transition (200ms) |

### Markdown Fields

| Action | Result |
|--------|--------|
| Click "Edit" button | Switch to textarea editor |
| Click "Preview"/"Done" | Switch to rendered markdown view |
| Empty field | Show placeholder text (e.g., "Add design...") |
| Click placeholder | Enter edit mode |

### Dropdowns

| Action | Result |
|--------|--------|
| Click dropdown | Open options list |
| Select option | Update value, close dropdown |
| Click outside | Close without change |
| Keyboard | Arrow keys navigate, Enter selects |

### Labels

| Action | Result |
|--------|--------|
| Type in input + Enter | Add new label |
| Click × on label | Remove label |
| Duplicate label | Prevent addition, show brief feedback |

### Dependencies

| Action | Result |
|--------|--------|
| Enter issue ID + click Add | Add dependency link |
| Click × on dependency | Remove dependency link |
| Show issue title | Fetch from issues list, truncate if long |
| Invalid ID | Show error message |

### Save Behavior

| Trigger | Action |
|---------|--------|
| Click "Save Changes" | Validate all fields, call API, show success/error |
| Click "Cancel" | Discard changes, close modal |
| Click outside modal | Prompt if unsaved changes, else close |
| Escape key | Same as Cancel |

---

## API Changes

### Existing Endpoints

```
POST /api/issues/:id          # Update description (exists)
POST /api/issues/:id/status   # Update status (exists)
```

### New Endpoint Required

```
PATCH /api/issues/:id
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "status": "enum",
  "issue_type": "enum",
  "priority": 0-4,
  "assignee": "string",
  "labels": ["string"],
  "external_ref": "string",
  "estimate": number,
  "due": "ISO8601",
  "defer": "ISO8601",
  "parent": "string",
  "design": "string",
  "acceptance_criteria": "string",
  "notes": "string"
}

Response: { success: boolean, error?: string }
```

### Backend Implementation

The API should call appropriate `bd update` commands:
- `bd update <id> --title="..."`
- `bd update <id> --status=...`
- `bd update <id> --priority=...`
- `bd update <id> --assignee=...`
- `bd update <id> --due=...`
- `bd update <id> --defer=...`
- `bd update <id> --body-file=...` (for description)
- `bd label <id> add/remove <label>`
- `bd dep add/remove <id> <depends-on-id>`

For fields without direct CLI support, may need to update `.beads/issues.jsonl` directly.

---

## Technical Implementation

### New Files

```
src/client/components/
├── IssueEditorModal/
│   ├── index.tsx              # Main modal container
│   ├── TitleSection.tsx       # Title input
│   ├── MarkdownSection.tsx    # Reusable markdown editor/viewer
│   ├── PropertiesSection.tsx  # Type, Status, Priority, Assignee
│   ├── DatesSection.tsx       # Due, Defer date pickers
│   ├── MetadataSection.tsx    # External ref, Estimate
│   ├── TimestampsSection.tsx  # Read-only timestamps
│   ├── LabelsSection.tsx      # Label tag management
│   ├── DependenciesSection.tsx # Dependency management
│   ├── CollapsibleSection.tsx # Reusable collapsible wrapper
│   └── DatePicker.tsx         # Date picker component (or use library)
```

### Modified Files

```
src/shared/types.ts            # Extend Issue interface with all fields
src/server/routes/api.ts       # Add PATCH endpoint
src/client/components/KanbanBoard.tsx  # Replace simple modal with IssueEditorModal
src/client/components/TableView.tsx    # Replace simple modal with IssueEditorModal
```

### New Dependencies

```json
{
  "react-datepicker": "^6.x",
  "@types/react-datepicker": "^6.x"
}
```

### State Management

```typescript
interface IssueEditorState {
  // Form values (working copy)
  values: Partial<Issue>;

  // Track which fields have been modified
  dirtyFields: Set<keyof Issue>;

  // UI state
  expandedSections: Set<string>;
  editingField: string | null;

  // Async state
  saving: boolean;
  error: string | null;
}
```

### Data Flow

```
User opens modal
     │
     ▼
IssueEditorModal receives issue prop
     │
     ▼
Initialize state with issue values
     │
     ▼
User makes edits (updates local state)
     │
     ▼
User clicks "Save Changes"
     │
     ▼
Collect only dirty fields
     │
     ▼
PATCH /api/issues/:id with changes
     │
     ▼
On success: close modal, trigger refresh
On error: show error message, stay open
```

---

## Testing Requirements

### Unit Tests

```typescript
// tests/unit/IssueEditorModal.test.tsx

describe('IssueEditorModal', () => {
  it('renders all sections');
  it('initializes with issue values');
  it('tracks dirty fields on edit');
  it('calls onSave with only changed fields');
  it('shows unsaved changes warning on close');
});

describe('CollapsibleSection', () => {
  it('starts collapsed when defaultCollapsed=true');
  it('toggles on header click');
  it('animates expand/collapse');
});

describe('MarkdownSection', () => {
  it('renders markdown in view mode');
  it('shows textarea in edit mode');
  it('toggles between modes');
  it('shows placeholder when empty');
});

describe('DatePicker', () => {
  it('opens calendar on click');
  it('selects date and closes');
  it('clears date with clear button');
  it('formats display correctly');
  it('handles keyboard navigation');
});

describe('LabelsSection', () => {
  it('renders existing labels');
  it('adds new label on enter');
  it('removes label on × click');
  it('prevents duplicate labels');
});

describe('DependenciesSection', () => {
  it('renders blocks and blocked-by lists');
  it('adds dependency with valid ID');
  it('shows error for invalid ID');
  it('removes dependency on × click');
});
```

### Integration Tests

```typescript
describe('Issue Editor API Integration', () => {
  it('PATCH updates issue fields');
  it('handles validation errors');
  it('triggers bd sync after save');
});
```

---

## Acceptance Criteria

### Must Have (P0)

- [ ] Modal displays all core fields (title, description, status, type, priority)
- [ ] Dropdowns for status, type, and priority with correct enum values
- [ ] Title is editable with text input
- [ ] Description shows markdown preview with edit toggle
- [ ] Save button calls API and closes modal on success
- [ ] Cancel button discards changes
- [ ] Unsaved changes warning when closing with edits

### Should Have (P1)

- [ ] Date picker for `due` and `defer` fields
- [ ] Labels section with add/remove functionality
- [ ] Dependencies section showing blocks/blocked-by
- [ ] Metadata section (assignee, external_ref, estimate)
- [ ] Documentation fields (design, acceptance_criteria, notes) with collapse
- [ ] Timestamps section (read-only, collapsed by default)
- [ ] Collapsible sections with smooth animation
- [ ] Parent issue field

### Nice to Have (P2)

- [ ] Keyboard shortcuts (Cmd+S to save, Escape to close)
- [ ] Auto-save draft to localStorage
- [ ] Inline validation feedback
- [ ] Issue ID autocomplete for parent/dependencies
- [ ] Estimate input with hours/minutes toggle
- [ ] Recent labels suggestions

---

## Mockup Reference

The attached screenshot shows a similar editor layout for reference:
- Two-column layout (content + sidebar)
- Collapsible documentation sections
- Properties panel with dropdowns
- Labels with tags
- Dependencies with issue links

---

## Open Questions

1. **Date picker library:** Confirm `react-datepicker` is acceptable, or prefer native inputs?

2. **Field validation:** Should we validate fields client-side (e.g., estimate > 0) before saving?

3. **Dependency visualization:** Show dependency issue titles inline, or just IDs with tooltip?

4. **Estimate format:** Store as minutes and display as "2h 30m", or allow flexible input?

5. **Unsaved changes:** Use browser `beforeunload` event for full page navigation protection?

6. **Mobile layout:** Stack panels vertically on mobile, or simplify to essential fields only?

---

## Implementation Phases

| Phase | Scope |
|-------|-------|
| Phase 1 | Core structure: Modal layout, title, description, save/cancel |
| Phase 2 | Properties section: Type, status, priority dropdowns |
| Phase 3 | Date fields: Date picker component, due/defer integration |
| Phase 4 | Labels and dependencies: Tag input, dependency management |
| Phase 5 | Documentation fields: Collapsible markdown sections |
| Phase 6 | Metadata and timestamps: Remaining fields, read-only display |
| Phase 7 | Polish: Animations, keyboard nav, validation, tests |

---

## References

- Current modal: `src/client/components/KanbanBoard.tsx:538-613`
- Beads field reference: https://steveyegge.github.io/beads/llms.txt
- Existing PRD format: `docs/prd-epics-list-view.md`
