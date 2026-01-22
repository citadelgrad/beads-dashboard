import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KanbanBoard, {
  getAgeInDays,
  getAgeBadgeColor,
  getInitials,
  COLUMNS,
  PRIORITY_BORDER_COLORS,
  CATEGORY_TO_STATUS,
  isBlockedByDependencies,
  categorizeIssue,
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
  it('has correct number of columns (beads-style: 4)', () => {
    expect(COLUMNS).toHaveLength(4);
  });

  it('includes all required categories', () => {
    const categories = COLUMNS.map((col) => col.category);
    expect(categories).toContain('blocked');
    expect(categories).toContain('ready');
    expect(categories).toContain('in_progress');
    expect(categories).toContain('closed');
  });

  it('has correct column order (Blocked, Ready, In Progress, Closed)', () => {
    expect(COLUMNS[0].category).toBe('blocked');
    expect(COLUMNS[1].category).toBe('ready');
    expect(COLUMNS[2].category).toBe('in_progress');
    expect(COLUMNS[3].category).toBe('closed');
  });

  it('maps labels correctly', () => {
    expect(COLUMNS[0].label).toBe('Blocked');
    expect(COLUMNS[1].label).toBe('Ready');
    expect(COLUMNS[2].label).toBe('In Progress');
    expect(COLUMNS[3].label).toBe('Closed');
  });

  it('each column has all required properties', () => {
    COLUMNS.forEach((col) => {
      expect(col).toHaveProperty('category');
      expect(col).toHaveProperty('label');
      expect(col).toHaveProperty('bgColor');
      expect(col).toHaveProperty('headerColor');
      expect(typeof col.category).toBe('string');
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

describe('Category to Status Mapping', () => {
  it('maps blocked category to blocked status', () => {
    expect(CATEGORY_TO_STATUS.blocked).toBe('blocked');
  });

  it('maps ready category to open status', () => {
    expect(CATEGORY_TO_STATUS.ready).toBe('open');
  });

  it('maps in_progress category to in_progress status', () => {
    expect(CATEGORY_TO_STATUS.in_progress).toBe('in_progress');
  });

  it('maps closed category to closed status', () => {
    expect(CATEGORY_TO_STATUS.closed).toBe('closed');
  });
});

describe('isBlockedByDependencies', () => {
  it('returns false for issue with no dependencies', () => {
    const issue = createTestIssue({ id: 'test-1', status: 'open' });
    const allIssues = [issue];
    expect(isBlockedByDependencies(issue, allIssues)).toBe(false);
  });

  it('returns true for issue with open dependency', () => {
    const blocker = createTestIssue({ id: 'blocker-1', status: 'open' });
    const blocked = createTestIssue({
      id: 'blocked-1',
      status: 'open',
      dependencies: [{ issue_id: 'blocked-1', depends_on_id: 'blocker-1', type: 'depends_on' }],
    });
    const allIssues = [blocker, blocked];
    expect(isBlockedByDependencies(blocked, allIssues)).toBe(true);
  });

  it('returns false for issue with closed dependency', () => {
    const blocker = createTestIssue({ id: 'blocker-1', status: 'closed' });
    const blocked = createTestIssue({
      id: 'blocked-1',
      status: 'open',
      dependencies: [{ issue_id: 'blocked-1', depends_on_id: 'blocker-1', type: 'depends_on' }],
    });
    const allIssues = [blocker, blocked];
    expect(isBlockedByDependencies(blocked, allIssues)).toBe(false);
  });

  it('returns true for issue with legacy blocked_by array', () => {
    const blocker = createTestIssue({ id: 'blocker-1', status: 'in_progress' });
    const blocked = createTestIssue({
      id: 'blocked-1',
      status: 'open',
      blocked_by: ['blocker-1'],
    });
    const allIssues = [blocker, blocked];
    expect(isBlockedByDependencies(blocked, allIssues)).toBe(true);
  });

  it('returns false when blocker issue does not exist', () => {
    const blocked = createTestIssue({
      id: 'blocked-1',
      status: 'open',
      dependencies: [{ issue_id: 'blocked-1', depends_on_id: 'non-existent', type: 'depends_on' }],
    });
    const allIssues = [blocked];
    expect(isBlockedByDependencies(blocked, allIssues)).toBe(false);
  });
});

describe('categorizeIssue', () => {
  it('categorizes closed issues as closed', () => {
    const issue = createTestIssue({ id: 'test-1', status: 'closed' });
    const allIssues = [issue];
    expect(categorizeIssue(issue, allIssues)).toBe('closed');
  });

  it('categorizes in_progress issues as in_progress', () => {
    const issue = createTestIssue({ id: 'test-1', status: 'in_progress' });
    const allIssues = [issue];
    expect(categorizeIssue(issue, allIssues)).toBe('in_progress');
  });

  it('categorizes explicitly blocked issues as blocked', () => {
    const issue = createTestIssue({ id: 'test-1', status: 'blocked' });
    const allIssues = [issue];
    expect(categorizeIssue(issue, allIssues)).toBe('blocked');
  });

  it('categorizes dependency-blocked issues as blocked', () => {
    const blocker = createTestIssue({ id: 'blocker-1', status: 'open' });
    const blocked = createTestIssue({
      id: 'blocked-1',
      status: 'open',
      dependencies: [{ issue_id: 'blocked-1', depends_on_id: 'blocker-1', type: 'depends_on' }],
    });
    const allIssues = [blocker, blocked];
    expect(categorizeIssue(blocked, allIssues)).toBe('blocked');
  });

  it('categorizes open issues with no blockers as ready', () => {
    const issue = createTestIssue({ id: 'test-1', status: 'open' });
    const allIssues = [issue];
    expect(categorizeIssue(issue, allIssues)).toBe('ready');
  });

  it('categorizes deferred issues as ready', () => {
    const issue = createTestIssue({ id: 'test-1', status: 'deferred' as any });
    const allIssues = [issue];
    expect(categorizeIssue(issue, allIssues)).toBe('ready');
  });

  it('categorizes pinned issues as ready', () => {
    const issue = createTestIssue({ id: 'test-1', status: 'pinned' as any });
    const allIssues = [issue];
    expect(categorizeIssue(issue, allIssues)).toBe('ready');
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

  it('renders all columns (beads-style: 4)', () => {
    render(<KanbanBoard issues={[]} />);

    // Check all 4 beads-style columns are rendered
    expect(screen.getByTestId('kanban-column-blocked')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-ready')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-in_progress')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-closed')).toBeInTheDocument();
  });

  it('shows column headers with correct labels', () => {
    render(<KanbanBoard issues={[]} />);

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('groups issues correctly by category', () => {
    const issues: Issue[] = [
      createTestIssue({ id: 'test-1', title: 'Ready Issue', status: 'open' }),
      createTestIssue({ id: 'test-2', title: 'In Progress Issue', status: 'in_progress' }),
      createTestIssue({ id: 'test-3', title: 'Closed Issue', status: 'closed' }),
    ];

    render(<KanbanBoard issues={issues} />);

    // Check cards are in correct columns
    const readyColumn = screen.getByTestId('kanban-column-ready');
    const inProgressColumn = screen.getByTestId('kanban-column-in_progress');
    const closedColumn = screen.getByTestId('kanban-column-closed');

    expect(readyColumn).toHaveTextContent('Ready Issue');
    expect(inProgressColumn).toHaveTextContent('In Progress Issue');
    expect(closedColumn).toHaveTextContent('Closed Issue');
  });

  it('categorizes dependency-blocked issues into Blocked column', () => {
    const blocker = createTestIssue({ id: 'blocker-1', title: 'Blocker', status: 'open' });
    const blocked = createTestIssue({
      id: 'blocked-1',
      title: 'Blocked by dependency',
      status: 'open',
      dependencies: [{ issue_id: 'blocked-1', depends_on_id: 'blocker-1', type: 'depends_on' }],
    });

    render(<KanbanBoard issues={[blocker, blocked]} />);

    const blockedColumn = screen.getByTestId('kanban-column-blocked');
    const readyColumn = screen.getByTestId('kanban-column-ready');

    expect(blockedColumn).toHaveTextContent('Blocked by dependency');
    expect(readyColumn).toHaveTextContent('Blocker');
  });

  it('displays empty state for columns with no issues', () => {
    render(<KanbanBoard issues={[]} />);

    // Each empty column should show "No issues"
    const emptyMessages = screen.getAllByText('No issues');
    expect(emptyMessages.length).toBe(4); // All 4 columns should be empty
  });

  it('displays correct WIP count in column headers', () => {
    const issues: Issue[] = [
      createTestIssue({ id: 'test-1', status: 'open' }),
      createTestIssue({ id: 'test-2', status: 'open' }),
      createTestIssue({ id: 'test-3', status: 'in_progress' }),
    ];

    render(<KanbanBoard issues={issues} />);

    // Ready column should show 2, in_progress should show 1
    const readyColumn = screen.getByTestId('kanban-column-ready');
    const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

    expect(readyColumn).toHaveTextContent('2');
    expect(inProgressColumn).toHaveTextContent('1');
  });

  it('filters out tombstone issues from display', () => {
    const issues: Issue[] = [
      createTestIssue({ id: 'test-1', title: 'Active Issue', status: 'open' }),
      createTestIssue({ id: 'test-2', title: 'Tombstone Issue', status: 'tombstone' }),
    ];

    render(<KanbanBoard issues={issues} />);

    expect(screen.getByText('Active Issue')).toBeInTheDocument();
    expect(screen.queryByText('Tombstone Issue')).not.toBeInTheDocument();
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
        const readyColumn = screen.getByTestId('kanban-column-ready');

        // Simulate drag start
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Simulate drop
        fireEvent.drop(inProgressColumn);

        // Wait for API error and revert
        await waitFor(() => {
          expect(readyColumn).toHaveTextContent('Revert Test');
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
        const readyColumn = screen.getByTestId('kanban-column-ready');

        // Simulate drag start
        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });

        // Simulate drop on same column (ready)
        fireEvent.drop(readyColumn);

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

      const readyColumn = screen.getByTestId('kanban-column-ready');
      const inProgressColumn = screen.getByTestId('kanban-column-in_progress');

      // Initially ready has 2, in_progress has 0
      expect(readyColumn).toHaveTextContent('2');
      expect(inProgressColumn).toHaveTextContent('0');

      const card = screen.getByTestId('kanban-card-test-wip-1');

      // Simulate drag and drop
      fireEvent.dragStart(card, {
        dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
      });
      fireEvent.drop(inProgressColumn);

      // After optimistic update: ready has 1, in_progress has 1
      await waitFor(() => {
        expect(readyColumn).toHaveTextContent('1');
        expect(inProgressColumn).toHaveTextContent('1');
      });
    });
  });

  describe('API Integration', () => {
    describe('Status Update API', () => {
      it('sends correct request format for status update (ready to blocked)', async () => {
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

      it('sends open status when dropping on Ready column', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        const issues = [createTestIssue({ id: 'test-api-2', status: 'in_progress', title: 'Ready Test' })];
        render(<KanbanBoard issues={issues} />);

        const card = screen.getByTestId('kanban-card-test-api-2');
        const readyColumn = screen.getByTestId('kanban-column-ready');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(readyColumn);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/issues/test-api-2/status',
            expect.objectContaining({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'open' }),
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
        const readyColumn = screen.getByTestId('kanban-column-ready');

        fireEvent.dragStart(card, {
          dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
        });
        fireEvent.drop(inProgressColumn);

        // Card should revert to original column (Ready)
        await waitFor(() => {
          expect(readyColumn).toHaveTextContent('Network Test');
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

      // Modal should open - title in card as text, title in modal as input value
      await waitFor(() => {
        expect(screen.getByText('Clickable Issue')).toBeInTheDocument(); // Card title
        expect(screen.getByDisplayValue('Clickable Issue')).toBeInTheDocument(); // Modal title input
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
        // Modal opened - check title input exists
        expect(screen.getByDisplayValue('Empty Description')).toBeInTheDocument();
        // Description placeholder button should show (MarkdownSection renders button when empty)
        expect(screen.getByRole('button', { name: /add a description/i })).toBeInTheDocument();
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
        // Modal opened - check title input exists
        expect(screen.getByDisplayValue('No Description')).toBeInTheDocument();
        // Description placeholder button should show (MarkdownSection renders button when empty)
        expect(screen.getByRole('button', { name: /add a description/i })).toBeInTheDocument();
      });
    });

    it('closes modal on Cancel button click', async () => {
      const issues = [createTestIssue({
        id: 'test-close-modal',
        title: 'Close Modal Test',
        description: 'Test'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-close-modal');
      fireEvent.click(card);

      // Modal opens - check for title input
      await waitFor(() => {
        expect(screen.getByDisplayValue('Close Modal Test')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Modal should close - title input should be gone
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Close Modal Test')).not.toBeInTheDocument();
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

      // Modal opens - check for title input
      await waitFor(() => {
        expect(screen.getByDisplayValue('X Close Test')).toBeInTheDocument();
      });

      // Find X button (the one in the header with X icon)
      const modal = container.querySelector('.fixed.inset-0');
      const xButton = modal?.querySelector('button svg.lucide-x')?.parentElement;
      expect(xButton).toBeInTheDocument();
      fireEvent.click(xButton!);

      // Modal should close - title input should be gone
      await waitFor(() => {
        expect(screen.queryByDisplayValue('X Close Test')).not.toBeInTheDocument();
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

      // Wait for modal to open - check for title input
      await waitFor(() => {
        expect(screen.getByDisplayValue('Edit Button Test')).toBeInTheDocument();
      });

      // Edit button should be visible (has title="Edit Description")
      const editButton = screen.getAllByRole('button', { name: /^edit$/i })[0];
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

      // Wait for modal to open - check for title input
      await waitFor(() => {
        expect(screen.getByDisplayValue('Edit Mode Test')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getAllByRole('button', { name: /^edit$/i })[0];
      fireEvent.click(editButton);

      // Textarea should appear with the description
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Add a description...');
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveValue('Original description');
      });
    });

    it('returns to preview mode when preview button is clicked', async () => {
      const issues = [createTestIssue({
        id: 'test-cancel-edit',
        title: 'Cancel Edit Test',
        description: 'Original description'
      })];
      render(<KanbanBoard issues={issues} />);

      const card = screen.getByTestId('kanban-card-test-cancel-edit');
      fireEvent.click(card);

      // Wait for modal to open - check for title input
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cancel Edit Test')).toBeInTheDocument();
      });

      // Click edit button to enter edit mode
      const editButton = screen.getAllByRole('button', { name: /^edit$/i })[0];
      fireEvent.click(editButton);

      // Should be in edit mode
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a description...')).toBeInTheDocument();
      });

      // Click preview button to return to view mode
      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);

      // Should return to view mode (textarea gone)
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Add a description...')).not.toBeInTheDocument();
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

      // Wait for modal to open - check for title input
      await waitFor(() => {
        expect(screen.getByDisplayValue('Save Edit Test')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getAllByRole('button', { name: /^edit$/i })[0];
      fireEvent.click(editButton);

      // Change the description
      const textarea = await screen.findByPlaceholderText('Add a description...');
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // API should be called with PATCH method
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/issues/test-save-edit',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      // Modal should close after save - title input should be gone
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Save Edit Test')).not.toBeInTheDocument();
      });
    });

    it.skip('handles save failure gracefully', async () => {
      // Mock alert for error notification
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

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
        expect(screen.getByDisplayValue('Save Error Test')).toBeInTheDocument();
      });

      // Click edit button to enter edit mode
      const editButton = screen.getAllByRole('button', { name: /^edit$/i })[0];
      fireEvent.click(editButton);

      // Change the description to enable save
      const textarea = await screen.findByPlaceholderText('Add a description...');
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should call alert with error message
      await waitFor(() => {
        expect(alertMock).toHaveBeenCalled();
      });

      alertMock.mockRestore();
    });

    it.skip('shows Saving... text on save button while save is in progress', async () => {
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
        expect(screen.getByDisplayValue('Saving Test')).toBeInTheDocument();
      });

      // Click edit button to enter edit mode
      const editButton = screen.getAllByRole('button', { name: /^edit$/i })[0];
      fireEvent.click(editButton);

      // Make a change to enable save button
      const textarea = await screen.findByPlaceholderText('Add a description...');
      fireEvent.change(textarea, { target: { value: 'Updated description' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Save button should show "Saving..." text
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!({ ok: true, json: async () => ({ success: true }) });

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Saving Test')).not.toBeInTheDocument();
      });
    });
  });

  describe('Layout and Responsive', () => {
    it('renders 4 columns with correct structure', () => {
      render(<KanbanBoard issues={[]} />);

      // Verify all 4 beads-style columns are rendered
      const columns = [
        screen.getByTestId('kanban-column-blocked'),
        screen.getByTestId('kanban-column-ready'),
        screen.getByTestId('kanban-column-in_progress'),
        screen.getByTestId('kanban-column-closed'),
      ];

      expect(columns).toHaveLength(4);
    });

    it('columns have min-width class for responsive behavior', () => {
      render(<KanbanBoard issues={[]} />);

      const readyColumn = screen.getByTestId('kanban-column-ready');
      // Columns should have min-width to prevent shrinking too small
      expect(readyColumn).toHaveClass('min-w-[200px]');
    });

    it('columns have flex-shrink-0 to maintain size', () => {
      render(<KanbanBoard issues={[]} />);

      const readyColumn = screen.getByTestId('kanban-column-ready');
      expect(readyColumn).toHaveClass('flex-shrink-0');
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

      const readyColumn = screen.getByTestId('kanban-column-ready');
      // The cards container within the column should have overflow-y-auto
      const cardsContainer = readyColumn.querySelector('.overflow-y-auto');
      expect(cardsContainer).toBeInTheDocument();
    });

    it('column headers are sticky for visibility while scrolling', () => {
      render(<KanbanBoard issues={[]} />);

      const readyColumn = screen.getByTestId('kanban-column-ready');
      const header = readyColumn.querySelector('.sticky.top-0');
      expect(header).toBeInTheDocument();
    });

    it('columns have correct width calculation for 4-column desktop layout', () => {
      render(<KanbanBoard issues={[]} />);

      const readyColumn = screen.getByTestId('kanban-column-ready');
      // Width is calc(25% - 12px) for 4 columns with gap
      expect(readyColumn).toHaveClass('w-[calc(25%-12px)]');
    });

    it('cards container has minimum height', () => {
      render(<KanbanBoard issues={[]} />);

      const readyColumn = screen.getByTestId('kanban-column-ready');
      const cardsContainer = readyColumn.querySelector('.min-h-\\[200px\\]');
      expect(cardsContainer).toBeInTheDocument();
    });

    it('all 4 beads-style columns are in the DOM', () => {
      render(<KanbanBoard issues={[]} />);

      // All 4 columns should be present in DOM
      expect(screen.getByTestId('kanban-column-blocked')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-ready')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-in_progress')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-column-closed')).toBeInTheDocument();
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

      // Initial state - open issues go to Ready column
      const readyColumn = screen.getByTestId('kanban-column-ready');
      expect(readyColumn).toHaveTextContent('Initial');
      expect(readyColumn).toHaveTextContent('1');

      // Update props with new issues
      const updatedIssues = [
        createTestIssue({ id: 'test-sync-1', status: 'in_progress', title: 'Updated' }),
        createTestIssue({ id: 'test-sync-2', status: 'open', title: 'New Issue' }),
      ];
      rerender(<KanbanBoard issues={updatedIssues} />);

      // State should be synchronized
      const inProgressColumn = screen.getByTestId('kanban-column-in_progress');
      expect(inProgressColumn).toHaveTextContent('Updated');
      expect(readyColumn).toHaveTextContent('New Issue');
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
        const column = screen.getByTestId(`kanban-column-${col.category}`);
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
