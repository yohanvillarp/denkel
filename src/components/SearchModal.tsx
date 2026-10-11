import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { TaskNode } from '../types/task';
import {
  Search,
  X,
  Sprout,
  Leaf,
  CheckCircle2,
  FolderTree,
  CornerDownRight,
  Clock,
  ArrowUp,
  ArrowDown,
  CornerDownLeft
} from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { tasks, selectedTaskId, setSelectedTaskId, flyToTask } = useTaskContext();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Compute ancestor breadcrumb paths for all tasks
  const taskBreadcrumbMap = useMemo(() => {
    const map = new Map<string, string>();
    const taskMap = new Map<string, TaskNode>();
    tasks.forEach(t => taskMap.set(t.id, t));

    tasks.forEach(task => {
      const pathParts: string[] = [];
      let currentParentId = task.parentId;
      while (currentParentId) {
        const parent = taskMap.get(currentParentId);
        if (parent) {
          pathParts.unshift(parent.title);
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }
      map.set(task.id, pathParts.length > 0 ? pathParts.join(' / ') : 'Trunk Root');
    });

    return map;
  }, [tasks]);

  // Format minutes into clean duration (e.g. 1h 30m, 45m)
  const formatDuration = (mins: number) => {
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Filter and sort results based on search query
  const filteredTasks = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Empty query: show all tasks, categories first, then recently updated
      return [...tasks].sort((a, b) => {
        if (a.type === 'category' && b.type !== 'category') return -1;
        if (b.type === 'category' && a.type !== 'category') return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }

    return tasks
      .filter(task => {
        const titleMatch = task.title.toLowerCase().includes(trimmed);
        const pathMatch = (taskBreadcrumbMap.get(task.id) || '').toLowerCase().includes(trimmed);
        const statusMatch = task.status.toLowerCase().includes(trimmed);
        return titleMatch || pathMatch || statusMatch;
      })
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const aExact = aTitle === trimmed;
        const bExact = bTitle === trimmed;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;

        const aStarts = aTitle.startsWith(trimmed);
        const bStarts = bTitle.startsWith(trimmed);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [tasks, query, taskBreadcrumbMap]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on mount and handle global key listener
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (listContainerRef.current) {
      const activeElement = listContainerRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleSelect = (task: TaskNode) => {
    onClose();

    const isDrawerCurrentlyOpen = selectedTaskId !== null;

    if (isDrawerCurrentlyOpen) {
      // 1. Smoothly close existing drawer first
      setSelectedTaskId(null);

      // 2. Wait for exit animation (220ms), then activate target node & launch camera
      setTimeout(() => {
        setSelectedTaskId(task.id);
        flyToTask(task.id);
      }, 220);
    } else {
      // 1. Activate target node immediately so selection beacon is visible
      setSelectedTaskId(task.id);

      // 2. Launch smooth guided flight to visible canvas center
      flyToTask(task.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredTasks.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredTasks.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTasks[selectedIndex]) {
        handleSelect(filteredTasks[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0c1a12]/35 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl border border-[#dde7de] shadow-[0_20px_50px_rgba(16,91,56,0.14)] overflow-hidden flex flex-col max-h-[75vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3 border-b border-[#e9f0ea] flex items-center gap-3 bg-[#fafbfa]">
          <Search className="w-4 h-4 text-[#105b38] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search branches, projects, or categories across your tree..."
            className="w-full bg-transparent text-sm text-[#14231b] placeholder-[#718579] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-[#718579] hover:text-[#14231b] hover:bg-[#edf2ee] transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1 shrink-0 pl-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#718579] bg-[#edf2ee] border border-[#d6e2d8] rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List or Empty State */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto divide-y divide-[#f1f6f2] p-2 space-y-1"
        >
          {filteredTasks.length === 0 ? (
            <div className="py-12 px-6 text-center text-[#718579] flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#f0f6f1] flex items-center justify-center text-[#105b38] mb-3">
                <Sprout className="w-5 h-5 text-[#105b38]" />
              </div>
              <p className="text-sm font-medium text-[#14231b]">No branches found</p>
              <p className="text-xs text-[#718579] mt-1">
                No tasks or categories match &ldquo;<span className="font-mono text-[#105b38]">{query}</span>&rdquo;
              </p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const isSelected = index === selectedIndex;
              const isCategory = task.type === 'category';
              const breadcrumb = taskBreadcrumbMap.get(task.id) || 'Trunk Root';
              const durationStr = formatDuration(task.directMinutes || 0);

              return (
                <div
                  key={task.id}
                  onClick={() => handleSelect(task)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#eaf5ee] border border-[#cbe4d1] shadow-2xs'
                      : 'hover:bg-[#f4f8f5] border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 mr-3">
                    {/* Node Type Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isCategory ? (
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[#105b38]">
                          <FolderTree className="w-3.5 h-3.5" />
                        </div>
                      ) : task.status === 'completed' ? (
                        <div className="w-6 h-6 rounded-lg bg-[#105b38] flex items-center justify-center text-white">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : task.status === 'in_progress' ? (
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[#105b38]">
                          <Leaf className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                          <Sprout className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium truncate ${
                          task.status === 'completed' ? 'text-[#354a3e]' : 'text-[#14231b]'
                        }`}>
                          {task.title}
                        </span>
                        {task.isProvisional && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                            Provisional
                          </span>
                        )}
                      </div>

                      {/* Breadcrumb Path */}
                      <div className="flex items-center gap-1 text-[10px] text-[#718579] font-mono mt-0.5 truncate">
                        <CornerDownRight className="w-2.5 h-2.5 text-[#105b38] shrink-0" />
                        <span className="truncate">{breadcrumb}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Meta: Duration & Jump Hint */}
                  <div className="flex items-center gap-2 shrink-0">
                    {durationStr && !isCategory && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-[#105b38] bg-white/80 border border-[#d6e5d8] px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-[#105b38]" />
                        <span>{durationStr}</span>
                      </span>
                    )}
                    {isCategory && (
                      <span className="text-[10px] font-mono text-[#105b38] uppercase tracking-wider bg-white/80 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Stream
                      </span>
                    )}
                    {isSelected && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#105b38] bg-white px-1.5 py-0.5 rounded border border-[#cbe4d1] shadow-2xs">
                        <span>Fly to</span>
                        <CornerDownLeft className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 py-2 bg-[#f8faf8] border-t border-[#e9f0ea] flex items-center justify-between text-[11px] text-[#718579]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1 py-0.5 bg-white border border-[#dde5de] rounded text-[9px]">
                <ArrowUp className="w-2.5 h-2.5 inline" />
              </kbd>
              <kbd className="px-1 py-0.5 bg-white border border-[#dde5de] rounded text-[9px]">
                <ArrowDown className="w-2.5 h-2.5 inline" />
              </kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 bg-white border border-[#dde5de] rounded text-[9px]">
                ↵
              </kbd>
              <span className="ml-1">Fly to branch</span>
            </span>
          </div>
          <span className="font-mono text-[10px]">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'branch' : 'branches'}
          </span>
        </div>
      </div>
    </div>
  );
};
