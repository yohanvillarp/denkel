import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Sprout, ArrowUp, Sparkles, FolderTree, Leaf, Check } from 'lucide-react';
import { AICategorizationResult } from '../types/ai';

interface FeedbackState {
  result: AICategorizationResult;
  parentTitle?: string;
  reparentedCount?: number;
}

export const TaskInputBar: React.FC = () => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);
  const [reorganizeFeedback, setReorganizeFeedback] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const { plantTaskWithAI, tasks, hasPendingStructuralReview, reorganizeTreeWithAI } = useTaskContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = input.trim();
    if (!title || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await plantTaskWithAI(title);
      setInput('');

      // Determine parent title for feedback display
      let parentTitle: string | undefined;
      if (res.result.targetParentId) {
        const parent = tasks.find(t => t.id === res.result.targetParentId);
        parentTitle = parent?.title;
      } else if (res.categoryCreated) {
        parentTitle = res.categoryCreated.title;
      }

      setFeedback({
        result: res.result,
        parentTitle,
        reparentedCount: res.reparentedTasks?.length || 0
      });

      // Dismiss feedback toast after 4.5 seconds
      setTimeout(() => {
        setFeedback(prev => (prev?.result === res.result ? null : prev));
      }, 4500);
    } catch (err) {
      console.error('[TaskInputBar] Failed to plant task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorganize = async () => {
    if (isReorganizing || isSubmitting) return;
    try {
      setIsReorganizing(true);
      const res = await reorganizeTreeWithAI();
      if (res.success) {
        if (res.correctionsApplied > 0 && res.clustersCreated > 0) {
          setReorganizeFeedback(`Corrected ${res.correctionsApplied} misplaced task${res.correctionsApplied > 1 ? 's' : ''} & created ${res.clustersCreated} category.`);
        } else if (res.correctionsApplied > 0) {
          setReorganizeFeedback(`Detached ${res.correctionsApplied} misplaced task${res.correctionsApplied > 1 ? 's' : ''} to central trunk.`);
        } else if (res.tasksReorganized > 0) {
          setReorganizeFeedback(`Reorganized ${res.tasksReorganized} task${res.tasksReorganized > 1 ? 's' : ''} into ${res.clustersCreated} category.`);
        } else {
          setReorganizeFeedback('Tree structure verified • Hierarchy is well-organized.');
        }
      } else {
        setReorganizeFeedback('Review incomplete (offline mode) • Retry when connected.');
      }
      setTimeout(() => setReorganizeFeedback(null), 4500);
    } catch (err) {
      console.error('[TaskInputBar] Reorganization error:', err);
      setReorganizeFeedback('Could not complete review • Please retry.');
      setTimeout(() => setReorganizeFeedback(null), 3500);
    } finally {
      setIsReorganizing(false);
    }
  };

  const isSeedling = tasks.length === 0;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-30 flex flex-col items-center px-4 pointer-events-none">
      {/* Botanical Placement Feedback Pill */}
      {feedback && (
        <div className="mb-2 pointer-events-auto max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-md text-xs ${
            feedback.result.isFallback
              ? 'bg-amber-50/95 border border-amber-200 text-amber-950'
              : 'bg-white/95 border border-emerald-200 text-[#14231b]'
          }`}>
            {feedback.result.isFallback ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-200/80 text-amber-900 shrink-0">
                Offline
              </span>
            ) : feedback.result.action === 'create_category_wrapper' ? (
              <FolderTree className="w-3.5 h-3.5 text-[#105b38] shrink-0" />
            ) : feedback.result.action === 'nest_under_existing' ? (
              <Leaf className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
            ) : (
              <Sprout className="w-3.5 h-3.5 text-[#105b38] shrink-0" />
            )}

            <div className="flex items-center gap-1.5 truncate">
              {feedback.result.isFallback ? (
                <>
                  <span className="truncate font-medium">{feedback.result.taskTitle}</span>
                  <span className="text-amber-700/80 text-[11px] shrink-0">• Saved provisionally</span>
                </>
              ) : (
                <>
                  {feedback.parentTitle && (
                    <>
                      <span className="font-semibold text-[#105b38] truncate">{feedback.parentTitle}</span>
                      <span className="text-[#8ca394]">•</span>
                    </>
                  )}
                  <span className="truncate">{feedback.result.taskTitle}</span>
                  {feedback.reparentedCount && feedback.reparentedCount > 0 ? (
                    <span className="text-[11px] text-[#105b38] bg-emerald-100/70 px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                      +{feedback.reparentedCount} grouped
                    </span>
                  ) : null}
                </>
              )}
            </div>

            <Check className={`w-3 h-3 ml-auto shrink-0 ${feedback.result.isFallback ? 'text-amber-700' : 'text-[#10b981]'}`} />
          </div>
        </div>
      )}

      {/* Contextual Reorganization Feedback Toast */}
      {reorganizeFeedback && !feedback && (
        <div className="mb-2 pointer-events-auto max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/95 backdrop-blur-md border border-emerald-200 shadow-md text-xs text-[#105b38]">
            <Check className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
            <span className="font-medium truncate">{reorganizeFeedback}</span>
          </div>
        </div>
      )}

      {/* Contextual Reorganize Option: Appears ONLY when pending structural changes or provisional tasks exist */}
      {hasPendingStructuralReview && !reorganizeFeedback && !feedback && tasks.length >= 2 && (
        <div className="mb-2 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            type="button"
            onClick={handleReorganize}
            disabled={isReorganizing || isSubmitting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200/90 shadow-sm hover:shadow-md text-xs font-medium text-[#105b38] hover:bg-[#f0f7f2] transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-60"
            title="Evaluate tree taxonomy and group related branches with AI"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#105b38] ${isReorganizing ? 'animate-spin' : ''}`} />
            <span>{isReorganizing ? 'Analyzing tree taxonomy with AI...' : 'Reorganize tree structure with AI'}</span>
          </button>
        </div>
      )}

      {/* Floating Bottom Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto w-full max-w-lg backdrop-blur-md bg-white/95 border border-emerald-900/10 shadow-lg shadow-emerald-900/5 rounded-full p-1.5 pl-4 flex items-center gap-2.5 transition-all focus-within:ring-2 focus-within:ring-[#105b38]/15 focus-within:border-[#105b38]/30"
      >
        {isSubmitting ? (
          <Sparkles className="w-4 h-4 text-[#105b38] animate-spin shrink-0" />
        ) : (
          <Sprout className="w-4 h-4 text-[#105b38] opacity-75 shrink-0" />
        )}

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isSubmitting
              ? "Planting with botanical intelligence..."
              : isSeedling
              ? "Plant your first task or goal..."
              : "Plant a task, goal, or intention... (Press Enter)"
          }
          className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-[#14231b] placeholder:text-[#7f9486] font-sans"
          disabled={isSubmitting || isReorganizing}
          autoFocus
        />

        <button
          type="submit"
          disabled={!input.trim() || isSubmitting || isReorganizing}
          className="w-7 h-7 rounded-full bg-[#105b38] hover:bg-[#0c482c] disabled:opacity-30 disabled:hover:bg-[#105b38] text-white flex items-center justify-center transition-all hover:scale-105 shrink-0 shadow-sm cursor-pointer"
          title="Plant Task"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
