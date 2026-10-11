import { TaskNode } from '../types/task';

export interface LayoutPosition {
  x: number;
  y: number;
  originX: number;
  originY: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export interface ITreeLayoutEngine {
  calculateLayout(tasks: TaskNode[]): Map<string, LayoutPosition>;
}
