import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DateBadge from '@/components/DateBadge';

// Helper to create dates relative to "today"
// Returns date string with time component to ensure local time parsing
const createDate = (daysFromToday: number): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0); // Set to noon to avoid day boundary issues
  date.setDate(date.getDate() + daysFromToday);
  // Format as YYYY-MM-DDTHH:mm:ss (no timezone) so it's parsed as local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T12:00:00`;
};

describe('DateBadge', () => {
  // Mock date to ensure consistent testing
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('due date status', () => {
    it('should render overdue items with red styling', () => {
      const due = createDate(-3); // 3 days ago
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('3d overdue');
      expect(badge?.className).toContain('bg-red-100');
      expect(badge?.className).toContain('text-red-700');
    });

    it('should render items due today with orange styling', () => {
      const due = createDate(0); // today
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('Today');
      expect(badge?.className).toContain('bg-orange-100');
      expect(badge?.className).toContain('text-orange-700');
    });

    it('should render items due within 3 days with amber styling', () => {
      const due = createDate(2); // 2 days from now
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('2d');
      expect(badge?.className).toContain('bg-amber-100');
      expect(badge?.className).toContain('text-amber-700');
    });

    it('should render items due in more than 3 days with slate styling', () => {
      const due = createDate(7); // 7 days from now
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('7d');
      expect(badge?.className).toContain('bg-slate-100');
      expect(badge?.className).toContain('text-slate-600');
    });

    it('should return null when no due date provided', () => {
      const { container } = render(<DateBadge />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('defer date status', () => {
    it('should render deferred badge for future dates with purple styling', () => {
      const defer = createDate(5); // 5 days from now
      const { container } = render(<DateBadge defer={defer} />);

      const badge = container.querySelector('span[title^="Deferred"]');
      expect(badge).toBeTruthy();
      expect(badge?.className).toContain('bg-purple-100');
      expect(badge?.className).toContain('text-purple-700');
    });

    it('should not show deferred badge for past dates', () => {
      const defer = createDate(-2); // 2 days ago
      const { container } = render(<DateBadge defer={defer} />);

      const badge = container.querySelector('span[title^="Deferred"]');
      expect(badge).toBeNull();
    });

    it('should not show deferred badge for today (defer has passed)', () => {
      const defer = createDate(0); // today
      const { container } = render(<DateBadge defer={defer} />);

      const badge = container.querySelector('span[title^="Deferred"]');
      expect(badge).toBeNull();
    });
  });

  describe('combined badges', () => {
    it('should show both due and defer badges when both are present and valid', () => {
      const due = createDate(5);
      const defer = createDate(2);
      const { container } = render(<DateBadge due={due} defer={defer} />);

      const dueBadge = container.querySelector('span[title^="Due:"]');
      const deferBadge = container.querySelector('span[title^="Deferred"]');

      expect(dueBadge).toBeTruthy();
      expect(deferBadge).toBeTruthy();
    });

    it('should return null when neither due nor defer are present', () => {
      const { container } = render(<DateBadge />);
      expect(container.firstChild).toBeNull();
    });

    it('should show only due badge when defer is in the past', () => {
      const due = createDate(5);
      const defer = createDate(-1); // past
      const { container } = render(<DateBadge due={due} defer={defer} />);

      const dueBadge = container.querySelector('span[title^="Due:"]');
      const deferBadge = container.querySelector('span[title^="Deferred"]');

      expect(dueBadge).toBeTruthy();
      expect(deferBadge).toBeNull();
    });
  });

  describe('compact mode', () => {
    it('should use compact format by default', () => {
      const due = createDate(7);
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge?.textContent).toContain('7d');
    });

    it('should use full date format when compact is false', () => {
      const due = createDate(7);
      const { container } = render(<DateBadge due={due} compact={false} />);

      const badge = container.querySelector('span[title^="Due:"]');
      // Should contain month name instead of just "7d"
      expect(badge?.textContent).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 3 days due (boundary)', () => {
      const due = createDate(3);
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge?.textContent).toContain('3d');
      expect(badge?.className).toContain('bg-amber-100'); // Still "soon"
    });

    it('should handle exactly 4 days due (boundary - not "soon")', () => {
      const due = createDate(4);
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge?.textContent).toContain('4d');
      expect(badge?.className).toContain('bg-slate-100'); // Future, not soon
    });

    it('should handle 1 day overdue', () => {
      const due = createDate(-1);
      const { container } = render(<DateBadge due={due} />);

      const badge = container.querySelector('span[title^="Due:"]');
      expect(badge?.textContent).toContain('1d overdue');
      expect(badge?.className).toContain('bg-red-100');
    });
  });
});
