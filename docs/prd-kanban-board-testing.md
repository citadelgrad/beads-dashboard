# PRD: Kanban Board View Testing

## Overview

This document defines the testing requirements for the Kanban Board View feature in the Beads Performance Dashboard. The feature allows users to visualize and manage issues as cards organized into workflow status columns with drag-and-drop functionality.

## Feature Summary

| Attribute | Value |
|-----------|-------|
| Feature | Kanban Board View |
| Issue ID | beads-dashboard-hsj |
| Component | `src/client/components/KanbanBoard.tsx` |
| Test File | `tests/unit/kanbanBoard.test.tsx` |

## Test Scope

### In Scope
- Unit tests for helper functions
- Component rendering tests
- User interaction tests (drag-and-drop, click)
- API integration tests (status updates)
- Error handling and recovery
- Responsive layout behavior

### Out of Scope
- End-to-end browser automation tests
- Performance/load testing
- Accessibility audit (separate effort)

---

## Test Categories

### 1. Helper Function Tests

#### 1.1 `getAgeInDays(createdAt: string)`
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Same day | Today's date | 0 |
| One day ago | Yesterday | 1 |
| One week ago | 7 days prior | 7 |
| One month ago | 30 days prior | 30 |
| Future date | Tomorrow | -1 (or 0, verify behavior) |

#### 1.2 `getAgeBadgeColor(ageDays: number)`
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Fresh (< 7 days) | 0, 3, 6 | `bg-green-100 text-green-800` |
| Aging (7-29 days) | 7, 15, 29 | `bg-orange-100 text-orange-800` |
| Stale (30+ days) | 30, 60, 100 | `bg-red-100 text-red-800` |
| Boundary: 6 days | 6 | Green |
| Boundary: 7 days | 7 | Orange |
| Boundary: 29 days | 29 | Orange |
| Boundary: 30 days | 30 | Red |

#### 1.3 `getInitials(assignee: string | undefined)`
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Undefined | `undefined` | `?` |
| Empty string | `""` | `?` |
| Single name | `"Alice"` | `AL` |
| Two names | `"John Doe"` | `JD` |
| Three names | `"Mary Jane Watson"` | `MW` |
| With extra spaces | `"  Bob   Smith  "` | `BS` |

---

### 2. Column Configuration Tests

#### 2.1 COLUMNS constant
| Test Case | Expected |
|-----------|----------|
| Total columns | 6 |
| Column order | open → in_progress → blocked → closed → deferred → tombstone |
| Each column has required properties | status, label, bgColor, headerColor |

#### 2.2 PRIORITY_BORDER_COLORS constant
| Priority | Expected Color Class |
|----------|---------------------|
| 0 (Critical) | `border-l-red-500` |
| 1 (High) | `border-l-orange-500` |
| 2 (Medium) | `border-l-yellow-500` |
| 3 (Low) | `border-l-blue-500` |
| 4 (Lowest) | `border-l-gray-400` |

---

### 3. Component Rendering Tests

#### 3.1 KanbanBoard Component
| Test Case | Setup | Expected |
|-----------|-------|----------|
| Renders all 6 columns | Empty issues array | 6 column elements with correct test IDs |
| Columns have correct labels | Empty issues array | "Open", "In Progress", "Blocked", "Done", "Deferred", "Tombstone" |
| Empty columns show placeholder | No issues for status | "No issues" text displayed |
| Issues grouped by status | Mixed status issues | Each issue in correct column |

#### 3.2 KanbanCard Component
| Test Case | Setup | Expected |
|-----------|-------|----------|
| Displays title | Issue with title | Title text visible |
| Displays shortened ID | Issue with full ID | Last segment of ID shown |
| Displays priority border | P1 issue | Orange left border |
| Displays type icon | Bug issue | Bug icon rendered |
| Displays assignee initials | Assigned issue | Initials in avatar circle |
| Displays age badge | 5-day-old issue | "5d" with green background |
| Unassigned shows "?" | No assignee | "?" in avatar |

#### 3.3 Column Header
| Test Case | Setup | Expected |
|-----------|-------|----------|
| Shows status label | Any column | Label text in header |
| Shows issue count | 3 issues in column | "3" badge displayed |
| Count updates on change | Add/remove issue | Badge updates immediately |

---

### 4. Drag and Drop Tests

#### 4.1 Mouse Drag
| Test Case | Action | Expected |
|-----------|--------|----------|
| Drag start | Mouse down + move on card | Card becomes semi-transparent, cursor changes |
| Drag over column | Drag card over different column | Column highlights as drop target |
| Drop on valid column | Release on different status column | API called, card moves to new column |
| Drop on same column | Release on original column | No API call, no change |
| Drag cancel | Drag out of board area | Card returns to original position |

#### 4.2 Touch Drag (Mobile)
| Test Case | Action | Expected |
|-----------|--------|----------|
| Touch start | Touch and hold card | Drag initiated, ghost card appears |
| Touch move | Drag finger across screen | Ghost follows finger, columns highlight |
| Touch end on column | Release finger over column | Status updated |
| Touch cancel | Touch interrupted | Card returns to original |

#### 4.3 Optimistic Updates
| Test Case | Scenario | Expected |
|-----------|----------|----------|
| Immediate UI update | Drag card to new column | Card appears in new column before API responds |
| WIP count updates | Move card between columns | Source column count -1, target column count +1 |
| Success confirmation | API returns 200 | Card stays in new column |
| Failure revert | API returns error | Card reverts to original column, error shown |

---

### 5. API Integration Tests

#### 5.1 Status Update API
| Test Case | Request | Expected Response |
|-----------|---------|-------------------|
| Valid status change | POST `/api/issues/:id/status` with valid status | 200 OK |
| Invalid status | POST with unknown status | 400 Bad Request |
| Non-existent issue | POST to invalid ID | 404 Not Found |
| Server error | API unavailable | 500, UI shows error |

#### 5.2 Error Handling
| Test Case | Scenario | Expected UI Behavior |
|-----------|----------|---------------------|
| Network failure | fetch throws | Error banner displayed, card reverts |
| API error response | 4xx/5xx response | Error message shown, card reverts |
| Error dismissal | Click X on error | Error banner removed |

---

### 6. Modal/Detail View Tests

#### 6.1 Card Click Interaction
| Test Case | Action | Expected |
|-----------|--------|----------|
| Click opens modal | Click on card | Modal appears with issue details |
| Click during drag | Click while dragging | Modal does NOT open |
| Modal shows title | Open modal | Issue title in header |
| Modal shows ID | Open modal | Full issue ID displayed |
| Modal shows description | Issue has description | Markdown rendered |
| Empty description | No description | Placeholder text shown |

#### 6.2 Description Editing
| Test Case | Action | Expected |
|-----------|--------|----------|
| Edit button visible | Modal open, not editing | Edit icon shown |
| Click edit | Click edit button | Textarea appears with content |
| Cancel edit | Click cancel | Returns to view mode, no save |
| Save changes | Click save | API called, modal closes |
| Save error | API fails | Error alert, stays in edit mode |

---

### 7. Layout and Responsive Tests

#### 7.1 Desktop Layout (> 1024px)
| Test Case | Expected |
|-----------|----------|
| 4 columns visible | Open, In Progress, Blocked, Done visible without scroll |
| Column width | Each column ~25% of container |
| Horizontal scroll | Deferred and Tombstone accessible via scroll |
| Vertical scroll within column | Long card list scrollable, header stays fixed |

#### 7.2 Tablet Layout (768px - 1024px)
| Test Case | Expected |
|-----------|----------|
| Minimum 3 columns visible | At least 3 columns fit |
| Columns maintain min-width | Columns don't shrink below 200px |

#### 7.3 Mobile Layout (< 768px)
| Test Case | Expected |
|-----------|----------|
| Horizontal scroll enabled | Can scroll to see all columns |
| Touch drag works | Can drag cards on touch devices |
| Cards readable | Card content not truncated excessively |

---

### 8. State Persistence Tests

#### 8.1 View Preference
| Test Case | Action | Expected |
|-----------|--------|----------|
| Board view persists | Select Board tab, refresh page | Board tab still active |
| localStorage key | Check storage | `beads-dashboard-view` = `"board"` |
| Clear storage | Remove localStorage item | Defaults to previous behavior |

---

## Test Data Requirements

### Sample Issues for Testing
```typescript
const testIssues: Issue[] = [
  // Open issues (various ages)
  { id: 'test-001', title: 'Fresh issue', status: 'open', priority: 2, created_at: '2026-01-17', issue_type: 'task' },
  { id: 'test-002', title: 'Week old issue', status: 'open', priority: 1, created_at: '2026-01-11', issue_type: 'bug' },
  { id: 'test-003', title: 'Month old issue', status: 'open', priority: 0, created_at: '2025-12-18', issue_type: 'feature' },

  // In Progress
  { id: 'test-004', title: 'Active work', status: 'in_progress', priority: 1, created_at: '2026-01-15', issue_type: 'task', assignee: 'John Doe' },

  // Blocked
  { id: 'test-005', title: 'Blocked item', status: 'blocked', priority: 2, created_at: '2026-01-10', issue_type: 'task' },

  // Closed
  { id: 'test-006', title: 'Completed work', status: 'closed', priority: 3, created_at: '2026-01-01', issue_type: 'task' },

  // Edge cases
  { id: 'test-007', title: '', status: 'open', priority: 4, created_at: '2026-01-18', issue_type: 'task' }, // Empty title
  { id: 'test-008', title: 'Very long title that should be truncated with ellipsis when displayed', status: 'open', priority: 2, created_at: '2026-01-18', issue_type: 'epic' },
];
```

---

## Acceptance Criteria Verification

| Criteria | Test Coverage |
|----------|---------------|
| User can view all issues organized into columns by workflow status | Section 3.1 |
| User can drag a card from one column to another and the issue status updates | Section 4.1, 4.3, 5.1 |
| Cards display title, ID, priority, assignee, and color-coded age indicator | Section 3.2 |
| Board view persists as user preference when switching away and returning | Section 8.1 |
| Drag and drop works on both mouse and touch devices | Section 4.1, 4.2 |
| Column shows accurate count of cards and updates in real-time | Section 3.3, 4.3 |

---

## Test Execution

### Running Unit Tests
```bash
# Run all Kanban tests
npm test -- tests/unit/kanbanBoard.test.tsx

# Run with coverage
npm test:coverage -- tests/unit/kanbanBoard.test.tsx

# Run in watch mode
npm test -- --watch tests/unit/kanbanBoard.test.tsx
```

### Manual Testing Checklist

- [ ] Open Board tab, verify 4 columns visible
- [ ] Drag card from Open to In Progress
- [ ] Verify card appears in new column immediately
- [ ] Verify API call succeeds (check network tab)
- [ ] Drag card to Blocked, verify orange/red styling
- [ ] Click a card, verify modal opens with details
- [ ] Edit description, save, verify persists
- [ ] Refresh page, verify Board view still selected
- [ ] Test on mobile device or emulator
- [ ] Disconnect network, drag card, verify error + revert

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
| Product | | | |
