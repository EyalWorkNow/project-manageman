import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft2, Magicpen, Add, Warning2, Eye, Edit2,
  Profile2User, FolderOpen,
} from 'iconsax-react';
import { motion } from 'motion/react';
import { Project, Task, AISummary, ProjectMember, STATUS_TRANSLATION_KEYS } from '../types';
import { api } from '../services/api';
import { cn, formatDate, daysUntil, STATUS_COLORS, PRIORITY_COLORS, STATUS_DOT, PRIORITY_DOT } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import KanbanBoard from '../components/KanbanBoard';
import TaskDetailModal from '../components/TaskDetailModal';
import AiDraftPanel from '../components/AiDraftPanel';
import ProjectMembersPanel from '../components/ProjectMembersPanel';

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

type Tab = 'board' | 'ai' | 'members';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isRTL, language } = useI18n();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [customerUpdate, setCustomerUpdate] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.projects.get(id), api.members.list(id)])
      .then(([proj, mems]) => {
        setProject(proj);
        setTasks(proj.tasks || []);
        setMembers(mems);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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
        <p className="text-zinc-500 font-semibold">{isRTL ? 'פרויקט לא נמצא.' : 'Project not found.'}</p>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const blockedTasks = tasks.filter(t => t.isBlocked);
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

  const aiContext = `Project: ${project.name}. Client: ${project.clientName}. Status: ${project.status}. Tasks: ${tasks.map(t => `${t.title} [${t.status}]`).join(', ')}.`;

  // ── AI handlers ─────────────────────────────────────────────────────────────
  async function generateAISummary() {
    if (!project) return;
    setGeneratingAI(true); setAiError(null); setCustomerUpdate(null); setActiveTab('ai');
    try {
      setAiSummary(await api.ai.summarize(project, tasks, language));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Could not generate summary.');
    } finally { setGeneratingAI(false); }
  }

  async function generateCustomerUpdate() {
    if (!project) return;
    setGeneratingAI(true); setAiError(null); setAiSummary(null); setActiveTab('ai');
    try {
      const res = await api.ai.customerUpdate(project, tasks, language);
      setCustomerUpdate(res.update);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Could not generate customer update.');
    } finally { setGeneratingAI(false); }
  }

  // ── Task modal handlers ──────────────────────────────────────────────────────
  function handleTaskUpdate(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(updated);
  }

  function handleTaskDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'board',   label: isRTL ? `לוח (${tasks.length})` : `Board (${tasks.length})` },
    { id: 'ai',      label: isRTL ? 'AI' : 'AI' },
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
              className="btn-secondary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft2 size={16} color="currentColor" className={isRTL ? 'rotate-180' : ''} />
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
              className="btn-secondary text-xs font-semibold px-3 h-9 rounded-lg hidden sm:flex items-center gap-1.5"
            >
              <Edit2 size={13} color="currentColor" />
              {isRTL ? 'עריכה' : 'Edit'}
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/customer-view`)}
              className="btn-secondary text-xs font-semibold px-3 h-9 rounded-lg flex items-center gap-1.5"
            >
              <Eye size={13} color="currentColor" />
              <span className="hidden sm:inline">{t('project.details.external_view') || 'Customer View'}</span>
            </button>
            <button
              onClick={() => navigate(`/tasks/new?projectId=${id}`)}
              className="btn-primary text-xs font-semibold px-3 h-9 rounded-lg flex items-center gap-1.5"
            >
              <Add size={13} color="white" />
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
          <div className="card p-5 flex flex-col gap-3">
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
              {completedTasks} / {tasks.length} {isRTL ? 'משימות הושלמו' : 'tasks done'}
            </p>
          </div>

          {/* PM / Client */}
          <div className="card p-5 flex flex-col gap-2">
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
          <div className="card p-5 flex flex-col gap-2">
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
                    className="btn-primary mt-6 px-5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2"
                  >
                    <Add size={14} color="white" />
                    {isRTL ? 'הוסף משימה ראשונה' : 'Add First Task'}
                  </button>
                </div>
              ) : (
                <KanbanBoard
                  tasks={tasks}
                  projectId={id!}
                  onTaskOpen={setSelectedTask}
                  onTasksChange={setTasks}
                />
              )}
            </div>
          )}

          {/* ── AI TAB ────────────────────────────────────────────────────── */}
          {activeTab === 'ai' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI action card */}
                <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: '#1F2D3D' }}>
                  <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                    <div className="w-10 h-10 bg-[#0073EA] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Magicpen size={18} color="white" variant="Bold" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{isRTL ? 'מרכז AI' : 'AI Intelligence'}</p>
                      <p className="text-xs text-zinc-500">
                        {isRTL ? 'הפק תובנות מנתוני הפרויקט' : 'Generate insights from project data'}
                      </p>
                    </div>
                  </div>

                  {aiError && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300">
                      {aiError}
                    </div>
                  )}

                  <button
                    onClick={generateAISummary}
                    disabled={generatingAI}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-lg text-zinc-900 text-sm font-semibold hover:bg-[#FAFAFA] transition-colors disabled:opacity-60 cursor-pointer',
                      isRTL && 'flex-row-reverse'
                    )}
                  >
                    <span className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                      <Magicpen size={14} color="#0073EA" variant="Bold" />
                      {isRTL ? 'סיכום פנימי' : 'Internal Report'}
                    </span>
                    <ChevronRight size={14} flip={isRTL} />
                  </button>

                  <button
                    onClick={generateCustomerUpdate}
                    disabled={generatingAI}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-white text-sm font-semibold border border-white/20 hover:bg-white/10 transition-colors disabled:opacity-60 cursor-pointer',
                      isRTL && 'flex-row-reverse'
                    )}
                  >
                    <span>{isRTL ? 'עדכון ללקוח' : 'Customer Update'}</span>
                    <ChevronRight size={14} flip={isRTL} />
                  </button>
                </div>

                {/* AI output */}
                <div className="min-h-[220px]">
                  {!aiSummary && !customerUpdate && !generatingAI && (
                    <div className="h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200/50 text-center px-6 py-12">
                      <Magicpen size={32} color="#C5CAD6" variant="Bold" />
                      <p className="text-sm font-semibold text-zinc-500 mt-3">
                        {isRTL ? 'בחר פעולה AI להתחלה' : 'Select an action to generate insights'}
                      </p>
                    </div>
                  )}

                  {generatingAI && (
                    <div className="h-full rounded-xl border border-zinc-200/50 p-6 space-y-4 animate-pulse">
                      <div className="skeleton h-4 w-32 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton h-3 w-4/5 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton h-3 w-3/5 rounded" />
                    </div>
                  )}

                  {aiSummary && !generatingAI && (
                    <div className="card p-6 space-y-5">
                      <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                          {isRTL ? 'דוח פנימי' : 'Internal Report'}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900">
                          {aiSummary.source === 'gemini' ? 'Gemini' : 'AI'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <Section label={isRTL ? 'מצב כללי' : 'Overall Health'} content={aiSummary.overallStatus} />
                        <Section label={isRTL ? 'פעולה הבאה' : 'Next Action'} content={aiSummary.recommendedNextAction} accent />
                        <Section label={isRTL ? 'סיכונים וחסמים' : 'Risks & Blockers'} content={aiSummary.risksAndBlockers} />
                        <Section label={isRTL ? 'התקדמות' : 'Key Progress'} content={aiSummary.keyProgress} />
                      </div>
                    </div>
                  )}

                  {customerUpdate && !generatingAI && (
                    <div
                      className="rounded-xl p-6 space-y-4 border"
                      style={{ backgroundColor: '#1F2D3D', borderColor: '#2D3E50' }}
                    >
                      <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {isRTL ? 'טיוטת עדכון ללקוח' : 'Customer Update Draft'}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-blue-300">Ready</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-300">"{customerUpdate}"</p>
                    </div>
                  )}
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
      <AiDraftPanel context={aiContext} />
    </div>
  );
}
