import React, { useState, useRef } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Add, Calendar1, CloseCircle, Profile2User } from 'iconsax-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectMember, Task, TaskStatus, STATUS_TRANSLATION_KEYS } from '../types';
import { cn, formatDate, STATUS_DOT, PRIORITY_DOT, daysUntil } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import { api } from '../services/api';

const COLUMNS: { status: TaskStatus; dot: string; bg: string }[] = [
  { status: 'To Do',              dot: '#C5CAD6', bg: '#F6F7FB' },
  { status: 'In Progress',        dot: '#0073EA', bg: '#EDF4FF' },
  { status: 'Waiting for Client', dot: '#FDAB3D', bg: '#FFF8EC' },
  { status: 'Blocked',            dot: '#E2445C', bg: '#FFF0F3' },
  { status: 'Done',               dot: '#00C875', bg: '#EDFAF4' },
];

function initials(name: string) {
  return (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  '#0073EA','#A25DDC','#00C875','#FDAB3D','#E2445C',
  '#579BFC','#FF7575','#FFCB00','#03A9F4',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface CardProps {
  key?: React.Key;
  task: Task;
  onOpen: (t: Task) => void;
  ghost?: boolean;
}

function TaskCard({ task, onOpen, ghost }: CardProps) {
  const { isRTL, t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const clickedRef = useRef(false);

  const days = task.dueDate ? daysUntil(task.dueDate) : null;
  const overdue = days !== null && days < 0;

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  function handlePointerDown(e: React.PointerEvent) {
    clickedRef.current = true;
    listeners?.onPointerDown?.(e);
  }
  function handleClick() {
    if (!isDragging && clickedRef.current) onOpen(task);
    clickedRef.current = false;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        'bg-white rounded-xl border border-[#E6E9EF] p-3 space-y-2 cursor-grab active:cursor-grabbing select-none touch-none transition-all',
        ghost ? 'opacity-30' : 'hover:shadow-md hover:border-[#C8D2E0]',
        isDragging && 'opacity-0'
      )}
    >
      <p className={cn('text-[12px] font-semibold text-[#1F2D3D] leading-snug line-clamp-2', isRTL && 'text-right')}>
        {task.title}
      </p>

      <div className={cn('flex items-center justify-between gap-1', isRTL && 'flex-row-reverse')}>
        {task.assignee ? (
          <div className={cn('flex items-center gap-1.5', isRTL && 'flex-row-reverse')}>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: avatarColor(task.assignee) }}
            >
              {initials(task.assignee)}
            </div>
            <span className="text-[10px] text-[#6B7A8D] truncate max-w-[80px]">{task.assignee}</span>
          </div>
        ) : (
          <span className="text-[10px] text-[#C5CAD6] italic">{isRTL ? 'ללא אחראי' : 'Unassigned'}</span>
        )}

        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority])} />
      </div>

      {task.dueDate && (
        <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
          <Calendar1 size={10} color={overdue ? '#E2445C' : '#6B7A8D'} variant="Bold" />
          <span className={cn('text-[10px] font-medium', overdue ? 'text-[#E2445C]' : 'text-[#6B7A8D]')}>
            {formatDate(task.dueDate)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  key?: React.Key;
  status: TaskStatus;
  dot: string;
  bg: string;
  tasks: Task[];
  members: ProjectMember[];
  allUsers?: ProjectMember[];
  activeId: string | null;
  onOpen: (t: Task) => void;
  onAdd: (status: TaskStatus, title: string, assignees: string[]) => void;
}

function KanbanColumn({ status, dot, bg, tasks, members, allUsers, activeId, onOpen, onAdd }: ColumnProps) {
  const { t, isRTL } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<ProjectMember[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionEnd, setMentionEnd] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const searchSource = allUsers && allUsers.length > 0 ? allUsers : members;

  const availableMembers = searchSource.filter((member) => (
    !selectedMembers.some((selected) => selected.id === member.id)
  ));
  const filteredMembers = availableMembers.filter((member) => {
    const query = mentionQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      member.name.toLowerCase().includes(query)
      || member.email.toLowerCase().includes(query)
      || (member.title || '').toLowerCase().includes(query)
    );
  });

  function resetComposer() {
    setNewTitle('');
    setSelectedMembers([]);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
    setMentionEnd(null);
  }

  function closeComposer() {
    setAdding(false);
    resetComposer();
  }

  function updateMentionState(value: string, caretPosition: number) {
    const textBeforeCaret = value.slice(0, caretPosition);
    const atIndex = textBeforeCaret.lastIndexOf('@');
    const hasTrigger = atIndex >= 0
      && (atIndex === 0 || /\s/.test(textBeforeCaret[atIndex - 1]))
      && !/\s/.test(textBeforeCaret.slice(atIndex + 1));

    if (!hasTrigger || availableMembers.length === 0) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionStart(null);
      setMentionEnd(null);
      return;
    }

    setMentionOpen(true);
    setMentionQuery(textBeforeCaret.slice(atIndex + 1));
    setMentionStart(atIndex);
    setMentionEnd(caretPosition);
  }

  function handleTitleChange(value: string, caretPosition: number) {
    setNewTitle(value);
    updateMentionState(value, caretPosition);
  }

  function handleMemberSelect(member: ProjectMember) {
    setSelectedMembers((current) => (
      current.some((selected) => selected.id === member.id)
        ? current
        : [...current, member]
    ));

    if (mentionStart === null || mentionEnd === null) {
      setMentionOpen(false);
      setMentionQuery('');
      return;
    }

    const before = newTitle.slice(0, mentionStart);
    const after = newTitle.slice(mentionEnd);
    const nextTitle = `${before}${after}`.replace(/\s{2,}/g, ' ').trimStart();
    const nextCaretPosition = before.length;

    setNewTitle(nextTitle);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
    setMentionEnd(null);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  }

  function submit() {
    const title = newTitle.trim();
    if (!title) return;
    onAdd(status, title, selectedMembers.map((member) => member.name));
    setAdding(false);
    resetComposer();
  }

  return (
    <div className="flex flex-col gap-2.5 w-[230px] min-w-[230px] flex-shrink-0">
      {/* Header */}
      <div className={cn('flex items-center justify-between px-0.5', isRTL && 'flex-row-reverse')}>
        <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
          <span className="text-[12px] font-bold text-[#1F2D3D]">
            {t(STATUS_TRANSLATION_KEYS[status]) || status}
          </span>
          <span className="text-[10px] font-semibold text-[#6B7A8D] bg-[#F0F2F7] rounded-full px-1.5 py-px leading-none tabular-nums">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#F0F2F7] text-[#6B7A8D] hover:text-[#0073EA] transition-colors cursor-pointer"
        >
          <Add size={13} color="currentColor" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[100px] rounded-xl p-2 transition-all duration-150',
          isOver
            ? 'ring-2 ring-[#0073EA] ring-inset bg-[#EDF4FF]'
            : ''
        )}
        style={{ backgroundColor: isOver ? undefined : bg }}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onOpen={onOpen}
            ghost={activeId === task.id}
          />
        ))}

        {/* Inline add */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="relative bg-white border-2 border-[#0073EA] rounded-xl p-2.5 space-y-2"
            >
              {selectedMembers.length > 0 && (
                <div className={cn('flex flex-wrap gap-1.5', isRTL && 'flex-row-reverse')}>
                  {selectedMembers.map((member) => (
                    <span
                      key={member.id}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full bg-[#0F172A] px-2 py-1 text-[10px] font-semibold text-white',
                        isRTL && 'flex-row-reverse'
                      )}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[8px] font-bold">
                        {initials(member.name)}
                      </span>
                      <span className="max-w-[110px] truncate">{member.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMembers((current) => current.filter((selected) => selected.id !== member.id))}
                        className="cursor-pointer text-white/80 hover:text-white"
                        aria-label={isRTL ? `הסר את ${member.name}` : `Remove ${member.name}`}
                      >
                        <CloseCircle size={11} color="currentColor" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                autoFocus
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyDown={e => {
                  if (mentionOpen && filteredMembers.length > 0 && (e.key === 'Enter' || e.key === 'Tab')) {
                    e.preventDefault();
                    handleMemberSelect(filteredMembers[0]);
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                  if (e.key === 'Escape') {
                    if (mentionOpen) {
                      setMentionOpen(false);
                      setMentionQuery('');
                      setMentionStart(null);
                      setMentionEnd(null);
                      return;
                    }
                    closeComposer();
                  }
                }}
                placeholder={isRTL ? 'שם המשימה... כתוב @ כדי לתייג משתתפים' : 'Task title... type @ to mention participants'}
                rows={2}
                className={cn(
                  'w-full text-[12px] text-[#1F2D3D] placeholder:text-[#C5CAD6] resize-none outline-none leading-snug bg-transparent',
                  isRTL && 'text-right'
                )}
              />
              {mentionOpen && (
                <div className="absolute inset-x-2 top-full z-20 mt-1 rounded-xl border border-[#D8E0EB] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
                  <div className="max-h-52 overflow-y-auto">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleMemberSelect(member)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[#F6F8FC] cursor-pointer',
                            isRTL && 'flex-row-reverse text-right'
                          )}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF3FF] text-[10px] font-bold text-[#1D4ED8]">
                            {initials(member.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-[#111827]">{member.name}</p>
                            <p className="truncate text-[10px] text-[#6B7280]">
                              {member.title || member.email}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className={cn('px-2.5 py-2 text-[11px] text-[#6B7280]', isRTL && 'text-right')}>
                        {isRTL ? 'לא נמצאו משתתפים מתאימים' : 'No matching participants found'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className={cn('flex items-center gap-1.5 text-[10px] text-[#94A3B8]', isRTL && 'flex-row-reverse')}>
                <Profile2User size={12} color="currentColor" />
                <span>
                  {searchSource.length > 0
                    ? (isRTL ? 'כתוב @ כדי לחפש משתמש ולצרף אותו למשימה' : 'Type @ to search users and add them to the task')
                    : (isRTL ? 'אין משתמשים זמינים במערכת כרגע' : 'No users available in the system yet')}
                </span>
              </div>
              <div className={cn('flex items-center gap-1.5', isRTL && 'flex-row-reverse')}>
                <button
                  onClick={submit}
                  className="text-[10px] font-bold px-2.5 py-1 bg-[#0073EA] text-white rounded-lg hover:bg-[#0060C2] transition-colors cursor-pointer"
                >
                  {isRTL ? 'הוסף' : 'Add'}
                </button>
                <button
                  onClick={closeComposer}
                  className="text-[10px] font-semibold px-2.5 py-1 text-[#6B7A8D] hover:text-[#1F2D3D] transition-colors cursor-pointer"
                >
                  {isRTL ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state nudge */}
        {tasks.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-3 text-[10px] font-semibold text-[#C5CAD6] hover:text-[#0073EA] hover:bg-white/60 rounded-xl transition-all cursor-pointer"
          >
            {isRTL ? '+ הוסף משימה' : '+ Add task'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Confirm move modal ───────────────────────────────────────────────────────

interface PendingMove {
  task: Task;
  newStatus: TaskStatus;
}

function ConfirmMoveModal({
  move,
  onConfirm,
  onCancel,
}: {
  move: PendingMove;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t, isRTL } = useI18n();
  const newCol = COLUMNS.find(c => c.status === move.newStatus)!;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ duration: 0.15 }}
        className="relative bg-white rounded-2xl shadow-2xl border border-[#E6E9EF] p-6 w-[340px] max-w-[90vw]"
      >
        <h3 className={cn('text-[15px] font-bold text-[#1F2D3D] mb-1', isRTL && 'text-right')}>
          {isRTL ? 'שינוי סטטוס' : 'Move task?'}
        </h3>
        <p className={cn('text-xs text-[#6B7A8D] mb-4 leading-relaxed', isRTL && 'text-right')}>
          {isRTL
            ? `להעביר את "${move.task.title}" לסטטוס`
            : `Move "${move.task.title}" to`}
          {' '}
          <span className="font-bold" style={{ color: newCol.dot }}>
            {t(STATUS_TRANSLATION_KEYS[move.newStatus]) || move.newStatus}
          </span>
          {isRTL ? '?' : '?'}
        </p>
        <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer"
            style={{ backgroundColor: newCol.dot }}
          >
            {isRTL ? 'כן, העבר' : 'Move'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-[#6B7A8D] bg-[#F6F7FB] hover:bg-[#E6E9EF] transition-colors cursor-pointer"
          >
            {isRTL ? 'ביטול' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  members: ProjectMember[];
  allUsers?: ProjectMember[];
  onTaskOpen: (task: Task) => void;
  onTasksChange: (tasks: Task[]) => void;
}

export default function KanbanBoard({ tasks, projectId, members, allUsers, onTaskOpen, onTasksChange }: KanbanBoardProps) {
  const { isRTL } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function byStatus(status: TaskStatus) {
    return tasks.filter(t => t.status === status);
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setPendingMove({ task, newStatus });
  }

  async function confirmMove() {
    if (!pendingMove) return;
    const { task, newStatus } = pendingMove;
    setPendingMove(null);

    onTasksChange(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await api.tasks.updateStatus(task.id, newStatus);
    } catch {
      onTasksChange(tasks);
    }
  }

  function cancelMove() {
    setPendingMove(null);
  }

  const activeTask = tasks.find(t => t.id === activeId);

  async function handleAdd(status: TaskStatus, title: string, assignees: string[]) {
    try {
      const newTask = await api.tasks.save({
        projectId, title, status,
        description: '', assignee: assignees.join(', '), priority: 'Medium',
        dueDate: '', isBlocked: false, blockerDescription: '', internalNotes: '',
      } as Partial<Task>);
      onTasksChange([...tasks, newTask]);
    } catch (err) {
      console.error(err);
    }
  }

  const cols = isRTL ? [...COLUMNS].reverse() : COLUMNS;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className={cn('flex gap-4 overflow-x-auto pb-4 px-6', isRTL && 'flex-row-reverse')}>
          {cols.map(({ status, dot, bg }) => (
            <KanbanColumn
              key={status}
              status={status}
              dot={dot}
              bg={bg}
              tasks={byStatus(status)}
              members={members}
              allUsers={allUsers}
              activeId={activeId}
              onOpen={onTaskOpen}
              onAdd={handleAdd}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {activeTask ? (
            <div className="bg-white rounded-xl border border-[#0073EA] shadow-2xl p-3 w-[230px] rotate-1">
              <p className="text-[12px] font-semibold text-[#1F2D3D] leading-snug line-clamp-2">
                {activeTask.title}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {pendingMove && (
          <ConfirmMoveModal
            move={pendingMove}
            onConfirm={confirmMove}
            onCancel={cancelMove}
          />
        )}
      </AnimatePresence>
    </>
  );
}
