import CollapsibleSection from './CollapsibleSection';
import type { Issue } from '@shared/types';

interface TimestampsSectionProps {
  values: Partial<Issue>;
}

/**
 * Formats an ISO 8601 timestamp to a human-readable format.
 * Example: "Jan 18, 2026 at 3:45 PM"
 */
function formatTimestamp(isoString: string | undefined): string {
  if (!isoString) return '';

  try {
    const date = new Date(isoString);

    // Check for invalid date
    if (isNaN(date.getTime())) {
      return isoString; // Return original string if parsing fails
    }

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    // Format: "Jan 18, 2026 at 3:45 PM"
    const formatted = date.toLocaleString('en-US', options);
    // Insert "at" between date and time
    return formatted.replace(/,\s(\d{1,2}:)/, ' at $1');
  } catch {
    return isoString; // Return original string if formatting fails
  }
}

/**
 * TimestampsSection displays read-only timestamp information.
 * Contains: Created at, Updated at, Closed at (if present), Created by.
 * All fields are display-only (no editing).
 * Collapsed by default.
 */
function TimestampsSection({ values }: TimestampsSectionProps) {
  const hasClosedAt = !!values.closed_at;
  const hasCreatedBy = !!values.created_by;

  return (
    <CollapsibleSection title="Timestamps" defaultExpanded={false}>
      <div className="space-y-3">
        {/* Created At */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-0.5">
            Created
          </label>
          <p className="text-sm text-slate-600">
            {formatTimestamp(values.created_at) || '-'}
          </p>
        </div>

        {/* Updated At */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-0.5">
            Updated
          </label>
          <p className="text-sm text-slate-600">
            {formatTimestamp(values.updated_at) || '-'}
          </p>
        </div>

        {/* Closed At - Only show if present */}
        {hasClosedAt && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">
              Closed
            </label>
            <p className="text-sm text-slate-600">
              {formatTimestamp(values.closed_at)}
            </p>
          </div>
        )}

        {/* Created By - Only show if present */}
        {hasCreatedBy && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">
              Created by
            </label>
            <p className="text-sm text-slate-600">{values.created_by}</p>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default TimestampsSection;
