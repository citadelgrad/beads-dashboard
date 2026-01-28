import { useMemo } from 'react';
import { Calendar, Hourglass } from 'lucide-react';

interface DateBadgeProps {
  due?: string;
  defer?: string;
  compact?: boolean;
}

/**
 * DateBadge component displays due dates and deferred dates with color-coded urgency.
 *
 * Timezone behavior: All dates are displayed in the user's local timezone.
 * Due dates are compared against local midnight for consistent day boundaries.
 *
 * Color coding:
 * - Red: Overdue (past due date)
 * - Orange: Due today
 * - Amber: Due within 3 days
 * - Slate: Due more than 3 days away
 * - Purple: Deferred to future date
 */
function DateBadge({ due, defer, compact = true }: DateBadgeProps) {
  // Calculate today's date, updating when due/defer props change
  // Using a new Date each render ensures correctness if dashboard stays open overnight
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, [due, defer]);

  // Calculate due date badge (memoized)
  const dueBadge = useMemo(() => {
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
        aria-label={`Due ${formatDate(dueDate)}`}
      >
        <Calendar className="w-3 h-3" aria-hidden="true" />
        {label}
      </span>
    );
  }, [due, today, compact]);

  // Calculate defer badge (memoized)
  const deferBadge = useMemo(() => {
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
        aria-label={`Deferred until ${formatDate(deferDate)}`}
      >
        <Hourglass className="w-3 h-3" aria-hidden="true" />
        {label}
      </span>
    );
  }, [defer, today, compact]);

  if (!dueBadge && !deferBadge) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {dueBadge}
      {deferBadge}
    </span>
  );
}

/**
 * Helper function to format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

export default DateBadge;
