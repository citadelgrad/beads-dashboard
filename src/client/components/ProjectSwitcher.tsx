import { useState, useEffect } from 'react';
import { ChevronDown, Folder, Activity } from 'lucide-react';
import type { BeadsProject } from '@shared/types';

interface ProjectSwitcherProps {
  currentProjectName: string;
}

export default function ProjectSwitcher({ currentProjectName }: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<BeadsProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/registry');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleProjectSwitch = async (projectPath: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/project/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to switch project');
      }

      setIsOpen(false);
      // Data will refresh via socket
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.project-switcher')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="project-switcher relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
        disabled={loading}
      >
        <Folder size={16} className="text-slate-500" />
        <span className="font-medium text-slate-700">{currentProjectName}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 py-1">
              Beads Projects
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-400 text-center">
                No registered projects found
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => handleProjectSwitch(project.path)}
                  disabled={loading}
                  className={`w-full text-left px-3 py-2.5 transition-all duration-150 ${
                    project.name === currentProjectName
                      ? 'bg-blue-50 border-l-2 border-l-blue-500'
                      : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Folder size={16} className="text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-700 truncate">
                          {project.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {project.path}
                        </div>
                      </div>
                    </div>
                    {project.isActive && (
                      <div className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0 ml-2">
                        <Activity size={12} />
                        <span>Active</span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {error && (
            <div className="px-3 py-2 border-t border-slate-100 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
