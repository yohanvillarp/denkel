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
  Check
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
    deleteTask
  } = useTaskContext();

  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [manualHours, setManualHours] = useState('0');
  const [manualMinutes, setManualMinutes] = useState('30');
  const [manualNote, setManualNote] = useState('');

  // Inline editing state for past sessions
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  if (!selectedTask) return null;

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

  const handleDelete = async () => {
    if (window.confirm(`Delete "${selectedTask.title}"? Any child branches will remain connected to the tree.`)) {
      await deleteTask(selectedTask.id);
    }
  };

  return (
    <aside className="fixed top-14 right-0 bottom-0 w-full sm:w-[420px] bg-white border-l border-[#e8efe8] shadow-[-8px_0_30px_rgba(16,91,56,0.04)] z-40 flex flex-col transition-all duration-300 ease-in-out">
      {/* Header: Breadcrumbs & Close */}
      <div className="px-6 py-4 border-b border-[#f0f4f1] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            selectedTask.status === 'completed'
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
        {/* Status Buttons & Title */}
        <div>
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

          <h2 className="font-semibold text-xl text-[#14231b] leading-snug tracking-tight">
            {selectedTask.title}
          </h2>
        </div>

        {/* Effort & Watered Time Card */}
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

          {/* Action Triggers */}
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

          {/* Inline Manual Time Entry Form */}
          {isManualLogOpen && (
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

        {/* Sub-branches (if any) */}
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

        {/* Discrete Session History Log with Editable Notes */}
        <div className="space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-[#63776a] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Session History Log</span>
          </div>

          {(selectedTask.sessionHistory || []).length === 0 ? (
            <div className="p-3.5 rounded-xl bg-[#fbfcf9] border border-[#e8efe8] text-xs text-[#526358] text-center leading-relaxed">
              No sessions logged yet. Start a focus timer or log manual effort to water this branch and see it grow!
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
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-[#f0f4f1] bg-white flex items-center justify-between shrink-0">
        <button
          onClick={handleDelete}
          className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          title="Delete this branch"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <button
          onClick={() => handleStatusChange(selectedTask.status === 'completed' ? 'in_progress' : 'completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
            selectedTask.status === 'completed'
              ? 'bg-[#edf5ee] text-[#105b38] border border-[#cde0d2]'
              : 'bg-[#105b38] text-white hover:bg-[#0c482c]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{selectedTask.status === 'completed' ? 'Mark In Progress' : 'Mark as Bloomed'}</span>
        </button>
      </div>
    </aside>
  );
};
