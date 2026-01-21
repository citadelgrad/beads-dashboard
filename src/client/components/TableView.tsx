import { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  ArrowDown,
  ArrowDownFromLine,
  ArrowUp,
  ArrowUpDown,
  Bug,
  Box,
  Boxes,
  ListCheck,
  Filter,
  FilterX,
  ChevronDown,
  ChevronRight,
  Play,
  Check,
  Search,
  LayoutList,
  Network,
} from 'lucide-react';
import type { Issue, IssueStatus, Priority } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';
import IssueEditorModal from './IssueEditorModal';
import CopyableId from './CopyableId';
import DateBadge from './DateBadge';

interface TableViewProps {
  issues: Issue[];
}

function TableView({ issues }: TableViewProps) {
  const [filterText, setFilterText] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Epics view toggle with localStorage persistence
  const [showEpicsView, setShowEpicsView] = useState<boolean>(() => {
    const saved = localStorage.getItem('beads-show-epics-view');
    return saved === 'true';
  });

  // Expanded epics tracking
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('beads-expanded-epics');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Epics view: show closed toggle (default: hide closed)
  const [showClosedEpics, setShowClosedEpics] = useState<boolean>(() => {
    const saved = localStorage.getItem('beads-show-closed-epics');
    return saved === 'true';
  });

  // Sorting state (default: priority ascending = highest priority first)
  type SortColumn = 'id' | 'title' | 'type' | 'priority' | 'status';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>(() => {
    const saved = localStorage.getItem('beads-sort-column');
    return (saved as SortColumn) || 'priority';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const saved = localStorage.getItem('beads-sort-direction');
    return (saved as SortDirection) || 'asc';
  });

  // Column filters with localStorage persistence
  const [statusFilter, setStatusFilter] = useState<IssueStatus[]>(() => {
    const saved = localStorage.getItem('beads-filter-status');
    return saved ? JSON.parse(saved) : [];
  });
  const [typeFilter, setTypeFilter] = useState<string[]>(() => {
    const saved = localStorage.getItem('beads-filter-type');
    return saved ? JSON.parse(saved) : [];
  });
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(() => {
    const saved = localStorage.getItem('beads-filter-priority');
    return saved ? JSON.parse(saved) : [];
  });

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Quick action state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingPriority, setUpdatingPriority] = useState<string | null>(null);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('beads-filter-status', JSON.stringify(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('beads-filter-type', JSON.stringify(typeFilter));
  }, [typeFilter]);

  useEffect(() => {
    localStorage.setItem('beads-filter-priority', JSON.stringify(priorityFilter));
  }, [priorityFilter]);

  // Persist epics view state
  useEffect(() => {
    localStorage.setItem('beads-show-epics-view', String(showEpicsView));
  }, [showEpicsView]);

  useEffect(() => {
    localStorage.setItem('beads-expanded-epics', JSON.stringify([...expandedEpics]));
  }, [expandedEpics]);

  useEffect(() => {
    localStorage.setItem('beads-show-closed-epics', String(showClosedEpics));
  }, [showClosedEpics]);

  useEffect(() => {
    localStorage.setItem('beads-sort-column', sortColumn);
  }, [sortColumn]);

  useEffect(() => {
    localStorage.setItem('beads-sort-direction', sortDirection);
  }, [sortDirection]);

  // Handle column sort click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending (highest priority first for priority)
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort function for issues
  const sortIssues = <T extends Issue>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'type':
          comparison = a.issue_type.localeCompare(b.issue_type);
          break;
        case 'priority':
          // Lower number = higher priority, so ascending means P0 first
          comparison = a.priority - b.priority;
          break;
        case 'status':
          const statusOrder = ['in_progress', 'open', 'blocked', 'deferred', 'closed'];
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  // Priority icons mapping
  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 0: return <AlertOctagon className="w-3.5 h-3.5" />;
      case 1: return <AlertTriangle className="w-3.5 h-3.5" />;
      case 2: return <ArrowUp className="w-3.5 h-3.5" />;
      case 3: return <ArrowDown className="w-3.5 h-3.5" />;
      case 4: return <ArrowDownFromLine className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  // Type icons mapping
  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'bug') return <Bug className="w-3 h-3" />;
    if (t === 'feature') return <Box className="w-3 h-3" />;
    if (t === 'epic') return <Boxes className="w-3 h-3" />;
    return <ListCheck className="w-3 h-3" />; // Default (Task)
  };

  // Get unique values for filters
  const uniqueStatuses = Array.from(
    new Set(issues.filter((i) => i.status !== 'tombstone').map((i) => i.status))
  ).sort();

  const uniqueTypes = Array.from(
    new Set(
      issues
        .filter((i) => i.status !== 'tombstone' && i.issue_type)
        .map((i) => i.issue_type)
    )
  ).sort();

  const uniquePriorities = Array.from(
    new Set(
      issues
        .filter((i) => i.status !== 'tombstone' && i.priority !== undefined)
        .map((i) => i.priority)
    )
  ).sort((a, b) => a - b);

  // Filter issues based on all criteria
  const filteredIssues = sortIssues(issues.filter((issue) => {
    // 1. Exclude deleted issues
    if (issue.status === 'tombstone') return false;

    // 2. Apply column filters
    if (statusFilter.length > 0 && !statusFilter.includes(issue.status)) {
      return false;
    }
    if (typeFilter.length > 0 && !typeFilter.includes(issue.issue_type)) {
      return false;
    }
    if (priorityFilter.length > 0 && !priorityFilter.includes(issue.priority)) {
      return false;
    }

    // 3. Apply text filter if present
    if (!filterText) return true;

    const searchLower = filterText.toLowerCase();
    const idMatch = issue.id.toLowerCase().includes(searchLower);
    const titleMatch = (issue.title || '').toLowerCase().includes(searchLower);
    const statusMatch = issue.status.toLowerCase().includes(searchLower);
    const typeMatch = (issue.issue_type || '').toLowerCase().includes(searchLower);

    const priorityLabel = PRIORITY_LABELS[issue.priority] || '';
    const priorityMatch = priorityLabel.toLowerCase().includes(searchLower);

    return idMatch || titleMatch || statusMatch || typeMatch || priorityMatch;
  }));

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 0:
        return 'bg-red-100 text-red-800 border border-red-200';
      case 1:
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 2:
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 3:
        return 'bg-green-100 text-green-800 border border-green-200';
      case 4:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  const getTypeInfo = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'bug')
      return {
        class: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
        icon: <Bug className="w-3 h-3" />,
      };
    if (t === 'feature')
      return {
        class: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10',
        icon: <Box className="w-3 h-3" />,
      };
    if (t === 'epic')
      return {
        class: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10',
        icon: <Boxes className="w-3 h-3" />,
      };
    return {
      class: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
      icon: <ListCheck className="w-3 h-3" />,
    };
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Filter management functions
  const toggleFilterValue = (filterType: string, value: string | number) => {
    if (filterType === 'status') {
      const newFilter = statusFilter.includes(value as IssueStatus)
        ? statusFilter.filter((v) => v !== value)
        : [...statusFilter, value as IssueStatus];
      setStatusFilter(newFilter);
    } else if (filterType === 'type') {
      const newFilter = typeFilter.includes(value as string)
        ? typeFilter.filter((v) => v !== value)
        : [...typeFilter, value as string];
      setTypeFilter(newFilter);
    } else if (filterType === 'priority') {
      const newFilter = priorityFilter.includes(value as Priority)
        ? priorityFilter.filter((v) => v !== value)
        : [...priorityFilter, value as Priority];
      setPriorityFilter(newFilter);
    }
  };

  const clearFilter = (filterType: string) => {
    if (filterType === 'status') setStatusFilter([]);
    else if (filterType === 'type') setTypeFilter([]);
    else if (filterType === 'priority') setPriorityFilter([]);
  };

  const clearAllFilters = () => {
    setStatusFilter([]);
    setTypeFilter([]);
    setPriorityFilter([]);
  };

  const hasActiveFilters =
    statusFilter.length > 0 || typeFilter.length > 0 || priorityFilter.length > 0;

  // Toggle epic expansion
  const toggleEpicExpansion = (epicId: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  // Get children for an epic (issues that depend on this epic or have it as parent)
  const getEpicChildren = (epicId: string): Issue[] => {
    return issues.filter((issue) => {
      if (issue.status === 'tombstone' || issue.id === epicId) return false;

      // Check if issue has this epic as parent_id
      if (issue.parent_id === epicId) return true;

      // Check if issue depends on this epic (new structure: array of objects)
      if (issue.dependencies && Array.isArray(issue.dependencies)) {
        const hasDependency = issue.dependencies.some(
          (dep) => typeof dep === 'object' && dep.depends_on_id === epicId
        );
        if (hasDependency) return true;
      }

      // Check blocked_by (legacy: array of strings)
      if (issue.blocked_by && issue.blocked_by.includes(epicId)) return true;

      return false;
    });
  };

  // Calculate progress for an epic
  const calculateEpicProgress = (children: Issue[]) => {
    if (children.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = children.filter((c) => c.status === 'closed').length;
    const percentage = Math.round((completed / children.length) * 100);
    return { completed, total: children.length, percentage };
  };

  // Get all epics with their children and progress
  const epicsWithChildren = issues
    .filter((issue) => issue.issue_type === 'epic' && issue.status !== 'tombstone')
    .map((epic) => {
      const children = sortIssues(getEpicChildren(epic.id)); // Sort children too
      const progress = calculateEpicProgress(children);
      return { epic, children, progress };
    })
    .filter((e) => {
      // Filter closed epics unless showClosedEpics is true
      if (!showClosedEpics && e.epic.status === 'closed') return false;

      // Apply priority filter
      if (priorityFilter.length > 0 && !priorityFilter.includes(e.epic.priority)) return false;

      // Apply text search
      if (filterText) {
        const searchLower = filterText.toLowerCase();
        const idMatch = e.epic.id.toLowerCase().includes(searchLower);
        const titleMatch = (e.epic.title || '').toLowerCase().includes(searchLower);
        if (!idMatch && !titleMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort epics using the same sort column/direction
      let comparison = 0;
      switch (sortColumn) {
        case 'id':
          comparison = a.epic.id.localeCompare(b.epic.id);
          break;
        case 'title':
          comparison = (a.epic.title || '').localeCompare(b.epic.title || '');
          break;
        case 'priority':
          comparison = a.epic.priority - b.epic.priority;
          break;
        case 'status':
          const statusOrder = ['in_progress', 'open', 'blocked', 'deferred', 'closed'];
          comparison = statusOrder.indexOf(a.epic.status) - statusOrder.indexOf(b.epic.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Open the editor modal
  const openIssueEditor = useCallback((issue: Issue) => {
    setSelectedIssue(issue);
  }, []);

  // Close the editor modal
  const closeIssueEditor = useCallback(() => {
    setSelectedIssue(null);
  }, []);

  // Save handler for the editor modal - calls PATCH API
  const handleSaveIssue = useCallback(async (updates: Partial<Issue>) => {
    if (!selectedIssue) return;

    const res = await fetch(`/api/issues/${selectedIssue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update issue');
    }

    // The socket.io refresh will update the issues automatically
  }, [selectedIssue]);

  const handleStatusUpdate = async (issueId: string, newStatus: IssueStatus) => {
    setUpdatingStatus(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handlePriorityUpdate = async (issueId: string, newPriority: Priority) => {
    setUpdatingPriority(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update priority');
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to update priority: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdatingPriority(null);
    }
  };

  // FilterDropdown component
  interface FilterDropdownProps {
    column: string;
    values: (string | number)[];
    activeFilters: (string | number)[];
    onToggle: (value: string | number) => void;
    onClear: () => void;
  }

  const FilterDropdown = ({ column, values, activeFilters, onToggle, onClear }: FilterDropdownProps) => {
    const isOpen = openDropdown === column;
    const hasFilters = activeFilters.length > 0;

    const getDisplayValue = (value: string | number) => {
      if (column === 'priority') {
        return PRIORITY_LABELS[value as Priority] || value;
      }
      return value;
    };

    return (
      <div className="relative inline-block">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : column);
          }}
          className={`ml-2 p-1 rounded transition-colors ${
            hasFilters
              ? 'text-blue-600 hover:text-blue-700 bg-blue-50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          title={hasFilters ? `Filtered (${activeFilters.length})` : 'Filter'}
        >
          {hasFilters ? <Filter className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isOpen && (
          <div
            className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-600 uppercase">Filter</span>
              {hasFilters && (
                <button
                  onClick={() => onClear()}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {values.map((value) => {
                const isSelected = activeFilters.includes(value);
                const displayValue = getDisplayValue(value);

                return (
                  <label
                    key={value}
                    className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(value)}
                      className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`capitalize ${
                        isSelected ? 'font-medium text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {displayValue}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="card overflow-hidden">
        {/* Search Control and View Toggle */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Filter by ID, Title, Status, Type, or Priority..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            {/* Epics View Toggle */}
            <button
              onClick={() => setShowEpicsView(!showEpicsView)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showEpicsView
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
              title={showEpicsView ? 'Switch to flat list view' : 'Switch to epics view'}
            >
              {showEpicsView ? (
                <>
                  <Network className="w-4 h-4" />
                  <span>Epics View</span>
                </>
              ) : (
                <>
                  <LayoutList className="w-4 h-4" />
                  <span>Flat List</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <div className="px-4 py-2 border-b border-slate-200 bg-blue-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              {statusFilter.length + typeFilter.length + priorityFilter.length} filter(s) active
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          </div>
        )}

        {/* Shared Header Row */}
        <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
          {/* Expand button space (epics only) */}
          {showEpicsView && <div className="w-8"></div>}

          {/* ID - sortable */}
          <button
            onClick={() => handleSort('id')}
            className="w-20 flex items-center hover:text-slate-900 transition-colors"
          >
            ID
            <SortIndicator column="id" />
          </button>

          {/* Title - sortable */}
          <button
            onClick={() => handleSort('title')}
            className="flex-1 flex items-center text-left hover:text-slate-900 transition-colors"
          >
            Title
            <SortIndicator column="title" />
          </button>

          {/* Progress (epics only) - not sortable */}
          {showEpicsView && <div className="w-40">Progress</div>}

          {/* Type (flat list only) - sortable with filter */}
          {!showEpicsView && (
            <div className="w-24 flex items-center">
              <button
                onClick={() => handleSort('type')}
                className="flex items-center hover:text-slate-900 transition-colors"
              >
                Type
                <SortIndicator column="type" />
              </button>
              <FilterDropdown
                column="type"
                values={uniqueTypes}
                activeFilters={typeFilter}
                onToggle={(value) => toggleFilterValue('type', value)}
                onClear={() => clearFilter('type')}
              />
            </div>
          )}

          {/* Priority - sortable with filter */}
          <div className="w-24 flex items-center">
            <button
              onClick={() => handleSort('priority')}
              className="flex items-center hover:text-slate-900 transition-colors"
            >
              Priority
              <SortIndicator column="priority" />
            </button>
            <FilterDropdown
              column="priority"
              values={uniquePriorities}
              activeFilters={priorityFilter}
              onToggle={(value) => toggleFilterValue('priority', value)}
              onClear={() => clearFilter('priority')}
            />
          </div>

          {/* Status - sortable with filter/toggle */}
          <div className="w-28 flex items-center">
            <button
              onClick={() => handleSort('status')}
              className="flex items-center hover:text-slate-900 transition-colors"
            >
              Status
              <SortIndicator column="status" />
            </button>
            {showEpicsView ? (
              <button
                onClick={() => setShowClosedEpics(!showClosedEpics)}
                className={`ml-2 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  showClosedEpics
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                }`}
                title={showClosedEpics ? 'Showing all epics' : 'Showing open epics only'}
              >
                {showClosedEpics ? 'All' : 'Open'}
              </button>
            ) : (
              <FilterDropdown
                column="status"
                values={uniqueStatuses}
                activeFilters={statusFilter}
                onToggle={(value) => toggleFilterValue('status', value)}
                onClear={() => clearFilter('status')}
              />
            )}
          </div>

          {/* Actions */}
          <div className="w-20 text-right">Actions</div>
        </div>

        {/* Conditional View: Epics or Flat List */}
        {showEpicsView ? (
          /* Epics View */
          <div className="divide-y divide-slate-100">
              {epicsWithChildren.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-2">No epics found</p>
                <p className="text-sm text-slate-400">
                  Create an epic using: <code className="bg-slate-100 px-2 py-0.5 rounded">bd create --type=epic --title="..."</code>
                </p>
              </div>
            ) : (
              epicsWithChildren.map(({ epic, children, progress }) => {
                const isExpanded = expandedEpics.has(epic.id);
                const shortId = epic.id.includes('-') ? epic.id.split('-').pop() : epic.id;
                const priorityLabel = PRIORITY_LABELS[epic.priority] || epic.priority;

                return (
                  <div key={epic.id} className="bg-white">
                    {/* Epic Row - aligned with shared header */}
                    <div
                      className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleEpicExpansion(epic.id)}
                    >
                      {/* Expand/Collapse */}
                      <button className="w-8 flex justify-center text-slate-400 hover:text-slate-600">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      {/* ID */}
                      <div className="w-20 flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <CopyableId fullId={epic.id} displayId={shortId} showIcon={false} />
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openIssueEditor(epic);
                          }}
                          className="font-medium text-slate-900 hover:text-blue-600 text-left truncate"
                        >
                          {epic.title || 'Untitled'}
                        </button>
                        <DateBadge due={epic.due} defer={epic.defer} compact />
                      </div>

                      {/* Progress Bar */}
                      <div className="w-40 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progress.percentage === 100
                                ? 'bg-green-500'
                                : progress.percentage > 0
                                ? 'bg-blue-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-16 text-right">
                          {progress.completed}/{progress.total}
                        </span>
                      </div>

                      {/* Priority */}
                      <div className="w-24">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(epic.priority)}`}>
                          {getPriorityIcon(epic.priority)}
                          {priorityLabel}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="w-28">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                            ${
                              epic.status === 'closed'
                                ? 'bg-green-100 text-green-800'
                                : epic.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : epic.status === 'blocked'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                        >
                          {epic.status}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="w-20 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {epic.status !== 'closed' && epic.status !== 'in_progress' && (
                          <button
                            onClick={() => handleStatusUpdate(epic.id, 'in_progress')}
                            disabled={updatingStatus === epic.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="Start Progress"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {epic.status !== 'closed' && (
                          <button
                            onClick={() => handleStatusUpdate(epic.id, 'closed')}
                            disabled={updatingStatus === epic.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Close Epic"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Children (expanded) */}
                    {isExpanded && (
                      <div className="bg-slate-50/50 border-t border-slate-100">
                        {children.length === 0 ? (
                          <div className="px-6 py-4 pl-16 text-sm text-slate-400 italic">
                            No child issues linked to this epic
                          </div>
                        ) : (
                          children.map((child, idx) => {
                            const childShortId = child.id.includes('-') ? child.id.split('-').pop() : child.id;
                            const isLast = idx === children.length - 1;
                            const childTypeInfo = getTypeInfo(child.issue_type);

                            return (
                              <div
                                key={child.id}
                                className="flex items-center gap-4 px-6 py-2 pl-16 hover:bg-slate-100/50 group"
                              >
                                {/* Tree connector */}
                                <span className="text-slate-300 font-mono text-sm w-4">
                                  {isLast ? '└' : '├'}
                                </span>

                                {/* Status indicator */}
                                <span className="flex-shrink-0">
                                  {child.status === 'closed' ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : child.status === 'in_progress' ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                  ) : child.status === 'blocked' ? (
                                    <AlertOctagon className="w-4 h-4 text-red-500" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                  )}
                                </span>

                                {/* Child ID */}
                                <CopyableId fullId={child.id} displayId={childShortId} showIcon={false} className="text-xs w-12" />

                                {/* Type badge */}
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${childTypeInfo.class}`}>
                                  {childTypeInfo.icon}
                                </span>

                                {/* Title */}
                                <button
                                  onClick={() => openIssueEditor(child)}
                                  className="flex-1 text-sm text-slate-700 hover:text-blue-600 text-left truncate"
                                >
                                  {child.title || 'Untitled'}
                                </button>
                                <DateBadge due={child.due} defer={child.defer} compact />

                                {/* Priority */}
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${getPriorityStyle(child.priority)}`}>
                                  {getPriorityIcon(child.priority)}
                                </span>

                                {/* Quick actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {child.status !== 'closed' && child.status !== 'in_progress' && (
                                    <button
                                      onClick={() => handleStatusUpdate(child.id, 'in_progress')}
                                      disabled={updatingStatus === child.id}
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                                      title="Start Progress"
                                    >
                                      <Play className="w-3 h-3" />
                                    </button>
                                  )}
                                  {child.status !== 'closed' && (
                                    <button
                                      onClick={() => handleStatusUpdate(child.id, 'closed')}
                                      disabled={updatingStatus === child.id}
                                      className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                                      title="Close Issue"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Flat List View - flexbox rows matching epics view */
          <div className="divide-y divide-slate-100">
            {filteredIssues.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ListCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No issues found matching "{filterText}"</p>
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const created = new Date(issue.created_at);
                const updated = issue.updated_at ? new Date(issue.updated_at) : null;
                const isClosed = issue.status === 'closed';
                const today = new Date();
                const ageInDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                const isStale = !isClosed && ageInDays > 30;
                const priorityLabel = PRIORITY_LABELS[issue.priority] || issue.priority;
                const shortId = issue.id.includes('-') ? issue.id.split('-').pop() : issue.id;
                const typeInfo = getTypeInfo(issue.issue_type);

                return (
                  <div key={issue.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 group">
                    {/* ID */}
                    <div className="w-20 flex items-center gap-2">
                      {typeInfo.icon}
                      <CopyableId fullId={issue.id} displayId={shortId} showIcon={false} />
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <button
                        onClick={() => openIssueEditor(issue)}
                        className="font-medium text-slate-900 hover:text-blue-600 text-left truncate"
                      >
                        {issue.title || 'Untitled'}
                      </button>
                      <DateBadge due={issue.due} defer={issue.defer} compact />
                      {isStale && (
                        <span className="text-xs text-red-600 font-medium">{ageInDays}d</span>
                      )}
                    </div>

                    {/* Type */}
                    <div className="w-24">
                      <span className={`capitalize inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeInfo.class}`}>
                        {issue.issue_type}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="w-24">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(issue.priority)}`}>
                        {getPriorityIcon(issue.priority)}
                        {priorityLabel}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="w-28">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${
                            issue.status === 'closed'
                              ? 'bg-green-100 text-green-800'
                              : issue.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : issue.status === 'blocked'
                              ? 'bg-red-100 text-red-800'
                              : issue.status === 'deferred'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                      >
                        {issue.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="w-20 flex items-center justify-end gap-1">
                      {issue.status !== 'closed' && issue.status !== 'in_progress' && (
                        <button
                          onClick={() => handleStatusUpdate(issue.id, 'in_progress')}
                          disabled={updatingStatus === issue.id}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                          title="Start Progress"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {issue.status !== 'closed' && (
                        <button
                          onClick={() => handleStatusUpdate(issue.id, 'closed')}
                          disabled={updatingStatus === issue.id}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                          title="Close Issue"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Issue Editor Modal */}
      {selectedIssue && (
        <IssueEditorModal
          issue={selectedIssue}
          allIssues={issues}
          onClose={closeIssueEditor}
          onSave={handleSaveIssue}
        />
      )}
    </>
  );
}

export default TableView;
