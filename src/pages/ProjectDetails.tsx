import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft2, Magicpen, Add, Warning2, Eye, Edit2,
  Profile2User, FolderOpen, Send2, DocumentText, MessageText, Flash, ClipboardText, TickCircle, Calendar1, Activity,
} from 'iconsax-react';
import { motion } from 'motion/react';
import { Project, Task, AISummary, ProjectGanttData, ProjectMember, ProjectDecisionItem, ChatMessage, STATUS_TRANSLATION_KEYS } from '../types';
import { api } from '../services/api';
import { cn, formatDate, daysUntil, STATUS_COLORS, PRIORITY_COLORS, STATUS_DOT, PRIORITY_DOT } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import KanbanBoard from '../components/KanbanBoard';
import TaskDetailModal from '../components/TaskDetailModal';
import AiDraftPanel from '../components/AiDraftPanel';
import ProjectMembersPanel from '../components/ProjectMembersPanel';
import ProjectGanttPanel from '../components/ProjectGanttPanel';

function ChevronRight({ size = 14, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={flip ? 'rotate-180' : ''}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function Section({ label, content, accent }: { label: string; content: string; accent?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={cn('text-xs leading-relaxed font-semibold', accent ? 'text-zinc-900' : 'text-zinc-900')}>{content}</p>
    </div>
  );
}

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__)/g);
  return parts.map((part, i) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  function flushList() {
    if (!listItems.length) return;
    const items = listItems.map((item, i) => <li key={i}>{parseInline(item)}</li>);
    elements.push(
      listType === 'ol'
        ? <ol key={elements.length} className="list-decimal pl-5 space-y-0.5 my-1">{items}</ol>
        : <ul key={elements.length} className="list-disc pl-5 space-y-0.5 my-1">{items}</ul>
    );
    listItems = [];
    listType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ul = line.match(/^[-*•]\s+(.*)/);
    const ol = line.match(/^\d+\.\s+(.*)/);
    const h = line.match(/^#{1,3}\s+(.*)/);

    if (ul) {
      if (listType !== 'ul') flushList();
      listType = 'ul'; listItems.push(ul[1]);
    } else if (ol) {
      if (listType !== 'ol') flushList();
      listType = 'ol'; listItems.push(ol[1]);
    } else {
      flushList();
      if (h) {
        elements.push(<p key={elements.length} className="font-bold text-sm text-zinc-900 mt-2 mb-0.5">{parseInline(h[1])}</p>);
      } else if (!line.trim()) {
        if (i > 0 && i < lines.length - 1) elements.push(<div key={elements.length} className="h-1.5" />);
      } else {
        elements.push(<p key={elements.length} className="leading-relaxed">{parseInline(line)}</p>);
      }
    }
  }
  flushList();
  return <div className="text-sm space-y-0.5">{elements}</div>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer flex-shrink-0"
      title="Copy"
    >
      {copied
        ? <TickCircle size={12} color="#22c55e" variant="Bold" />
        : <ClipboardText size={12} color="currentColor" variant="Linear" />
      }
    </button>
  );
}

type ProjectChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'internal_report' | 'customer_update';
  data?: any;
  timestamp: Date;
};

type Tab = 'board' | 'gantt' | 'ai' | 'members';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isRTL, language } = useI18n();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ganttData, setGanttData] = useState<ProjectGanttData | null>(null);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [decisionLog, setDecisionLog] = useState<ProjectDecisionItem[]>([]);

  const [activeTab, setActiveTab] = useState<Tab>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [aiMessages, setAiMessages] = useState<ProjectChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  function refreshGanttData(projectId = id) {
    if (!projectId) return;
    setGanttLoading(true);
    api.projects.gantt(projectId)
      .then(setGanttData)
      .catch(console.error)
      .finally(() => setGanttLoading(false));
  }

  useEffect(() => {
    if (activeTab === 'ai') {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [aiMessages, generatingAI, activeTab]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadProject() {
      setLoading(true);
      setLoadError(null);
      setProject(null);
      setTasks([]);
      setMembers([]);
      setAllUsers([]);
      setGanttData(null);
      setDecisionLog([]);

      try {
        const proj = await api.projects.get(id);
        if (cancelled) return;

        setProject(proj);
        setTasks(proj.tasks || []);
        setMembers(proj.members || []);

        const [membersResult, ganttResult, decisionResult, usersResult] = await Promise.allSettled([
          api.members.list(id),
          api.projects.gantt(id),
          api.insights.decisionLog(id),
          api.users.list(),
        ]);

        if (cancelled) return;

        if (membersResult.status === 'fulfilled') {
          setMembers(membersResult.value);
        } else {
          console.error(membersResult.reason);
        }

        if (usersResult.status === 'fulfilled') {
          setAllUsers(usersResult.value);
        } else {
          console.error(usersResult.reason);
        }

        if (ganttResult.status === 'fulfilled') {
          setGanttData(ganttResult.value);
        } else {
          console.error(ganttResult.reason);
        }

        if (decisionResult.status === 'fulfilled') {
          setDecisionLog(decisionResult.value);
        } else {
          console.error(decisionResult.reason);
        }
      } catch (error) {
        console.error(error);
        if (cancelled) return;

        const message = error instanceof Error ? error.message : 'Could not load project.';
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || activeTab !== 'gantt' || ganttData || ganttLoading) return;
    refreshGanttData(id);
  }, [activeTab, ganttData, ganttLoading, id]);

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-6 space-y-5">
        <div className="skeleton h-14 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAFA]">
        <p className="text-zinc-500 font-semibold">
          {loadError && loadError !== 'Project not found.'
            ? (isRTL ? 'לא ניתן לטעון את הפרויקט כרגע.' : 'Could not load the project right now.')
            : (isRTL ? 'פרויקט לא נמצא.' : 'Project not found.')}
        </p>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const activeTasks = tasks.filter(t => t.status === 'To Do' || t.status === 'In Progress' || t.status === 'Waiting for Client').length;
  const blockedTasks = tasks.filter(t => t.isBlocked);
  const progress = ganttData?.health.progressPercent
    ?? (tasks.length > 0
      ? Math.round(tasks.reduce((sum, task) => sum + (task.progressPercent ?? (task.status === 'Done' ? 100 : 0)), 0) / tasks.length)
      : 0);
  const days = project.deadline ? daysUntil(project.deadline) : null;

  const progressColor =
    progress > 60 ? 'bg-[#00C875]' : progress > 30 ? 'bg-[#FDAB3D]' : 'bg-[#E2445C]';
  const daysColor =
    days === null ? 'bg-zinc-100 text-zinc-500'
    : days > 14   ? 'bg-[#E6F9F1] text-[#00854D]'
    : days > 0    ? 'bg-[#FFF4E5] text-[#C47E00]'
    :               'bg-[#FFEEF1] text-[#C5263A]';
  const daysLabel =
    days === null ? ''
    : days === 0  ? (isRTL ? 'היום' : 'Today')
    : days < 0   ? `${Math.abs(days)}${isRTL ? ' ד׳ באיחור' : 'd overdue'}`
    :              `${days}${isRTL ? ' ד׳ נותרו' : 'd left'}`;

  const enhancedAiContext = [
    `Project: ${project.name}`,
    `Client: ${project.clientName}`,
    `Project status: ${project.status}`,
    `Progress: ${progress}%`,
    `Active tasks: ${activeTasks}`,
    `Blocked tasks: ${blockedTasks.length}`,
    `Completed tasks: ${completedTasks}`,
    blockedTasks.length > 0 ? `Blocked task details: ${blockedTasks.map(task => `${task.title} (${task.blockerDescription || 'No blocker description'})`).join('; ')}` : '',
    ganttData?.health ? `Critical path tasks: ${ganttData.health.criticalPathTasks}. Overdue tasks: ${ganttData.health.overdueTasks}.` : '',
    ganttData?.milestones?.length ? `Milestones: ${ganttData.milestones.map((milestone) => `${milestone.milestoneName} [${milestone.status}] due ${milestone.dueDate}`).join('; ')}` : '',
    ganttData?.resources?.length ? `Resource load: ${ganttData.resources.slice(0, 6).map((resource) => `${resource.fullName} ${Math.round(resource.openTaskAllocationPercent || 0)}% allocation across ${resource.openTasks} open tasks`).join('; ')}` : '',
    decisionLog.length ? `Decision log: ${decisionLog.slice(0, 6).map((item) => `${item.summary}${item.taskTitle ? ` [${item.taskTitle}]` : ''}`).join('; ')}` : '',
    `Tasks: ${tasks.map(t => `${t.title} [${t.status}]`).join(', ')}`,
  ].filter(Boolean).join('. ');

  // ── AI handlers ─────────────────────────────────────────────────────────────
  async function generateAISummary() {
    if (!project) return;
    const userMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'user', content: isRTL ? 'הפק דוח סטטוס פנימי' : 'Generate Internal Status Report', type: 'text', timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setGeneratingAI(true); 
    try {
      const summary = await api.ai.summarize(project, tasks, language);
      const aiMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', type: 'internal_report', data: summary, timestamp: new Date() };
      setAiMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setAiMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: err instanceof Error ? err.message : 'Could not generate summary.', type: 'text', timestamp: new Date() }]);
    } finally { setGeneratingAI(false); }
  }

  async function generateCustomerUpdate() {
    if (!project) return;
    const userMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'user', content: isRTL ? 'נסח עדכון סטטוס ללקוח' : 'Draft Customer Update', type: 'text', timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setGeneratingAI(true); 
    try {
      const res = await api.ai.customerUpdate(project, tasks, language);
      const aiMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', type: 'customer_update', data: res.update, timestamp: new Date() };
      setAiMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setAiMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: err instanceof Error ? err.message : 'Could not generate update.', type: 'text', timestamp: new Date() }]);
    } finally { setGeneratingAI(false); }
  }

  async function streamProjectChat(userText: string, historySnapshot: ChatMessage[]) {
    if (!project) return;
    const assistantId = crypto.randomUUID();
    setAiMessages(prev => [...prev, {
      id: assistantId, role: 'assistant', content: '', type: 'text', timestamp: new Date(), data: { streaming: true },
    }]);
    setGeneratingAI(true);
    aiAbortRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: historySnapshot, language, projectId: project.id }),
        signal: aiAbortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              full += parsed.text;
              const snapshot = full;
              setAiMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: snapshot } : m
              ));
            }
          } catch { /* skip */ }
        }
      }
      setAiMessages(prev => prev.map(m => m.id === assistantId ? { ...m, data: undefined } : m));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Fallback to non-streaming
        try {
          const data = await api.ai.chat(userText, historySnapshot, language, project.id);
          setAiMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: data.reply || 'No response.', data: undefined } : m
          ));
        } catch {
          setAiMessages(prev => prev.map(m =>
            m.id === assistantId
              ? { ...m, content: isRTL ? 'אירעה שגיאה. נסה שנית.' : 'Error occurred. Please try again.', data: undefined }
              : m
          ));
        }
      } else {
        setAiMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, data: undefined } : m
        ));
      }
    } finally {
      setGeneratingAI(false);
      aiAbortRef.current = null;
    }
  }

  async function handleSendChat() {
    if (!chatInput.trim() || !project || generatingAI) return;
    const text = chatInput.trim();
    setChatInput('');
    const history: ChatMessage[] = aiMessages.map(m => ({ role: m.role, content: m.content }));
    const userMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, type: 'text', timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    await streamProjectChat(text, history);
  }

  async function runPresetAiAction(label: string, prompt: string) {
    if (!project || generatingAI) return;
    setActiveTab('ai');
    const history: ChatMessage[] = aiMessages.map(m => ({ role: m.role, content: m.content }));
    const userMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'user', content: label, type: 'text', timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    await streamProjectChat(prompt, history);
  }
  
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendChat();
    }
  }

  // ── Task modal handlers ──────────────────────────────────────────────────────
  function handleTaskUpdate(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(updated);
    refreshGanttData(updated.projectId);
  }

  function handleTaskDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
    refreshGanttData();
  }

  function handleGanttTaskOpen(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (task) {
      setSelectedTask(task);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'board',   label: isRTL ? `לוח (${tasks.length})` : `Board (${tasks.length})` },
    { id: 'gantt',   label: isRTL ? 'גאנט פרויקט' : 'Project Gantt' },
    { id: 'ai',      label: isRTL ? 'עוזר חכם' : 'Smart Assistant' },
    { id: 'members', label: isRTL ? `משתתפים (${members.length})` : `Members (${members.length})` },
  ];

  return (
    <div className={cn('min-h-screen bg-[#FAFAFA]', isRTL && 'text-right')}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200/50">
        <div className={cn('flex items-center justify-between gap-4 px-6 md:px-8 h-14', isRTL && 'flex-row-reverse')}>
          {/* Left: back + title */}
          <div className={cn('flex items-center gap-3 min-w-0', isRTL && 'flex-row-reverse')}>
            <Link
              to="/"
              className="btn-secondary w-9 h-9 !p-0 rounded-lg flex items-center justify-center flex-shrink-0 text-zinc-700 hover:text-zinc-900 icon-action"
            >
              <ArrowLeft2 size={16} color="currentColor" className={cn('icon-micro', isRTL ? 'rotate-180' : '')} />
            </Link>
            <div className="min-w-0">
              <div className={cn('flex items-center gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
                <h1 className="text-base font-bold text-zinc-900 truncate">{project.name}</h1>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_COLORS[project.status])}>
                  {t(STATUS_TRANSLATION_KEYS[project.status]) || project.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {project.clientName}{project.projectManager && ` · ${project.projectManager}`}
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className={cn('flex items-center gap-2 flex-shrink-0', isRTL && 'flex-row-reverse')}>
            <button
              onClick={() => navigate(`/projects/edit/${id}`)}
              className={cn('btn-secondary text-xs font-semibold px-3 h-9 rounded-lg hidden sm:flex items-center gap-1.5 icon-action', isRTL && 'flex-row-reverse')}
            >
              <Edit2 size={13} color="currentColor" className="icon-micro" />
              {isRTL ? 'עריכה' : 'Edit'}
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/customer-view`)}
              className={cn('btn-secondary text-xs font-semibold px-3 h-9 rounded-lg flex items-center gap-1.5 icon-action', isRTL && 'flex-row-reverse')}
            >
              <Eye size={13} color="currentColor" className="icon-micro" />
              <span className="hidden sm:inline">{t('project.details.external_view') || 'Customer View'}</span>
            </button>
            <button
              onClick={() => navigate(`/tasks/new?projectId=${id}`)}
              className={cn('btn-primary text-xs font-semibold px-3 h-9 rounded-lg flex items-center gap-1.5 icon-action', isRTL && 'flex-row-reverse')}
            >
              <Add size={13} color="white" className="icon-micro" />
              <span className="hidden sm:inline">{t('project.details.new_task') || 'New Task'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className="py-5 max-w-[1600px] mx-auto space-y-4">

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 md:px-8">
          {/* Progress */}
          <div className="card p-5 flex flex-col gap-3 icon-action">
            <div className="icon-shell">
              <Activity size={16} color="currentColor" className="text-zinc-800 icon-micro" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('project.details.execution') || 'Progress'}
            </p>
            <p className="text-4xl font-bold text-zinc-900 tabular-nums leading-none">{progress}%</p>
            <div className="w-full bg-zinc-100 rounded-full overflow-hidden" style={{ height: 8 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full', progressColor)}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {isRTL
                ? `${activeTasks} פעילות · ${blockedTasks.length} חסומות · ${completedTasks} הושלמו`
                : `${activeTasks} active · ${blockedTasks.length} blocked · ${completedTasks} done`}
            </p>
          </div>

          {/* PM / Client */}
          <div className="card p-5 flex flex-col gap-2 icon-action">
            <div className="icon-shell">
              <Profile2User size={16} color="currentColor" className="text-zinc-800 icon-micro" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('project.details.account_lead') || 'PM / Client'}
            </p>
            <p className="text-base font-bold text-zinc-900 mt-1">{project.projectManager}</p>
            <p className="text-xs text-zinc-500">
              {t('label.client') || 'Client'}:{' '}
              <span className="font-semibold text-zinc-900">{project.clientName}</span>
            </p>
          </div>

          {/* Deadline */}
          <div className="card p-5 flex flex-col gap-2 icon-action">
            <div className="icon-shell">
              <Calendar1 size={16} color="currentColor" className="text-zinc-800 icon-micro" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('project.details.target') || 'Deadline'}
            </p>
            <p className="text-base font-bold text-zinc-900 mt-1">{formatDate(project.deadline)}</p>
            {daysLabel && (
              <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full self-start', daysColor)}>
                {daysLabel}
              </span>
            )}
          </div>
        </div>

        {/* Blocker banner */}
        {blockedTasks.length > 0 && (
          <div className={cn(
            'mx-6 md:mx-8 flex flex-col sm:flex-row sm:items-start gap-3 bg-[#FFEEF1] border border-[#F5C0CA] rounded-xl px-5 py-4',
            isRTL && 'flex-row-reverse'
          )}>
            <div className={cn('flex items-center gap-2 flex-shrink-0', isRTL && 'flex-row-reverse')}>
              <Warning2 size={16} color="#C5263A" variant="Bold" />
              <span className="text-xs font-bold text-[#C5263A]">
                {blockedTasks.length} {isRTL ? 'חסמים פעילים' : `active blocker${blockedTasks.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className={cn('flex flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
              <button
                onClick={() => runPresetAiAction(
                  isRTL ? 'תוכנית שחרור חסמים' : 'Blocker Recovery Plan',
                  isRTL
                    ? 'נתח את החסמים הפעילים, תעדף אותם, תן תוכנית שחרור אופרטיבית, מי צריך לטפל, ומה צריך לעדכן ללקוח או להנהלה.'
                    : 'Analyze the active blockers, prioritize them, and produce an operational recovery plan with owners, next actions, and any stakeholder follow-up needed.',
                )}
                className="text-[11px] font-semibold bg-white border border-[#F5C0CA] text-[#C5263A] rounded-full px-2.5 py-0.5 hover:bg-[#FFEEF1] transition-colors cursor-pointer"
              >
                {isRTL ? 'AI לשחרור חסמים' : 'AI Recovery Plan'}
              </button>
              {blockedTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="text-[11px] font-semibold bg-white border border-[#F5C0CA] text-[#C5263A] rounded-full px-2.5 py-0.5 hover:bg-[#FFEEF1] transition-colors cursor-pointer"
                >
                  {task.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab bar + content card */}
        <div className="card mx-6 md:mx-8 overflow-hidden">
          {/* Tabs */}
          <div className={cn('flex border-b border-zinc-200/50 px-6', isRTL && 'flex-row-reverse')}>
            {TABS.map(({ id: tabId, label }) => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={cn(
                  'py-3.5 px-1 text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap',
                  isRTL ? 'ml-6' : 'mr-6',
                  activeTab === tabId
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── BOARD TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'board' && (
            <div className="pt-5 pb-2">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <FolderOpen size={48} color="#C5CAD6" variant="Bold" />
                  <h3 className="text-base font-bold text-zinc-900 mt-4">
                    {isRTL ? 'עדיין אין משימות' : 'No tasks yet'}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                    {isRTL ? 'הוסף משימה כדי שהלוח ידעיג לחיים.' : 'Add your first task to bring the board to life.'}
                  </p>
                  <button
                    onClick={() => navigate(`/tasks/new?projectId=${id}`)}
                    className={cn('btn-primary mt-6 px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2', isRTL && 'flex-row-reverse')}
                  >
                    <Add size={14} color="white" />
                    {isRTL ? 'הוסף משימה ראשונה' : 'Add First Task'}
                  </button>
                </div>
              ) : (
                <KanbanBoard
                  tasks={tasks}
                  projectId={id!}
                  members={members}
                  allUsers={allUsers}
                  onTaskOpen={setSelectedTask}
                  onTasksChange={setTasks}
                />
              )}
            </div>
          )}

          {activeTab === 'gantt' && (
            <ProjectGanttPanel
              data={ganttData}
              members={members}
              loading={ganttLoading}
              isRTL={isRTL}
              onTaskOpen={handleGanttTaskOpen}
            />
          )}

          {/* ── AI TAB ────────────────────────────────────────────────────── */}
          {activeTab === 'ai' && (
            <div className="bg-[#F6F7FB] border-t border-zinc-200/50" style={{ height: '600px' }}>
              <div className="flex h-full flex-col lg:flex-row">
                
                {/* Right Pane: Quick Actions */}
                <div className={cn(
                  "w-full lg:w-80 bg-white border-b lg:border-b-0 flex flex-col shrink-0 overflow-y-auto",
                  isRTL ? "lg:border-l border-zinc-200/50" : "lg:border-r border-zinc-200/50"
                )}>
                  <div className="p-5 border-b border-zinc-100">
                    <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                        <Magicpen size={20} color="white" variant="Bold" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'פעולות חכמות' : 'Smart Actions'}</h3>
                        <p className="text-xs text-zinc-500">{isRTL ? 'תובנות ודוחות בלחיצה' : 'One-click insights & reports'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    <button
                      onClick={generateAISummary}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-semibold text-zinc-700 hover:text-blue-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <DocumentText size={18} className="text-blue-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'דוח סטטוס פנימי' : 'Internal Status Report'}</span>
                    </button>
                    
                    <button
                      onClick={generateCustomerUpdate}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-semibold text-zinc-700 hover:text-indigo-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <MessageText size={18} className="text-indigo-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'טיוטת עדכון לקוח' : 'Customer Update Draft'}</span>
                    </button>

                    <button
                      onClick={() => runPresetAiAction(
                        isRTL ? 'תדרוך שבועי למנהל פרויקט' : 'Weekly PM Brief',
                        isRTL
                          ? 'כתוב תדרוך שבועי קצר למנהל פרויקט: שלושה סיכונים מיידיים, שלוש החלטות שצריך לקבל השבוע, ושלוש משימות שחייבות לזוז עכשיו.'
                          : 'Create a concise weekly PM brief with three immediate risks, three decisions needed this week, and three tasks that must move now.',
                      )}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-sm font-semibold text-zinc-700 hover:text-emerald-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <Flash size={18} className="text-emerald-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'תדרוך שבועי PM' : 'Weekly PM Brief'}</span>
                    </button>

                    <button
                      onClick={() => runPresetAiAction(
                        isRTL ? 'איזון עומס משאבים' : 'Resource Rebalance',
                        isRTL
                          ? 'נתח את עומס המשאבים בפרויקט ותן המלצות פרקטיות לאיזון עומסים, שינוי בעלים או סדר עדיפויות מחדש בלי לסכן את היעד.'
                          : 'Analyze resource load in this project and suggest practical rebalancing actions, owner changes, or reprioritization without putting the target date at risk.',
                      )}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-violet-300 hover:bg-violet-50 transition-all text-sm font-semibold text-zinc-700 hover:text-violet-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <Profile2User size={18} className="text-violet-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'איזון עומסים' : 'Resource Rebalance'}</span>
                    </button>

                    <button
                      onClick={() => runPresetAiAction(
                        isRTL ? 'הכנה לישיבת סטטוס' : 'Meeting Prep',
                        isRTL
                          ? 'הכן דף הכנה לישיבת סטטוס: על מה לשאול, אילו החלטות חייבות לצאת מהפגישה, איפה חסר owner, ואילו חסמים דורשים escalation.'
                          : 'Prepare a project status meeting brief: what to ask, which decisions must come out of the meeting, where ownership is missing, and which blockers need escalation.',
                      )}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-cyan-300 hover:bg-cyan-50 transition-all text-sm font-semibold text-zinc-700 hover:text-cyan-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <DocumentText size={18} className="text-cyan-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'הכנה לפגישה' : 'Meeting Prep'}</span>
                    </button>

                    <button
                      onClick={() => runPresetAiAction(
                        isRTL ? 'בדיקת סיכון שינויי היקף' : 'Scope Change Risk Check',
                        isRTL
                          ? 'בדוק אם שינוי או הוספת משימה חדשה יסכנו את הלו״ז, המשאבים או שרשרת התלותים. תן המלצה איך להכניס שינוי בלי לגרום ל-scope creep לא נשלט.'
                          : 'Evaluate change-request risk for this project: where added scope would break the timeline, resource plan, or dependency chain, and how to contain scope creep.',
                      )}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-rose-300 hover:bg-rose-50 transition-all text-sm font-semibold text-zinc-700 hover:text-rose-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <Warning2 size={18} className="text-rose-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'סיכון שינוי היקף' : 'Scope Change Risk'}</span>
                    </button>

                    <button
                      onClick={() => runPresetAiAction(
                        isRTL ? 'ביטחון באבני דרך' : 'Milestone Confidence Review',
                        isRTL
                          ? 'נתח את אבני הדרך והערכת ההגעה אליהן: אילו אבני דרך בסיכון, למה, ומה הפעולות שצריך לעשות השבוע כדי להעלות את רמת הביטחון.'
                          : 'Review milestone confidence: identify which milestones are at risk, why, and what should happen this week to improve confidence.',
                      )}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-amber-300 hover:bg-amber-50 transition-all text-sm font-semibold text-zinc-700 hover:text-amber-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <Eye size={18} className="text-amber-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'ביטחון באבני דרך' : 'Milestone Confidence'}</span>
                    </button>
                  </div>

                  <div className="border-t border-zinc-100 p-5">
                    <div className={cn('flex items-center gap-2 mb-3', isRTL && 'flex-row-reverse')}>
                      <Warning2 size={14} className="text-zinc-500" variant="Bold" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {isRTL ? 'יומן החלטות' : 'Decision Feed'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {decisionLog.length === 0 ? (
                        <p className={cn("text-xs text-zinc-500", isRTL && "text-right")}>
                          {isRTL ? 'אין החלטות אחרונות זמינות.' : 'No recent decision items are available.'}
                        </p>
                      ) : (
                        decisionLog.slice(0, 6).map((item) => (
                          <div key={item.id} className="rounded-xl border border-zinc-200/60 bg-zinc-50/70 px-3 py-2">
                            <p className={cn("text-xs font-semibold text-zinc-900 leading-relaxed", isRTL && "text-right")}>
                              {item.summary}
                            </p>
                            <p className={cn("mt-1 text-[10px] text-zinc-500", isRTL && "text-right")}>
                              {[item.taskTitle, item.actorName, formatDate(item.createdAt)].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-auto p-5 bg-zinc-50/50 border-t border-zinc-100">
                    <div className={cn('flex items-center gap-2 mb-2', isRTL && 'flex-row-reverse')}>
                      <Flash size={14} className="text-amber-500" variant="Bold" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{isRTL ? 'הקשר המודל' : 'Model Context'}</span>
                    </div>
                    <p className={cn("text-xs leading-relaxed text-zinc-600", isRTL && "text-right")}>
                      {isRTL 
                        ? 'העוזר החכם קורא את נתוני הפרויקט הנוכחי בזמן אמת ויודע לענות על שאלות, לנסח הודעות ולזהות סיכונים באופן אוטומטי.'
                        : 'The smart assistant reads current project data in real-time and can answer questions, draft messages, and identify risks automatically.'}
                    </p>
                  </div>
                </div>

                {/* Left Pane: Interactive Chat */}
                <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {aiMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                          <Magicpen size={32} className="text-blue-500" variant="Bold" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">
                          {isRTL ? 'איך אפשר לעזור עם הפרויקט?' : 'How can I help with this project?'}
                        </h2>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          {isRTL 
                            ? 'אפשר לבקש סיכומים, לנסח מיילים ללקוח, או פשוט לשאול אותי מה תוקע את הפרויקט כרגע.'
                            : 'You can ask for summaries, draft client emails, or just ask what is blocking the project right now.'}
                        </p>
                      </div>
                    ) : (
                      aiMessages.map(msg => (
                        <div key={msg.id} className={cn('flex w-full', msg.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start'))}>
                          <div className={cn(
                            'max-w-[85%] lg:max-w-[70%]',
                            msg.role === 'user' && (isRTL ? 'text-right' : 'text-left')
                          )}>
                            
                            {/* User message */}
                            {msg.role === 'user' && (
                              <div className={cn(
                                "inline-block px-4 py-3 rounded-2xl text-sm font-medium",
                                "bg-zinc-900 text-white shadow-md",
                                isRTL ? "rounded-tl-sm" : "rounded-tr-sm"
                              )}>
                                {msg.content}
                              </div>
                            )}

                            {/* Assistant generic text */}
                            {msg.role === 'assistant' && msg.type === 'text' && (
                              <div className={cn(
                                "px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-800 shadow-sm",
                                isRTL ? "rounded-tr-sm text-right" : "rounded-tl-sm text-left"
                              )}>
                                {msg.content
                                  ? <MarkdownText content={msg.content} />
                                  : null}
                                {msg.data?.streaming && (
                                  <span className="inline-flex gap-1 mt-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.2s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.1s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Assistant Internal Report */}
                            {msg.role === 'assistant' && msg.type === 'internal_report' && msg.data && (
                              <div className={cn(
                                "bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 overflow-hidden",
                                isRTL && "text-right"
                              )}>
                                <div className={cn("flex items-center gap-3 mb-4 pb-4 border-b border-zinc-100", isRTL && "flex-row-reverse")}>
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <DocumentText size={16} className="text-blue-600" variant="Bold" />
                                  </div>
                                  <h4 className="text-sm font-bold text-zinc-900">{isRTL ? 'דוח סטטוס פנימי' : 'Internal Status Report'}</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <Section label={isRTL ? 'מצב כללי' : 'Overall Health'} content={msg.data.overallStatus} />
                                  <Section label={isRTL ? 'פעולה הבאה' : 'Next Action'} content={msg.data.recommendedNextAction} accent />
                                  <Section label={isRTL ? 'סיכונים וחסמים' : 'Risks & Blockers'} content={msg.data.risksAndBlockers} />
                                  <Section label={isRTL ? 'התקדמות' : 'Key Progress'} content={msg.data.keyProgress} />
                                </div>
                              </div>
                            )}

                            {/* Assistant Customer Update */}
                            {msg.role === 'assistant' && msg.type === 'customer_update' && msg.data && (
                              <div className={cn(
                                "bg-[#1F2D3D] border border-[#2D3E50] shadow-md rounded-2xl p-5 overflow-hidden",
                                isRTL && "text-right"
                              )}>
                                <div className={cn("flex items-center gap-3 mb-4 pb-4 border-b border-[#2D3E50]", isRTL && "flex-row-reverse")}>
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <MessageText size={16} className="text-indigo-400" variant="Bold" />
                                  </div>
                                  <h4 className="text-sm font-bold text-white">{isRTL ? 'טיוטת עדכון ללקוח' : 'Customer Update Draft'}</h4>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                  "{msg.data}"
                                </p>
                              </div>
                            )}

                            <div className={cn("flex items-center gap-2 mt-1.5 px-1", isRTL ? (msg.role === 'user' ? 'justify-end' : 'justify-start flex-row-reverse') : (msg.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'))}>
                              <span className="text-[10px] text-zinc-400">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.role === 'assistant' && msg.content && !msg.data?.streaming && (
                                <CopyButton text={msg.content} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Typing indicator — only while awaiting first token */}
                    {generatingAI && !aiMessages.some(m => m.data?.streaming) && (
                      <div className={cn('flex w-full', isRTL ? 'justify-end' : 'justify-start')}>
                        <div className="bg-zinc-50 border border-zinc-200 px-4 py-3 rounded-2xl shadow-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-zinc-200/50">
                    <div className={cn("flex items-center gap-3 max-w-4xl mx-auto", isRTL && "flex-row-reverse")}>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isRTL ? "שאל את המודל שאלה על הפרויקט..." : "Ask the model about the project..."}
                        className={cn(
                          "flex-1 h-12 px-5 bg-zinc-50 border border-zinc-200/80 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all",
                          isRTL && "text-right"
                        )}
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || generatingAI}
                        className={cn(
                          "w-12 h-12 flex items-center justify-center rounded-xl transition-all flex-shrink-0 cursor-pointer shadow-sm",
                          !chatInput.trim() || generatingAI
                            ? "bg-zinc-100 text-zinc-400"
                            : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                        )}
                      >
                        <Send2 size={20} color="currentColor" variant="Bold" className={isRTL ? 'rotate-180' : ''} />
                      </button>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-[10px] text-zinc-400">
                        {isRTL ? 'המודל מנתח את הנתונים בזמן אמת. תשובות עשויות להשתנות.' : 'The model analyzes data in real-time. Answers may vary.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBERS TAB ───────────────────────────────────────────────── */}
          {activeTab === 'members' && (
            <ProjectMembersPanel
              projectId={id!}
              members={members}
              onMembersChange={setMembers}
            />
          )}
        </div>
      </div>

      {/* ── TASK DETAIL SLIDE-IN ──────────────────────────────────────────── */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        currentUser={project.projectManager || 'You'}
      />

      {/* ── FLOATING AI DRAFT PANEL ───────────────────────────────────────── */}
      <AiDraftPanel context={enhancedAiContext} />
    </div>
  );
}
