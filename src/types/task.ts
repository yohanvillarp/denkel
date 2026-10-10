export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type NodeType = 'category' | 'project' | 'task';

export interface SessionLog {
  id: string;
  startTime: string; // ISO date
  durationMinutes: number;
  note?: string;
}

export interface TaskNode {
  id: string;
  title: string;
  type: NodeType; // 'category' | 'project' | 'task'
  parentId: string | null;
  status: TaskStatus; // independent of hours
  directMinutes: number; // minutes logged directly to this node
  sessionHistory: SessionLog[];
  isProvisional?: boolean; // created without AI category confirmation
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTimerState {
  taskId: string;
  startTime: number; // Unix timestamp
  accumulatedSeconds: number;
  isPaused: boolean;
}
