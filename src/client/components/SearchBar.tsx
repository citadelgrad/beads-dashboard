import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { Issue } from '@shared/types';

interface SearchBarProps {
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  placeholder?: string;
  onFocusRequest?: (focusFn: () => void) => void;
}

interface SearchBarState {
  query: string;
  debouncedQuery: string;
  isOpen: boolean;
  highlightedIndex: number;
}

function SearchBar({ issues, onSelectIssue, placeholder = "Search issues...", onFocusRequest }: SearchBarProps) {
  const [state, setState] = useState<SearchBarState>({
    query: '',
    debouncedQuery: '',
    isOpen: false,
    highlightedIndex: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-process issues for faster filtering (per arch review)
  const searchableIssues = useMemo(() =>
    issues
      .filter((issue) => issue.status !== 'tombstone')
      .map((issue) => ({
        issue,
        searchText: `${issue.id} ${issue.title || ''}`.toLowerCase()
      })),
    [issues]
  );

  // Filter issues based on debounced query with early exit (per arch review)
  const filteredIssues = useMemo(() => {
    if (!state.debouncedQuery.trim()) return [];

    const searchLower = state.debouncedQuery.toLowerCase();
    const results: Issue[] = [];

    // Early exit after 10 matches for performance
    for (const { issue, searchText } of searchableIssues) {
      if (searchText.includes(searchLower)) {
        results.push(issue);
        if (results.length >= 10) break;
      }
    }

    return results;
  }, [searchableIssues, state.debouncedQuery]);

  // Debounce query input (200ms per arch review)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        debouncedQuery: prev.query,
        isOpen: prev.query.trim().length > 0
      }));
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!state.isOpen || filteredIssues.length === 0) {
      if (e.key === 'Enter' && filteredIssues.length > 0) {
        onSelectIssue(filteredIssues[0]);
        setState(prev => ({ ...prev, query: '', debouncedQuery: '', isOpen: false }));
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          highlightedIndex: Math.min(prev.highlightedIndex + 1, filteredIssues.length - 1)
        }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          highlightedIndex: Math.max(prev.highlightedIndex - 1, 0)
        }));
        break;
      case 'Enter':
        e.preventDefault();
        onSelectIssue(filteredIssues[state.highlightedIndex]);
        setState({ query: '', debouncedQuery: '', isOpen: false, highlightedIndex: 0 });
        inputRef.current?.blur();
        break;
      case 'Escape':
        setState(prev => ({ ...prev, isOpen: false }));
        inputRef.current?.blur();
        break;
    }
  }, [state.isOpen, state.highlightedIndex, filteredIssues, onSelectIssue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setState(prev => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Expose focus method to parent component (per arch review - keyboard shortcut at App level)
  useEffect(() => {
    if (onFocusRequest) {
      onFocusRequest(() => inputRef.current?.focus());
    }
  }, [onFocusRequest]);

  const handleClear = useCallback(() => {
    setState({ query: '', debouncedQuery: '', isOpen: false, highlightedIndex: 0 });
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={state.query}
          onChange={(e) => setState(prev => ({
            ...prev,
            query: e.target.value,
            highlightedIndex: 0
          }))}
          onFocus={() => state.query && setState(prev => ({ ...prev, isOpen: true }))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-32 py-2 border border-slate-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          role="combobox"
          aria-expanded={state.isOpen}
          aria-controls="search-results"
          aria-activedescendant={state.isOpen && filteredIssues.length > 0 ? `result-${state.highlightedIndex}` : undefined}
          aria-label="Search issues by ID or title"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
        {state.query && (
          <button
            onClick={handleClear}
            className="absolute right-20 top-2.5 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <span className="absolute right-3 top-2.5 text-xs text-slate-400 hidden sm:block" aria-hidden="true">
          Cmd+Shift+K
        </span>
      </div>

      {/* Autocomplete dropdown */}
      {state.isOpen && filteredIssues.length > 0 && (
        <div
          id="search-results"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg
                        shadow-xl max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {filteredIssues.map((issue, index) => (
            <SearchResultItem
              key={issue.id}
              issue={issue}
              isHighlighted={index === state.highlightedIndex}
              onClick={() => {
                onSelectIssue(issue);
                setState({ query: '', debouncedQuery: '', isOpen: false, highlightedIndex: 0 });
              }}
              resultId={`result-${index}`}
            />
          ))}
        </div>
      )}

      {/* No results message */}
      {state.isOpen && state.debouncedQuery && filteredIssues.length === 0 && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg
                        shadow-lg p-4 text-center text-slate-500 text-sm"
          role="status"
        >
          No issues found matching "{state.debouncedQuery}"
        </div>
      )}
    </div>
  );
}

interface SearchResultItemProps {
  issue: Issue;
  isHighlighted: boolean;
  onClick: () => void;
  resultId: string;
}

function SearchResultItem({ issue, isHighlighted, onClick, resultId }: SearchResultItemProps) {
  const shortId = issue.id.includes('-') ? issue.id.split('-').pop() : issue.id;

  // Simple type icon mapping
  const typeIcon = issue.issue_type === 'bug' ? '🐛' :
                   issue.issue_type === 'feature' ? '✨' :
                   issue.issue_type === 'epic' ? '📦' : '📝';

  // Priority badge color
  const priorityColor = issue.priority === 0 ? 'bg-red-100 text-red-700' :
                        issue.priority === 1 ? 'bg-orange-100 text-orange-700' :
                        issue.priority === 2 ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600';

  // Status badge color
  const statusColor = issue.status === 'closed' ? 'bg-green-100 text-green-700' :
                      issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      issue.status === 'blocked' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600';

  return (
    <div
      id={resultId}
      role="option"
      aria-selected={isHighlighted}
      className={`px-4 py-3 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors duration-100
                  ${isHighlighted ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg" aria-hidden="true">{typeIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-slate-500">{shortId}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${priorityColor}`}>
              P{issue.priority}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${statusColor}`}>
              {issue.status}
            </span>
          </div>
          <p className="text-sm text-slate-700 truncate">{issue.title || 'Untitled'}</p>
        </div>
      </div>
    </div>
  );
}

export default SearchBar;
