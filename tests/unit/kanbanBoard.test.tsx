import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KanbanBoard, {
  getAgeInDays,
  getAgeBadgeColor,
  getInitials,
  COLUMNS,
  PRIORITY_BORDER_COLORS,
} from '@/components/KanbanBoard';
import type { Issue, Priority } from '@shared/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create test issues
function createTestIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'test-project-abc123',
    title: 'Test Issue',
    description: 'Test description',
    status: 'open',
    issue_type: 'task',
    priority: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('KanbanBoard Helper Functions', () => {
  describe('getAgeInDays', () => {
    it('returns 0 for today', () => {
      const today = new Date().toISOString();
      expect(getAgeInDays(today)).toBe(0);
    });

    it('returns 1 for yesterday', () => {
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(getAgeInDays(yesterday)).toBe(1);
    });

    it('returns 7 for one week ago', () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(getAgeInDays(sevenDaysAgo)).toBe(7);
    });

    it('returns 30 for one month ago', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(getAgeInDays(thirtyDaysAgo)).toBe(30);
    });

    it('returns negative value for future date', () => {
      const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(getAgeInDays(tomorrow)).toBeLessThan(0);
    });
  });

  describe('getAgeBadgeColor', () => {
    it('returns green for age < 7 days', () => {
      expect(getAgeBadgeColor(0)).toBe('bg-green-100 text-green-800');
      expect(getAgeBadgeColor(6)).toBe('bg-green-100 text-green-800');
    });

    it('returns orange for 7 <= age < 30 days', () => {
      expect(getAgeBadgeColor(7)).toBe('bg-orange-100 text-orange-800');
      expect(getAgeBadgeColor(15)).toBe('bg-orange-100 text-orange-800');
      expect(getAgeBadgeColor(29)).toBe('bg-orange-100 text-orange-800');
    });

    it('returns red for age >= 30 days', () => {
      expect(getAgeBadgeColor(30)).toBe('bg-red-100 text-red-800');
      expect(getAgeBadgeColor(60)).toBe('bg-red-100 text-red-800');
      expect(getAgeBadgeColor(100)).toBe('bg-red-100 text-red-800');
    });
  });

  describe('getInitials', () => {
    it('returns ? for undefined', () => {
      expect(getInitials(undefined)).toBe('?');
    });

    it('returns ? for empty string', () => {
      expect(getInitials('')).toBe('?');
    });

    it('returns first two chars for single name', () => {
      expect(getInitials('Alice')).toBe('AL');
    });

    it('returns first and last initials for two names', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns first and last initials for three names', () => {
      expect(getInitials('Mary Jane Watson')).toBe('MW');
    });

    it('handles leading and trailing whitespace', () => {
      expect(getInitials('  Bob  ')).toBe('BO');
    });

    it('handles extra spaces between names', () => {
      expect(getInitials('  Bob   Smith  ')).toBe('BS');
    });
  });
});

describe('KanbanBoard Column Configuration', () => {
  it('has correct number of columns', () => {
    expect(COLUMNS).toHaveLength(6);
  });

  it('includes all required statuses', () => {
    const statuses = COLUMNS.map((col) => col.status);
    expect(statuses).toContain('open');
    expect(statuses).toContain('in_progress');
    expect(statuses).toContain('blocked');
    expect(statuses).toContain('closed');
    expect(statuses).toContain('deferred');
    expect(statuses).toContain('tombstone');
  });

  it('has correct column order', () => {
    expect(COLUMNS[0].status).toBe('open');
    expect(COLUMNS[1].status).toBe('in_progress');
    expect(COLUMNS[2].status).toBe('blocked');
    expect(COLUMNS[3].status).toBe('closed');
    expect(COLUMNS[4].status).toBe('deferred');
    expect(COLUMNS[5].status).toBe('tombstone');
  });

  it('maps labels correctly', () => {
    expect(COLUMNS[0].label).toBe('Open');
    expect(COLUMNS[1].label).toBe('In Progress');
    expect(COLUMNS[2].label).toBe('Blocked');
    expect(COLUMNS[3].label).toBe('Done');
    expect(COLUMNS[4].label).toBe('Deferred');
    expect(COLUMNS[5].label).toBe('Tombstone');
  });

  it('each column has all required properties', () => {
    COLUMNS.forEach((col) => {
      expect(col).toHaveProperty('status');
      expect(col).toHaveProperty('label');
      expect(col).toHaveProperty('bgColor');
      expect(col).toHaveProperty('headerColor');
      expect(typeof col.status).toBe('string');
      expect(typeof col.label).toBe('string');
      expect(typeof col.bgColor).toBe('string');
      expect(typeof col.headerColor).toBe('string');
    });
  });

  it('each column has valid Tailwind bg color classes', () => {
    COLUMNS.forEach((col) => {
      expect(col.bgColor).toMatch(/^bg-[a-z]+-\d+$/);
      expect(col.headerColor).toMatch(/^bg-[a-z]+-\d+$/);
    });
  });
});

describe('Priority Border Colors', () => {
  it('has correct colors for all priorities', () => {
    expect(PRIORITY_BORDER_COLORS[0]).toBe('border-l-red-500'); // Critical
    expect(PRIORITY_BORDER_COLORS[1]).toBe('border-l-orange-500'); // High
    expect(PRIORITY_BORDER_COLORS[2]).toBe('border-l-yellow-500'); // Medium
    expect(PRIORITY_BORDER_COLORS[3]).toBe('border-l-blue-500'); // Low
    expect(PRIORITY_BORDER_COLORS[4]).toBe('border-l-gray-400'); // Lowest
  });

  it('has all priority levels defined', () => {
    const priorities: Priority[] = [0, 1, 2, 3, 4];
    priorities.forEach((p) => {
      expect(PRIORITY_BORDER_COLORS[p]).toBeDefined();
    });
  });
});

describe('KanbanBoard Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all columns', () => {
    render(<KanbanBoard issues={[]} />);

    // Check all columns are rendered
    expect(screen.getByTestId('kanban-column-open')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-in_progress')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-blocked')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-closed')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-deferred')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-tombstone')).toBeInTheDocument();
  });

  it('shows column headers with correct labels', () => {
    render(<KanbanBoard issues={[]} />);

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Deferred')).toBeInTheDocument();
    expect(screen.getByText('Tombstone')).toBeInTheDocument();
  });

  it('groups issues correctly by status', () => {
    const issues: Issue[] = [
      createTestIssue({ id: 'test-1', title: 'Open Issue', status: 'open' }),
      createTestIssue({ id: 'test-2', title: 'In Progress Issue', status: 'in_progress' }),
      createTestIssue({ id: 'test-3', title: 'Closed Issue', status: 'closed' }),
    ];

    render(<KanbanBoard issues={issues} />);

    // Check cards are in correct columns
    const openColumn = screen.getByTestId('kanban-column-open');
    const inProgressColumn = screen.getByTestId('kanban-column-in_progress');
    const closedColumn = screen.getByTestId('kanban-column-closed');

    expect(openColumn).toHaveTextContent('Open Issue');
    expect(inProgressColumn).toHaveTextContent('In Progress Issue');
    expect(closedColumn).toHaveTextContent('Closed Issue');
  });

  it('displays empty state for columns with no issues', () => {
    render(<KanbanBoard issues={[]} />);

    // Each empty column should show "No issues"
    const emptyMessages = screen.getAllByText('No issues');
    expect(emptyMessages.length).toBe(6); // All 6 columns should be empty
  });

  it('displays correct WIP count in column headers', () => {
    const issues: Issue[] = [
      createTestIssue({ id: 'test-1', status: 'open' }),
      createTestIssue({ id: 'test-2', status: 'open' }),
      createTestIssue({ id: 'test-3', status: 'in_progress' }),
    ];

    render(<KanbanBoard issues={issues} />);

    // Open column should show 2, in_progress should show 1
    const openColumn = screen.getByTestId('kanban-column-open');
    const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

    expect(openColumn).toHaveTextContent('2');
    expect(inProgressColumn).toHaveTextContent('1');
  });

  describe('KanbanCard Display', () => {
    it('displays card title', () => {
      const issues = [createTestIssue({ id: 'test-1', title: 'My Test Issue' })];
      render(<KanbanBoard issues={issues} />);
      expect(screen.getByText('My Test Issue')).toBeInTheDocument();
    });

    it('displays shortened issue ID', () => {
      const issues = [createTestIssue({ id: 'test-project-abc123', title: 'Test' })];
      render(<KanbanBoard issues={issues} />);
      expect(screen.getByText('abc123')).toBeInTheDocument();
    });

    it('displays priority border color based on priority level', () => {
      // Test P0 (Critical) - red border
      const issuesP0 = [createTestIssue({ id: 'test-p0', priority: 0, title: 'Critical' })];
      const { container: containerP0 } = render(<KanbanBoard issues={issuesP0} />);
      const cardP0 = containerP0.querySelector('[data-testid="kanban-card-test-p0"]');
      expect(cardP0).toHaveClass('border-l-red-500');
    });

    it('displays priority border for high priority', () => {
      const issues = [createTestIssue({ id: 'test-p1', priority: 1, title: 'High' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const card = container.querySelector('[data-testid="kanban-card-test-p1"]');
      expect(card).toHaveClass('border-l-orange-500');
    });

    it('displays priority border for medium priority', () => {
      const issues = [createTestIssue({ id: 'test-p2', priority: 2, title: 'Medium' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const card = container.querySelector('[data-testid="kanban-card-test-p2"]');
      expect(card).toHaveClass('border-l-yellow-500');
    });

    it('displays priority border for low priority', () => {
      const issues = [createTestIssue({ id: 'test-p3', priority: 3, title: 'Low' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const card = container.querySelector('[data-testid="kanban-card-test-p3"]');
      expect(card).toHaveClass('border-l-blue-500');
    });

    it('displays priority border for lowest priority', () => {
      const issues = [createTestIssue({ id: 'test-p4', priority: 4, title: 'Lowest' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const card = container.querySelector('[data-testid="kanban-card-test-p4"]');
      expect(card).toHaveClass('border-l-gray-400');
    });

    it('renders type icon for bug issues', () => {
      const issues = [createTestIssue({ id: 'test-bug', issue_type: 'bug', title: 'Bug Issue' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      // Bug icon should be rendered (SVG element with lucide class)
      const card = container.querySelector('[data-testid="kanban-card-test-bug"]');
      const svgIcon = card?.querySelector('svg.lucide-bug');
      expect(svgIcon).toBeInTheDocument();
    });

    it('renders type icon for feature issues', () => {
      const issues = [createTestIssue({ id: 'test-feat', issue_type: 'feature', title: 'Feature' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const card = container.querySelector('[data-testid="kanban-card-test-feat"]');
      const svgIcon = card?.querySelector('svg.lucide-box');
      expect(svgIcon).toBeInTheDocument();
    });

    it('renders type icon for epic issues', () => {
      const issues = [createTestIssue({ id: 'test-epic', issue_type: 'epic', title: 'Epic' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const card = container.querySelector('[data-testid="kanban-card-test-epic"]');
      const svgIcon = card?.querySelector('svg.lucide-boxes');
      expect(svgIcon).toBeInTheDocument();
    });

    it('renders type icon for task issues', () => {
      const issues = [createTestIssue({ id: 'test-task', issue_type: 'task', title: 'Task' })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const card = container.querySelector('[data-testid="kanban-card-test-task"]');
      const svgIcon = card?.querySelector('svg.lucide-list-check');
      expect(svgIcon).toBeInTheDocument();
    });

    it('displays age badge', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const issues = [createTestIssue({ id: 'test-1', created_at: threeDaysAgo })];
      render(<KanbanBoard issues={issues} />);
      expect(screen.getByText('3d')).toBeInTheDocument();
    });

    it('displays age badge with correct color for fresh issues', () => {
      const today = new Date().toISOString();
      const issues = [createTestIssue({ id: 'test-fresh', created_at: today })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const ageBadge = container.querySelector('.bg-green-100.text-green-800');
      expect(ageBadge).toBeInTheDocument();
      expect(ageBadge).toHaveTextContent('0d');
    });

    it('displays age badge with orange color for aging issues', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const issues = [createTestIssue({ id: 'test-aging', created_at: tenDaysAgo })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const ageBadge = container.querySelector('.bg-orange-100.text-orange-800');
      expect(ageBadge).toBeInTheDocument();
      expect(ageBadge).toHaveTextContent('10d');
    });

    it('displays age badge with red color for stale issues', () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      const issues = [createTestIssue({ id: 'test-stale', created_at: fortyDaysAgo })];
      const { container } = render(<KanbanBoard issues={issues} />);
      const ageBadge = container.querySelector('.bg-red-100.text-red-800');
      expect(ageBadge).toBeInTheDocument();
      expect(ageBadge).toHaveTextContent('40d');
    });

    it('displays assignee initials when assigned', () => {
      const issues = [createTestIssue({ id: 'test-1', assignee: 'John Doe' })];
      render(<KanbanBoard issues={issues} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('displays ? for unassigned issues', () => {
      const issues = [createTestIssue({ id: 'test-1', assignee: undefined })];
      render(<KanbanBoard issues={issues} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('shows Untitled for issues without title', () => {
      const issues = [createTestIssue({ id: 'test-1', title: '' })];
      render(<KanbanBoard issues={issues} />);
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('truncates long titles with line-clamp', () => {
      const longTitle = 'Very long title that should be truncated with ellipsis when displayed in the kanban card';
      const issues = [createTestIssue({ id: 'test-long', title: longTitle })];
      render(<KanbanBoard issues={issues} />);
      // The title should still be in the document
      expect(screen.getByText(longTitle)).toBeInTheDocument();
      // The title element should have the line-clamp class
      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toHaveClass('line-clamp-2');
    });
  });

  describe('Drag and Drop', () => {
    describe('Mouse Drag', () => {
      it('triggers status update API on drag', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        const issues = [createTestIssue({ id: 'test-drag-1', status: 'open', title: 'Drag Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-drag-1');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

        // Simulate drag start
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Simulate drag over
        fireEvent.dragOver(inProgressColumn, {
          preventDefault: vi.fn(),
          dataTransfer: { dropEffect: 'move' },
        });

        // Simulate drop
        fireEvent.drop(inProgressColumn);

        // Wait for API call
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/issues/test-drag-1/status',
            expect.objectContaining({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'in_progress' }),
            })
          );
        });
      });

      it('card becomes semi-transparent during drag', () => {
        const issues = [createTestIssue({ id: 'test-opacity', status: 'open', title: 'Opacity Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-opacity');

        // Before drag, card should not have opacity class
        expect(card).not.toHaveClass('opacity-50');

        // Start drag
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // During drag, card should have opacity class
        expect(card).toHaveClass('opacity-50');
        expect(card).toHaveClass('scale-95');
      });

      it('column highlights as drop target during drag over', () => {
        const issues = [createTestIssue({ id: 'test-highlight', status: 'open', title: 'Highlight Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-highlight');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

        // Start drag
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Before drag over, column should not have highlight
        expect(inProgressColumn).not.toHaveClass('border-blue-400');

        // Drag over the column
        fireEvent.dragOver(inProgressColumn, {
          preventDefault: vi.fn(),
          dataTransfer: { dropEffect: 'move' },
        });

        // Column should now have highlight border
        expect(inProgressColumn).toHaveClass('border-blue-400');
        expect(inProgressColumn).toHaveClass('border-2');
      });

      it('drag end resets dragging state', () => {
        const issues = [createTestIssue({ id: 'test-end', status: 'open', title: 'End Test' })];
        const { container } = render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-end');
        const board = container.firstChild as HTMLElement;

        // Start drag
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Card should be dragging
        expect(card).toHaveClass('opacity-50');

        // Fire drag end on the board
        fireEvent.dragEnd(board);

        // Card should no longer be dragging
        expect(card).not.toHaveClass('opacity-50');
      });
    });

    describe('Touch Drag', () => {
      it('initiates drag on touch start', () => {
        const issues = [createTestIssue({ id: 'test-touch', status: 'open', title: 'Touch Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-touch');

        // Before touch, card should not be dragging
        expect(card).not.toHaveClass('opacity-50');

        // Simulate touch start
        fireEvent.touchStart(card, {
          touches: [{ clientX: 100, clientY: 100 }],
        });

        // Card should now be in dragging state
        expect(card).toHaveClass('opacity-50');
      });

      it('handles touch move over columns', () => {
        const issues = [createTestIssue({ id: 'test-touch-move', status: 'open', title: 'Touch Move' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-touch-move');

        // Start touch drag
        fireEvent.touchStart(card, {
          touches: [{ clientX: 100, clientY: 100 }],
        });

        // The touch move is handled by document event listeners
        // This test verifies the touch start sets up the drag state
        expect(card).toHaveClass('opacity-50');
      });
    });

    describe('Optimistic Updates', () => {
      it('performs optimistic update on drag', async () => {
        // Mock a delayed API response
        mockFetch.mockImplementation(() => new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, json: async () => ({ success: true }) });
          }, 100);
        }));

        const issues = [createTestIssue({ id: 'test-opt-1', status: 'open', title: 'Optimistic Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-opt-1');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

        // Simulate drag start
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Simulate drop
        fireEvent.drop(inProgressColumn);

        // Card should immediately appear in new column (optimistic update)
        await waitFor(() => {
          expect(inProgressColumn).toHaveTextContent('Optimistic Test');
        });
      });

      it('reverts optimistic update on API error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Failed to update' }),
        });

        const issues = [createTestIssue({ id: 'test-revert-1', status: 'open', title: 'Revert Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-revert-1');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');
        const openColumn = screen.getByTestId('kanban-column-open');

        // Simulate drag start
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Simulate drop
        fireEvent.drop(inProgressColumn);

        // Wait for API error and revert
        await waitFor(() => {
          expect(openColumn).toHaveTextContent('Revert Test');
        });

        // Error message should be displayed
        await waitFor(() => {
          expect(screen.getByText(/Failed to update/)).toBeInTheDocument();
        });
      });

      it('does not call API when dropping on same column', async () => {
        const issues = [createTestIssue({ id: 'test-same-1', status: 'open', title: 'Same Column Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-same-1');
        const openColumn = screen.getByTestId('kanban-column-open');

        // Simulate drag start
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Simulate drop on same column
        fireEvent.drop(openColumn);

        // API should not be called
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('WIP Count Updates', () => {
    it('updates WIP count optimistically during drag', async () => {
      mockFetch.mockImplementation(() => new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ok: true, json: async () => ({ success: true }) });
        }, 100);
      }));

      const issues = [
        createTestIssue({ id: 'test-wip-1', status: 'open', title: 'WIP Test 1' }),
        createTestIssue({ id: 'test-wip-2', status: 'open', title: 'WIP Test 2' }),
      ];
      render(<KanbanBoard issues={issues} />);

      const openColumn = screen.getByTestId('kanban-column-open');
      const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

      // Initially open has 2, in_progress has 0
      expect(openColumn).toHaveTextContent('2');
      expect(inProgressColumn).toHaveTextContent('0');

      const card = screen.getByTestId('kanban-card-test-wip-1');

      // Simulate drag and drop
      fireEvent.dragStart(card, {
        dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
      });
      fireEvent.drop(inProgressColumn);

      // After optimistic update: open has 1, in_progress has 1
      await waitFor(() => {
        expect(openColumn).toHaveTextContent('1');
        expect(inProgressColumn).toHaveTextContent('1');
      });
    });
  });

  describe('API Integration', () => {
    describe('Status Update API', () => {
      it('sends correct request format for status update', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        const issues = [createTestIssue({ id: 'test-api-1', status: 'open', title: 'API Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-api-1');
        const blockedColumn = screen.getByTestId('kanban-column-blocked');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(blockedColumn);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/issues/test-api-1/status',
            expect.objectContaining({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'blocked' }),
            })
          );
        });
      });

      it('handles 400 Bad Request response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Invalid status value' }),
        });

        const issues = [createTestIssue({ id: 'test-400', status: 'open', title: '400 Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-400');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(inProgressColumn);

        await waitFor(() => {
          expect(screen.getByText(/Invalid status value/)).toBeInTheDocument();
        });
      });

      it('handles 500 Server Error response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Internal server error' }),
        });

        const issues = [createTestIssue({ id: 'test-500', status: 'open', title: '500 Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-500');
        const closedColumn = screen.getByTestId('kanban-column-closed');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(closedColumn);

        await waitFor(() => {
          expect(screen.getByText(/Internal server error/)).toBeInTheDocument();
        });
      });
    });

    describe('Error Handling', () => {
      it('handles network failure gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const issues = [createTestIssue({ id: 'test-network', status: 'open', title: 'Network Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-network');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');
        const openColumn = screen.getByTestId('kanban-column-open');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(inProgressColumn);

        // Card should revert to original column
        await waitFor(() => {
          expect(openColumn).toHaveTextContent('Network Test');
        });

        // Error message should be displayed
        await waitFor(() => {
          expect(screen.getByText(/Network error/)).toBeInTheDocument();
        });
      });

      it('allows error dismissal by clicking X', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Dismissable error' }),
        });

        const issues = [createTestIssue({ id: 'test-dismiss', status: 'open', title: 'Dismiss Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-dismiss');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(inProgressColumn);

        // Wait for error to appear
        await waitFor(() => {
          expect(screen.getByText(/Dismissable error/)).toBeInTheDocument();
        });

        // Find and click the dismiss button (X icon)
        const errorBanner = screen.getByText(/Dismissable error/).closest('div');
        const dismissButton = errorBanner?.querySelector('button');
        expect(dismissButton).toBeInTheDocument();

        fireEvent.click(dismissButton!);

        // Error should be removed
        await waitFor(() => {
          expect(screen.queryByText(/Dismissable error/)).not.toBeInTheDocument();
        });
      });

      it('shows updating indicator during API call', async () => {
        // Create a promise that we can control
        let resolvePromise: (value: unknown) => void;
        mockFetch.mockImplementation(() => new Promise((resolve) => {
          resolvePromise = resolve;
        }));

        const issues = [createTestIssue({ id: 'test-indicator', status: 'open', title: 'Indicator Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-indicator');
        const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(inProgressColumn);

        // Updating indicator should appear
        await waitFor(() => {
          expect(screen.getByText('Updating issue status...')).toBeInTheDocument();
        });

        // Resolve the promise
        resolvePromise!({ ok: true, json: async () => ({ success: true }) });

        // Updating indicator should disappear
        await waitFor(() => {
          expect(screen.queryByText('Updating issue status...')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Card Click to Open Details', () => {
    it('opens description modal on card click', async () => {
      const issues = [createTestIssue({
        id: 'test-click-1',
        title: 'Clickable Issue',
        description: 'Test description content'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-click-1');
      fireEvent.click(card);

      // Modal should open with issue details - there will be two titles (card + modal)
      await waitFor(() => {
        const titles = screen.getAllByText('Clickable Issue');
        expect(titles).toHaveLength(2); // One in card, one in modal header
        expect(screen.getByText('test-click-1')).toBeInTheDocument();
      });
    });

    it('does not open modal when clicking during drag', () => {
      const issues = [createTestIssue({
        id: 'test-drag-click',
        title: 'Drag Click Test',
        description: 'Test description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-drag-click');

      // Start dragging
      fireEvent.dragStart(card, {
        dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
      });

      // Try to click while dragging - modal should not open
      fireEvent.click(card);

      // Modal should NOT be visible (only one title in card)
      const titles = screen.getAllByText('Drag Click Test');
      expect(titles).toHaveLength(1); // Only the card title, no modal
    });

    it('displays full issue ID in modal', async () => {
      const issues = [createTestIssue({
        id: 'full-project-id-abc123',
        title: 'Full ID Test',
        description: 'Test'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-full-project-id-abc123');
      fireEvent.click(card);

      await waitFor(() => {
        // Full ID should be shown in modal
        expect(screen.getByText('full-project-id-abc123')).toBeInTheDocument();
      });
    });

    it('renders markdown description in modal', async () => {
      const issues = [createTestIssue({
        id: 'test-md',
        title: 'Markdown Test',
        description: '# Heading\n\n- List item\n- Another item'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-md');
      fireEvent.click(card);

      await waitFor(() => {
        // Look for rendered markdown (h1 becomes visible)
        const modalContent = screen.getByText('Heading');
        expect(modalContent).toBeInTheDocument();
        expect(modalContent.tagName).toBe('H1');
      });
    });

    it('shows placeholder for empty description', async () => {
      const issues = [createTestIssue({
        id: 'test-empty-desc',
        title: 'Empty Description',
        description: ''
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-empty-desc');
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByText('No description provided for this issue.')).toBeInTheDocument();
      });
    });

    it('shows placeholder for undefined description', async () => {
      const issues = [createTestIssue({
        id: 'test-no-desc',
        title: 'No Description',
        description: undefined
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-no-desc');
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByText('No description provided for this issue.')).toBeInTheDocument();
      });
    });

    it('closes modal on Close button click', async () => {
      const issues = [createTestIssue({
        id: 'test-close-modal',
        title: 'Close Modal Test',
        description: 'Test'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-close-modal');
      fireEvent.click(card);

      // Modal opens
      await waitFor(() => {
        expect(screen.getAllByText('Close Modal Test')).toHaveLength(2);
      });

      // Click close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.getAllByText('Close Modal Test')).toHaveLength(1);
      });
    });

    it('closes modal on X button click', async () => {
      const issues = [createTestIssue({
        id: 'test-x-close',
        title: 'X Close Test',
        description: 'Test'
      })];
      const { container } = render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-x-close');
      fireEvent.click(card);

      // Modal opens
      await waitFor(() => {
        expect(screen.getAllByText('X Close Test')).toHaveLength(2);
      });

      // Find X button (the one in the header with X icon)
      const modal = container.querySelector('.fixed.inset-0');
      const xButton = modal?.querySelector('button svg.lucide-x')?.parentElement;
      expect(xButton).toBeInTheDocument();
      fireEvent.click(xButton!);

      // Modal should close
      await waitFor(() => {
        expect(screen.getAllByText('X Close Test')).toHaveLength(1);
      });
    });
  });

  describe('Description Editing', () => {
    it('shows edit button in modal when not editing', async () => {
      const issues = [createTestIssue({
        id: 'test-edit-btn',
        title: 'Edit Button Test',
        description: 'Existing description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-edit-btn');
      fireEvent.click(card);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getAllByText('Edit Button Test')).toHaveLength(2);
      });

      // Edit button should be visible (has title="Edit Description")
      const editButton = screen.getByTitle('Edit Description');
      expect(editButton).toBeInTheDocument();
    });

    it('switches to edit mode when edit button is clicked', async () => {
      const issues = [createTestIssue({
        id: 'test-edit-mode',
        title: 'Edit Mode Test',
        description: 'Original description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-edit-mode');
      fireEvent.click(card);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getAllByText('Edit Mode Test')).toHaveLength(2);
      });

      // Click edit button
      const editButton = screen.getByTitle('Edit Description');
      fireEvent.click(editButton);

      // Textarea should appear with the description
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Enter issue description...');
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveValue('Original description');
      });
    });

    it('cancels edit and returns to view mode', async () => {
      const issues = [createTestIssue({
        id: 'test-cancel-edit',
        title: 'Cancel Edit Test',
        description: 'Original description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-cancel-edit');
      fireEvent.click(card);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getAllByText('Cancel Edit Test')).toHaveLength(2);
      });

      // Click edit button
      const editButton = screen.getByTitle('Edit Description');
      fireEvent.click(editButton);

      // Should be in edit mode
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter issue description...')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should return to view mode
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Enter issue description...')).not.toBeInTheDocument();
      });
    });

    it('saves changes and calls API when save is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const issues = [createTestIssue({
        id: 'test-save-edit',
        title: 'Save Edit Test',
        description: 'Original description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-save-edit');
      fireEvent.click(card);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getAllByText('Save Edit Test')).toHaveLength(2);
      });

      // Click edit button
      const editButton = screen.getByTitle('Edit Description');
      fireEvent.click(editButton);

      // Change the description
      const textarea = await screen.findByPlaceholderText('Enter issue description...');
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // API should be called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/issues/test-save-edit',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: 'Updated description' }),
          })
        );
      });

      // Modal should close after save
      await waitFor(() => {
        expect(screen.getAllByText('Save Edit Test')).toHaveLength(1);
      });
    });

    it('shows error and stays in edit mode on save failure', async () => {
      // Mock window.alert
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      });

      const issues = [createTestIssue({
        id: 'test-save-error',
        title: 'Save Error Test',
        description: 'Original description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-save-error');
      fireEvent.click(card);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getAllByText('Save Error Test')).toHaveLength(2);
      });

      // Click edit button
      const editButton = screen.getByTitle('Edit Description');
      fireEvent.click(editButton);

      // Change the description
      const textarea = await screen.findByPlaceholderText('Enter issue description...');
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should show alert and stay in edit mode
      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Failed to save description');
        expect(screen.getByPlaceholderText('Enter issue description...')).toBeInTheDocument();
      });

      alertMock.mockRestore();
    });

    it('shows Saving... text while save is in progress', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockImplementation(() => new Promise((resolve) => {
        resolvePromise = resolve;
      }));

      const issues = [createTestIssue({
        id: 'test-saving',
        title: 'Saving Test',
        description: 'Original description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-saving');
      fireEvent.click(card);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getAllByText('Saving Test')).toHaveLength(2);
      });

      // Click edit button
      const editButton = screen.getByTitle('Edit Description');
      fireEvent.click(editButton);

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should show "Saving..."
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!({ ok: true, json: async () => ({ success: true }) });

      // Modal should close
      await waitFor(() => {
        expect(screen.getAllByText('Saving Test')).toHaveLength(1);
      });
    });
  });

  describe('Layout and Responsive', () => {
    it('renders 6 columns with correct structure', () => {
      render(<KanbanBoard issues={[]} />);

      // Verify all 6 columns are rendered
      const columns = [
        screen.getByTestId('kanban-column-open'),
        screen.getByTestId('kanban-column-in_progress'),
        screen.getByTestId('kanban-column-blocked'),
        screen.getByTestId('kanban-column-closed'),
        screen.getByTestId('kanban-column-deferred'),
        screen.getByTestId('kanban-column-tombstone'),
      ];

      expect(columns).toHaveLength(6);
    });

    it('columns have min-width class for responsive behavior', () => {
      render(<KanbanBoard issues={[]} />);

      const openColumn = screen.getByTestId('kanban-column-open');
      // Columns should have min-width to prevent shrinking too small
      expect(openColumn).toHaveClass('min-w-[200px]');
    });

    it('columns have flex-shrink-0 to maintain size', () => {
      render(<KanbanBoard issues={[]} />);

      const openColumn = screen.getByTestId('kanban-column-open');
      expect(openColumn).toHaveClass('flex-shrink-0');
    });

    it('board container has horizontal overflow for scrolling', () => {
      const { container } = render(<KanbanBoard issues={[]} />);

      // The flex container with columns should have overflow-x-auto
      const flexContainer = container.querySelector('.flex.gap-4.overflow-x-auto');
      expect(flexContainer).toBeInTheDocument();
    });

    it('board has minimum height for consistent layout', () => {
      const { container } = render(<KanbanBoard issues={[]} />);

      const flexContainer = container.querySelector('.flex.gap-4.overflow-x-auto');
      expect(flexContainer).toHaveStyle({ minHeight: '600px' });
    });

    it('columns have vertical overflow for card scrolling', () => {
      render(<KanbanBoard issues={[]} />);

      const openColumn = screen.getByTestId('kanban-column-open');
      // The cards container within the column should have overflow-y-auto
      const cardsContainer = openColumn.querySelector('.overflow-y-auto');
      expect(cardsContainer).toBeInTheDocument();
    });

    it('column headers are sticky for visibility while scrolling', () => {
      render(<KanbanBoard issues={[]} />);

      const openColumn = screen.getByTestId('kanban-column-open');
      const header = openColumn.querySelector('.sticky.top-0');
      expect(header).toBeInTheDocument();
    });

    it('columns have correct width calculation for 4-column desktop layout', () => {
      render(<KanbanBoard issues={[]} />);

      const openColumn = screen.getByTestId('kanban-column-open');
      // Width is calc(25% - 12px) for 4 columns with gap
      expect(openColumn).toHaveClass('w-[calc(25%-12px)]');
    });

    it('cards container has minimum height', () => {
      render(<KanbanBoard issues={[]} />);

      const openColumn = screen.getByTestId('kanban-column-open');
      const cardsContainer = openColumn.querySelector('.min-h-\\[200px\\]');
      expect(cardsContainer).toBeInTheDocument();
    });

    it('all 6 columns are in the DOM and accessible via scroll', () => {
      render(<KanbanBoard issues={[]} />);

      // All columns should be present in DOM (5th and 6th accessible via scroll)
      expect(screen.getByTestId('kanban-column-open')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-in_progress')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-blocked')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-closed')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-deferred')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-tombstone')).toBeInTheDocument();
    });

    it('cards have proper styling for readability', () => {
      const issues = [createTestIssue({ id: 'test-readable', title: 'Readable Card' })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-readable');
      // Card should have padding and proper border
      expect(card).toHaveClass('p-3');
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('shadow-sm');
    });

    it('card titles have line-clamp for text overflow', () => {
      const issues = [createTestIssue({ id: 'test-clamp', title: 'Test Title' })];
      render(<KanbanBoard issues={issues} />);

      const title = screen.getByText('Test Title');
      expect(title).toHaveClass('line-clamp-2');
    });
  });

  describe('State and Props', () => {
    it('syncs internal state with issues prop changes', async () => {
      const initialIssues = [createTestIssue({ id: 'test-sync-1', status: 'open', title: 'Initial' })];
      const { rerender } = render(<KanbanBoard issues={initialIssues} />);

      // Initial state
      const openColumn = screen.getByTestId('kanban-column-open');
      expect(openColumn).toHaveTextContent('Initial');
      expect(openColumn).toHaveTextContent('1');

      // Update props with new issues
      const updatedIssues = [
        createTestIssue({ id: 'test-sync-1', status: 'in_progress', title: 'Updated' }),
        createTestIssue({ id: 'test-sync-2', status: 'open', title: 'New Issue' }),
      ];
      rerender(<KanbanBoard issues={updatedIssues} />);

      // State should be synchronized
      const inProgressColumn = screen.getByTestId('kanban-column-in_progress');
      expect(inProgressColumn).toHaveTextContent('Updated');
      expect(openColumn).toHaveTextContent('New Issue');
    });

    it('maintains optimistic updates until props change', async () => {
      mockFetch.mockImplementation(() => new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ok: true, json: async () => ({ success: true }) });
        }, 500);
      }));

      const issues = [createTestIssue({ id: 'test-opt-persist', status: 'open', title: 'Persist Test' })];
      const { rerender } = render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-opt-persist');
      const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

      // Drag card
      fireEvent.dragStart(card, {
        dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
      });
      fireEvent.drop(inProgressColumn);

      // Optimistic update should show card in new column
      await waitFor(() => {
        expect(inProgressColumn).toHaveTextContent('Persist Test');
      });

      // Before API resolves, rerender with original props
      // This simulates the real-time refresh from socket
      const updatedIssues = [createTestIssue({ id: 'test-opt-persist', status: 'in_progress', title: 'Persist Test' })];
      rerender(<KanbanBoard issues={updatedIssues} />);

      // Card should still be in new column
      expect(inProgressColumn).toHaveTextContent('Persist Test');
    });

    it('handles empty issues array', () => {
      render(<KanbanBoard issues={[]} />);

      // All columns should show "No issues"
      COLUMNS.forEach((col) => {
        const column = screen.getByTestId(`kanban-column-${col.status}`);
        expect(column).toHaveTextContent('No issues');
        expect(column).toHaveTextContent('0');
      });
    });

    it('handles issues with missing optional fields', () => {
      const minimalIssue: Issue = {
        id: 'test-minimal',
        title: 'Minimal Issue',
        description: undefined,
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignee: undefined,
      };
      render(<KanbanBoard issues={[minimalIssue]} />);

      const card = screen.getByTestId('kanban-card-test-minimal');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('?')).toBeInTheDocument(); // Unassigned
    });
  });

  // Note: View preference persistence (localStorage) is handled by App.tsx
  // The KanbanBoard component itself is stateless regarding view persistence
  // See tests/unit/app.test.tsx for localStorage persistence tests
  describe('Integration Notes', () => {
    it('KanbanBoard receives issues as props (controlled component)', () => {
      const issues = [createTestIssue({ id: 'test-controlled', title: 'Controlled' })];
      const { container } = render(<KanbanBoard issues={issues} />);

      // Component renders without internal data fetching
      expect(container.querySelector('[data-testid="kanban-card-test-controlled"]')).toBeInTheDocument();
    });

    it('KanbanBoard does not persist any state to localStorage', () => {
      // Clear localStorage before test
      localStorage.clear();

      const issues = [createTestIssue({ id: 'test-no-persist', title: 'No Persist' })];
      render(<KanbanBoard issues={issues} />);

      // KanbanBoard should not write to localStorage
      // View preference is handled by parent App component
      expect(localStorage.getItem('beads-dashboard-view')).toBeNull();
      expect(localStorage.getItem('beads-active-tab')).toBeNull();
    });
  });
});
