import React, { useState, useEffect } from 'react';
import { Project, Task, STATUS_TRANSLATION_KEYS } from '../types';
import { Link } from 'react-router-dom';
import { Clock, InfoCircle, Magicpen, ArrowRight2, TrendUp, RotateLeft, Profile2User, Activity, TickCircle, ArrowUp2, Calendar } from 'iconsax-react';
import { cn, formatDate, STATUS_COLORS } from '../lib/utils';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';

export function InfoTooltip({ content }: { content: string }) {
  const { isRTL } = useI18n();
  return (
    <div className={cn('group/tooltip relative inline-block', isRTL ? 'mr-1' : 'ml-1')}>
      <InfoCircle variant="Linear" color="currentColor" size={13} className="text-zinc-300 hover:text-blue-500 transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -tranzinc-x-1/2 mb-2 w-48 p-2.5 bg-zinc-900 text-white text-[10px] font-medium leading-relaxed rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-xl pointer-events-none text-center">
        {content}
        <div className="absolute top-full left-1/2 -tranzinc-x-1/2 border-6 border-transparent border-t-zinc-900" />
      </div>
    </div>
  );
}

export function KPICard({
  label,
  value,
  icon,
  trend,
  warning,
  description,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  warning?: boolean;
  description: string;
}) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all p-5 group cursor-default',
      warning && 'border-red-100 bg-red-50/30'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
          warning ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-900'
        )}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            'text-[10px] font-bold px-2 py-1 rounded-lg',
            warning ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-zinc-50 text-zinc-500 border border-zinc-100'
          )}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
        <InfoTooltip content={description} />
      </div>
      <p className={cn('text-2xl font-bold tracking-tight', warning && value !== 0 ? 'text-red-600' : 'text-zinc-900')}>
        {value}
      </p>
    </div>
  );
}

const STATUS_RING: Record<string, string> = {
  'On Track': 'bg-emerald-500',
  'At Risk': 'bg-amber-500',
  'Blocked': 'bg-red-500',
  'Completed': 'bg-zinc-300',
};

export function ProjectCard({ project }: { project: Project; key?: React.Key }) {
  const { t, isRTL } = useI18n();

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block bg-white rounded-2xl border border-zinc-100 p-5 hover:shadow-lg hover:shadow-blue-500/5 hover:-tranzinc-y-0.5 transition-all cursor-pointer"
    >
      <div className={cn('flex items-start justify-between mb-4', isRTL && 'flex-row-reverse')}>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_RING[project.status] || 'bg-zinc-300')} />
          <span className={cn(
            'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border',
            STATUS_COLORS[project.status]
          )}>
            {t(STATUS_TRANSLATION_KEYS[project.status]) || project.status}
          </span>
        </div>
        <div className="w-7 h-7 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
          <ArrowRight2 variant="Linear" color="currentColor" size={14} className={isRTL ? 'rotate-180' : ''} />
        </div>
      </div>

      <h3 className={cn('text-sm font-bold text-zinc-900 leading-tight mb-1', isRTL && 'text-right')}>
        {project.name}
      </h3>
      <p className={cn('text-xs text-zinc-400 font-medium mb-1', isRTL && 'text-right')}>
        {project.clientName}
      </p>
      <p className={cn('text-xs text-zinc-500 line-clamp-2 mb-5 leading-relaxed', isRTL && 'text-right')}>
        {project.description}
      </p>

      <div className={cn('flex items-center justify-between pt-4 border-t border-zinc-50', isRTL && 'flex-row-reverse')}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-white">
            {project.projectManager.charAt(0)}
          </div>
          <span className="text-[11px] font-semibold text-zinc-600">{project.projectManager}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <Calendar variant="Linear" color="currentColor" size={12} className="text-zinc-300" />
          {formatDate(project.deadline)}
        </div>
      </div>
    </Link>
  );
}

export function DailyBrief({ projects: _projects, tasks: _tasks }: { projects: Project[]; tasks: Task[] }) {
  const { t, isRTL, language } = useI18n();
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateBrief() {
    setLoading(true);
    try {
      const data = await api.ai.dailyBrief(language);
      setBrief(data.brief);
    } catch {
      setBrief(isRTL ? 'לא ניתן לייצר את התדרוך כרגע. נסה שוב.' : 'Could not generate brief. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn('bg-white rounded-2xl border border-zinc-100 shadow-sm p-5', isRTL && 'text-right')}>
      <div className={cn('flex items-center gap-2 mb-4', isRTL && 'flex-row-reverse')}>
        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
          <Magicpen variant="Linear" color="currentColor" size={14} className="text-blue-600" />
        </div>
        <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">{t('dash.daily_brief')}</h3>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={brief || 'initial'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-zinc-700 leading-relaxed mb-4 font-medium"
        >
          {brief || (isRTL ? 'לחץ לקבלת תובנות על הפורטפוליו.' : 'Click to get portfolio insights.')}
        </motion.p>
      </AnimatePresence>

      {!brief ? (
        <button
          onClick={generateBrief}
          disabled={loading}
          className="w-full py-2.5 bg-zinc-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? <RotateLeft variant="Linear" color="currentColor" className="animate-spin" size={13} /> : <TrendUp variant="Linear" color="currentColor" size={13} />}
          {loading ? (isRTL ? 'מנתח...' : 'Analyzing...') : (isRTL ? 'הפק תדרוך' : 'Generate Brief')}
        </button>
      ) : (
        <button
          onClick={() => setBrief(null)}
          className="w-full py-2 border border-zinc-100 hover:bg-zinc-50 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-wider transition-all cursor-pointer"
        >
          {isRTL ? 'אפס' : 'Reset'}
        </button>
      )}
    </div>
  );
}

export function RecentActivity({ tasks }: { tasks: Task[] }) {
  const { isRTL } = useI18n();
  const recentTasks = tasks
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className={cn('bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden', isRTL && 'text-right')}>
      <div className={cn('px-6 py-4 border-b border-zinc-100 flex items-center justify-between', isRTL && 'flex-row-reverse')}>
        <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'פעילות אחרונה' : 'Recent Activity'}</h3>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{isRTL ? 'עדכון חי' : 'Live Feed'}</span>
      </div>

      <div className="divide-y divide-zinc-50">
        {recentTasks.map(task => (
          <div key={task.id} className={cn('flex items-center gap-3 px-6 py-3 hover:bg-zinc-50 transition-colors', isRTL && 'flex-row-reverse')}>
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
              task.status === 'Done' ? 'bg-zinc-100 text-zinc-900' : task.isBlocked ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-900'
            )}>
              {task.status === 'Done' ? <TickCircle variant="Linear" color="currentColor" size={14} /> : task.isBlocked ? <InfoCircle variant="Linear" color="currentColor" size={14} /> : <Activity variant="Linear" color="currentColor" size={14} />}
            </div>
            <div className={cn('flex-1 min-w-0', isRTL && 'text-right')}>
              <p className="text-xs font-semibold text-zinc-800 truncate">{task.title}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{task.assignee}</p>
            </div>
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0',
              task.status === 'Done' ? 'bg-zinc-100 text-zinc-900' : task.isBlocked ? 'bg-red-50 text-red-500' : 'bg-zinc-100 text-zinc-900'
            )}>
              {task.status}
            </span>
          </div>
        ))}
        {recentTasks.length === 0 && (
          <div className="py-10 text-center text-xs text-zinc-400">
            {isRTL ? 'אין פעילות אחרונה.' : 'No recent activity.'}
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamOverview() {
  const { t, isRTL } = useI18n();
  const members = [
    { name: isRTL ? 'אייל עטיה' : 'EYAL ATIA', role: t('nav.admin') || 'Lead PM', active: true, initials: 'EA', from: 'from-zinc-800', to: 'to-zinc-900' },
    { name: isRTL ? 'שרה מילר' : 'Sarah Miller', role: isRTL ? 'ארכיטקטית' : 'Architect', active: true, initials: 'SM', from: 'from-zinc-700', to: 'to-zinc-800' },
    { name: isRTL ? 'ג׳יימס צ׳ן' : 'James Chen', role: isRTL ? 'מנהל פרויקט' : 'Project Manager', active: false, initials: 'JC', from: 'from-zinc-600', to: 'to-zinc-700' },
  ];

  return (
    <div className={cn('bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden', isRTL && 'text-right')}>
      <div className={cn('px-5 py-4 border-b border-zinc-100 flex items-center justify-between', isRTL && 'flex-row-reverse')}>
        <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          <Profile2User variant="Linear" color="currentColor" size={14} className="text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-900">{t('dash.team_overview')}</h3>
        </div>
        <span className="text-[10px] text-zinc-400">{members.length} {isRTL ? 'חברים' : 'members'}</span>
      </div>

      <div className="p-4 space-y-2">
        {members.map(m => (
          <div
            key={m.name}
            className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors', isRTL && 'flex-row-reverse')}
          >
            <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
              <div className={cn(`w-9 h-9 rounded-2xl bg-gradient-to-br ${m.from} ${m.to} flex items-center justify-center text-white text-[10px] font-bold shrink-0`)}>
                {m.initials}
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-xs font-semibold text-zinc-800">{m.name}</p>
                <p className="text-[10px] text-zinc-400">{m.role}</p>
              </div>
            </div>
            <div className={cn('flex items-center gap-1.5', isRTL && 'flex-row-reverse')}>
              <div className={cn('w-1.5 h-1.5 rounded-full', m.active ? 'bg-emerald-400' : 'bg-amber-400')} />
              <span className="text-[10px] text-zinc-400">{m.active ? (isRTL ? 'פעיל' : 'Active') : (isRTL ? 'עסוק' : 'Busy')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
