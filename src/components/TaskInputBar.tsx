import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Sprout, ArrowUp } from 'lucide-react';

export const TaskInputBar: React.FC = () => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addTask, tasks } = useTaskContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = input.trim();
    if (!title || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addTask(title);
      setInput('');
    } catch (err) {
      console.error('[TaskInputBar] Failed to add task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSeedling = tasks.length === 0;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto w-full max-w-lg backdrop-blur-md bg-white/90 border border-emerald-900/10 shadow-lg shadow-emerald-900/5 rounded-full p-1.5 pl-4 flex items-center gap-2.5 transition-all focus-within:ring-2 focus-within:ring-[#105b38]/15 focus-within:border-[#105b38]/30"
      >
        <Sprout className="w-4 h-4 text-[#105b38] opacity-75 shrink-0" />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isSeedling ? "Plant your first task or goal..." : "Plant a task, goal, or intention... (Press Enter)"}
          className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-[#14231b] placeholder:text-[#7f9486] font-sans"
          disabled={isSubmitting}
          autoFocus
        />

        <button
          type="submit"
          disabled={!input.trim() || isSubmitting}
          className="w-7 h-7 rounded-full bg-[#105b38] hover:bg-[#0c482c] disabled:opacity-30 disabled:hover:bg-[#105b38] text-white flex items-center justify-center transition-all hover:scale-105 shrink-0 shadow-sm"
          title="Plant Task"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
