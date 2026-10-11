import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TaskNode, NodeType, TaskStatus, SessionLog, ActiveTimerState } from '../types/task';
import { storageAdapter } from '../services/storage/LocalStorageAdapter';
import { CameraController } from '../tree/CameraController';

interface TaskContextType {
  tasks: TaskNode[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedTask: TaskNode | null;
  addTask: (title: string, parentId?: string | null, type?: NodeType) => Promise<TaskNode>;
  createCategory: (title: string, parentId?: string | null) => Promise<TaskNode>;
  promoteToCategory: (categoryTitle: string, taskIds: string[], parentId?: string | null) => Promise<TaskNode>;
  convertTaskType: (taskId: string, type: NodeType) => Promise<void>;
  updateTask: (task: TaskNode) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  logTime: (taskId: string, durationMinutes: number, note?: string) => Promise<void>;
  updateSessionNote: (taskId: string, sessionId: string, note: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  reparentTask: (taskId: string, newParentId: string | null) => Promise<void>;
  activeTimer: ActiveTimerState | null;
  setActiveTimer: (timer: ActiveTimerState | null) => Promise<void>;
  cameraController: CameraController;
  isLoading: boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTimer, setActiveTimerState] = useState<ActiveTimerState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Single persistent camera controller instance
  const cameraController = useMemo(() => new CameraController(0, 0, 1.0), []);

  // Initial load from storage adapter
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [loadedTasks, loadedTimer] = await Promise.all([
          storageAdapter.getTasks(),
          storageAdapter.getActiveTimer()
        ]);
        if (isMounted) {
          setTasks(loadedTasks);
          setActiveTimerState(loadedTimer);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[TaskContext] Error loading initial data:', err);
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Save active timer when updated
  const setActiveTimer = useCallback(async (timer: ActiveTimerState | null) => {
    setActiveTimerState(timer);
    await storageAdapter.saveActiveTimer(timer);
  }, []);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const addTask = useCallback(async (
    title: string,
    parentId: string | null = null,
    type: NodeType = 'task'
  ): Promise<TaskNode> => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Task title cannot be empty');
    }

    const newTask: TaskNode = {
      id: `${type === 'category' ? 'cat' : 'task'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: trimmedTitle,
      type,
      parentId,
      status: type === 'category' ? 'in_progress' : 'pending',
      directMinutes: 0,
      sessionHistory: [],
      isProvisional: !parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    await storageAdapter.saveTasks(updated);
    return newTask;
  }, [tasks]);

  const createCategory = useCallback(async (
    title: string,
    parentId: string | null = null
  ): Promise<TaskNode> => {
    return addTask(title, parentId, 'category');
  }, [addTask]);

  const promoteToCategory = useCallback(async (
    categoryTitle: string,
    taskIds: string[],
    parentId: string | null = null
  ): Promise<TaskNode> => {
    const trimmed = categoryTitle.trim();
    if (!trimmed) throw new Error('Category title cannot be empty');

    const newCategory: TaskNode = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: trimmed,
      type: 'category',
      parentId,
      status: 'in_progress',
      directMinutes: 0,
      sessionHistory: [],
      isProvisional: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const taskIdSet = new Set(taskIds);
    const updatedTasks = tasks.map(t => {
      if (taskIdSet.has(t.id)) {
        return {
          ...t,
          parentId: newCategory.id,
          isProvisional: false,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    const finalTasks = [...updatedTasks, newCategory];
    setTasks(finalTasks);
    await storageAdapter.saveTasks(finalTasks);
    return newCategory;
  }, [tasks]);

  const convertTaskType = useCallback(async (taskId: string, type: NodeType) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          type,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    setTasks(updated);
    await storageAdapter.saveTasks(updated);
  }, [tasks]);

  const updateTask = useCallback(async (updatedNode: TaskNode) => {
    const updated = tasks.map(t => (t.id === updatedNode.id ? { ...updatedNode, updatedAt: new Date().toISOString() } : t));
    setTasks(updated);
    await storageAdapter.saveTasks(updated);
  }, [tasks]);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    setTasks(updated);
    await storageAdapter.saveTasks(updated);
  }, [tasks]);

  const logTime = useCallback(async (taskId: string, durationMinutes: number, note?: string) => {
    if (durationMinutes <= 0) return;
    const newSession: SessionLog = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      startTime: new Date().toISOString(),
      durationMinutes,
      note
    };

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          directMinutes: (t.directMinutes || 0) + durationMinutes,
          // Transition from pending to in_progress if not completed
          status: t.status === 'pending' ? ('in_progress' as TaskStatus) : t.status,
          sessionHistory: [newSession, ...(t.sessionHistory || [])],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    setTasks(updated);
    await storageAdapter.saveTasks(updated);
  }, [tasks]);

  const updateSessionNote = useCallback(async (taskId: string, sessionId: string, note: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          sessionHistory: (t.sessionHistory || []).map(s => (s.id === sessionId ? { ...s, note: note.trim() || undefined } : s)),
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    setTasks(updated);
    await storageAdapter.saveTasks(updated);
  }, [tasks]);

  const reparentTask = useCallback(async (taskId: string, newParentId: string | null) => {
    // Check for self or circular dependency
    if (taskId === newParentId) {
      throw new Error('A node cannot be its own parent');
    }

    // Verify circular path: newParent cannot be a descendant of taskId
    const isDescendant = (currentParentId: string | null, targetAncestorId: string): boolean => {
      if (!currentParentId) return false;
      if (currentParentId === targetAncestorId) return true;
      const parentTask = tasks.find(t => t.id === currentParentId);
      return parentTask ? isDescendant(parentTask.parentId, targetAncestorId) : false;
    };

    if (newParentId && isDescendant(newParentId, taskId)) {
      throw new Error('Reparenting would create a circular reference');
    }

    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          parentId: newParentId,
          isProvisional: false,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    setTasks(updated);
    await storageAdapter.saveTasks(updated);
  }, [tasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    // Reparent direct children to this task's parent to avoid orphaned subtrees
    const targetTask = tasks.find(t => t.id === taskId);
    const fallbackParentId = targetTask ? targetTask.parentId : null;

    const updated = tasks
      .filter(t => t.id !== taskId)
      .map(t => (t.parentId === taskId ? { ...t, parentId: fallbackParentId } : t));

    setTasks(updated);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    await storageAdapter.saveTasks(updated);
  }, [tasks, selectedTaskId]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        selectedTaskId,
        setSelectedTaskId,
        selectedTask,
        addTask,
        createCategory,
        promoteToCategory,
        convertTaskType,
        updateTask,
        updateTaskStatus,
        logTime,
        updateSessionNote,
        deleteTask,
        reparentTask,
        activeTimer,
        setActiveTimer,
        cameraController,
        isLoading
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
