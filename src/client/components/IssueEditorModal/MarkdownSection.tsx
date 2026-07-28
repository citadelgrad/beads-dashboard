import { useState, useCallback } from 'react';
import { marked } from 'marked';
import { Edit2, Eye } from 'lucide-react';

interface MarkdownSectionProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultExpanded?: boolean;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function FieldCount({ value }: { value: string }) {
  const characterCount = [...value].length;
  const tokenCount = Math.ceil(characterCount / 4);

  return (
    <div
      className="mt-1.5 text-right text-xs tabular-nums text-slate-400"
      title="Approximate token count based on four characters per token"
    >
      {formatCount(characterCount, 'character')} · ~{formatCount(tokenCount, 'token')}
    </div>
  );
}

function MarkdownSection({
  label,
  value,
  onChange,
  placeholder = 'Add content...',
  defaultExpanded = false,
}: MarkdownSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded] = useState(defaultExpanded);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const toggleEditMode = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  // Render markdown content
  // Security note: This content comes from Beads' local export/read surface,
  // which is user-owned data stored locally on their machine, not untrusted
  // external input. This follows the same pattern as KanbanBoard.tsx:493-496.
  const renderMarkdown = (content: string) => {
    return { __html: marked.parse(content) as string };
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <button
          onClick={toggleEditMode}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
          type="button"
        >
          {isEditing ? (
            <>
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={value}
          onChange={handleChange}
          className="w-full h-64 p-3 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none resize-y"
          placeholder={placeholder}
        />
      ) : value ? (
        <div
          className="prose prose-sm max-w-none text-slate-700 p-3 border border-slate-200 rounded-lg bg-slate-50 min-h-[100px]"
          dangerouslySetInnerHTML={renderMarkdown(value)}
        />
      ) : (
        <button
          onClick={toggleEditMode}
          className="w-full p-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-400 italic hover:border-blue-400 hover:text-blue-500 transition-colors text-left"
          type="button"
        >
          {placeholder}
        </button>
      )}
      <FieldCount value={value} />
    </div>
  );
}

export default MarkdownSection;
