import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ProjectStatus, TaskPriority, TaskStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function daysUntil(dateString: string): number {
  const now = new Date();
  const target = new Date(dateString);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const STATUS_COLORS: Record<ProjectStatus | TaskStatus, string> = {
  'On Track': 'status-on-track',
  'At Risk': 'status-at-risk',
  'Blocked': 'status-blocked',
  'Completed': 'status-completed',
  'To Do': 'status-todo',
  'In Progress': 'status-in-progress',
  'Waiting for Client': 'status-waiting',
  'Done': 'status-done',
};

export const STATUS_DOT: Record<ProjectStatus | TaskStatus, string> = {
  'On Track': 'bg-[#00C875]',
  'At Risk': 'bg-[#FDAB3D]',
  'Blocked': 'bg-[#E2445C]',
  'Completed': 'bg-[#808080]',
  'To Do': 'bg-[#808080]',
  'In Progress': 'bg-[#A25DDC]',
  'Waiting for Client': 'bg-[#579BFC]',
  'Done': 'bg-[#00C875]',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  'Low': 'priority-low',
  'Medium': 'priority-medium',
  'High': 'priority-high',
  'Critical': 'priority-critical',
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  'Low': 'bg-[#808080]',
  'Medium': 'bg-[#0073EA]',
  'High': 'bg-[#FDAB3D]',
  'Critical': 'bg-[#E2445C]',
};
