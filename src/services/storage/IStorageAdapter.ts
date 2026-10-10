import { TaskNode, ActiveTimerState } from '../../types/task';

export interface IStorageAdapter {
  getTasks(): Promise<TaskNode[]>;
  saveTasks(tasks: TaskNode[]): Promise<void>;
  getActiveTimer(): Promise<ActiveTimerState | null>;
  saveActiveTimer(state: ActiveTimerState | null): Promise<void>;
  clear(): Promise<void>;
}
