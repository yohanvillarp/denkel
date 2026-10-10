import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Play, Pause, CheckCircle, X } from 'lucide-react';

interface FocusTimerProps {
  taskId: string;
  onClose: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ taskId, onClose }) => {
  const { tasks, logTime, activeTimer, setActiveTimer } = useTaskContext();
  const task = tasks.find(t => t.id === taskId);

  // Initialize or restore elapsed seconds from activeTimer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      if (activeTimer.isPaused) {
        return activeTimer.accumulatedSeconds;
      } else {
        const passedSinceStart = Math.floor((Date.now() - activeTimer.startTime) / 1000);
        return activeTimer.accumulatedSeconds + Math.max(0, passedSinceStart);
      }
    }
    return 0;
  });

  const [isPaused, setIsPaused] = useState<boolean>(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      return activeTimer.isPaused;
    }
    return false;
  });

  const [activityDescription, setActivityDescription] = useState<string>('');

  // Main 1-second ticker loop
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Periodic persistence autosave (every 5 seconds)
  useEffect(() => {
    const autosave = setInterval(() => {
      setActiveTimer({
        taskId,
        startTime: Date.now(),
        accumulatedSeconds: elapsedSeconds,
        isPaused
      });
    }, 5000);

    return () => clearInterval(autosave);
  }, [taskId, elapsedSeconds, isPaused, setActiveTimer]);

  const handleTogglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    setActiveTimer({
      taskId,
      startTime: Date.now(),
      accumulatedSeconds: elapsedSeconds,
      isPaused: nextPaused
    });
  };

  const handleFinish = async () => {
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const sessionCount = (task?.sessionHistory || []).length + 1;
    const finalNote = activityDescription.trim() || `Session ${sessionCount}`;
    await logTime(taskId, minutes, finalNote);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Format MM:SS or HH:MM:SS
  const formatTimeDigits = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Circular sweep progress calculation (one revolution every 60 seconds)
  const sweepRadius = 135;
  const circumference = 2 * Math.PI * sweepRadius;
  const secondProgress = (elapsedSeconds % 60) / 60;
  const strokeDashoffset = circumference - secondProgress * circumference;

  return (
    <div className="fixed inset-0 z-50 bg-[#f4f8f5] flex flex-col justify-between items-center p-6 select-none animate-fade-in">
      {/* Top Header: Task Title & Dismiss */}
      <header className="w-full max-w-4xl flex items-center justify-between">
        <div className="w-9" />

        <h1 className="text-base sm:text-lg font-semibold text-[#14231b] truncate max-w-md text-center">
          {task?.title || 'Focused Work Session'}
        </h1>

        <button
          onClick={handleCancel}
          className="w-9 h-9 rounded-full bg-white/90 border border-[#e2ebe4] flex items-center justify-center text-[#526358] hover:text-[#14231b] hover:bg-white transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Close Focus Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Monumental Circular Timer */}
      <main className="flex flex-col items-center justify-center my-auto w-full max-w-md">
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
          {/* Animated Background SVG Sweep Ring */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 320 320">
            {/* Background track circle */}
            <circle
              cx="160"
              cy="160"
              r={sweepRadius}
              className="text-[#e2ece4]"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Active sweep circle */}
            <circle
              cx="160"
              cy="160"
              r={sweepRadius}
              className="text-[#105b38] transition-all duration-300 ease-linear"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Inner Frosted Card */}
          <div className="absolute inset-5 rounded-full bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(16,91,56,0.06)] border border-white/60 flex flex-col items-center justify-center text-center p-6">
            <div className="font-mono text-5xl sm:text-7xl font-semibold tracking-tight text-[#14231b] tabular-nums">
              {formatTimeDigits(elapsedSeconds)}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-[#526358]">
              <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-[#10b981] animate-ping'}`} />
              <span>{isPaused ? 'Session Paused' : 'Flow State Active'}</span>
            </div>
          </div>
        </div>

        {/* Ergonomic Controls */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={handleTogglePause}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#105b38] text-white hover:bg-[#0c482c] transition-all shadow-md active:scale-95 text-sm font-medium cursor-pointer"
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={handleFinish}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-[#dde5de] text-[#14231b] hover:bg-[#f2f7f3] hover:text-[#105b38] transition-all shadow-sm active:scale-95 text-sm font-medium cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-[#105b38]" />
            <span>Finish Session</span>
          </button>
        </div>

        {/* Subtle, Optional Activity Field Below Controls */}
        <div className="w-full max-w-sm mt-5">
          <div className="flex items-center bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[#dde5de] shadow-sm text-xs text-[#526358] transition-all focus-within:border-[#105b38]/40 focus-within:ring-2 focus-within:ring-[#105b38]/10 focus-within:bg-white">
            <input
              type="text"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              placeholder="What are you working on? (Optional)"
              className="w-full bg-transparent border-0 outline-none text-[#14231b] placeholder:text-[#526358]/50 text-xs"
            />
          </div>
        </div>
      </main>

      <div className="h-6" />
    </div>
  );
};
