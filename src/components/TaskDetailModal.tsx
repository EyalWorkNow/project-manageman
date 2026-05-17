import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CloseCircle, Edit2, Trash, Send2, MessageText1,
  Flag2, Calendar1, Profile, Tag, ArrowLeft2,
} from 'iconsax-react';
import { cn, STATUS_COLORS, STATUS_DOT, PRIORITY_COLORS, PRIORITY_DOT, formatDate } from '../lib/utils';
import { Task, Comment, TASK_STATUSES, TASK_PRIORITIES, STATUS_TRANSLATION_KEYS, PRIORITY_TRANSLATION_KEYS } from '../types';
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
  const { t, isRTL } = useI18n();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [saving, setSaving] = useState(false);
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
    loadComments(task.id);
  }, [task?.id]);

  async function loadComments(taskId: string) {
    try {
      const data = await api.tasks.getComments(taskId);
      setComments(data);
    } catch { setComments([]); }
  }

  async function saveEdit() {
    if (!task) return;
    setSaving(true);
    try {
      const updated = await api.tasks.save({ ...task, ...editData });
      onUpdate(updated);
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

  if (!task) return null;

  const currentTaskColor = editData.displayColor || task.displayColor || '';
  const currentProgress = typeof editData.progressPercent === 'number' ? editData.progressPercent : (task.progressPercent ?? 0);

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
