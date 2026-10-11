import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TaskNode, NodeType, TaskStatus, SessionLog, ActiveTimerState } from '../types/task';
import { storageAdapter } from '../services/storage/LocalStorageAdapter';
import { CameraController } from '../tree/CameraController';

import { AICategorizationResult, TreeTaxonomySummary } from '../types/ai';
import { AIOrchestrator } from '../services/ai/AIOrchestrator';

export const computeTreeStructureFingerprint = (taskList: TaskNode[]): string => {
  return taskList
    .map(t => `${t.id}:${t.parentId || 'root'}:${t.type}:${t.title.trim().toLowerCase()}:${t.isProvisional ? 'prov' : 'done'}`)
    .sort()
    .join('|');
};

interface TaskContextType {
  tasks: TaskNode[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedTask: TaskNode | null;
  hasPendingStructuralReview: boolean;
  addTask: (title: string, parentId?: string | null, type?: NodeType) => Promise<TaskNode>;
  plantTaskWithAI: (input: string) => Promise<{
    task: TaskNode;
    categoryCreated?: TaskNode;
    reparentedTasks?: TaskNode[];
    result: AICategorizationResult;
  }>;
  reorganizeTreeWithAI: () => Promise<{
    clustersCreated: number;
    tasksReorganized: number;
    correctionsApplied: number;
    reasoning: string;
    success: boolean;
  }>;
  createCategory: (title: string, parentId?: string | null) => Promise<TaskNode>;
  promoteToCategory: (categoryTitle: string, taskIds: string[], parentId?: string | null) => Promise<TaskNode>;
  convertTaskType: (taskId: string, type: NodeType) => Promise<void>;
  updateTask: (task: TaskNode) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  logTime: (taskId: string, durationMinutes: number, note?: string) => Promise<void>;
  updateSession: (taskId: string, sessionId: string, durationMinutes: number, note?: string) => Promise<void>;
  updateSessionNote: (taskId: string, sessionId: string, note: string) => Promise<void>;
  deleteSession: (taskId: string, sessionId: string) => Promise<void>;
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
  const [lastReviewedFingerprint, setLastReviewedFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Single persistent camera controller instance
  const cameraController = useMemo(() => new CameraController(0, 0, 1.0), []);

  // Botanical AI Orchestrator instance
  const aiOrchestrator = useMemo(() => new AIOrchestrator(), []);

  // Initial load from storage adapter
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [loadedTasks, loadedTimer, loadedFingerprint] = await Promise.all([
          storageAdapter.getTasks(),
          storageAdapter.getActiveTimer(),
          storageAdapter.getLastReviewedFingerprint()
        ]);
        if (isMounted) {
          setTasks(loadedTasks);
          setActiveTimerState(loadedTimer);
          setLastReviewedFingerprint(loadedFingerprint);
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

  const hasPendingStructuralReview = useMemo(() => {
    if (tasks.length < 2) return false;
    if (tasks.some(t => t.isProvisional)) return true;
    if (!lastReviewedFingerprint) return true;
    const currentFingerprint = computeTreeStructureFingerprint(tasks);
    return currentFingerprint !== lastReviewedFingerprint;
  }, [tasks, lastReviewedFingerprint]);

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

  const plantTaskWithAI = useCallback(async (
    input: string
  ): Promise<{
    task: TaskNode;
    categoryCreated?: TaskNode;
    reparentedTasks?: TaskNode[];
    result: AICategorizationResult;
  }> => {
    const trimmed = input.trim();
    if (!trimmed) throw new Error('Task input cannot be empty');

    const existingTaxonomy: TreeTaxonomySummary[] = tasks.map(t => ({
      id: t.id,
      title: t.title,
      type: t.type,
      parentId: t.parentId,
      directMinutes: t.directMinutes,
      isProvisional: t.isProvisional
    }));

    const result = await aiOrchestrator.categorizeTask(trimmed, existingTaxonomy);

    // 1. Category wrapper creation (with retroactive reparenting of existing peer tasks)
    if (result.action === 'create_category_wrapper' && result.newCategoryTitle) {
      const newCategory: TaskNode = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: result.newCategoryTitle,
        type: 'category',
        parentId: null,
        status: 'in_progress',
        directMinutes: 0,
        sessionHistory: [],
        isProvisional: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newTask: TaskNode = {
        id: `task_${Date.now() + 1}_${Math.random().toString(36).substring(2, 7)}`,
        title: result.taskTitle,
        type: 'task',
        parentId: newCategory.id,
        status: 'pending',
        directMinutes: 0,
        sessionHistory: [],
        isProvisional: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const reparentSet = new Set(result.reparentExistingTaskIds || []);
      const reparentedTasksList: TaskNode[] = [];

      const updatedExisting = tasks.map(t => {
        if (reparentSet.has(t.id)) {
          const movedTask: TaskNode = {
            ...t,
            parentId: newCategory.id,
            isProvisional: false,
            updatedAt: new Date().toISOString()
          };
          reparentedTasksList.push(movedTask);
          return movedTask;
        }
        return t;
      });

      const updated = [...updatedExisting, newCategory, newTask];
      setTasks(updated);
      await storageAdapter.saveTasks(updated);

      if (!result.isFallback && !updated.some(t => t.isProvisional)) {
        const newFp = computeTreeStructureFingerprint(updated);
        setLastReviewedFingerprint(newFp);
        await storageAdapter.saveLastReviewedFingerprint(newFp);
      }

      return {
        task: newTask,
        categoryCreated: newCategory,
        reparentedTasks: reparentedTasksList,
        result
      };
    }

    // 2. Nest under existing node (with retroactive reparenting of peer tasks if proposed)
    if (result.action === 'nest_under_existing' && result.targetParentId) {
      const newTask: TaskNode = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: result.taskTitle,
        type: 'task',
        parentId: result.targetParentId,
        status: 'pending',
        directMinutes: 0,
        sessionHistory: [],
        isProvisional: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const reparentSet = new Set(result.reparentExistingTaskIds || []);
      const reparentedTasksList: TaskNode[] = [];

      const updatedExisting = tasks.map(t => {
        if (reparentSet.has(t.id)) {
          const movedTask: TaskNode = {
            ...t,
            parentId: result.targetParentId,
            isProvisional: false,
            updatedAt: new Date().toISOString()
          };
          reparentedTasksList.push(movedTask);
          return movedTask;
        }
        return t;
      });

      const updated = [...updatedExisting, newTask];
      setTasks(updated);
      await storageAdapter.saveTasks(updated);

      if (!result.isFallback && !updated.some(t => t.isProvisional)) {
        const newFp = computeTreeStructureFingerprint(updated);
        setLastReviewedFingerprint(newFp);
        await storageAdapter.saveLastReviewedFingerprint(newFp);
      }

      return { task: newTask, reparentedTasks: reparentedTasksList, result };
    }

    // 3. Top-level stem on central trunk
    const newTask: TaskNode = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: result.taskTitle,
      type: 'task',
      parentId: null,
      status: 'pending',
      directMinutes: 0,
      sessionHistory: [],
      isProvisional: result.isFallback || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    await storageAdapter.saveTasks(updated);

    if (!result.isFallback && !updated.some(t => t.isProvisional)) {
      const newFp = computeTreeStructureFingerprint(updated);
      setLastReviewedFingerprint(newFp);
      await storageAdapter.saveLastReviewedFingerprint(newFp);
    }

    return { task: newTask, result };
  }, [tasks, aiOrchestrator]);

  const reorganizeTreeWithAI = useCallback(async (): Promise<{
    clustersCreated: number;
    tasksReorganized: number;
    correctionsApplied: number;
    reasoning: string;
    success: boolean;
  }> => {
    const currentFingerprint = computeTreeStructureFingerprint(tasks);
    if (tasks.length < 2) {
      return { clustersCreated: 0, tasksReorganized: 0, correctionsApplied: 0, reasoning: 'Need at least 2 tasks to evaluate reorganization.', success: true };
    }

    // Guard against duplicate requests when structure is already reviewed and unchanged
    if (lastReviewedFingerprint === currentFingerprint && !tasks.some(t => t.isProvisional)) {
      return { clustersCreated: 0, tasksReorganized: 0, correctionsApplied: 0, reasoning: 'Tree structure is already reviewed.', success: true };
    }

    const existingTaxonomy: TreeTaxonomySummary[] = tasks.map(t => ({
      id: t.id,
      title: t.title,
      type: t.type,
      parentId: t.parentId,
      directMinutes: t.directMinutes,
      isProvisional: t.isProvisional
    }));

    const result = await aiOrchestrator.reorganizeTree(existingTaxonomy);

    // CRITICAL: Fallback must NOT mark the hierarchy as successfully reviewed
    if (result.isFallback) {
      console.warn('[reorganizeTreeWithAI] Reorganization used fallback; pending review remains.');
      return {
        clustersCreated: 0,
        tasksReorganized: 0,
        correctionsApplied: 0,
        reasoning: result.reasoning || 'Reorganization unavailable in offline mode.',
        success: false
      };
    }

    let currentTasks = [...tasks];
    let totalMoved = 0;
    let totalCorrected = 0;

    // 1. Apply relationship corrections (detach misplaced tasks or move to appropriate parent)
    if (result.corrections && result.corrections.length > 0) {
      for (const correction of result.corrections) {
        currentTasks = currentTasks.map(t => {
          if (t.id === correction.taskId) {
            totalCorrected++;
            return {
              ...t,
              parentId: correction.newParentId,
              // If detached to root, mark provisional; if moved to legitimate category, unmark provisional
              isProvisional: correction.newParentId === null,
              updatedAt: new Date().toISOString()
              // ALL EFFORT, SESSIONS, DATES, STATUS, AND ID PRESERVED UNTOUCHED!
            };
          }
          return t;
        });
      }
    }

    // 2. Apply clusters (grouping independent or detached tasks into categories)
    if (result.clusters && result.clusters.length > 0) {
      for (const cluster of result.clusters) {
        const newCategory: TaskNode = {
          id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: cluster.categoryTitle,
          type: 'category',
          parentId: null,
          status: 'in_progress',
          directMinutes: 0,
          sessionHistory: [],
          isProvisional: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const idSet = new Set(cluster.taskIds);
        currentTasks = currentTasks.map(t => {
          if (idSet.has(t.id)) {
            totalMoved++;
            return {
              ...t,
              parentId: newCategory.id,
              isProvisional: false,
              updatedAt: new Date().toISOString()
            };
          }
          return t;
        });

        currentTasks.push(newCategory);
      }
    } else if (totalCorrected === 0) {
      // Gemini confirmed the current tree has no clusters and no misplacements; clear provisional markers
      currentTasks = currentTasks.map(t => (t.isProvisional ? { ...t, isProvisional: false } : t));
    }

    setTasks(currentTasks);
    await storageAdapter.saveTasks(currentTasks);

    const newFingerprint = computeTreeStructureFingerprint(currentTasks);
    setLastReviewedFingerprint(newFingerprint);
    await storageAdapter.saveLastReviewedFingerprint(newFingerprint);

    return {
      clustersCreated: result.clusters?.length || 0,
      tasksReorganized: totalMoved,
      correctionsApplied: totalCorrected,
      reasoning: result.reasoning,
      success: true
    };
  }, [tasks, lastReviewedFingerprint, aiOrchestrator]);

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
    const target = tasks.find(t => t.id === taskId);
    if (status === 'pending' && target) {
      const hasAccumulatedTime = (target.directMinutes || 0) > 0 || (target.sessionHistory || []).some(s => s.durationMinutes > 0);
      if (hasAccumulatedTime) {
        // Pending Bud is restricted to unstarted tasks with zero accumulated time
        return;
      }
    }

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
          // Transition from pending to in_progress on first logged effort
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

  const updateSession = useCallback(async (
    taskId: string,
    sessionId: string,
    durationMinutes: number,
    note?: string
  ) => {
    const validMinutes = Math.max(0, durationMinutes);
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const history = t.sessionHistory || [];
        const targetSession = history.find(s => s.id === sessionId);
        if (!targetSession) return t;

        const durationDiff = validMinutes - targetSession.durationMinutes;
        const newDirectMins = Math.max(0, (t.directMinutes || 0) + durationDiff);

        const newHistory = history.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              durationMinutes: validMinutes,
              note: note !== undefined ? (note.trim() || undefined) : s.note
            };
          }
          return s;
        });

        return {
          ...t,
          directMinutes: newDirectMins,
          sessionHistory: newHistory,
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

  const deleteSession = useCallback(async (taskId: string, sessionId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const targetSession = (t.sessionHistory || []).find(s => s.id === sessionId);
        const sessionMins = targetSession ? targetSession.durationMinutes : 0;
        const newHistory = (t.sessionHistory || []).filter(s => s.id !== sessionId);
        const newDirectMins = Math.max(0, (t.directMinutes || 0) - sessionMins);
        return {
          ...t,
          directMinutes: newDirectMins,
          sessionHistory: newHistory,
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
        hasPendingStructuralReview,
        addTask,
        plantTaskWithAI,
        reorganizeTreeWithAI,
        createCategory,
        promoteToCategory,
        convertTaskType,
        updateTask,
        updateTaskStatus,
        logTime,
        updateSession,
        updateSessionNote,
        deleteSession,
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
