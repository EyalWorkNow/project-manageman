import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CloseCircle, Edit2, Trash, Send2, MessageText1,
  Flag2, Calendar1, Profile, Tag, ArrowLeft2, Activity, Magicpen, Routing,
} from 'iconsax-react';
import { cn, STATUS_COLORS, STATUS_DOT, PRIORITY_COLORS, PRIORITY_DOT, formatDate } from '../lib/utils';
import { Task, Comment, TASK_STATUSES, TASK_PRIORITIES, STATUS_TRANSLATION_KEYS, PRIORITY_TRANSLATION_KEYS, TaskDetailContext } from '../types';
import { api } from '../services/api';
import { useI18n } from '../lib/i18n';

interface Props {
  task: Task | null;
  onClose: () => void;
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
  currentUser?: string;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(dateString: string, isRTL: boolean) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isRTL ? 'עכשיו' : 'just now';
  if (mins < 60) return isRTL ? `לפני ${mins} ד'` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isRTL ? `לפני ${hrs} ש'` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return isRTL ? `לפני ${days} ימים` : `${days}d ago`;
}

const TASK_COLOR_PRESETS = ['#0073EA', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#1F2D3D', '#579BFC', '#9CA3AF'];

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete, currentUser = 'You' }: Props) {
  const { t, isRTL, language } = useI18n();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [taskContext, setTaskContext] = useState<TaskDetailContext>({ dependencies: [], activity: [] });
  const [commentInput, setCommentInput] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitle, setAiTitle] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task) return;
    setEditData({
      title: task.title, description: task.description,
      assignee: task.assignee, status: task.status,
      priority: task.priority, dueDate: task.dueDate,
      isBlocked: task.isBlocked, blockerDescription: task.blockerDescription,
      internalNotes: task.internalNotes,
      startDate: task.startDate,
      progressPercent: task.progressPercent ?? 0,
      displayColor: task.displayColor || '',
    });
    setEditing(false);
    setConfirmDelete(false);
    setAiTitle('');
    setAiResponse('');
    setTaskContext({ dependencies: [], activity: [] });
    loadComments(task.id);
    loadTaskContext(task.id);
  }, [task?.id]);

  async function loadComments(taskId: string) {
    try {
      const data = await api.tasks.getComments(taskId);
      setComments(data);
    } catch { setComments([]); }
  }

  async function loadTaskContext(taskId: string) {
    setContextLoading(true);
    try {
      const data = await api.tasks.getContext(taskId);
      setTaskContext(data);
    } catch {
      setTaskContext({ dependencies: [], activity: [] });
    } finally {
      setContextLoading(false);
    }
  }

  async function saveEdit() {
    if (!task) return;
    setSaving(true);
    try {
      const updated = await api.tasks.save({
        id: task.id,
        projectId: task.projectId,
        title: editData.title ?? task.title,
        description: editData.description ?? task.description,
        assignee: editData.assignee ?? task.assignee,
        status: editData.status ?? task.status,
        priority: editData.priority ?? task.priority,
        dueDate: editData.dueDate ?? task.dueDate,
        startDate: editData.startDate ?? task.startDate,
        progressPercent: typeof editData.progressPercent === 'number' ? editData.progressPercent : (task.progressPercent ?? 0),
        isBlocked: Boolean(editData.isBlocked),
        blockerDescription: editData.blockerDescription ?? task.blockerDescription,
        internalNotes: editData.internalNotes ?? task.internalNotes,
        displayColor: editData.displayColor ?? task.displayColor ?? '',
      });
      onUpdate(updated);
      setEditData({
        title: updated.title,
        description: updated.description,
        assignee: updated.assignee,
        status: updated.status,
        priority: updated.priority,
        dueDate: updated.dueDate,
        isBlocked: updated.isBlocked,
        blockerDescription: updated.blockerDescription,
        internalNotes: updated.internalNotes,
        startDate: updated.startDate,
        progressPercent: updated.progressPercent ?? 0,
        displayColor: updated.displayColor || '',
      });
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function sendComment() {
    if (!task || !commentInput.trim() || savingComment) return;
    setSavingComment(true);
    try {
      const newComment = await api.tasks.addComment(task.id, commentInput.trim(), currentUser);
      setComments(prev => [...prev, newComment]);
      setCommentInput('');
    } catch { /* ignore */ }
    finally { setSavingComment(false); }
  }

  async function handleDelete() {
    if (!task) return;
    await api.tasks.delete(task.id);
    onDelete(task.id);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); }
  }

  async function runTaskAiAction(label: string, prompt: string) {
    if (!task || aiLoading) return;
    setAiLoading(true);
    setAiTitle(label);
    try {
      const dependencySummary = taskContext.dependencies
        .map((dependency) => `${dependency.direction}: ${dependency.title} [${dependency.status}] (${dependency.dependencyType}, lag ${dependency.lagDays}d, blocking ${dependency.isBlocking ? 'yes' : 'no'})`)
        .join('; ');
      const activitySummary = taskContext.activity
        .slice(0, 6)
        .map((item) => `${item.eventType}: ${item.message || ''}`.trim())
        .join('; ');
      const commentSummary = comments
        .slice(-4)
        .map((comment) => `${comment.author}: ${comment.content}`)
        .join('; ');
      const taskContextText = [
        `Task: ${task.title}`,
        `Status: ${task.status}`,
        `Priority: ${task.priority}`,
        `Assignee: ${task.assignee || 'Unassigned'}`,
        `Start: ${task.startDate || 'none'}`,
        `Due: ${task.dueDate || 'none'}`,
        `Progress: ${Math.round(task.progressPercent ?? 0)}%`,
        task.isBlocked ? `Blocked: ${task.blockerDescription || 'yes'}` : 'Blocked: no',
        dependencySummary ? `Dependencies: ${dependencySummary}` : '',
        activitySummary ? `Recent activity: ${activitySummary}` : '',
        commentSummary ? `Recent comments: ${commentSummary}` : '',
      ].filter(Boolean).join('. ');

      const data = await api.ai.draft(prompt, taskContextText, language);
      setAiResponse(data.reply || (isRTL ? 'לא התקבלה תשובה.' : 'No response.'));
    } catch {
      setAiResponse(isRTL ? 'אירעה שגיאה. נסה שוב.' : 'Error occurred. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  if (!task) return null;

  const currentTaskColor = editData.displayColor || task.displayColor || '';
  const currentProgress = typeof editData.progressPercent === 'number' ? editData.progressPercent : (task.progressPercent ?? 0);
  const predecessors = taskContext.dependencies.filter((item) => item.direction === 'predecessor');
  const successors = taskContext.dependencies.filter((item) => item.direction === 'successor');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ x: isRTL ? -480 : 480 }}
          animate={{ x: 0 }}
          exit={{ x: isRTL ? -480 : 480 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={cn('relative ml-auto w-full max-w-[500px] bg-white h-full flex flex-col shadow-2xl overflow-hidden', isRTL && 'ml-0 mr-auto')}
        >
          {/* Top bar */}
          <div className={cn('flex items-center justify-between px-5 py-4 border-b border-[#E6E9EF] flex-shrink-0', isRTL && 'flex-row-reverse')}>
            <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
              <button onClick={onClose} className="text-[#6B7A8D] hover:text-[#1F2D3D] transition-colors cursor-pointer">
                <ArrowLeft2 size={20} color="currentColor" className={isRTL ? 'rotate-180' : ''} />
              </button>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_COLORS[task.status])}>
                {t(STATUS_TRANSLATION_KEYS[task.status])}
              </span>
              <div className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[task.priority])} />
              <span className={cn('text-[11px] font-bold', PRIORITY_COLORS[task.priority])}>
                {t(PRIORITY_TRANSLATION_KEYS[task.priority])}
              </span>
            </div>
            <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7A8D] hover:bg-[#F6F7FB] hover:text-[#0073EA] transition-all cursor-pointer"
                  title={isRTL ? 'עריכה' : 'Edit'}
                >
                  <Edit2 size={16} color="currentColor" />
                </button>
              )}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7A8D] hover:bg-red-50 hover:text-[#E2445C] transition-all cursor-pointer"
                  title={isRTL ? 'מחיקה' : 'Delete'}
                >
                  <Trash size={16} color="currentColor" />
                </button>
              ) : (
                <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                  <span className="text-xs text-[#E2445C] font-semibold">{isRTL ? 'בטוח?' : 'Sure?'}</span>
                  <button onClick={handleDelete} className="text-xs font-bold text-white bg-[#E2445C] px-2 py-1 rounded cursor-pointer hover:bg-red-700">
                    {isRTL ? 'מחק' : 'Delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs font-medium text-[#6B7A8D] cursor-pointer">{isRTL ? 'ביטול' : 'Cancel'}</button>
                </div>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7A8D] hover:bg-[#F6F7FB] transition-all cursor-pointer">
                <CloseCircle size={16} color="currentColor" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto light-scrollbar">
            <div className="p-5 space-y-5">

              {/* Title */}
              {editing ? (
                <input
                  value={editData.title}
                  onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                  className={cn('text-lg font-bold text-[#1F2D3D] w-full border-b-2 border-[#0073EA] outline-none pb-1 bg-transparent', isRTL && 'text-right')}
                  autoFocus
                />
              ) : (
                <h2 className={cn('text-lg font-bold text-[#1F2D3D] leading-tight', isRTL && 'text-right')}>{task.title}</h2>
              )}

              {/* Meta pills */}
              <div className={cn('flex flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
                {/* Assignee */}
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7FB] border border-[#E6E9EF]', isRTL && 'flex-row-reverse')}>
                  <Profile size={13} color="#6B7A8D" />
                  {editing ? (
                    <input
                      value={editData.assignee}
                      onChange={e => setEditData(d => ({ ...d, assignee: e.target.value }))}
                      className={cn('text-xs font-medium text-[#1F2D3D] bg-transparent outline-none w-24', isRTL && 'text-right')}
                    />
                  ) : (
                    <span className="text-xs font-medium text-[#1F2D3D]">{task.assignee}</span>
                  )}
                </div>

                {/* Due date */}
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7FB] border border-[#E6E9EF]', isRTL && 'flex-row-reverse')}>
                  <Calendar1 size={13} color="#6B7A8D" />
                  {editing ? (
                    <input
                      type="date"
                      value={editData.dueDate}
                      onChange={e => setEditData(d => ({ ...d, dueDate: e.target.value }))}
                      className="text-xs font-medium text-[#1F2D3D] bg-transparent outline-none"
                    />
                  ) : (
                    <span className="text-xs font-medium text-[#1F2D3D]">{formatDate(task.dueDate)}</span>
                  )}
                </div>

                {/* Start date */}
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7FB] border border-[#E6E9EF]', isRTL && 'flex-row-reverse')}>
                  <Calendar1 size={13} color="#6B7A8D" />
                  {editing ? (
                    <input
                      type="date"
                      value={editData.startDate || ''}
                      onChange={e => setEditData(d => ({ ...d, startDate: e.target.value }))}
                      className="text-xs font-medium text-[#1F2D3D] bg-transparent outline-none"
                    />
                  ) : (
                    <span className="text-xs font-medium text-[#1F2D3D]">
                      {task.startDate ? formatDate(task.startDate) : (isRTL ? 'ללא התחלה' : 'No start')}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7FB] border border-[#E6E9EF]', isRTL && 'flex-row-reverse')}>
                  <span className="text-[11px] font-bold text-[#6B7A8D]">%</span>
                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={currentProgress}
                      onChange={e => setEditData(d => ({ ...d, progressPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                      className="w-16 text-xs font-medium text-[#1F2D3D] bg-transparent outline-none"
                    />
                  ) : (
                    <span className="text-xs font-medium text-[#1F2D3D]">{Math.round(task.progressPercent ?? 0)}%</span>
                  )}
                </div>

                {/* Priority (editing) */}
                {editing && (
                  <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7FB] border border-[#E6E9EF]', isRTL && 'flex-row-reverse')}>
                    <Flag2 size={13} color="#6B7A8D" />
                    <select
                      value={editData.priority}
                      onChange={e => setEditData(d => ({ ...d, priority: e.target.value as any }))}
                      className="text-xs font-medium text-[#1F2D3D] bg-transparent outline-none cursor-pointer"
                    >
                      {TASK_PRIORITIES.map(p => <option key={p} value={p}>{t(PRIORITY_TRANSLATION_KEYS[p])}</option>)}
                    </select>
                  </div>
                )}

                {/* Status (editing) */}
                {editing && (
                  <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7FB] border border-[#E6E9EF]', isRTL && 'flex-row-reverse')}>
                    <Tag size={13} color="#6B7A8D" />
                    <select
                      value={editData.status}
                      onChange={e => setEditData(d => ({ ...d, status: e.target.value as any }))}
                      className="text-xs font-medium text-[#1F2D3D] bg-transparent outline-none cursor-pointer"
                    >
                      {TASK_STATUSES.map(s => <option key={s} value={s}>{t(STATUS_TRANSLATION_KEYS[s])}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {(editing || currentTaskColor) && (
                <div>
                  <p className={cn('text-[10px] font-bold uppercase tracking-widest text-[#6B7A8D] mb-2', isRTL && 'text-right')}>
                    {isRTL ? 'צבע בגאנט' : 'Gantt Color'}
                  </p>
                  <div className={cn('flex flex-wrap items-center gap-2', isRTL && 'flex-row-reverse')}>
                    {TASK_COLOR_PRESETS.map((color) => {
                      const active = currentTaskColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => editing && setEditData(d => ({ ...d, displayColor: color }))}
                          disabled={!editing}
                          className={cn(
                            'h-7 w-7 rounded-full border-2 transition-all',
                            active ? 'border-[#1F2D3D] scale-105' : 'border-white',
                            !editing && 'cursor-default opacity-90',
                          )}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      );
                    })}
                    {editing && (
                      <label className={cn('inline-flex items-center gap-2 rounded-xl border border-[#E6E9EF] bg-[#F6F7FB] px-3 py-1.5 text-xs font-medium text-[#1F2D3D]', isRTL && 'flex-row-reverse')}>
                        <input
                          type="color"
                          value={currentTaskColor || '#0073EA'}
                          onChange={e => setEditData(d => ({ ...d, displayColor: e.target.value.toUpperCase() }))}
                          className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                        />
                        {isRTL ? 'בחירה חופשית' : 'Custom'}
                      </label>
                    )}
                  </div>
                </div>
              )}

              {editing && (
                <div className="rounded-xl border border-[#E6E9EF] bg-[#F6F7FB] px-4 py-3">
                  <div className={cn('flex items-center justify-between gap-3', isRTL && 'flex-row-reverse')}>
                    <div>
                      <p className="text-xs font-bold text-[#1F2D3D]">{isRTL ? 'משימה חסומה' : 'Task blocked'}</p>
                      <p className="text-[11px] text-[#6B7A8D]">
                        {isRTL ? 'סמן משימה שחייבת טיפול כדי להתקדם' : 'Mark tasks that cannot move without intervention'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(editData.isBlocked)}
                      onChange={e => setEditData(d => ({
                        ...d,
                        isBlocked: e.target.checked,
                        status: e.target.checked ? 'Blocked' : (d.status === 'Blocked' ? 'To Do' : d.status),
                      }))}
                      className="h-4 w-4 accent-[#E2445C]"
                    />
                  </div>
                  {editData.isBlocked && (
                    <textarea
                      value={editData.blockerDescription || ''}
                      onChange={e => setEditData(d => ({ ...d, blockerDescription: e.target.value }))}
                      rows={2}
                      className={cn('mt-3 w-full rounded-xl border border-[#F5C0CA] bg-white px-3 py-2 text-xs text-[#1F2D3D] outline-none focus:border-[#E2445C] resize-none', isRTL && 'text-right')}
                      placeholder={isRTL ? 'מה חוסם את המשימה כרגע?' : 'What is blocking this task right now?'}
                    />
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <p className={cn('text-[10px] font-bold uppercase tracking-widest text-[#6B7A8D] mb-2', isRTL && 'text-right')}>
                  {isRTL ? 'תיאור' : 'Description'}
                </p>
                {editing ? (
                  <textarea
                    value={editData.description}
                    onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                    rows={4}
                    className={cn('w-full text-sm text-[#1F2D3D] bg-[#F6F7FB] border border-[#E6E9EF] rounded-xl px-3 py-2.5 outline-none focus:border-[#0073EA] transition-colors resize-none', isRTL && 'text-right')}
                  />
                ) : (
                  <p className={cn('text-sm text-[#1F2D3D] leading-relaxed', isRTL && 'text-right')}>
                    {task.description || <span className="text-[#C5CAD6] italic">{isRTL ? 'אין תיאור' : 'No description'}</span>}
                  </p>
                )}
              </div>

              {/* Internal notes */}
              {(task.internalNotes || editing) && (
                <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl px-4 py-3">
                  <p className={cn('text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1.5', isRTL && 'text-right')}>
                    {isRTL ? 'הערות פנימיות' : 'Internal Notes'}
                  </p>
                  {editing ? (
                    <textarea
                      value={editData.internalNotes}
                      onChange={e => setEditData(d => ({ ...d, internalNotes: e.target.value }))}
                      rows={2}
                      className={cn('w-full text-xs text-amber-900 bg-transparent outline-none resize-none placeholder:text-amber-400', isRTL && 'text-right')}
                      placeholder={isRTL ? 'הערות לצוות בלבד...' : 'Notes for team only...'}
                    />
                  ) : (
                    <p className={cn('text-xs text-amber-900', isRTL && 'text-right')}>{task.internalNotes}</p>
                  )}
                </div>
              )}

              {/* Blocker */}
              {task.isBlocked && !editing && (
                <div className="bg-[#FFEEF1] border border-[#F5C0CA] rounded-xl px-4 py-3">
                  <p className={cn('text-[10px] font-bold uppercase tracking-widest text-[#C5263A] mb-1.5', isRTL && 'text-right')}>
                    {isRTL ? 'חסום — ' : 'Blocked — '}
                  </p>
                  <p className={cn('text-xs text-[#C5263A]', isRTL && 'text-right')}>{task.blockerDescription}</p>
                </div>
              )}

              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className={cn('flex items-start justify-between gap-3', isRTL && 'flex-row-reverse')}>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                      <Magicpen size={16} color="#0073EA" variant="Bold" />
                      <p className="text-sm font-bold text-[#1F2D3D]">{isRTL ? 'קופיילוט למשימה' : 'Task Copilot'}</p>
                    </div>
                    <p className="mt-1 text-xs text-[#526172]">
                      {isRTL ? 'מנתח את מצב המשימה, התלותים והפעילות האחרונה.' : 'Analyzes task health, dependencies, and recent activity.'}
                    </p>
                  </div>
                </div>

                <div className={cn('mt-3 flex flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
                  <button
                    type="button"
                    onClick={() => runTaskAiAction(
                      isRTL ? 'תוכנית התאוששות למשימה' : 'Task Recovery Plan',
                      isRTL
                        ? 'תן תוכנית התאוששות אופרטיבית למשימה הזאת: למה היא תקועה, מה הצעד הבא, מי הבעלים, ומה צריך לקרות ב-48 השעות הקרובות.'
                        : 'Create an operational recovery plan for this task: explain why it is slipping, the next action, the owner, and what should happen in the next 48 hours.',
                    )}
                    disabled={aiLoading}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                  >
                    {isRTL ? 'תוכנית התאוששות' : 'Recovery Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => runTaskAiAction(
                      isRTL ? 'השפעת תלותים' : 'Dependency Impact',
                      isRTL
                        ? 'נתח את התלותים של המשימה הזאת: מה חוסם אותה, את מי היא חוסמת, ומה הסיכון ללוח הזמנים אם היא תזוז ביומיים או יותר.'
                        : 'Analyze this task dependency chain: what is blocking it, what it blocks, and the scheduling impact if it slips by two days or more.',
                    )}
                    disabled={aiLoading}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                  >
                    {isRTL ? 'השפעת תלותים' : 'Dependency Impact'}
                  </button>
                  <button
                    type="button"
                    onClick={() => runTaskAiAction(
                      isRTL ? 'טיוטת עדכון לבעלים' : 'Draft Owner Update',
                      isRTL
                        ? 'נסח עדכון קצר לבעל המשימה: מה המצב, מה מעכב, ומה נדרש ממנו עכשיו.'
                        : 'Draft a short owner update for this task: current state, blocker, and what is needed right now.',
                    )}
                    disabled={aiLoading}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                  >
                    {isRTL ? 'עדכון לבעלים' : 'Owner Update'}
                  </button>
                </div>

                {(aiLoading || aiResponse) && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-white px-4 py-3">
                    <p className={cn('text-[10px] font-bold uppercase tracking-widest text-blue-700', isRTL && 'text-right')}>
                      {aiTitle || (isRTL ? 'תשובת AI' : 'AI Response')}
                    </p>
                    <p className={cn('mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1F2D3D]', isRTL && 'text-right')}>
                      {aiLoading ? (isRTL ? 'מנתח...' : 'Analyzing...') : aiResponse}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className={cn('mb-3 flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                  <Routing size={16} color="#0073EA" />
                  <p className="text-sm font-bold text-[#1F2D3D]">{isRTL ? 'תלותים והשפעה' : 'Dependencies & Impact'}</p>
                </div>
                {contextLoading ? (
                  <div className="skeleton h-24 rounded-2xl" />
                ) : taskContext.dependencies.length === 0 ? (
                  <p className={cn('rounded-xl border border-dashed border-[#E6E9EF] px-4 py-3 text-xs text-[#6B7A8D]', isRTL && 'text-right')}>
                    {isRTL ? 'אין תלותים רשומים למשימה הזאת.' : 'No dependencies are registered for this task.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-[#E6E9EF] bg-[#F6F7FB] px-4 py-3">
                      <p className={cn('text-[10px] font-bold uppercase tracking-widest text-[#6B7A8D]', isRTL && 'text-right')}>
                        {isRTL ? `חוסם אותה (${predecessors.length})` : `Blocking it (${predecessors.length})`}
                      </p>
                      <div className="mt-3 space-y-2">
                        {predecessors.length === 0 ? (
                          <p className={cn('text-xs text-[#6B7A8D]', isRTL && 'text-right')}>
                            {isRTL ? 'אין חסמים תלויי משימה.' : 'No upstream blockers.'}
                          </p>
                        ) : predecessors.map((dependency) => (
                          <div key={dependency.id} className="rounded-xl bg-white px-3 py-2">
                            <p className={cn('text-xs font-semibold text-[#1F2D3D]', isRTL && 'text-right')}>{dependency.title}</p>
                            <p className={cn('mt-1 text-[11px] text-[#6B7A8D]', isRTL && 'text-right')}>
                              {dependency.taskKey} · {dependency.dependencyType.replace(/_/g, ' ')} · {dependency.status}
                              {dependency.lagDays ? ` · lag ${dependency.lagDays}d` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#E6E9EF] bg-[#F6F7FB] px-4 py-3">
                      <p className={cn('text-[10px] font-bold uppercase tracking-widest text-[#6B7A8D]', isRTL && 'text-right')}>
                        {isRTL ? `מושפעות ממנה (${successors.length})` : `Impacted by it (${successors.length})`}
                      </p>
                      <div className="mt-3 space-y-2">
                        {successors.length === 0 ? (
                          <p className={cn('text-xs text-[#6B7A8D]', isRTL && 'text-right')}>
                            {isRTL ? 'אין משימות המשך מושפעות.' : 'No downstream impacted tasks.'}
                          </p>
                        ) : successors.map((dependency) => (
                          <div key={dependency.id} className="rounded-xl bg-white px-3 py-2">
                            <p className={cn('text-xs font-semibold text-[#1F2D3D]', isRTL && 'text-right')}>{dependency.title}</p>
                            <p className={cn('mt-1 text-[11px] text-[#6B7A8D]', isRTL && 'text-right')}>
                              {dependency.taskKey} · {dependency.dependencyType.replace(/_/g, ' ')} · {dependency.status}
                              {dependency.lagDays ? ` · lag ${dependency.lagDays}d` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className={cn('mb-3 flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                  <Activity size={16} color="#0073EA" />
                  <p className="text-sm font-bold text-[#1F2D3D]">{isRTL ? 'פעילות אחרונה במשימה' : 'Recent Task Activity'}</p>
                </div>
                {contextLoading ? (
                  <div className="skeleton h-24 rounded-2xl" />
                ) : taskContext.activity.length === 0 ? (
                  <p className={cn('rounded-xl border border-dashed border-[#E6E9EF] px-4 py-3 text-xs text-[#6B7A8D]', isRTL && 'text-right')}>
                    {isRTL ? 'אין פעילות אחרונה זמינה.' : 'No recent activity is available.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {taskContext.activity.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[#E6E9EF] px-4 py-3">
                        <p className={cn('text-sm font-medium text-[#1F2D3D]', isRTL && 'text-right')}>
                          {item.message || item.eventType.replace(/_/g, ' ')}
                        </p>
                        <p className={cn('mt-1 text-[11px] text-[#6B7A8D]', isRTL && 'text-right')}>
                          {[item.actorName, formatDate(item.createdAt), item.eventType.replace(/_/g, ' ')].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save button (editing) */}
              {editing && (
                <div className={cn('flex gap-3', isRTL && 'flex-row-reverse')}>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? '...' : (isRTL ? 'שמור' : 'Save')}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    {isRTL ? 'ביטול' : 'Cancel'}
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[#E6E9EF]" />

              {/* Comments */}
              <div>
                <div className={cn('flex items-center gap-2 mb-4', isRTL && 'flex-row-reverse')}>
                  <MessageText1 size={16} color="#0073EA" />
                  <p className="text-sm font-bold text-[#1F2D3D]">
                    {isRTL ? `עדכונים (${comments.length})` : `Follow-ups (${comments.length})`}
                  </p>
                </div>

                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment.id} className={cn('flex gap-3', isRTL && 'flex-row-reverse')}>
                      <div className="w-8 h-8 rounded-full bg-[#0073EA] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {getInitials(comment.author)}
                      </div>
                      <div className={cn('flex-1', isRTL && 'text-right')}>
                        <div className={cn('flex items-center gap-2 mb-1', isRTL && 'flex-row-reverse')}>
                          <span className="text-xs font-bold text-[#1F2D3D]">{comment.author}</span>
                          <span className="text-[10px] text-[#6B7A8D]">{timeAgo(comment.createdAt, isRTL)}</span>
                        </div>
                        <div className={cn('bg-[#F6F7FB] border border-[#E6E9EF] rounded-xl px-3 py-2 text-sm text-[#1F2D3D] leading-relaxed', isRTL && 'text-right')}>
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <p className={cn('text-xs text-[#6B7A8D] text-center py-4', isRTL && 'text-right')}>
                      {isRTL ? 'אין עדכונים עדיין. הוסף הודעה.' : 'No follow-ups yet. Add a message below.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Comment input */}
          <div className={cn('px-5 py-4 border-t border-[#E6E9EF] bg-white flex-shrink-0')}>
            <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
              <div className="w-8 h-8 rounded-full bg-[#0073EA] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {getInitials(currentUser)}
              </div>
              <input
                ref={commentInputRef}
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={isRTL ? 'הוסף עדכון...' : 'Add a follow-up...'}
                className={cn('flex-1 px-3 py-2 text-sm bg-[#F6F7FB] border border-[#E6E9EF] rounded-xl outline-none focus:border-[#0073EA] transition-colors text-[#1F2D3D] placeholder:text-[#6B7A8D]', isRTL && 'text-right')}
              />
              <button
                onClick={sendComment}
                disabled={!commentInput.trim() || savingComment}
                className="w-9 h-9 rounded-xl bg-[#0073EA] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0060C2] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              >
                <Send2 size={16} color="white" variant="Bold" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
