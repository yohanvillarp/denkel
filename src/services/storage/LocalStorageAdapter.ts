import { IStorageAdapter } from './IStorageAdapter';
import { TaskNode, ActiveTimerState } from '../../types/task';
import { CameraState } from '../../tree/CameraController';

const TASKS_STORAGE_KEY = 'denkel_tasks_v1';
const TIMER_STORAGE_KEY = 'denkel_active_timer_v1';
const CAMERA_SESSION_KEY = 'denkel_camera_session_v1';
const SELECTED_TASK_SESSION_KEY = 'denkel_selected_task_session_v1';

const FINGERPRINT_STORAGE_KEY = 'denkel_reviewed_fingerprint_v1';

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

  /**
   * Session-scoped camera state:
   * Persists across reloads within the same browsing session,
   * while new sessions start with a clean fit-to-view overview.
   */
  async getCameraState(): Promise<CameraState | null> {
    try {
      const data = sessionStorage.getItem(CAMERA_SESSION_KEY);
      if (!data) return null;
      return JSON.parse(data) as CameraState;
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to load camera state:', err);
      return null;
    }
  }

  async saveCameraState(state: CameraState | null): Promise<void> {
    try {
      if (!state) {
        sessionStorage.removeItem(CAMERA_SESSION_KEY);
      } else {
        sessionStorage.setItem(CAMERA_SESSION_KEY, JSON.stringify(state));
      }
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to save camera state:', err);
    }
  }

  /**
   * Session-scoped task selection:
   * Restores drawer focus on reload, while fresh sessions start with closed drawer.
   */
  async getSelectedTaskId(): Promise<string | null> {
    try {
      return sessionStorage.getItem(SELECTED_TASK_SESSION_KEY);
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to load selected task id:', err);
      return null;
    }
  }

  async saveSelectedTaskId(taskId: string | null): Promise<void> {
    try {
      if (!taskId) {
        sessionStorage.removeItem(SELECTED_TASK_SESSION_KEY);
      } else {
        sessionStorage.setItem(SELECTED_TASK_SESSION_KEY, taskId);
      }
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to save selected task id:', err);
    }
  }

  async getLastReviewedFingerprint(): Promise<string | null> {
    try {
      return localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to load reviewed fingerprint:', err);
      return null;
    }
  }

  async saveLastReviewedFingerprint(fingerprint: string | null): Promise<void> {
    try {
      if (!fingerprint) {
        localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
      } else {
        localStorage.setItem(FINGERPRINT_STORAGE_KEY, fingerprint);
      }
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to save reviewed fingerprint:', err);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(TASKS_STORAGE_KEY);
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
      sessionStorage.removeItem(CAMERA_SESSION_KEY);
      sessionStorage.removeItem(SELECTED_TASK_SESSION_KEY);
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to clear storage:', err);
    }
  }
}

export const storageAdapter = new LocalStorageAdapter();
