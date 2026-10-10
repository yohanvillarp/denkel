import React from 'react';
import { TaskProvider, useTaskContext } from './context/TaskContext';
import { TreeCanvas } from './components/TreeCanvas';
import { TaskInputBar } from './components/TaskInputBar';
import { Header } from './components/Header';

const MainView: React.FC = () => {
  const { isLoading } = useTaskContext();

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#fcfbf9] text-botanical-muted">
        <div className="w-10 h-10 border-2 border-botanical-branch border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Awakening your living tree...</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-botanical-canvas">
      <Header />
      <TreeCanvas />
      <TaskInputBar />
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
