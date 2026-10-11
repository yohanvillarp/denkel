import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { TaskStatus } from '../types/task';
import {
  X,
  Play,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Calendar,
  Sprout,
  Leaf,
  Pencil,
  Check,
  GitBranch,
  Layers,
  CornerDownRight,
  Plus,
  RotateCcw,
  AlertCircle,
  FolderTree,
  ChevronDown
} from 'lucide-react';

interface TaskDrawerProps {
  onStartTimer: (taskId: string) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ onStartTimer }) => {
  const {
    tasks,
    setSelectedTaskId,
    selectedTask,
    updateTaskStatus,
    logTime,
    updateSessionNote,
    deleteTask,
    reparentTask,
    convertTaskType,
    promoteToCategory,
    addTask
  } = useTaskContext();

  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [manualHours, setManualHours] = useState('0');
  const [manualMinutes, setManualMinutes] = useState('30');
  const [manualNote, setManualNote] = useState('');

  // Inline editing state for past sessions
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  // Sub-branch quick creation state
  const [isAddingSubBranch, setIsAddingSubBranch] = useState(false);
  const [subBranchTitle, setSubBranchTitle] = useState('');

  // Group into new category state
  const [isGroupingCategory, setIsGroupingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Explicit category conversion confirmation state
  const [isConfirmingCategoryConversion, setIsConfirmingCategoryConversion] = useState(false);

  // Inline delete confirmation state (avoids window.confirm freeze)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Custom parent branch selection dropdown state
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);

  if (!selectedTask) return null;

  const isCategory = selectedTask.type === 'category';
  const isBloomed = selectedTask.status === 'completed';

  // Compute breadcrumb path
  const getBreadcrumbPath = (): string => {
    const path: string[] = [selectedTask.title];
    let currentParentId = selectedTask.parentId;
    while (currentParentId) {
      const parent = tasks.find(t => t.id === currentParentId);
      if (parent) {
        path.unshift(parent.title);
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }
    return path.join(' / ');
  };

  // Compute subtask / child hours
  const childTasks = tasks.filter(t => t.parentId === selectedTask.id);
  const computeSubtaskMinutes = (parentId: string): number => {
    const children = tasks.filter(t => t.parentId === parentId);
    let total = 0;
    children.forEach(c => {
      total += (c.directMinutes || 0) + computeSubtaskMinutes(c.id);
    });
    return total;
  };
  const subtaskMinutes = computeSubtaskMinutes(selectedTask.id);
  const totalCombinedMinutes = (selectedTask.directMinutes || 0) + subtaskMinutes;

  const formatDuration = (mins: number) => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Filter valid parent options (prevent cycles: cannot select self or descendants)
  const isDescendant = (nodeId: string, potentialDescendantId: string): boolean => {
    if (nodeId === potentialDescendantId) return true;
    const children = tasks.filter(t => t.parentId === nodeId);
    return children.some(c => isDescendant(c.id, potentialDescendantId));
  };
  const validParentOptions = tasks.filter(t => t.id !== selectedTask.id && !isDescendant(selectedTask.id, t.id));

  const handleManualLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(manualHours, 10) || 0;
    const m = parseInt(manualMinutes, 10) || 0;
    const total = h * 60 + m;
    if (total <= 0) return;

    const sessionCount = (selectedTask.sessionHistory || []).length + 1;
    const finalNote = manualNote.trim() || `Session ${sessionCount}`;

    await logTime(selectedTask.id, total, finalNote);
    setIsManualLogOpen(false);
    setManualHours('0');
    setManualMinutes('30');
    setManualNote('');
  };

  const handleStatusChange = async (status: TaskStatus) => {
    await updateTaskStatus(selectedTask.id, status);
  };

  const handleReopenTask = async () => {
    await updateTaskStatus(selectedTask.id, 'in_progress');
  };

  const handleReparent = async (newParentId: string | null) => {
    try {
      await reparentTask(selectedTask.id, newParentId);
    } catch (err) {
      console.error('[TaskDrawer] Failed to reparent task:', err);
    }
  };

  const handleToggleType = async () => {
    if (!isCategory) {
      // If task has recorded effort, prompt explicit decision
      if ((selectedTask.directMinutes || 0) > 0) {
        setIsConfirmingCategoryConversion(true);
        return;
      }
      await convertTaskType(selectedTask.id, 'category');
    } else {
      await convertTaskType(selectedTask.id, 'task');
    }
  };

  const handleCreateSubBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subBranchTitle.trim();
    if (!trimmed) return;
    try {
      await addTask(trimmed, selectedTask.id, 'task');
      setSubBranchTitle('');
      setIsAddingSubBranch(false);
    } catch (err) {
      console.error('[TaskDrawer] Failed to add sub-branch:', err);
    }
  };

  const handleGroupCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      const createdCategory = await promoteToCategory(trimmed, [selectedTask.id], selectedTask.parentId);
      setNewCategoryName('');
      setIsGroupingCategory(false);
      setSelectedTaskId(createdCategory.id);
    } catch (err) {
      console.error('[TaskDrawer] Failed to group into category:', err);
    }
  };

  const handleDelete = async () => {
    await deleteTask(selectedTask.id);
    setIsConfirmingDelete(false);
  };

  return (
    <aside className="fixed top-14 right-0 bottom-0 w-full sm:w-[420px] bg-white border-l border-[#e8efe8] shadow-[-8px_0_30px_rgba(16,91,56,0.04)] z-40 flex flex-col transition-all duration-300 ease-in-out">
      {/* Header: Breadcrumbs & Close */}
      <div className="px-6 py-4 border-b border-[#f0f4f1] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isCategory
              ? 'bg-[#105b38]'
              : isBloomed
              ? 'bg-[#10b981]'
              : selectedTask.status === 'in_progress'
              ? 'bg-[#105b38] animate-pulse'
              : 'bg-[#d97706]'
          }`} />
          <span className="font-mono text-xs text-[#5c7064] tracking-wide truncate" title={getBreadcrumbPath()}>
            {getBreadcrumbPath()}
          </span>
        </div>
        <button
          onClick={() => setSelectedTaskId(null)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#708477] hover:text-[#14231b] hover:bg-[#f0f5f1] transition-colors shrink-0 cursor-pointer"
          title="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Title & Type Specific Headers */}
        <div>
          {isCategory ? (
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-emerald-100/80 text-[#105b38] border border-emerald-300/80">
                <Layers className="w-3.5 h-3.5 text-[#105b38]" />
                <span>Organizational Category Stream</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2.5">
              <button
                onClick={() => handleStatusChange('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedTask.status === 'pending'
                    ? 'bg-amber-100/90 text-amber-900 border border-amber-300/80 shadow-sm'
                    : 'bg-[#f4f7f4] text-[#526358] hover:bg-[#edf2ee]'
                }`}
              >
                <Sprout className="w-3.5 h-3.5 text-amber-700" />
                <span>Pending Bud</span>
              </button>
              <button
                onClick={() => handleStatusChange('in_progress')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedTask.status === 'in_progress'
                    ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 shadow-sm'
                    : 'bg-[#f4f7f4] text-[#526358] hover:bg-[#edf2ee]'
                }`}
              >
                <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                <span>In Progress</span>
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedTask.status === 'completed'
                    ? 'bg-[#105b38] text-white shadow-sm'
                    : 'bg-[#f4f7f4] text-[#526358] hover:bg-[#edf2ee]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bloomed</span>
              </button>
            </div>
          )}

          <h2 className="font-semibold text-xl text-[#14231b] leading-snug tracking-tight">
            {selectedTask.title}
          </h2>
        </div>

        {/* Protection Banner: Disallow Category Conversion for Tasks with Effort */}
        {isConfirmingCategoryConversion && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Cannot Convert Task with Recorded Effort</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              This task contains <strong className="font-mono text-amber-950">{formatDuration(selectedTask.directMinutes || 0)}</strong> of recorded effort across <strong className="font-mono text-amber-950">{(selectedTask.sessionHistory || []).length} sessions</strong>.
              Organizational categories only group activities and do not track individual effort. To organize this activity while preserving its complete history, create a new parent category to wrap it.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsConfirmingCategoryConversion(false)}
                className="px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setIsConfirmingCategoryConversion(false);
                  setIsGroupingCategory(true);
                }}
                className="px-3 py-1 bg-[#105b38] text-white rounded-lg text-xs font-medium hover:bg-[#0c482c] cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Create Parent Category</span>
              </button>
            </div>
          </div>
        )}

        {/* Effort Card: Separate Category vs Actionable Task */}
        {isCategory ? (
          <div className="p-4 rounded-2xl bg-[#f8faf8] border border-[#e8efe9] space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#63776a] font-mono uppercase tracking-wider">
                  Stream Accumulated Effort
                </span>
                <span className="font-bold text-2xl text-[#14231b] mt-0.5 font-mono">
                  {formatDuration(subtaskMinutes)}
                </span>
              </div>
              <span className="text-xs text-[#526358] font-mono">
                {childTasks.length} {childTasks.length === 1 ? 'sub-branch' : 'sub-branches'}
              </span>
            </div>
            <p className="text-[11px] text-[#63776a] leading-relaxed pt-1 border-t border-[#ebf2ec]">
              Categories group related activities and roll up descendant progress. Effort is watered directly onto specific sub-branches.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#f8faf8] border border-[#e8efe9]">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#63776a] font-mono uppercase tracking-wider">
                  Watered Effort
                </span>
                <span className="font-bold text-2xl text-[#14231b] mt-0.5 font-mono">
                  {formatDuration(totalCombinedMinutes)}
                </span>
              </div>
              <span className="text-xs text-[#526358] font-mono">
                {(selectedTask.sessionHistory || []).length} {
                  (selectedTask.sessionHistory || []).length === 1 ? 'session' : 'sessions'
                }
              </span>
            </div>

            {/* Effort Breakdown (Direct vs Subtask) */}
            {childTasks.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-[#ebf2ec] flex items-center justify-between text-xs text-[#526358]">
                <span>Direct branch: <strong className="font-mono text-[#14231b]">{formatDuration(selectedTask.directMinutes || 0)}</strong></span>
                <span>Sub-branches: <strong className="font-mono text-[#105b38]">{formatDuration(subtaskMinutes)}</strong></span>
              </div>
            )}

            {/* Time Tracking Controls or Reopen Action */}
            {isBloomed ? (
              <div className="mt-4 pt-3 border-t border-[#ebf2ec] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#105b38] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  <span>Task Bloomed & Complete</span>
                </div>
                <button
                  onClick={handleReopenTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 text-[#105b38] border border-emerald-200/80 text-xs font-medium transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Reopen task to add corrections or new sessions"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Task</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#ebf2ec]">
                <button
                  onClick={() => onStartTimer(selectedTask.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#105b38] hover:bg-[#0c482c] text-white font-medium text-xs transition-colors shadow-sm active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Timer</span>
                </button>
                <button
                  onClick={() => setIsManualLogOpen(!isManualLogOpen)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#dde5de] hover:bg-[#f2f7f3] text-[#33463a] font-medium text-xs transition-colors active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#63776a]" />
                  <span>Log Manually</span>
                </button>
              </div>
            )}

            {/* Inline Manual Time Entry Form */}
            {isManualLogOpen && !isBloomed && (
              <form onSubmit={handleManualLogSubmit} className="mt-3.5 pt-3 border-t border-[#ebf2ec] space-y-2.5">
                <div className="text-xs font-medium text-[#14231b]">Log Effort Manually</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#63776a] font-mono uppercase">Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#dde5de] rounded-lg text-xs font-mono text-[#14231b] focus:outline-none focus:border-[#105b38]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#63776a] font-mono uppercase">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#dde5de] rounded-lg text-xs font-mono text-[#14231b] focus:outline-none focus:border-[#105b38]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#63776a] font-mono uppercase">Session Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Drafted methodology section"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#dde5de] rounded-lg text-xs text-[#14231b] focus:outline-none focus:border-[#105b38]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsManualLogOpen(false)}
                    className="px-2.5 py-1 text-xs text-[#526358] hover:text-[#14231b] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#105b38] text-white rounded-lg text-xs font-medium hover:bg-[#0c482c] cursor-pointer shadow-sm"
                  >
                    Save Effort
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tree Botanical Hierarchy & Restructuring Controls */}
        <div className="p-4 rounded-2xl bg-[#fafbfa] border border-[#e8efe9] space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#63776a] font-mono uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#105b38]" />
              <span>Botanical Structure</span>
            </span>
            <button
              onClick={handleToggleType}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                isCategory
                  ? 'bg-emerald-50 text-[#105b38] border-emerald-300 font-semibold shadow-xs'
                  : 'bg-stone-50 text-[#526358] border-stone-200 hover:border-emerald-300'
              }`}
              title="Click to toggle between Category Stream and Task Branch"
            >
              {isCategory ? (
                <>
                  <FolderTree className="w-3 h-3 text-[#105b38]" />
                  <span>Category Stream</span>
                </>
              ) : (
                <>
                  <Leaf className="w-3 h-3 text-[#10b981]" />
                  <span>Task Branch</span>
                </>
              )}
            </button>
          </div>

          {/* Parent Attachment (Reparenting with smooth migration animation) */}
          <div className="space-y-1 relative">
            <label className="text-[10px] text-[#718579] font-mono uppercase flex items-center gap-1">
              <CornerDownRight className="w-3 h-3 text-[#105b38]" />
              <span>Grows From (Parent Branch)</span>
            </label>

            <button
              type="button"
              onClick={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#dde5de] hover:border-[#105b38]/50 rounded-xl text-xs text-[#14231b] flex items-center justify-between transition-colors cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#105b38]"
            >
              <div className="flex items-center gap-2 truncate">
                {selectedTask.parentId ? (
                  tasks.find(t => t.id === selectedTask.parentId)?.type === 'category' ? (
                    <FolderTree className="w-3.5 h-3.5 text-[#105b38] shrink-0" />
                  ) : (
                    <Leaf className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                  )
                ) : (
                  <Sprout className="w-3.5 h-3.5 text-[#105b38] shrink-0" />
                )}
                <span className="truncate">
                  {selectedTask.parentId
                    ? tasks.find(t => t.id === selectedTask.parentId)?.title || 'Selected Parent'
                    : 'Central Trunk (Primary Stem)'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#718579] shrink-0 transition-transform ${isParentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isParentDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsParentDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#dde5de] rounded-xl shadow-lg py-1 z-20 max-h-52 overflow-y-auto divide-y divide-[#f2f6f3]">
                  {/* Central Trunk Option */}
                  <button
                    type="button"
                    onClick={() => {
                      handleReparent(null);
                      setIsParentDropdownOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 text-xs flex items-center justify-between text-left hover:bg-[#f4f8f5] transition-colors cursor-pointer ${
                      !selectedTask.parentId ? 'bg-emerald-50/70 text-[#105b38] font-medium' : 'text-[#14231b]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Sprout className="w-3.5 h-3.5 text-[#105b38] shrink-0" />
                      <span className="truncate">Central Trunk (Primary Stem)</span>
                    </div>
                    {!selectedTask.parentId && <Check className="w-3 h-3 text-[#105b38] shrink-0" />}
                  </button>

                  {/* Valid Parent Branch Options */}
                  {validParentOptions.map(opt => {
                    const isSelected = selectedTask.parentId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          handleReparent(opt.id);
                          setIsParentDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 text-xs flex items-center justify-between text-left hover:bg-[#f4f8f5] transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50/70 text-[#105b38] font-medium' : 'text-[#14231b]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {opt.type === 'category' ? (
                            <FolderTree className="w-3.5 h-3.5 text-[#105b38] shrink-0" />
                          ) : (
                            <Leaf className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                          )}
                          <span className="truncate">{opt.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-[#718579]">
                            {opt.type === 'category' ? 'Category' : 'Branch'}
                          </span>
                          {isSelected && <Check className="w-3 h-3 text-[#105b38]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Quick Actions: Add Sub-Branch or Group into New Category */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-[#edf2ee]">
            <button
              onClick={() => {
                setIsAddingSubBranch(!isAddingSubBranch);
                setIsGroupingCategory(false);
              }}
              className="text-xs text-[#105b38] hover:text-[#0c482c] flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50/70 border border-emerald-200/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Sub-branch</span>
            </button>
            <button
              onClick={() => {
                setIsGroupingCategory(!isGroupingCategory);
                setIsAddingSubBranch(false);
              }}
              className="text-xs text-[#526358] hover:text-[#14231b] flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-stone-100 border border-stone-200/80 transition-colors cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              <span>Group in New Category</span>
            </button>
          </div>

          {/* Inline Form: Add Sub-branch */}
          {isAddingSubBranch && (
            <form onSubmit={handleCreateSubBranch} className="pt-2 border-t border-[#ebf2ec] flex gap-2">
              <input
                type="text"
                placeholder="Sub-branch title..."
                value={subBranchTitle}
                onChange={(e) => setSubBranchTitle(e.target.value)}
                autoFocus
                className="flex-1 px-2.5 py-1.5 bg-white border border-[#dde5de] rounded-lg text-xs text-[#14231b] focus:outline-none focus:border-[#105b38]"
              />
              <button
                type="submit"
                disabled={!subBranchTitle.trim()}
                className="px-3 py-1.5 bg-[#105b38] text-white rounded-lg text-xs font-medium hover:bg-[#0c482c] disabled:opacity-40 cursor-pointer"
              >
                Grow
              </button>
            </form>
          )}

          {/* Inline Form: Group in New Category */}
          {isGroupingCategory && (
            <form onSubmit={handleGroupCategory} className="pt-2 border-t border-[#ebf2ec] flex gap-2">
              <input
                type="text"
                placeholder="New Category Name (e.g. Research)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
                className="flex-1 px-2.5 py-1.5 bg-white border border-[#dde5de] rounded-lg text-xs text-[#14231b] focus:outline-none focus:border-[#105b38]"
              />
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="px-3 py-1.5 bg-[#105b38] text-white rounded-lg text-xs font-medium hover:bg-[#0c482c] disabled:opacity-40 cursor-pointer"
              >
                Create
              </button>
            </form>
          )}
        </div>

        {/* Sub-branches List */}
        {childTasks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#63776a]">
              <span>Sub-branches</span>
              <span className="text-[#105b38]">
                {childTasks.filter(c => c.status === 'completed').length} / {childTasks.length} Bloomed
              </span>
            </div>
            <div className="space-y-1.5">
              {childTasks.map(child => (
                <div
                  key={child.id}
                  onClick={() => setSelectedTaskId(child.id)}
                  className="flex items-center justify-between p-2 rounded-xl border border-[#ebf2ec] hover:bg-[#f6f9f6] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${child.status === 'completed' ? 'bg-[#10b981]' : child.status === 'in_progress' ? 'bg-[#105b38]' : 'bg-[#d97706]'}`} />
                    <span className={`text-xs ${child.status === 'completed' ? 'line-through text-[#718579]' : 'text-[#14231b]'}`}>
                      {child.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#526358]">
                    {formatDuration(child.directMinutes || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session History Log (Actionable task sessions or historical archive) */}
        {(!isCategory || (selectedTask.sessionHistory || []).length > 0) && (
          <div className="space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-[#63776a] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{isCategory ? 'Archived Session History' : 'Session History Log'}</span>
            </div>

            {(selectedTask.sessionHistory || []).length === 0 ? (
              <div className="p-3.5 rounded-xl bg-[#fbfcf9] border border-[#e8efe8] text-xs text-[#526358] text-center leading-relaxed">
                No sessions logged yet. Start a focus timer or log manual effort to water this branch!
              </div>
            ) : (
              <div className="space-y-2">
                {(selectedTask.sessionHistory || []).map((session, sIdx) => {
                  const defaultTitle = session.note || `Session ${(selectedTask.sessionHistory || []).length - sIdx}`;
                  const isEditing = editingSessionId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="p-2.5 rounded-xl bg-white border border-[#e8efe9] space-y-1.5 transition-all text-xs shadow-2xs"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 mr-2">
                          <Calendar className="w-3.5 h-3.5 text-[#105b38] shrink-0 mt-0.5" />
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <input
                                  type="text"
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  className="w-full px-2 py-0.5 bg-[#fbfcf9] border border-[#cde0d2] rounded text-xs text-[#14231b] focus:outline-none focus:border-[#105b38]"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateSessionNote(selectedTask.id, session.id, editingNoteText);
                                      setEditingSessionId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingSessionId(null);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    updateSessionNote(selectedTask.id, session.id, editingNoteText);
                                    setEditingSessionId(null);
                                  }}
                                  className="p-1 bg-[#105b38] text-white rounded hover:bg-[#0c482c] cursor-pointer"
                                  title="Save"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingSessionId(null)}
                                  className="p-1 text-[#526358] hover:text-[#14231b] cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group/note">
                                <span className="font-medium text-[#14231b]">
                                  {defaultTitle}
                                </span>
                                {!isCategory && (
                                  <button
                                    onClick={() => {
                                      setEditingSessionId(session.id);
                                      setEditingNoteText(session.note || defaultTitle);
                                    }}
                                    className="opacity-0 group-hover/note:opacity-100 text-[#718579] hover:text-[#105b38] p-0.5 transition-opacity cursor-pointer"
                                    title="Edit session description"
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="text-[10px] text-[#718579] font-mono mt-0.5">
                              {new Date(session.startTime).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <span className="font-mono font-medium text-[#105b38] shrink-0">
                          +{formatDuration(session.durationMinutes)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-[#f0f4f1] bg-white flex items-center justify-between shrink-0">
        {isConfirmingDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="px-2.5 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className="px-2 py-1 text-xs text-[#526358] hover:text-[#14231b] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete this branch"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isCategory ? 'Delete Stream' : 'Delete'}</span>
          </button>
        )}

        {!isCategory && (
          isBloomed ? (
            <button
              onClick={handleReopenTask}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer bg-emerald-50 text-[#105b38] border border-emerald-300 hover:bg-emerald-100/90 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Task</span>
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange('completed')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer bg-[#105b38] text-white hover:bg-[#0c482c] active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Bloomed</span>
            </button>
          )
        )}
      </div>
    </aside>
  );
};
