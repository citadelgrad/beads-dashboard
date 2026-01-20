import { useCallback } from 'react';

interface TitleSectionProps {
  value: string;
  onChange: (value: string) => void;
}

function TitleSection({ value, onChange }: TitleSectionProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-colors"
        placeholder="Enter issue title..."
      />
    </div>
  );
}

export default TitleSection;
