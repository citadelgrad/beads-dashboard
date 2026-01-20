import CollapsibleSection from './CollapsibleSection';
import DatePicker from './DatePicker';
import type { Issue } from '@shared/types';

interface DatesSectionProps {
  values: Partial<Issue>;
  onChange: (field: string, value: string | undefined) => void;
}

function DatesSection({ values, onChange }: DatesSectionProps) {
  return (
    <CollapsibleSection title="Dates" defaultExpanded={true} allowOverflow={true}>
      <div className="space-y-4">
        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Due Date
          </label>
          <DatePicker
            value={values.due}
            onChange={(date) => onChange('due', date)}
            placeholder="Set due date"
          />
        </div>

        {/* Defer Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Defer Until
          </label>
          <DatePicker
            value={values.defer}
            onChange={(date) => onChange('defer', date)}
            placeholder="Set defer date"
          />
          <p className="mt-1 text-xs text-slate-500">
            Hidden from bd ready until this date
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export default DatesSection;
