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
import ProjectSwitcher from '@/components/ProjectSwitcher';

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
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [granularity, setGranularity] = useState<TimeGranularity>(() => {
    const saved = localStorage.getItem('beads-granularity');
    return (saved as TimeGranularity) || 'daily';
  });

  // Global modal state (per arch review: keep local, use overlay layer)
  const [globalModalIssue, setGlobalModalIssue] = useState<Issue | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Current project path from server
  const [currentProjectPath, setCurrentProjectPath] = useState<string>('');

  const metrics = useMetrics(parsedIssues, granularity);

  const fetchCurrentProject = async () => {
    try {
      const res = await fetch('/api/project/current');
      if (!res.ok) throw new Error('Failed to fetch current project');
      const data = await res.json();
      setCurrentProjectPath(data.path || '');
    } catch (err) {
      console.error('Failed to fetch current project:', err);
    }
  };

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
    fetchCurrentProject();

    const socketInstance = io();
    setSocket(socketInstance);

    socketInstance.on('refresh', () => {
      console.log('Data changed, reloading...');
      fetchData();
      fetchCurrentProject();
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

  // Keyboard shortcut: "c" for create new issue (like Gmail's compose)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea or if modifiers are pressed
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // "c" for create new issue
      if (e.key === 'c') {
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

  // Extract project name from current project path
  const projectName = currentProjectPath
    ? currentProjectPath.split('/').pop() || 'Unknown'
    : '';

  // Filter out tombstones for display count
  const activeIssuesCount = parsedIssues.filter((i) => i.status !== 'tombstone').length;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">
                Beads Performance Dashboard
              </h1>
              {projectName && <ProjectSwitcher currentProjectName={projectName} />}
            </div>
            <p className="text-slate-500 text-sm">
              Live View • {activeIssuesCount} issues loaded
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
            loading
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
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

        {/* Tabs - Premium segmented control style */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'table'}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'table'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            onClick={() => setActiveTab('table')}
          >
            Issues
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'board'}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'board'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            onClick={() => setActiveTab('board')}
          >
            Board
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        </div>
      </header>

      {loading && !parsedIssues.length ? (
        <div className="card py-20 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
            </div>
            <p className="text-slate-500 font-medium">Loading issues...</p>
          </div>
        </div>
      ) : error ? (
        <div className="card py-16 text-center border-red-200 bg-red-50/50">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-red-500 hover:text-red-700 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      ) : !metrics ? (
        <div className="card border-dashed border-2 py-16 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-700 font-medium mb-1">No issues found</p>
              <p className="text-slate-500 text-sm">Get started by creating your first issue</p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Create First Issue
            </button>
          </div>
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
