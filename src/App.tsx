import React, { useState, useEffect } from 'react';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import { TreeCanvas } from './components/TreeCanvas';
import { TaskInputBar } from './components/TaskInputBar';
import { Header } from './components/Header';
import { TaskDrawer } from './components/TaskDrawer';
import { FocusTimer } from './components/FocusTimer';
import { SearchModal } from './components/SearchModal';

const MainView: React.FC = () => {
  const { isLoading, activeTimer, setActiveTimer } = useTaskContext();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global keyboard shortcut to open search modal (/ or Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl && (activeEl as HTMLElement).isContentEditable);

      if ((e.key === '/' && !isInput) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#fcfbf9] text-botanical-muted">
        <div className="w-10 h-10 border-2 border-botanical-branch border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Awakening your living tree...</p>
      </div>
    );
  }

  const handleStartTimer = (taskId: string) => {
    setActiveTimer({
      taskId,
      startTime: Date.now(),
      accumulatedSeconds: 0,
      isPaused: false
    });
  };

  const handleCloseTimer = () => {
    setActiveTimer(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-botanical-canvas select-none">
      <Header onOpenSearch={() => setIsSearchOpen(true)} />
      <TreeCanvas />
      <TaskInputBar />

      {/* Task Details Slide-Over Drawer */}
      {!activeTimer && (
        <TaskDrawer onStartTimer={handleStartTimer} />
      )}

      {/* Distraction-Free Fullscreen Focus Timer */}
      {activeTimer && (
        <FocusTimer taskId={activeTimer.taskId} onClose={handleCloseTimer} />
      )}

      {/* Guided Floating Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <TaskProvider>
      <MainView />
    </TaskProvider>
  );
};

export default App;
