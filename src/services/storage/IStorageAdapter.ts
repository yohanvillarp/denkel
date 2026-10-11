import { TaskNode, ActiveTimerState } from '../../types/task';
import { CameraState } from '../../tree/CameraController';

export interface IStorageAdapter {
  getTasks(): Promise<TaskNode[]>;
  saveTasks(tasks: TaskNode[]): Promise<void>;
  getActiveTimer(): Promise<ActiveTimerState | null>;
  saveActiveTimer(state: ActiveTimerState | null): Promise<void>;
  getCameraState(): Promise<CameraState | null>;
  saveCameraState(state: CameraState | null): Promise<void>;
  getSelectedTaskId(): Promise<string | null>;
  saveSelectedTaskId(taskId: string | null): Promise<void>;
  getLastReviewedFingerprint(): Promise<string | null>;
  saveLastReviewedFingerprint(fingerprint: string | null): Promise<void>;
  clear(): Promise<void>;
}
