import { Plus } from 'lucide-react';

interface NewIssueButtonProps {
  onClick: () => void;
}

function NewIssueButton({ onClick }: NewIssueButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                 text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
      title="Create new issue (c)"
      aria-label="Create new issue"
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
      <span>New Issue</span>
      <kbd className="text-xs text-blue-200 hidden sm:block px-1.5 py-0.5 bg-blue-700/50 rounded" aria-hidden="true">c</kbd>
    </button>
  );
}

export default NewIssueButton;
