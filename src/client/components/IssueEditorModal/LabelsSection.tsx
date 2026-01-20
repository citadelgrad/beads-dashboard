import { useState, useCallback, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import type { Issue } from '@shared/types';

interface LabelsSectionProps {
  values: Partial<Issue>;
  onChange: (field: string, value: string[]) => void;
}

// Predefined colors for labels - cycles through these
const LABEL_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
];

/**
 * Get a consistent color for a label based on its name hash
 */
function getLabelColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % LABEL_COLORS.length;
  return LABEL_COLORS[index];
}

/**
 * Labels section with tag input functionality.
 * - Displays existing labels as colored pill-shaped tags
 * - Text input to add new labels (press Enter to add)
 * - X button on each label to remove
 * - Prevents duplicate labels
 */
function LabelsSection({ values, onChange }: LabelsSectionProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const labels = values.labels || [];

  // Add a new label
  const addLabel = useCallback(
    (labelToAdd: string) => {
      const trimmed = labelToAdd.trim().toLowerCase();
      if (!trimmed) return;

      // Check for duplicate
      if (labels.some((l) => l.toLowerCase() === trimmed)) {
        setShowDuplicateWarning(true);
        setTimeout(() => setShowDuplicateWarning(false), 2000);
        return;
      }

      onChange('labels', [...labels, trimmed]);
      setInputValue('');
    },
    [labels, onChange]
  );

  // Remove a label
  const removeLabel = useCallback(
    (labelToRemove: string) => {
      onChange(
        'labels',
        labels.filter((l) => l !== labelToRemove)
      );
    },
    [labels, onChange]
  );

  // Handle keydown in input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addLabel(inputValue);
      }
    },
    [inputValue, addLabel]
  );

  // Handle click on add button
  const handleAddClick = useCallback(() => {
    addLabel(inputValue);
  }, [inputValue, addLabel]);

  return (
    <CollapsibleSection title="Labels" defaultExpanded={true}>
      <div className="space-y-3">
        {/* Existing labels as tags */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const color = getLabelColor(label);
              return (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => removeLabel(label)}
                    className={`ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors ${color.text}`}
                    aria-label={`Remove ${label} label`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Input to add new label */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add label..."
            className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       hover:border-slate-400 transition-colors placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={handleAddClick}
            disabled={!inputValue.trim()}
            className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md
                       hover:bg-slate-50 hover:border-slate-400 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Duplicate warning */}
        {showDuplicateWarning && (
          <p className="text-xs text-amber-600">
            Label already exists
          </p>
        )}

        {/* Helper text */}
        {labels.length === 0 && (
          <p className="text-xs text-slate-500">
            Press Enter or click Add to add a label
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}

export default LabelsSection;
