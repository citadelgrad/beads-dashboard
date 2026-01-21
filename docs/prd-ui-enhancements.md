# PRD: Beads Dashboard UI Enhancements

**Status:** Draft
**Author:** Claude
**Created:** 2026-01-21
**Beads Epic:** beads-dashboard-fh6

---

## Overview

This feature set improves the user experience of the Beads Dashboard by enhancing ticket discovery, creation, and interaction patterns. The enhancements focus on streamlining common workflows: finding tickets quickly with autocomplete search, creating new tickets without leaving the dashboard, copying ticket IDs with visual feedback, adding quick actions to the list view, and displaying date information compactly across all views.

## Goals

1. **Improve ticket discovery** - Users should be able to quickly find any ticket by name or title with autocomplete suggestions
2. **Streamline ticket creation** - Users should be able to create new tickets directly from the dashboard without using the CLI
3. **Enable efficient ID sharing** - Users should be able to copy ticket IDs with a single click and receive visual confirmation
4. **Ensure UI consistency** - Quick actions should be available in all views that display tickets
5. **Surface date information** - Due dates and deferred dates should be visible without opening the modal

### Non-Goals

- Bulk operations on multiple tickets
- Advanced search filters (status, type, priority) in the autocomplete - existing column filters serve this purpose
- Modifying the Dashboard (metrics) view beyond date display on any embedded ticket lists
- Real-time collaboration features
- Full-featured keyboard navigation system (beyond search and create shortcuts)

## User Stories

**US-1: Autocomplete Search**
As a user, I want to search for tickets with autocomplete suggestions so that I can quickly find the ticket I'm looking for without scrolling through the list.

**US-2: Keyboard Search Shortcut**
As a power user, I want a keyboard shortcut (Cmd/Ctrl+K) to focus the search bar so that I can start searching without using my mouse.

**US-3: New Ticket Creation**
As a user, I want to create a new ticket from the dashboard so that I don't have to switch to the CLI for simple ticket creation.

**US-4: Keyboard Create Shortcut**
As a power user, I want a keyboard shortcut (Cmd/Ctrl+N) to open the new ticket modal so that I can quickly create tickets.

**US-5: Copy Ticket ID from Modal**
As a user, I want to click on a ticket ID in the modal to copy it to my clipboard so that I can easily share or reference it elsewhere.

**US-6: Copy Ticket ID from Any View**
As a user, I want to click on any ticket ID displayed in the list, board, or epic view to copy it to my clipboard.

**US-7: Copy Confirmation Animation**
As a user, I want visual feedback when I copy a ticket ID so that I know the copy action succeeded.

**US-8: List View Actions**
As a user, I want to see the same quick action buttons (Start Progress, Close) in the flat list view that I see in the epics view.

**US-9: Due Date Indicator**
As a user, I want to see when a ticket has a due date without opening the modal, with emphasis on overdue items.

**US-10: Deferred Date Indicator**
As a user, I want to see when a ticket is deferred until a future date so I understand why it's not ready.

## Functional Requirements

### FR-1: Enhanced Search with Autocomplete

**FR-1.1:** The search input shall be moved to a prominent position below the main navigation tabs.

**FR-1.2:** As the user types, the system shall display a dropdown of up to 10 matching tickets.

**FR-1.3:** Matching shall be performed on:
- Ticket ID (partial match)
- Ticket title (partial match, case-insensitive)

**FR-1.4:** Each autocomplete result shall display:
- Ticket ID (shortened format)
- Type icon
- Priority indicator
- Title (truncated if necessary)
- Status badge

**FR-1.5:** Pressing Enter shall open the first/highlighted result in the modal view.

**FR-1.6:** Pressing Escape shall close the autocomplete dropdown and clear focus.

**FR-1.7:** Clicking a result shall open that ticket in the modal view.

**FR-1.8:** The autocomplete shall filter in real-time (debounced by 150ms).

### FR-2: Keyboard Shortcuts

**FR-2.1:** Pressing Cmd+K (macOS) or Ctrl+K (Windows/Linux) shall focus the search input.

**FR-2.2:** Pressing Cmd+N (macOS) or Ctrl+N (Windows/Linux) shall open the new ticket modal.

**FR-2.3:** Shortcuts shall not trigger when typing in input fields or textareas.

**FR-2.4:** A visual hint showing available shortcuts shall appear near the search/create controls.

### FR-3: New Ticket Creation

**FR-3.1:** A "New Issue" button shall be displayed near the search input.

**FR-3.2:** Clicking the button shall open the IssueEditorModal in "create" mode.

**FR-3.3:** In create mode, the modal shall:
- Have a title placeholder "New Issue"
- Default to type "task", priority "Medium" (2), status "open"
- Show only essential fields initially (title, description, type, priority)
- Hide the ID field (will be generated)

**FR-3.4:** Saving shall call `POST /api/issues` to create the issue via `bd create`.

**FR-3.5:** After successful creation, the modal shall close and the view shall refresh.

### FR-4: Copy Ticket ID

**FR-4.1:** In the IssueEditorModal header, the ticket ID shall be clickable.

**FR-4.2:** Clicking the ID shall copy the full ticket ID to the clipboard.

**FR-4.3:** A copy animation shall play (e.g., checkmark icon, tooltip "Copied!").

**FR-4.4:** The animation shall persist for 2 seconds before reverting.

**FR-4.5:** All ticket IDs displayed in TableView, KanbanBoard, and Epics view shall be clickable to copy.

**FR-4.6:** Copy functionality shall work on both the short ID and provide the full ID in clipboard.

### FR-5: List View Actions

**FR-5.1:** The flat list view in TableView shall display action buttons matching the epics view.

**FR-5.2:** Actions shall include:
- "Start Progress" button (when status is not closed or in_progress)
- "Close" button (when status is not closed)

**FR-5.3:** Actions shall appear on hover, consistent with epics child items.

**FR-5.4:** Note: The flat list view already has these actions - this requirement ensures they remain visible and consistent.

### FR-6: Date Display

**FR-6.1:** When a ticket has a due date, a compact indicator shall be displayed.

**FR-6.2:** Due date format: Icon + relative date (e.g., "2d" for 2 days away, "-3d" for 3 days overdue).

**FR-6.3:** Overdue items shall have a red/warning color.

**FR-6.4:** Items due within 3 days shall have an orange/caution color.

**FR-6.5:** When a ticket has a defer date, a compact indicator shall be displayed.

**FR-6.6:** Defer date format: Icon + date (e.g., hourglass icon + "Jan 25").

**FR-6.7:** Date indicators shall be positioned near the title without disrupting the row layout.

**FR-6.8:** Date indicators shall be displayed in:
- TableView (flat list and epics view)
- KanbanBoard cards
- IssueEditorModal (already exists)

## Success Criteria

| Metric | Target |
|--------|--------|
| Search autocomplete response time | < 100ms |
| Time to find a specific ticket | Reduced by 50% vs scrolling |
| Ticket creation completion rate | > 90% (users who start, finish) |
| Copy ID success rate | 100% with visual confirmation |
| UI consistency score | Same actions available in all list views |

## Technical Constraints

- Must use existing `bd` CLI commands for all mutations (create, update)
- Must maintain real-time sync via Socket.IO
- Must work with existing JSONL data format
- Should minimize additional API endpoints
- Should use existing Lucide icons for consistency

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Autocomplete performance with large issue counts | Medium | Low | Implement client-side filtering with debounce; issues are loaded upfront |
| Browser clipboard API permissions | Low | Low | Use modern Clipboard API with fallback; most browsers support it |
| Keyboard shortcuts conflict with browser/OS | Medium | Medium | Use standard shortcuts (Cmd+K, Cmd+N); allow customization later |
| Modal create mode complexity | Medium | Medium | Reuse existing IssueEditorModal with conditional rendering |
| Date calculations for relative display | Low | Low | Use existing date utility patterns from age calculations |

## Dependencies

- Existing IssueEditorModal component infrastructure
- Existing API routes for issue updates
- New API endpoint for issue creation (`POST /api/issues`)
- Lucide React icons (already installed)

## Future Considerations

- Full keyboard navigation (j/k for up/down, o for open)
- Custom keyboard shortcut configuration
- Search history/recent tickets
- Bulk operations
- Saved search filters
