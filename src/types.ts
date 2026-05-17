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
  projectRole?: string;
  allocationPercent?: number;
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
  startDate?: string;
  progressPercent?: number;
  sortOrder?: number;
  timelineHealth?: string;
  isCriticalPath?: boolean;
  taskType?: string;
  baselineStartDate?: string;
  baselineEndDate?: string;
  displayColor?: string;
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SystemStatus {
  aiMode: 'gemini' | 'local-fallback';
  geminiModel: string;
  storage: 'local-json' | 'postgres';
  persistence: boolean;
  generatedAt: string;
}

export interface GanttProjectHealth {
  projectId: string;
  projectKey: string;
  projectName: string;
  status: string;
  priority: string;
  startDate: string;
  targetEndDate: string;
  actualEndDate: string | null;
  progressPercent: number;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  criticalPathTasks: number;
  earliestTaskStart: string | null;
  latestTaskEnd: string | null;
  healthStatus: string;
}

export interface GanttTimelineTask {
  taskId: string;
  projectId: string;
  taskKey: string;
  title: string;
  taskType: string;
  taskStatus: string;
  priority: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  durationDays: number;
  progressPercent: number;
  estimatedHours: number | null;
  loggedHours: number;
  isCriticalPath: boolean;
  sortOrder: number;
  ownerName: string | null;
  ownerEmail: string | null;
  blockingDependenciesCount: number;
  dependentTasksCount: number;
  isOverdue: boolean;
  timelineHealth: string;
  assignees: string[];
  baselineName: string | null;
  baselineVersion: number | null;
  baselineStartDate: string | null;
  baselineEndDate: string | null;
  commentsCount: number;
  displayColor?: string | null;
}

export interface GanttMilestone {
  id: string;
  projectId: string;
  milestoneKey: string;
  milestoneName: string;
  dueDate: string;
  status: string;
  completedAt: string | null;
  ownerName: string | null;
  isLate: boolean;
}

export interface GanttResourceLoad {
  userId: string;
  fullName: string;
  department: string | null;
  activeProjects: number;
  openTasks: number;
  openTaskAllocationPercent: number | null;
  nextTaskStart: string | null;
  latestTaskEnd: string | null;
}

export interface GanttActivityItem {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  actorName: string | null;
  eventType: string;
  message: string | null;
  createdAt: string;
}

export interface TaskDependencyLink {
  id: string;
  direction: 'predecessor' | 'successor';
  taskId: string;
  taskKey: string;
  title: string;
  status: string;
  dependencyType: string;
  lagDays: number;
  isBlocking: boolean;
}

export interface TaskDetailContext {
  dependencies: TaskDependencyLink[];
  activity: GanttActivityItem[];
}

export interface ProjectDecisionItem {
  id: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  actorName: string | null;
  decisionType: string;
  summary: string;
  createdAt: string;
}

export interface ProjectGanttData {
  health: GanttProjectHealth;
  tasks: GanttTimelineTask[];
  milestones: GanttMilestone[];
  resources: GanttResourceLoad[];
  activity: GanttActivityItem[];
}
