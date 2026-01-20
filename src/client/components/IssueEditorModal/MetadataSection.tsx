import CollapsibleSection from './CollapsibleSection';
import type { Issue } from '@shared/types';

interface MetadataSectionProps {
  values: Partial<Issue>;
  onChange: (field: string, value: string | number | undefined) => void;
}

/**
 * Converts minutes to a human-readable hours format
 */
function formatMinutesToHours(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return '';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * MetadataSection displays metadata fields in a collapsible panel.
 * Contains: External Ref (text) and Estimate (number in minutes).
 * Collapsed by default.
 */
function MetadataSection({ values, onChange }: MetadataSectionProps) {
  const estimateDisplay = formatMinutesToHours(values.estimate);

  return (
    <CollapsibleSection title="Metadata" defaultExpanded={false}>
      <div className="space-y-4">
        {/* External Reference */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            External Ref
          </label>
          <input
            type="text"
            value={values.external_ref || ''}
            onChange={(e) => onChange('external_ref', e.target.value || undefined)}
            placeholder="e.g., gh-9, jira-ABC"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">
            Link to external tracker (GitHub issue, Jira, etc.)
          </p>
        </div>

        {/* Estimate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Estimate
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="15"
              value={values.estimate ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onChange('estimate', val === '' ? undefined : parseInt(val, 10));
              }}
              placeholder="Minutes"
              className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-slate-500">min</span>
            {estimateDisplay && values.estimate && values.estimate >= 60 && (
              <span className="text-sm text-slate-400">
                = {estimateDisplay}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Estimated time to complete (in minutes)
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default MetadataSection;
