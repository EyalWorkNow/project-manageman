import { Project, Task, AISummary, CustomerUpdateResponse, SystemStatus, Comment, ProjectMember } from '../types';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'API Error';
    try {
      const error = await response.json();
      message = error.error || message;
      if (error.details) message = `${message} ${Object.values(error.details).join(' ')}`;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  projects: {
    list: (): Promise<Project[]> =>
      fetch('/api/projects').then(r => handleResponse<Project[]>(r)),
    get: (id: string): Promise<Project & { tasks: Task[]; members: ProjectMember[] }> =>
      fetch(`/api/projects/${id}`).then(r => handleResponse<Project & { tasks: Task[]; members: ProjectMember[] }>(r)),
    create: (project: Partial<Project>): Promise<Project> =>
      fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) }).then(r => handleResponse<Project>(r)),
    update: (id: string, project: Partial<Project>): Promise<Project> =>
      fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) }).then(r => handleResponse<Project>(r)),
  },
  tasks: {
    list: (): Promise<Task[]> =>
      fetch('/api/tasks').then(r => handleResponse<Task[]>(r)),
    save: (task: Partial<Task>): Promise<Task> =>
      fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) }).then(r => handleResponse<Task>(r)),
    updateStatus: (id: string, status: string): Promise<Task> =>
      fetch(`/api/tasks/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => handleResponse<Task>(r)),
    delete: (id: string): Promise<{ ok: boolean }> =>
      fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then(r => handleResponse<{ ok: boolean }>(r)),
    getComments: (taskId: string): Promise<Comment[]> =>
      fetch(`/api/tasks/${taskId}/comments`).then(r => handleResponse<Comment[]>(r)),
    addComment: (taskId: string, content: string, author: string): Promise<Comment> =>
      fetch(`/api/tasks/${taskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, author }) }).then(r => handleResponse<Comment>(r)),
  },
  members: {
    list: (projectId: string): Promise<ProjectMember[]> =>
      fetch(`/api/projects/${projectId}/members`).then(r => handleResponse<ProjectMember[]>(r)),
    add: (projectId: string, name: string, email: string, title: string): Promise<ProjectMember> =>
      fetch(`/api/projects/${projectId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, title }) }).then(r => handleResponse<ProjectMember>(r)),
    updateTitle: (projectId: string, memberId: string, title: string): Promise<ProjectMember> =>
      fetch(`/api/projects/${projectId}/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) }).then(r => handleResponse<ProjectMember>(r)),
    remove: (projectId: string, memberId: string): Promise<{ ok: boolean }> =>
      fetch(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }).then(r => handleResponse<{ ok: boolean }>(r)),
  },
  system: {
    status: (): Promise<SystemStatus> =>
      fetch('/api/system/status').then(r => handleResponse<SystemStatus>(r)),
  },
  ai: {
    summarize: (project: Project, tasks: Task[], language: 'en' | 'he' = 'en'): Promise<AISummary> =>
      fetch('/api/ai/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, tasks, language }) }).then(r => handleResponse<AISummary>(r)),
    customerUpdate: (project: Project, tasks: Task[], language: 'en' | 'he' = 'en'): Promise<CustomerUpdateResponse> =>
      fetch('/api/ai/customer-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, tasks, language }) }).then(r => handleResponse<CustomerUpdateResponse>(r)),
    draft: (message: string, context?: string, language: 'en' | 'he' = 'en'): Promise<{ reply: string; source: string }> =>
      fetch('/api/ai/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context, language }) }).then(r => handleResponse<{ reply: string; source: string }>(r)),
    chat: (message: string, language: 'en' | 'he' = 'en'): Promise<{ reply: string; source: string }> =>
      fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, language }) }).then(r => handleResponse<{ reply: string; source: string }>(r)),
  },
};
