import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Issue, TimeGranularity, CreateIssueRequest } from '@shared/types';
import { useMetrics } from '@/hooks/useMetrics';
import DashboardView from '@/components/DashboardView';
import TableView from '@/components/TableView';
import KanbanBoard from '@/components/KanbanBoard';
import SearchBar from '@/components/SearchBar';
import NewIssueButton from '@/components/NewIssueButton';
import IssueCreatorModal from '@/components/IssueCreatorModal';
import IssueEditorModal from '@/components/IssueEditorModal';

function App() {
  const [parsedIssues, setParsedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'board' | 'dashboard'>(() => {
    const saved = localStorage.getItem('beads-active-tab');
    if (saved === 'table' || saved === 'board' || saved === 'dashboard') {
      return saved;
    }
    return 'table';
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [granularity, setGranularity] = useState<TimeGranularity>(() => {
    const saved = localStorage.getItem('beads-granularity');
    return (saved as TimeGranularity) || 'daily';
  });

  // Global modal state (per arch review: keep local, use overlay layer)
  const [globalModalIssue, setGlobalModalIssue] = useState<Issue | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const metrics = useMetrics(parsedIssues, granularity);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setParsedIssues(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socketInstance = io();
    setSocket(socketInstance);

    socketInstance.on('refresh', () => {
      console.log('Data changed, reloading...');
      fetchData();
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Persist granularity to localStorage
  useEffect(() => {
    localStorage.setItem('beads-granularity', granularity);
  }, [granularity]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('beads-active-tab', activeTab);
  }, [activeTab]);

  // Keyboard shortcuts (Cmd+Shift+K for search, Cmd+N for create)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd+Shift+K or Ctrl+Shift+K for search
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault();
        if (searchFocusCallback.current) {
          searchFocusCallback.current();
        }
      }

      // Cmd+N or Ctrl+N for create
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setCreateModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // SearchBar focus callback ref
  const searchFocusCallback = useRef<(() => void) | null>(null);

  // Handle search selection (open in global modal)
  const handleSearchSelect = useCallback((issue: Issue) => {
    setGlobalModalIssue(issue);
  }, []);

  // Handle issue creation
  const handleCreateIssue = useCallback(async (data: CreateIssueRequest) => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create issue');
    }

    setCreateModalOpen(false);
    // Data will refresh via socket
  }, []);

  // Handle issue save (for global modal)
  const handleIssueSave = useCallback(async (updates: Partial<Issue>) => {
    if (!globalModalIssue) return;

    const res = await fetch(`/api/issues/${globalModalIssue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update issue');
    }

    setGlobalModalIssue(null);
    // Data will refresh via socket
  }, [globalModalIssue]);

  // Extract project name from issue IDs
  const projectName = parsedIssues.length > 0
    ? parsedIssues[0].id.substring(0, parsedIssues[0].id.lastIndexOf('-'))
    : '';

  // Filter out tombstones for display count
  const activeIssuesCount = parsedIssues.filter((i) => i.status !== 'tombstone').length;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {projectName && (
                <span className="text-slate-500 font-normal">{projectName} / </span>
              )}
              Beads Performance Dashboard
            </h1>
            <p className="text-slate-500 text-sm">
              Live View • {activeIssuesCount} issues loaded
            </p>
          </div>
          <div className="text-xs text-slate-400">
            {loading ? 'Connecting...' : 'Connected'}
          </div>
        </div>

        {/* Search + Create row */}
        <div className="flex items-center gap-4 mb-4">
          <SearchBar
            issues={parsedIssues}
            onSelectIssue={handleSearchSelect}
            onFocusRequest={(focusFn) => { searchFocusCallback.current = focusFn; }}
          />
          <NewIssueButton onClick={() => setCreateModalOpen(true)} />
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-slate-200">
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'table'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('table')}
          >
            Issues
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'board'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('board')}
          >
            Board
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        </div>
      </header>

      {loading && !parsedIssues.length ? (
        <div className="card py-20 text-center text-slate-400">Loading data...</div>
      ) : error ? (
        <div className="card py-20 text-center text-red-500">{error}</div>
      ) : !metrics ? (
        <div className="card border-dashed border-2 py-20 text-center text-slate-400">
          No issues found in .beads directory.
        </div>
      ) : activeTab === 'table' ? (
        <TableView issues={parsedIssues} />
      ) : activeTab === 'board' ? (
        <KanbanBoard issues={parsedIssues} />
      ) : (
        <DashboardView
          metrics={metrics}
          granularity={granularity}
          onGranularityChange={setGranularity}
        />
      )}

      {/* Global modals (overlay layer, per arch review) */}
      {globalModalIssue && (
        <IssueEditorModal
          issue={globalModalIssue}
          allIssues={parsedIssues}
          onClose={() => setGlobalModalIssue(null)}
          onSave={handleIssueSave}
        />
      )}
      {createModalOpen && (
        <IssueCreatorModal
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreateIssue}
        />
      )}
    </div>
  );
}

export default App;
