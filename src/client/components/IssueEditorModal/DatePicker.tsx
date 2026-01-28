import ReactDatePicker from 'react-datepicker';
import { Calendar, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  value: string | undefined;
  onChange: (date: string | undefined) => void;
  placeholder?: string;
}

function DatePicker({ value, onChange, placeholder = 'Select date' }: DatePickerProps) {
  // Parse ISO 8601 string to Date object, with validation
  let selectedDate: Date | null = null;
  if (value) {
    const parsed = new Date(value);
    // Check if date is valid (not NaN)
    if (!isNaN(parsed.getTime())) {
      selectedDate = parsed;
    }
  }

  // Handle date change from the picker
  const handleChange = (date: Date | null) => {
    if (date) {
      // Return ISO 8601 string
      onChange(date.toISOString());
    } else {
      onChange(undefined);
    }
  };

  // Clear the date
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div className="relative">
      <ReactDatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="MMM d, yyyy"
        placeholderText={placeholder}
        className="w-full px-3 py-2 pl-9 pr-8 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none bg-white"
        calendarClassName="beads-datepicker"
        showPopperArrow={false}
        popperPlacement="bottom-start"
      />

      {/* Calendar icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
          title="Clear date"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Custom styles for the datepicker to match Tailwind theme */}
      <style>{`
        /* Fixed positioning calendar needs high z-index to appear above modal */
        .react-datepicker-popper {
          z-index: 9999 !important;
        }

        .react-datepicker {
          font-family: ui-sans-serif, system-ui, sans-serif;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          border-radius: 0.5rem 0.5rem 0 0;
          padding-top: 0.75rem;
        }

        .react-datepicker__current-month {
          font-weight: 600;
          color: #334155;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .react-datepicker__day-names {
          margin-top: 0.5rem;
        }

        .react-datepicker__day-name {
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 500;
          width: 2rem;
          margin: 0.1rem;
        }

        .react-datepicker__month {
          margin: 0.5rem;
        }

        .react-datepicker__day {
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          margin: 0.1rem;
          border-radius: 0.375rem;
          color: #334155;
          font-size: 0.875rem;
        }

        .react-datepicker__day:hover {
          background-color: #e2e8f0;
          border-radius: 0.375rem;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #2563eb !important;
          color: white !important;
          font-weight: 500;
        }

        .react-datepicker__day--selected:hover {
          background-color: #1d4ed8 !important;
        }

        .react-datepicker__day--today {
          font-weight: 600;
          color: #2563eb;
        }

        .react-datepicker__day--today.react-datepicker__day--selected {
          color: white;
        }

        .react-datepicker__day--outside-month {
          color: #94a3b8;
        }

        .react-datepicker__day--disabled {
          color: #cbd5e1;
        }

        .react-datepicker__navigation {
          top: 0.75rem;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #64748b;
          border-width: 2px 2px 0 0;
          width: 0.5rem;
          height: 0.5rem;
        }

        .react-datepicker__navigation:hover *::before {
          border-color: #334155;
        }

        .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default DatePicker;
