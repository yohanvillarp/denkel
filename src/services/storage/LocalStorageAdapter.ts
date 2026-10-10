import { IStorageAdapter } from './IStorageAdapter';
import { TaskNode, ActiveTimerState } from '../../types/task';

const TASKS_STORAGE_KEY = 'denkel_tasks_v1';
const TIMER_STORAGE_KEY = 'denkel_active_timer_v1';

export class LocalStorageAdapter implements IStorageAdapter {
  async getTasks(): Promise<TaskNode[]> {
    try {
      const data = localStorage.getItem(TASKS_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to load tasks:', err);
      return [];
    }
  }

  async saveTasks(tasks: TaskNode[]): Promise<void> {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to save tasks:', err);
    }
  }

  async getActiveTimer(): Promise<ActiveTimerState | null> {
    try {
      const data = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as ActiveTimerState;
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to load active timer:', err);
      return null;
    }
  }

  async saveActiveTimer(state: ActiveTimerState | null): Promise<void> {
    try {
      if (!state) {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      } else {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
      }
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to save active timer:', err);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(TASKS_STORAGE_KEY);
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to clear storage:', err);
    }
  }
}

export const storageAdapter = new LocalStorageAdapter();
