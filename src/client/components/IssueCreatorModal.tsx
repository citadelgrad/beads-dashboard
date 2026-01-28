import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CreateIssueRequest, ExtendedIssueType, Priority } from '@shared/types';

interface IssueCreatorModalProps {
  onClose: () => void;
  onCreate: (data: CreateIssueRequest) => Promise<void>;
}

/**
 * Simplified modal for creating new issues.
 * Shows only essential fields: title, description, type, priority.
 * Per architecture review: separate component avoids dual-mode complexity in IssueEditorModal.
 */
function IssueCreatorModal({ onClose, onCreate }: IssueCreatorModalProps) {
  const [formState, setFormState] = useState<CreateIssueRequest>({
    title: '',
    description: '',
    issue_type: 'task',
    priority: 2,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    // Validate title
    if (!formState.title || formState.title.trim().length === 0) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onCreate(formState);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue');
    } finally {
      setSaving(false);
    }
  }, [formState, onCreate, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        // Cmd+Enter to save
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">New Issue</h2>
            <p className="text-sm text-slate-500 mt-1">Create a new task, bug, feature, or epic</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label htmlFor="create-title" className="block text-sm font-medium text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="create-title"
              type="text"
              value={formState.title}
              onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter issue title..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Type and Priority row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label htmlFor="create-type" className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <select
                id="create-type"
                value={formState.issue_type}
                onChange={(e) => setFormState(prev => ({ ...prev, issue_type: e.target.value as ExtendedIssueType }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="epic">Epic</option>
                <option value="chore">Chore</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="create-priority" className="block text-sm font-medium text-slate-700 mb-2">
                Priority
              </label>
              <select
                id="create-priority"
                value={formState.priority}
                onChange={(e) => setFormState(prev => ({ ...prev, priority: Number(e.target.value) as Priority }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>P0 - Critical</option>
                <option value={1}>P1 - High</option>
                <option value={2}>P2 - Medium</option>
                <option value={3}>P3 - Low</option>
                <option value={4}>P4 - Lowest</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="create-description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="create-description"
              value={formState.description}
              onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add a description (supports Markdown)..."
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-slate-500 mt-1">
              Markdown supported. You can add more details after creating the issue.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex items-center justify-between">
          <div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all duration-150"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-sm hover:shadow-md"
              disabled={saving || !formState.title.trim()}
              title="Cmd+Enter to save"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : 'Create Issue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IssueCreatorModal;
