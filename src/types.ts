export const PROJECT_STATUSES = ['On Track', 'At Risk', 'Blocked', 'Completed'] as const;
export const TASK_STATUSES = ['To Do', 'In Progress', 'Waiting for Client', 'Blocked', 'Done'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type TaskStatus = typeof TASK_STATUSES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];

export const STATUS_TRANSLATION_KEYS: Record<ProjectStatus | TaskStatus, string> = {
  'On Track': 'status.on_track',
  'At Risk': 'status.at_risk',
  'Blocked': 'status.blocked',
  'Completed': 'status.completed',
  'To Do': 'status.todo',
  'In Progress': 'status.in_progress',
  'Waiting for Client': 'status.waiting_for_client',
  'Done': 'status.done',
};

export const PRIORITY_TRANSLATION_KEYS: Record<TaskPriority, string> = {
  Low: 'priority.low',
  Medium: 'priority.medium',
  High: 'priority.high',
  Critical: 'priority.critical',
};

export interface ProjectMember {
  id: string;
  projectId: string;
  name: string;
  email: string;
  title: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  status: ProjectStatus;
  deadline: string;
  projectManager: string;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  members?: ProjectMember[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignee: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isBlocked: boolean;
  blockerDescription: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

export interface AISummary {
  overallStatus: string;
  keyProgress: string;
  risksAndBlockers: string;
  recommendedNextAction: string;
  customerCommunicationNeeded: boolean;
  source?: 'gemini' | 'local-fallback';
}

export interface CustomerUpdateResponse {
  update: string;
  source?: 'gemini' | 'local-fallback';
}

export interface SystemStatus {
  aiMode: 'gemini' | 'local-fallback';
  geminiModel: string;
  storage: 'local-json';
  persistence: boolean;
  generatedAt: string;
}
