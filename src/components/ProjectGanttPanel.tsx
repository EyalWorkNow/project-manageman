import React from 'react';
import {
  Activity,
  Calendar1,
  Chart21,
  Danger,
  Flag2,
  Profile2User,
  Routing,
} from 'iconsax-react';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameMonth,
  parseISO,
} from 'date-fns';
import { cn } from '../lib/utils';
import { ProjectGanttData, ProjectMember } from '../types';

interface Props {
  data: ProjectGanttData | null;
  members: ProjectMember[];
  loading: boolean;
  isRTL: boolean;
  onTaskOpen?: (taskId: string) => void;
}

const DAY_WIDTH = 34;

function MemberBadge({ member }: { key?: React.Key; member: ProjectMember }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/70 bg-white px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
        {member.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-zinc-900">{member.name}</p>
        <p className="truncate text-[11px] text-zinc-500">
          {member.title}
          {typeof member.allocationPercent === 'number' ? ` · ${Math.round(member.allocationPercent)}%` : ''}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone?: 'default' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-zinc-200 bg-white text-zinc-700';

  return (
    <div className={cn('rounded-2xl border px-4 py-4', toneClass)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
        <span>{icon}</span>
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-2 text-xs opacity-80">{hint}</p>
    </div>
  );
}

function timelineBarClass(status: string) {
  switch (status) {
    case 'done':
      return 'bg-emerald-500';
    case 'blocked':
      return 'bg-red-500';
    case 'in_review':
      return 'bg-amber-400';
    case 'in_progress':
      return 'bg-blue-600';
    default:
      return 'bg-zinc-400';
  }
}

function timelineBarColor(status: string, displayColor?: string | null) {
  if (displayColor) return displayColor;
  switch (status) {
    case 'done':
      return '#00C875';
    case 'blocked':
      return '#E2445C';
    case 'in_review':
      return '#FDAB3D';
    case 'in_progress':
      return '#0073EA';
    default:
      return '#9CA3AF';
  }
}

export default function ProjectGanttPanel({ data, members, loading, isRTL, onTaskOpen }: Props) {
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Calendar1 size={36} color="#98A2B3" />
        <p className="text-sm font-semibold text-zinc-700">{isRTL ? 'אין נתוני גאנט לפרויקט הזה.' : 'No Gantt data is available for this project yet.'}</p>
      </div>
    );
  }

  const taskDates = data.tasks.flatMap((task) => [task.plannedStartDate, task.plannedEndDate]).filter(Boolean);
  const activeTasks = data.tasks.filter((task) => !['done', 'cancelled'].includes(task.taskStatus)).length;
  const timelineStart = parseISO(taskDates[0] || data.health.startDate);
  const timelineEnd = parseISO(taskDates[taskDates.length - 1] || data.health.targetEndDate);
  const safeTimelineEnd = timelineEnd < timelineStart ? addDays(timelineStart, 1) : timelineEnd;
  const days = eachDayOfInterval({ start: timelineStart, end: safeTimelineEnd });
  const months = days.reduce<Array<{ label: string; span: number }>>((acc, day) => {
    const label = format(day, 'MMM yyyy');
    const last = acc[acc.length - 1];
    if (!last || !isSameMonth(day, parseISO(`${format(day, 'yyyy-MM')}-01`))) {
      // no-op; handled below
    }
    if (!last || last.label !== label) {
      acc.push({ label, span: 1 });
    } else {
      last.span += 1;
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard
          label={isRTL ? 'אחוז השלמה' : 'Completion'}
          value={`${Math.round(data.health.progressPercent)}%`}
          hint={`${data.health.projectKey} · ${data.health.healthStatus.replace(/_/g, ' ')}`}
          icon={<Chart21 size={18} color="currentColor" />}
          tone={data.health.healthStatus === 'blocked' || data.health.healthStatus === 'overdue' ? 'danger' : 'success'}
        />
        <StatCard
          label={isRTL ? 'משימות פעילות' : 'Active Tasks'}
          value={activeTasks}
          hint={isRTL ? `${data.health.totalTasks} סה״כ משימות` : `${data.health.totalTasks} total tasks`}
          icon={<Routing size={18} color="currentColor" />}
        />
        <StatCard
          label={isRTL ? 'משימות חסומות' : 'Blocked Tasks'}
          value={data.health.blockedTasks}
          hint={isRTL ? `${data.health.overdueTasks} באיחור` : `${data.health.overdueTasks} overdue`}
          icon={<Flag2 size={18} color="currentColor" />}
          tone={data.health.blockedTasks > 0 || data.health.overdueTasks > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label={isRTL ? 'נתיב קריטי' : 'Critical Path'}
          value={data.health.criticalPathTasks}
          hint={isRTL ? `${members.length} משתתפים בפרויקט` : `${members.length} project participants`}
          icon={<Profile2User size={18} color="currentColor" />}
        />
      </div>

      <section className="space-y-3">
        <div className={cn('flex flex-wrap items-center gap-3', isRTL && 'flex-row-reverse')}>
          <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'משתתפי הפרויקט' : 'Project Participants'}</h3>
          <span className="text-xs text-zinc-500">
            {isRTL ? 'מסונכרן מתוך project_members' : 'Synced from project_members'}
          </span>
        </div>
        <div className={cn('flex flex-wrap gap-3', isRTL && 'flex-row-reverse')}>
          {members.slice(0, 10).map((member) => (
            <MemberBadge key={member.id} member={member} />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white">
        <div className="border-b border-zinc-200/70 px-5 py-4">
          <div className={cn('flex items-center justify-between gap-3', isRTL && 'flex-row-reverse')}>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'גאנט פרויקט' : 'Project Gantt'}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {isRTL
                  ? `${format(timelineStart, 'dd MMM')} - ${format(safeTimelineEnd, 'dd MMM yyyy')}`
                  : `${format(timelineStart, 'dd MMM')} - ${format(safeTimelineEnd, 'dd MMM yyyy')}`}
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <p>{isRTL ? 'Baseline אפור · תכנון נוכחי בצבע' : 'Gray baseline · current plan in color'}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="sticky top-0 z-10 flex bg-white">
              <div className="sticky left-0 z-20 w-[280px] border-r border-zinc-200/70 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                {isRTL ? 'משימה' : 'Task'}
              </div>
              <div>
                <div className="flex border-b border-zinc-200/70">
                  {months.map((month) => (
                    <div
                      key={month.label}
                      className="border-r border-zinc-200/70 px-2 py-2 text-[11px] font-bold text-zinc-600"
                      style={{ width: month.span * DAY_WIDTH }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
                <div className="flex">
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className="border-r border-zinc-100 px-1 py-2 text-center text-[10px] text-zinc-500"
                      style={{ width: DAY_WIDTH }}
                    >
                      {format(day, 'd')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {data.tasks.map((task) => {
              const startOffset = differenceInCalendarDays(parseISO(task.plannedStartDate), timelineStart);
              const width = Math.max(task.durationDays, 1) * DAY_WIDTH;
              const baselineOffset = task.baselineStartDate
                ? differenceInCalendarDays(parseISO(task.baselineStartDate), timelineStart)
                : null;
              const baselineWidth = task.baselineStartDate && task.baselineEndDate
                ? (differenceInCalendarDays(parseISO(task.baselineEndDate), parseISO(task.baselineStartDate)) + 1) * DAY_WIDTH
                : null;

              return (
                <div key={task.taskId} className="flex border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => onTaskOpen?.(task.taskId)}
                    className="sticky left-0 z-10 flex w-[280px] items-center gap-3 border-r border-zinc-200/70 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <div className={cn('h-2.5 w-2.5 rounded-full', task.isCriticalPath ? 'bg-red-500' : 'bg-zinc-300')} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">{task.title}</p>
                      <p className="truncate text-[11px] text-zinc-500">
                        {task.taskKey}
                        {task.assignees.length > 0 ? ` · ${task.assignees.join(', ')}` : ''}
                      </p>
                    </div>
                  </button>

                  <div
                    className="relative"
                    style={{ width: days.length * DAY_WIDTH, height: 56 }}
                  >
                    <div className="absolute inset-0 flex">
                      {days.map((day) => (
                        <div key={day.toISOString()} className="border-r border-zinc-100" style={{ width: DAY_WIDTH }} />
                      ))}
                    </div>

                    {baselineOffset !== null && baselineWidth !== null && (
                      <div
                        className="absolute top-3 h-2 rounded-full bg-zinc-300/90"
                        style={{ left: baselineOffset * DAY_WIDTH + 2, width: Math.max(baselineWidth - 4, 8) }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => onTaskOpen?.(task.taskId)}
                      className={cn(
                        'absolute top-5 h-5 overflow-hidden rounded-full shadow-sm transition-all hover:ring-2 hover:ring-black/10',
                        timelineBarClass(task.taskStatus),
                      )}
                      style={{
                        left: startOffset * DAY_WIDTH + 2,
                        width: Math.max(width - 4, 12),
                        backgroundColor: timelineBarColor(task.taskStatus, task.displayColor),
                      }}
                    >
                      <div className="h-full bg-black/15" style={{ width: `${Math.max(0, Math.min(task.progressPercent, 100))}%` }} />
                    </button>

                    <div
                      className="absolute top-10 text-[10px] font-medium text-zinc-500"
                      style={{ left: startOffset * DAY_WIDTH + 2 }}
                    >
                      {task.commentsCount > 0 ? `${task.commentsCount} ${isRTL ? 'תגובות' : 'comments'}` : task.timelineHealth}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-zinc-200/70 bg-white p-5">
          <div className={cn('mb-4 flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            <Calendar1 size={16} color="#0073EA" />
            <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'אבני דרך' : 'Milestones'}</h3>
          </div>
          <div className="space-y-3">
            {data.milestones.map((milestone) => (
              <div key={milestone.id} className="rounded-xl border border-zinc-200/70 px-4 py-3">
                <div className={cn('flex items-start justify-between gap-3', isRTL && 'flex-row-reverse')}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{milestone.milestoneName}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {milestone.milestoneKey}
                      {milestone.ownerName ? ` · ${milestone.ownerName}` : ''}
                    </p>
                  </div>
                  <div className={cn('rounded-full px-2 py-1 text-[10px] font-bold uppercase', milestone.isLate ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700')}>
                    {milestone.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {isRTL ? 'יעד' : 'Due'}: {format(parseISO(milestone.dueDate), 'dd MMM yyyy')}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200/70 bg-white p-5">
          <div className={cn('mb-4 flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            <Profile2User size={16} color="#0073EA" />
            <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'הקצאת משאבים' : 'Resource Load'}</h3>
          </div>
          <div className="space-y-3">
            {data.resources.map((resource) => (
              <div key={resource.userId} className="rounded-xl border border-zinc-200/70 px-4 py-3">
                <div className={cn('flex items-start justify-between gap-3', isRTL && 'flex-row-reverse')}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{resource.fullName}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{resource.department || (isRTL ? 'ללא מחלקה' : 'No department')}</p>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-700">
                    {Math.round(resource.openTaskAllocationPercent || 0)}%
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {isRTL
                    ? `${resource.openTasks} משימות פתוחות · ${resource.activeProjects} פרויקטים פעילים`
                    : `${resource.openTasks} open tasks · ${resource.activeProjects} active projects`}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200/70 bg-white p-5">
        <div className={cn('mb-4 flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          <Activity size={16} color="#0073EA" />
          <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'פעילות אחרונה' : 'Recent Activity'}</h3>
        </div>
        <div className="space-y-3">
          {data.activity.map((item) => (
            <div key={item.id} className={cn('flex items-start gap-3 rounded-xl border border-zinc-200/70 px-4 py-3', isRTL && 'flex-row-reverse')}>
              <div className="mt-1 rounded-full bg-zinc-100 p-2 text-zinc-600">
                {item.eventType.includes('blocked') ? <Danger size={14} color="currentColor" /> : <Activity size={14} color="currentColor" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">
                  {item.message || item.eventType.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {[item.taskTitle, item.actorName, format(new Date(item.createdAt), 'dd MMM yyyy HH:mm')].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
