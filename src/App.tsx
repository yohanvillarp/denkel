import React from 'react';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import { TreeCanvas } from './components/TreeCanvas';
import { TaskInputBar } from './components/TaskInputBar';
import { Header } from './components/Header';
import { TaskDrawer } from './components/TaskDrawer';
import { FocusTimer } from './components/FocusTimer';

const MainView: React.FC = () => {
  const { isLoading, activeTimer, setActiveTimer, selectedTaskId } = useTaskContext();

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
      <Header />
      <TreeCanvas />
      <TaskInputBar />

      {/* Task Details Slide-Over Drawer */}
      {selectedTaskId && !activeTimer && (
        <TaskDrawer onStartTimer={handleStartTimer} />
      )}

      {/* Distraction-Free Fullscreen Focus Timer */}
      {activeTimer && (
        <FocusTimer taskId={activeTimer.taskId} onClose={handleCloseTimer} />
      )}
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
