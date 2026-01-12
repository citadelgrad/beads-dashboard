function TableView({ issues }) {
  const [filterText, setFilterText] = React.useState("");
  const [activeDescription, setActiveDescription] = React.useState(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Column filters with localStorage persistence
  const [statusFilter, setStatusFilter] = React.useState(() => {
    const saved = localStorage.getItem('beads-filter-status');
    return saved ? JSON.parse(saved) : [];
  });
  const [typeFilter, setTypeFilter] = React.useState(() => {
    const saved = localStorage.getItem('beads-filter-type');
    return saved ? JSON.parse(saved) : [];
  });
  const [priorityFilter, setPriorityFilter] = React.useState(() => {
    const saved = localStorage.getItem('beads-filter-priority');
    return saved ? JSON.parse(saved) : [];
  });

  // Dropdown state
  const [openDropdown, setOpenDropdown] = React.useState(null);

  // Quick action state
  const [updatingStatus, setUpdatingStatus] = React.useState(null);

  const PRIORITIES = ["Critical", "High", "Medium", "Low", "Lowest"];

  // Persist filters to localStorage
  React.useEffect(() => {
    localStorage.setItem('beads-filter-status', JSON.stringify(statusFilter));
  }, [statusFilter]);

  React.useEffect(() => {
    localStorage.setItem('beads-filter-type', JSON.stringify(typeFilter));
  }, [typeFilter]);

  React.useEffect(() => {
    localStorage.setItem('beads-filter-priority', JSON.stringify(priorityFilter));
  }, [priorityFilter]);

  // Icons
  const Icons = {
    Critical: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    High: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    Medium: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    Low: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    ),
    "Lowest": (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 18L12 22L16 18" />
        <path d="M12 2V22" />
      </svg>
    ),
    Copy: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    ),
    PanelTopOpen: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
      </svg>
    ),
    Close: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    ),
    Edit: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
    Bug: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 2 1.88 1.88" />
        <path d="M14.12 3.88 16 2" />
        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.31 0-6-2.69-6-6v-3h12v3c0 3.31-2.69 6-6 6Z" />
        <path d="M12 11v9" />
        <path d="M6 13H2" />
        <path d="M22 13h-4" />
        <path d="M14.67 17.15 17.5 19.13" />
        <path d="m6.5 19.13 2.83-1.98" />
        <path d="m17.5 8.87-2.83 1.98" />
        <path d="m6.5 8.87 2.83 1.98" />
      </svg>
    ),
    Box: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
    Boxes: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71Z" />
        <path d="m3 14.26 3 1.71 3-1.71" />
        <path d="M6 21.21v-5.24" />
        <path d="M13.26 12.83a2 2 0 0 0-1.26 1.8v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-2.74 1.57Z" />
        <path d="m13 14.26 3 1.71 3-1.71" />
        <path d="M16 21.21v-5.24" />
        <path d="M7.97 4.42A2 2 0 0 0 7 6.13v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71V6.13a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71Z" />
        <path d="m8 5.76 3 1.71 3-1.71" />
        <path d="M11 12.71V7.47" />
      </svg>
    ),
    ListCheck: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 18H3" />
        <path d="m15 18 2 2 4-4" />
        <path d="M16 12H3" />
        <path d="M16 6H3" />
      </svg>
    ),
    Filter: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    ),
    FilterX: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.055" />
        <path d="m22 3-5 5" />
        <path d="m17 3 5 5" />
      </svg>
    ),
    ChevronDown: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    Play: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    Check: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  };

  // Get unique values for filters
  const uniqueStatuses = React.useMemo(() => {
    const statuses = new Set();
    issues.forEach(i => {
      if (i.status !== 'tombstone') statuses.add(i.status);
    });
    return Array.from(statuses).sort();
  }, [issues]);

  const uniqueTypes = React.useMemo(() => {
    const types = new Set();
    issues.forEach(i => {
      if (i.status !== 'tombstone' && i.issue_type) types.add(i.issue_type);
    });
    return Array.from(types).sort();
  }, [issues]);

  const uniquePriorities = React.useMemo(() => {
    const priorities = new Set();
    issues.forEach(i => {
      if (i.status !== 'tombstone' && i.priority !== undefined) {
        priorities.add(i.priority);
      }
    });
    return Array.from(priorities).sort((a, b) => a - b);
  }, [issues]);

  // Filter issues based on all criteria
  const filteredIssues = issues.filter((issue) => {
    // 1. Exclude deleted issues
    if (issue.status === "tombstone") return false;

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
    const titleMatch = (issue.title || "").toLowerCase().includes(searchLower);
    const statusMatch = issue.status.toLowerCase().includes(searchLower);
    const typeMatch = (issue.issue_type || "").toLowerCase().includes(
      searchLower
    );

    // Map priority index to string for searching
    const priorityLabel = PRIORITIES[issue.priority] || "";
    const priorityMatch = priorityLabel.toLowerCase().includes(searchLower);

    return idMatch || titleMatch || statusMatch || typeMatch || priorityMatch;
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 0:
        return "bg-red-100 text-red-800 border border-red-200"; // Critical
      case 1:
        return "bg-orange-100 text-orange-800 border border-orange-200"; // High
      case 2:
        return "bg-yellow-100 text-yellow-800 border border-yellow-200"; // Medium
      case 3:
        return "bg-green-100 text-green-800 border border-green-200"; // Low
      case 4:
        return "bg-slate-100 text-slate-800 border border-slate-200"; // Lowest
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
    }
  };

  const getTypeInfo = (type) => {
    const t = (type || "").toLowerCase();
    if (t === "bug")
      return {
        class: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
        icon: Icons.Bug,
      };
    if (t === "feature")
      return {
        class:
          "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10",
        icon: Icons.Box,
      };
    if (t === "epic")
      return {
        class:
          "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10",
        icon: Icons.Boxes,
      };
    return {
      class: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10",
      icon: Icons.ListCheck,
    }; // Default (Task)
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here, but for now we'll rely on user action
  };

  // Filter management functions
  const toggleFilterValue = (filterType, value) => {
    const setterMap = {
      status: setStatusFilter,
      type: setTypeFilter,
      priority: setPriorityFilter,
    };
    const filterMap = {
      status: statusFilter,
      type: typeFilter,
      priority: priorityFilter,
    };

    const currentFilter = filterMap[filterType];
    const setter = setterMap[filterType];

    if (currentFilter.includes(value)) {
      setter(currentFilter.filter(v => v !== value));
    } else {
      setter([...currentFilter, value]);
    }
  };

  const clearFilter = (filterType) => {
    if (filterType === 'status') setStatusFilter([]);
    else if (filterType === 'type') setTypeFilter([]);
    else if (filterType === 'priority') setPriorityFilter([]);
  };

  const clearAllFilters = () => {
    setStatusFilter([]);
    setTypeFilter([]);
    setPriorityFilter([]);
  };

  const hasActiveFilters = statusFilter.length > 0 || typeFilter.length > 0 || priorityFilter.length > 0;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const openDescription = (issue) => {
    setActiveDescription(issue);
    setEditValue(issue.description || "");
    setIsEditing(false);
  };

  const closeDescription = () => {
    setActiveDescription(null);
    setIsEditing(false);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!activeDescription) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/issues/${activeDescription.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      // Close modal, data refresh will happen via socket
      closeDescription();
    } catch (err) {
      console.error(err);
      alert("Failed to save description");
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (issueId, newStatus) => {
    setUpdatingStatus(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }
      // Data refresh will happen via socket
    } catch (err) {
      console.error(err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // FilterDropdown component
  const FilterDropdown = ({ column, values, activeFilters, onToggle, onClear }) => {
    const isOpen = openDropdown === column;
    const hasFilters = activeFilters.length > 0;

    const getDisplayValue = (value) => {
      if (column === 'priority') {
        return PRIORITIES[value] || value;
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
          {hasFilters ? Icons.Filter : Icons.ChevronDown}
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
                    <span className={`capitalize ${isSelected ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
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
        {/* Search Control */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by ID, Title, Status, Type, or Priority..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {/* Search Icon SVG */}
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
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
              {Icons.FilterX}
              Clear All Filters
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    Type
                    <FilterDropdown
                      column="type"
                      values={uniqueTypes}
                      activeFilters={typeFilter}
                      onToggle={(value) => toggleFilterValue('type', value)}
                      onClear={() => clearFilter('type')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    Priority
                    <FilterDropdown
                      column="priority"
                      values={uniquePriorities}
                      activeFilters={priorityFilter}
                      onToggle={(value) => toggleFilterValue('priority', value)}
                      onClear={() => clearFilter('priority')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    Status
                    <FilterDropdown
                      column="status"
                      values={uniqueStatuses}
                      activeFilters={statusFilter}
                      onToggle={(value) => toggleFilterValue('status', value)}
                      onClear={() => clearFilter('status')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3">Cycle Time</th>
                <th className="px-6 py-3">Age</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.map((issue) => {
                const created = new Date(issue.created_at);
                const updated = issue.updated_at
                  ? new Date(issue.updated_at)
                  : null;
                const isClosed = issue.status === "closed";
                const today = new Date();
                const ageInDays = Math.floor(
                  (today - created) / (1000 * 60 * 60 * 24)
                );
                const isStale = !isClosed && ageInDays > 30;

                let cycleTime = "-";
                let age = "-";

                if (isClosed && updated) {
                  const diff = Math.ceil(
                    (updated - created) / (1000 * 60 * 60 * 24)
                  );
                  cycleTime = `${diff}d`;
                } else {
                  age = `${ageInDays}d`;
                }

                const priorityLabel =
                  PRIORITIES[issue.priority] || issue.priority;
                const PriorityIcon = Icons[priorityLabel] || null;

                // Remove prefix from ID (e.g. beads-dashboard-123 -> 123)
                // Assumes format is prefix-hash, so taking last segment
                const shortId = issue.id.includes("-")
                  ? issue.id.split("-").pop()
                  : issue.id;

                const typeInfo = getTypeInfo(issue.issue_type);

                return (
                  <tr key={issue.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{shortId}</span>
                        <button
                          onClick={() => handleCopy(issue.id)}
                          className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Copy full ID"
                        >
                          {Icons.Copy}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{issue.title || "Untitled"}</span>
                        <button
                          onClick={() => openDescription(issue)}
                          className="ml-auto text-slate-300 hover:text-blue-600 transition-colors"
                          title="View Description"
                        >
                          {Icons.PanelTopOpen}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`capitalize inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${typeInfo.class}`}
                      >
                        {typeInfo.icon}
                        {issue.issue_type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(
                          issue.priority
                        )}`}
                      >
                        {PriorityIcon}
                        {priorityLabel}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${
                            issue.status === "closed"
                              ? "bg-green-100 text-green-800"
                              : issue.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : issue.status === "blocked"
                              ? "bg-red-100 text-red-800"
                              : issue.status === "deferred"
                              ? "bg-amber-100 text-amber-800"
                              : issue.status === "pinned"
                              ? "bg-purple-100 text-purple-800"
                              : issue.status === "hooked"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {created.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {updated ? updated.toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-3 text-slate-500">{cycleTime}</td>
                    <td
                      className={`px-6 py-3 ${
                        isStale ? "text-red-600 font-bold" : "text-slate-500"
                      }`}
                    >
                      {age}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {issue.status !== "closed" && issue.status !== "in_progress" && (
                          <button
                            onClick={() => handleStatusUpdate(issue.id, "in_progress")}
                            disabled={updatingStatus === issue.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="Start Progress"
                          >
                            {Icons.Play}
                          </button>
                        )}
                        {issue.status !== "closed" && (
                          <button
                            onClick={() => handleStatusUpdate(issue.id, "closed")}
                            disabled={updatingStatus === issue.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Close Issue"
                          >
                            {Icons.Check}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredIssues.length === 0 && (
                <tr>
                  <td
                    colSpan="10"
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    No issues found matching "{filterText}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description Modal */}
      {activeDescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeDescription.title}
                </h3>
                <p className="text-sm text-slate-500 font-mono mt-1">
                  {activeDescription.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                    title="Edit Description"
                  >
                    {Icons.Edit}
                  </button>
                )}
                <button
                  onClick={closeDescription}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {Icons.Close}
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isEditing ? (
                <textarea
                  className="w-full h-64 p-3 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter issue description..."
                />
              ) : activeDescription.description ? (
                <div 
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: marked.parse(activeDescription.description) }}
                />
              ) : (
                <div className="text-slate-400 italic text-center py-8">
                  ⚠️ No description provided for this issue.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={closeDescription}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
