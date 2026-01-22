import { useState, useCallback, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { Issue, IssueStatus, Priority, IssueDependency } from '@shared/types';
import TitleSection from './TitleSection';
import MarkdownSection from './MarkdownSection';
import CollapsibleSection from './CollapsibleSection';
import PropertiesSection from './PropertiesSection';
import DatesSection from './DatesSection';
import MetadataSection from './MetadataSection';
import TimestampsSection from './TimestampsSection';
import LabelsSection from './LabelsSection';
import DependenciesSection from './DependenciesSection';

interface IssueEditorModalProps {
  issue: Issue;
  allIssues?: Issue[];
  onClose: () => void;
  onSave: (updates: Partial<Issue>) => Promise<void>;
}

interface FormState {
  title: string;
  description: string;
  issue_type: string;
  status: IssueStatus;
  priority: Priority;
  assignee: string;
  parent_id: string;
  due: string | undefined;
  defer: string | undefined;
  // Documentation fields
  design: string;
  acceptance_criteria: string;
  notes: string;
  // Metadata fields
  external_ref: string | undefined;
  estimate: number | undefined;
  // Labels and dependencies
  labels: string[];
  dependencies: IssueDependency[];
}

function IssueEditorModal({ issue, allIssues = [], onClose, onSave }: IssueEditorModalProps) {
  // Form state - working copy of editable fields
  const [formState, setFormState] = useState<FormState>({
    title: issue.title,
    description: issue.description || '',
    issue_type: issue.issue_type || 'task',
    status: issue.status || 'open',
    priority: issue.priority ?? 2,
    assignee: issue.assignee || '',
    parent_id: issue.parent_id || '',
    due: issue.due,
    defer: issue.defer,
    // Documentation fields
    design: issue.design || '',
    acceptance_criteria: issue.acceptance_criteria || '',
    notes: issue.notes || '',
    // Metadata fields
    external_ref: issue.external_ref,
    estimate: issue.estimate,
    // Labels and dependencies
    labels: issue.labels || [],
    dependencies: issue.dependencies || [],
  });

  // Track dirty state
  const [isDirty, setIsDirty] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copy to clipboard state
  const [copied, setCopied] = useState(false);

  // Handle copy issue ID to clipboard
  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(issue.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy issue ID:', err);
    }
  }, [issue.id]);

  // Update dirty state when form values change
  useEffect(() => {
    const titleChanged = formState.title !== issue.title;
    const descriptionChanged = formState.description !== (issue.description || '');
    const typeChanged = formState.issue_type !== (issue.issue_type || 'task');
    const statusChanged = formState.status !== (issue.status || 'open');
    const priorityChanged = formState.priority !== (issue.priority ?? 2);
    const assigneeChanged = formState.assignee !== (issue.assignee || '');
    const parentChanged = formState.parent_id !== (issue.parent_id || '');
    const dueChanged = formState.due !== issue.due;
    const deferChanged = formState.defer !== issue.defer;
    // Documentation fields
    const designChanged = formState.design !== (issue.design || '');
    const acceptanceCriteriaChanged = formState.acceptance_criteria !== (issue.acceptance_criteria || '');
    const notesChanged = formState.notes !== (issue.notes || '');
    // Metadata fields
    const externalRefChanged = formState.external_ref !== issue.external_ref;
    const estimateChanged = formState.estimate !== issue.estimate;
    // Labels and dependencies (array comparison)
    const originalLabels = issue.labels || [];
    const labelsChanged =
      formState.labels.length !== originalLabels.length ||
      formState.labels.some((l, i) => l !== originalLabels[i]);
    const originalDeps = issue.dependencies || [];
    const dependenciesChanged =
      formState.dependencies.length !== originalDeps.length ||
      JSON.stringify(formState.dependencies) !== JSON.stringify(originalDeps);

    setIsDirty(
      titleChanged ||
      descriptionChanged ||
      typeChanged ||
      statusChanged ||
      priorityChanged ||
      assigneeChanged ||
      parentChanged ||
      dueChanged ||
      deferChanged ||
      designChanged ||
      acceptanceCriteriaChanged ||
      notesChanged ||
      externalRefChanged ||
      estimateChanged ||
      labelsChanged ||
      dependenciesChanged
    );
  }, [formState, issue]);

  // Handle title change
  const handleTitleChange = useCallback((newTitle: string) => {
    setFormState((prev) => ({ ...prev, title: newTitle }));
  }, []);

  // Handle description change
  const handleDescriptionChange = useCallback((newDescription: string) => {
    setFormState((prev) => ({ ...prev, description: newDescription }));
  }, []);

  // Handle property change (for PropertiesSection, DatesSection, MetadataSection)
  const handlePropertyChange = useCallback((field: string, value: unknown) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle documentation field changes
  const handleDesignChange = useCallback((newDesign: string) => {
    setFormState((prev) => ({ ...prev, design: newDesign }));
  }, []);

  const handleAcceptanceCriteriaChange = useCallback((newAcceptanceCriteria: string) => {
    setFormState((prev) => ({ ...prev, acceptance_criteria: newAcceptanceCriteria }));
  }, []);

  const handleNotesChange = useCallback((newNotes: string) => {
    setFormState((prev) => ({ ...prev, notes: newNotes }));
  }, []);

  // Handle labels change
  const handleLabelsChange = useCallback((_field: string, newLabels: string[]) => {
    setFormState((prev) => ({ ...prev, labels: newLabels }));
  }, []);

  // Handle dependencies change
  const handleDependenciesChange = useCallback((_field: string, newDependencies: IssueDependency[]) => {
    setFormState((prev) => ({ ...prev, dependencies: newDependencies }));
  }, []);

  // Handle close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmClose) {
        return;
      }
    }
    onClose();
  }, [isDirty, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      // Collect only changed fields
      const updates: Partial<Issue> = {};

      if (formState.title !== issue.title) {
        updates.title = formState.title;
      }

      if (formState.description !== (issue.description || '')) {
        updates.description = formState.description;
      }

      if (formState.issue_type !== (issue.issue_type || 'task')) {
        updates.issue_type = formState.issue_type as Issue['issue_type'];
      }

      if (formState.status !== (issue.status || 'open')) {
        updates.status = formState.status;
      }

      if (formState.priority !== (issue.priority ?? 2)) {
        updates.priority = formState.priority;
      }

      if (formState.assignee !== (issue.assignee || '')) {
        updates.assignee = formState.assignee || undefined;
      }

      if (formState.parent_id !== (issue.parent_id || '')) {
        updates.parent_id = formState.parent_id || undefined;
      }

      console.log('[DEBUG] Date comparison:', {
        'formState.due': formState.due,
        'issue.due': issue.due,
        'dueChanged': formState.due !== issue.due
      });

      // For dates: use empty string instead of undefined when clearing
      // because JSON.stringify strips undefined values
      if (formState.due !== issue.due) {
        updates.due = formState.due ?? '';
      }

      if (formState.defer !== issue.defer) {
        updates.defer = formState.defer ?? '';
      }

      // Documentation fields
      if (formState.design !== (issue.design || '')) {
        updates.design = formState.design || undefined;
      }

      if (formState.acceptance_criteria !== (issue.acceptance_criteria || '')) {
        updates.acceptance_criteria = formState.acceptance_criteria || undefined;
      }

      if (formState.notes !== (issue.notes || '')) {
        updates.notes = formState.notes || undefined;
      }

      // Metadata fields
      if (formState.external_ref !== issue.external_ref) {
        updates.external_ref = formState.external_ref;
      }

      if (formState.estimate !== issue.estimate) {
        updates.estimate = formState.estimate;
      }

      // Labels (array comparison)
      const originalLabels = issue.labels || [];
      const labelsChanged =
        formState.labels.length !== originalLabels.length ||
        formState.labels.some((l, i) => l !== originalLabels[i]);
      if (labelsChanged) {
        updates.labels = formState.labels;
      }

      // Dependencies (array comparison)
      const originalDeps = issue.dependencies || [];
      const dependenciesChanged =
        formState.dependencies.length !== originalDeps.length ||
        JSON.stringify(formState.dependencies) !== JSON.stringify(originalDeps);
      if (dependenciesChanged) {
        updates.dependencies = formState.dependencies;
      }

      // Only save if there are changes
      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [formState, issue, onSave, onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-100">
          <button
            onClick={handleCopyId}
            className="group relative flex items-center gap-2 text-sm text-slate-500 font-mono hover:text-slate-700 transition-colors"
            title="Click to copy issue ID"
          >
            <span className={`transition-all duration-300 ${copied ? 'text-green-600' : ''}`}>
              {issue.id}
            </span>
            <span className={`transition-all duration-300 ${copied ? 'text-green-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </span>
            {/* Floating tooltip */}
            {copied && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                Copied!
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-600 rotate-45" />
              </span>
            )}
          </button>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Two column layout */}
        <div className="flex-1 flex gap-6 p-6 min-h-0">
          {/* Left panel - Main content (65%) - scrollable */}
          <div className="w-[65%] overflow-y-auto space-y-6 pr-2">
              {/* Title Section */}
              <TitleSection value={formState.title} onChange={handleTitleChange} />

              {/* Description Section */}
              <MarkdownSection
                label="Description"
                value={formState.description}
                onChange={handleDescriptionChange}
                placeholder="Add a description..."
                defaultExpanded={true}
              />

              {/* Documentation Fields - Collapsible sections */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                {/* Design Section */}
                <CollapsibleSection title="Design" defaultExpanded={false}>
                  <MarkdownSection
                    label=""
                    value={formState.design}
                    onChange={handleDesignChange}
                    placeholder="Add design..."
                    defaultExpanded={true}
                  />
                </CollapsibleSection>

                {/* Acceptance Criteria Section */}
                <CollapsibleSection title="Acceptance Criteria" defaultExpanded={false}>
                  <MarkdownSection
                    label=""
                    value={formState.acceptance_criteria}
                    onChange={handleAcceptanceCriteriaChange}
                    placeholder="Add acceptance criteria..."
                    defaultExpanded={true}
                  />
                </CollapsibleSection>

                {/* Notes Section */}
                <CollapsibleSection title="Notes" defaultExpanded={false}>
                  <MarkdownSection
                    label=""
                    value={formState.notes}
                    onChange={handleNotesChange}
                    placeholder="Add notes..."
                    defaultExpanded={true}
                  />
                </CollapsibleSection>
              </div>
            </div>

          {/* Right panel - Sidebar (35%) - scrollable with overflow visible for date picker */}
          <div className="w-[35%] overflow-y-auto overflow-x-visible space-y-4">
              {/* Properties Section */}
              <PropertiesSection
                values={formState}
                allIssues={allIssues}
                onChange={handlePropertyChange}
              />

              {/* Dates Section */}
              <DatesSection
                values={formState}
                onChange={handlePropertyChange}
              />

              {/* Metadata Section - collapsed by default */}
              <MetadataSection
                values={formState}
                onChange={handlePropertyChange}
              />

              {/* Timestamps Section - read-only, collapsed by default */}
              <TimestampsSection values={issue} />

              {/* Labels Section */}
              <LabelsSection
                values={formState}
                onChange={handleLabelsChange}
              />

              {/* Dependencies Section */}
              <DependenciesSection
                values={formState}
                allIssues={allIssues}
                onChange={handleDependenciesChange}
                currentIssueId={issue.id}
              />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex items-center justify-between">
          <div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {isDirty && !error && (
              <p className="text-amber-600 text-sm">You have unsaved changes</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving || !isDirty}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IssueEditorModal;
