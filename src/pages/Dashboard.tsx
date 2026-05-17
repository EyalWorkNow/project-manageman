import React, { useDeferredValue, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Project, Task, SystemStatus } from '../types';
import { Link } from 'react-router-dom';
import { ProjectCard, KPICard, DailyBrief, RecentActivity, TeamOverview } from '../components/DashboardComponents';
import {
  Folder2,
  AddCircle,
  InfoCircle,
  TickCircle,
  Clock,
  Refresh2,
  ArrowRight2,
  SearchNormal1,
  Filter,
  ShieldTick,
  Messages2,
  TrendUp,
  Flash,
  ArrowUp2,
} from 'iconsax-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { SystemStatusPanel } from '../components/UxGuides';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [viewType, setViewType] = useState<'all' | 'active'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const { t, isRTL } = useI18n();

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsData, tasksData, statusData] = await Promise.all([
          api.projects.list(),
          api.tasks.list(),
          api.system.status(),
        ]);
        setProjects(projectsData);
        setTasks(tasksData);
        setSystemStatus(statusData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, viewType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAFA]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Refresh2 variant="Linear" color="currentColor" className="animate-spin text-zinc-900" size={28} />
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.3em]">
            {isRTL ? 'טוען נתונים...' : 'Loading data...'}
          </p>
        </motion.div>
      </div>
    );
  }

  const stats = {
    active: projects.filter(p => p.status !== 'Completed').length,
    openTasks: tasks.filter(t => t.status !== 'Done').length,
    blocked: tasks.filter(t => t.isBlocked).length,
    critical: tasks.filter(t => t.priority === 'Critical').length,
    completed: tasks.filter(t => t.status === 'Done').length,
    atRisk: projects.filter(p => p.status === 'At Risk' || p.status === 'Blocked').length,
  };

  const reliability = tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 100;
  const normalizedQuery = deferredSearchQuery.toLowerCase();
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(normalizedQuery) ||
    p.clientName.toLowerCase().includes(normalizedQuery) ||
    p.projectManager.toLowerCase().includes(normalizedQuery)
  );
  const visibleProjects = viewType === 'active'
    ? filteredProjects.filter(p => p.status !== 'Completed')
    : filteredProjects;

  const totalPages = Math.max(1, Math.ceil(visibleProjects.length / ITEMS_PER_PAGE));
  const paginatedProjects = visibleProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <header className={cn(
        'sticky top-0 md:top-0 z-20 px-6 md:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-zinc-200/50 flex flex-col md:flex-row md:items-center justify-between gap-3',
        isRTL && 'text-right'
      )}>
        <div className={cn('flex flex-col md:flex-row md:items-center gap-4', isRTL && 'md:flex-row-reverse')}>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{t('dash.title')}</h1>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              {isRTL ? `${projects.length} פרויקטים • ${tasks.length} משימות` : `${projects.length} projects • ${tasks.length} tasks`}
            </p>
          </div>

          <div className="relative">
            <SearchNormal1 variant="Linear" color="currentColor" className={cn('absolute top-1/2 -translate-y-1/2 text-zinc-400', isRTL ? 'right-3' : 'left-3')} size={14} />
            <input
              type="text"
              placeholder={t('dash.search') || 'SearchNormal1 projects...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(
                'h-9 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100 w-64 transition-all placeholder:text-zinc-400',
                isRTL ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4'
              )}
            />
          </div>
        </div>

        <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
          <div className={cn('hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200/60 rounded-xl')}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
              {isRTL ? 'מערכת פעילה' : 'Live'}
            </span>
          </div>
          <Link
            to="/ai-chat"
            className={cn(
              'flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl font-semibold text-xs hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-pointer',
              isRTL && 'flex-row-reverse'
            )}
          >
            <Messages2 variant="Linear" color="currentColor" size={14} />
            {isRTL ? 'צ׳אט AI' : 'AI Chat'}
          </Link>
          <Link
            to="/projects/new"
            className={cn(
              'flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white rounded-xl font-semibold text-xs shadow-sm hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer',
              isRTL && 'flex-row-reverse'
            )}
          >
            <AddCircle variant="Linear" color="currentColor" size={14} />
            {t('dash.new_project')}
          </Link>
        </div>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 md:p-8 space-y-8"
      >
        {/* Hero banner */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-[2rem] bg-white border border-zinc-200/60 overflow-hidden p-8 md:p-10 shadow-sm"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className={cn('flex items-center gap-2 mb-3', isRTL && 'flex-row-reverse')}>
                <div className="w-2 h-2 rounded-full bg-zinc-900" />
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  {isRTL ? 'מרכז שליטה' : 'Command Center'}
                </p>
              </div>
              <h2 className="text-3xl md:text-4xl font-medium text-zinc-900 mb-4 tracking-tight">
                {isRTL
                  ? 'הפרויקטים שלך במבט על.'
                  : 'Your projects at a glance.'}
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
                {isRTL
                  ? 'כל מה שאתה צריך כדי לנהל, לעקוב ולהתקדם. הכל במקום אחד, נקי וממוקד.'
                  : 'Everything you need to manage, track, and progress. All in one place, clean and focused.'}
              </p>
            </div>
            <div className={cn('flex gap-3', isRTL && 'flex-row-reverse')}>
              <Link
                to="/ai-chat"
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-2xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Flash variant="Linear" color="currentColor" size={14} className="text-zinc-900" />
                {isRTL ? 'שאל AI' : 'Ask AI'}
              </Link>
              <Link
                to="/projects/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                <AddCircle variant="Linear" color="currentColor" size={14} />
                {isRTL ? 'פרויקט חדש' : 'New Project'}
              </Link>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label={t('dash.active_projects')}
            value={stats.active}
            icon={<Folder2 variant="Linear" color="currentColor" size={18} />}
            trend={isRTL ? `${projects.length} סה״כ` : `${projects.length} total`}
            description={isRTL ? 'מספר הפרויקטים שעדיין לא הסתיימו.' : 'Non-completed projects in the portfolio.'}
          />
          <KPICard
            label={t('dash.pending_tasks')}
            value={stats.openTasks}
            icon={<Clock variant="Linear" color="currentColor" size={18} />}
            trend={isRTL ? `${stats.critical} קריטיות` : `${stats.critical} critical`}
            description={isRTL ? 'משימות פתוחות הדורשות טיפול.' : 'Open tasks still in the pipeline.'}
          />
          <KPICard
            label={t('dash.blocked_paths') || 'Blocked Paths'}
            value={stats.blocked}
            icon={<InfoCircle variant="Linear" color="currentColor" size={18} />}
            warning={stats.blocked > 0}
            description={isRTL ? 'משימות חסומות הדורשות פתרון דחוף.' : 'Tasks impeded — unblock to resume delivery.'}
          />
          <KPICard
            label={t('dash.reliability') || 'Reliability'}
            value={`${reliability}%`}
            icon={<TickCircle variant="Linear" color="currentColor" size={18} />}
            trend={isRTL ? `${stats.completed} בוצעו` : `${stats.completed} done`}
            description={isRTL ? 'יחס המשימות שהושלמו מסך הכל.' : 'Completion ratio across all tracked tasks.'}
          />
        </motion.div>

        {/* Main content grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Project portfolio */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl border border-zinc-200/50 shadow-sm overflow-hidden">
              {/* Portfolio header */}
              <div className={cn('px-6 py-5 border-b border-zinc-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4', isRTL && 'text-right')}>
                <div className={cn('flex items-center gap-4', isRTL && 'flex-row-reverse')}>
                  <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">{isRTL ? 'פורטפוליו' : 'Portfolio'}</h2>
                  <div className="relative">
                    <SearchNormal1 variant="Linear" color="currentColor" className={cn('absolute top-1/2 -translate-y-1/2 text-zinc-400', isRTL ? 'right-2.5' : 'left-2.5')} size={13} />
                    <input
                      type="text"
                      placeholder={isRTL ? 'חיפוש בפרויקטים...' : 'SearchNormal1 portfolio...'}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={cn(
                        'h-8 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-300 w-48 transition-all placeholder:text-zinc-400',
                        isRTL ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3'
                      )}
                    />
                  </div>
                </div>
                <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                  <div className="flex items-center gap-1 p-1 bg-zinc-50/80 rounded-xl border border-zinc-200/60">
                    <button
                      onClick={() => setViewType('all')}
                      className={cn(
                        'px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer',
                        viewType === 'all' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'הכל' : 'All'}
                    </button>
                    <button
                      onClick={() => setViewType('active')}
                      className={cn(
                        'px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer',
                        viewType === 'active' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'פעילים' : 'Active'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Project grid */}
              <div className="p-6">
                <AnimatePresence mode="popLayout">
                  {visibleProjects.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4 shadow-sm border border-zinc-100">
                        <Folder2 variant="Linear" color="currentColor" size={24} />
                      </div>
                      <p className="text-sm text-zinc-500 font-medium">
                        {isRTL ? 'לא נמצאו פרויקטים.' : 'No projects found.'}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {paginatedProjects.map(project => (
                          <ProjectCard key={project.id} project={project} />
                        ))}
                      </div>
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className={cn('flex items-center justify-between pt-4 border-t border-zinc-100', isRTL && 'flex-row-reverse')}>
                          <p className="text-xs text-zinc-500 font-medium">
                            {isRTL 
                              ? `עמוד ${currentPage} מתוך ${totalPages}` 
                              : `Page ${currentPage} of ${totalPages}`}
                          </p>
                          <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {isRTL ? 'הקודם' : 'Previous'}
                            </button>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {isRTL ? 'הבא' : 'Next'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <RecentActivity tasks={tasks} />
          </motion.div>

          {/* Right sidebar */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4 space-y-5">
            {/* At-risk alert */}
            {stats.atRisk > 0 && (
              <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6">
                <div className={cn('flex items-center gap-2 mb-4', isRTL && 'flex-row-reverse')}>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-sm font-semibold text-red-900 tracking-tight">
                    {isRTL ? `${stats.atRisk} פרויקטים בסיכון` : `${stats.atRisk} projects at risk`}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {projects.filter(p => p.status === 'At Risk' || p.status === 'Blocked').slice(0, 3).map(p => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-red-50 hover:border-red-200 transition-all cursor-pointer group shadow-sm',
                        isRTL && 'flex-row-reverse'
                      )}
                    >
                      <div className={cn('min-w-0', isRTL && 'text-right')}>
                        <p className="text-sm font-medium text-zinc-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-red-500 font-medium mt-0.5">{p.status}</p>
                      </div>
                      <ArrowUp2 variant="Linear" color="currentColor" size={14} className="text-zinc-300 group-hover:text-red-500 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* AI shortcut */}
            <Link
              to="/ai-chat"
              className="block bg-zinc-900 rounded-3xl p-6 text-white hover:bg-zinc-800 transition-all cursor-pointer group shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className={cn('flex items-center justify-between mb-4 relative z-10', isRTL && 'flex-row-reverse')}>
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Messages2 variant="Linear" color="currentColor" size={18} className="text-white" />
                </div>
                <ArrowUp2 variant="Linear" color="currentColor" size={18} className="text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h3 className="font-semibold text-lg mb-2 relative z-10">{isRTL ? 'עוזר AI אישי' : 'AI Assistant'}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed relative z-10">
                {isRTL
                  ? 'קבל תובנות, שאל שאלות, ונהל סיכונים בעזרת הבינה המלאכותית שלנו.'
                  : 'Get insights, ask questions, and manage risks with our AI.'}
              </p>
            </Link>

            {/* Critical tasks */}
            <div className="bg-white rounded-3xl border border-zinc-200/50 shadow-sm overflow-hidden">
              <div className={cn('px-6 py-5 border-b border-zinc-200/50 flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                   <ShieldTick variant="Linear" color="currentColor" size={14} className="text-red-600" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">{isRTL ? 'משימות קריטיות' : 'Critical Tasks'}</h3>
              </div>
              <div className="p-4 space-y-2">
                {tasks.filter(t => t.priority === 'Critical').slice(0, 4).map(task => (
                  <div
                    key={task.id}
                    className={cn('flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-50/80 hover:bg-zinc-100 transition-colors border border-transparent hover:border-zinc-200/50', isRTL && 'flex-row-reverse')}
                  >
                    <div className={cn('min-w-0 flex-1', isRTL && 'text-right')}>
                      <p className="text-xs font-semibold text-zinc-900 truncate">{task.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{task.assignee}</p>
                    </div>
                    {task.isBlocked && (
                      <span className="text-[9px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full shrink-0 ml-2 tracking-wider">
                        {isRTL ? 'חסום' : 'BLOCKED'}
                      </span>
                    )}
                  </div>
                ))}
                {tasks.filter(t => t.priority === 'Critical').length === 0 && (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3">
                       <TickCircle variant="Linear" color="currentColor" size={20} className="text-zinc-300" />
                    </div>
                    <p className="text-xs font-medium text-zinc-500">{isRTL ? 'הכל נקי. אין משימות קריטיות.' : 'All clear. No critical tasks.'}</p>
                  </div>
                )}
              </div>
            </div>

            <DailyBrief projects={projects} tasks={tasks} />
            <SystemStatusPanel status={systemStatus} />
            <TeamOverview />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
