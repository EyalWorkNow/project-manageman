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
  const [viewType, setViewType] = useState<'all' | 'active' | 'on_track' | 'at_risk' | 'blocked' | 'completed'>('all');
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
  const visibleProjects = filteredProjects.filter(p => {
    if (viewType === 'active') return p.status !== 'Completed';
    if (viewType === 'on_track') return p.status === 'On Track';
    if (viewType === 'at_risk') return p.status === 'At Risk';
    if (viewType === 'blocked') return p.status === 'Blocked';
    if (viewType === 'completed') return p.status === 'Completed';
    return true;
  });

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
        'sticky top-0 z-20 px-6 md:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-zinc-200/50 flex items-center justify-between',
        isRTL && 'text-right'
      )}>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{t('dash.title')}</h1>
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
                <svg width="70" height="12" viewBox="0 0 70 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3 w-auto text-zinc-900">
                  <path d="M5.96046e-05 8.84424V0.276238H1.08006V7.88424H4.82406V8.84424H5.96046e-05ZM7.20503 2.41224V8.84424H6.14903V2.41224H7.20503ZM6.68903 0.000237703C6.84903 0.000237703 6.98903 0.0562377 7.10903 0.168238C7.23703 0.272238 7.30103 0.440238 7.30103 0.672238C7.30103 0.896238 7.23703 1.06424 7.10903 1.17624C6.98903 1.28824 6.84903 1.34424 6.68903 1.34424C6.51303 1.34424 6.36503 1.28824 6.24503 1.17624C6.12503 1.06424 6.06503 0.896238 6.06503 0.672238C6.06503 0.440238 6.12503 0.272238 6.24503 0.168238C6.36503 0.0562377 6.51303 0.000237703 6.68903 0.000237703ZM12.3388 2.29224C13.1068 2.29224 13.6868 2.48024 14.0788 2.85624C14.4708 3.22424 14.6668 3.82424 14.6668 4.65624V8.84424H13.6228V4.72824C13.6228 4.20824 13.5068 3.82024 13.2748 3.56424C13.0428 3.30824 12.6788 3.18024 12.1828 3.18024C11.4708 3.18024 10.9788 3.38024 10.7068 3.78024C10.4348 4.18024 10.2988 4.75624 10.2988 5.50824V8.84424H9.24278V2.41224H10.0948L10.2508 3.28824H10.3108C10.4548 3.06424 10.6308 2.88024 10.8388 2.73624C11.0548 2.58424 11.2908 2.47224 11.5468 2.40024C11.8028 2.32824 12.0668 2.29224 12.3388 2.29224ZM19.7567 2.29224C20.5247 2.29224 21.1047 2.48024 21.4967 2.85624C21.8887 3.22424 22.0847 3.82424 22.0847 4.65624V8.84424H21.0407V4.72824C21.0407 4.20824 20.9247 3.82024 20.6927 3.56424C20.4607 3.30824 20.0967 3.18024 19.6007 3.18024C18.8887 3.18024 18.3967 3.38024 18.1247 3.78024C17.8527 4.18024 17.7167 4.75624 17.7167 5.50824V8.84424H16.6607V2.41224H17.5127L17.6687 3.28824H17.7287C17.8727 3.06424 18.0487 2.88024 18.2567 2.73624C18.4727 2.58424 18.7087 2.47224 18.9647 2.40024C19.2207 2.32824 19.4847 2.29224 19.7567 2.29224ZM29.6707 5.61624C29.6707 6.15224 29.5987 6.62824 29.4547 7.04424C29.3187 7.45224 29.1187 7.80024 28.8547 8.08824C28.5987 8.37624 28.2827 8.59624 27.9067 8.74824C27.5387 8.89224 27.1267 8.96424 26.6707 8.96424C26.2467 8.96424 25.8547 8.89224 25.4947 8.74824C25.1347 8.59624 24.8227 8.37624 24.5587 8.08824C24.2947 7.80024 24.0867 7.45224 23.9347 7.04424C23.7907 6.62824 23.7187 6.15224 23.7187 5.61624C23.7187 4.90424 23.8387 4.30424 24.0787 3.81624C24.3187 3.32024 24.6627 2.94424 25.1107 2.68824C25.5587 2.42424 26.0907 2.29224 26.7067 2.29224C27.2907 2.29224 27.8027 2.42424 28.2427 2.68824C28.6907 2.94424 29.0387 3.32024 29.2867 3.81624C29.5427 4.30424 29.6707 4.90424 29.6707 5.61624ZM24.8107 5.61624C24.8107 6.12024 24.8747 6.56024 25.0027 6.93624C25.1387 7.30424 25.3467 7.58824 25.6267 7.78824C25.9067 7.98824 26.2627 8.08824 26.6947 8.08824C27.1267 8.08824 27.4827 7.98824 27.7627 7.78824C28.0427 7.58824 28.2467 7.30424 28.3747 6.93624C28.5107 6.56024 28.5787 6.12024 28.5787 5.61624C28.5787 5.10424 28.5107 4.66824 28.3747 4.30824C28.2387 3.94824 28.0307 3.67224 27.7507 3.48024C27.4787 3.28024 27.1227 3.18024 26.6827 3.18024C26.0267 3.18024 25.5507 3.39624 25.2547 3.82824C24.9587 4.26024 24.8107 4.85624 24.8107 5.61624ZM41.61 2.29224C41.73 2.29224 41.858 2.30024 41.994 2.31624C42.138 2.32424 42.262 2.34024 42.366 2.36424L42.234 3.33624C42.13 3.31224 42.014 3.29224 41.886 3.27624C41.766 3.26024 41.65 3.25224 41.538 3.25224C41.29 3.25224 41.054 3.30424 40.83 3.40824C40.606 3.51224 40.406 3.66024 40.23 3.85224C40.054 4.03624 39.914 4.26024 39.81 4.52424C39.714 4.78824 39.666 5.08424 39.666 5.41224V8.84424H38.61V2.41224H39.474L39.594 3.58824H39.642C39.778 3.34824 39.942 3.13224 40.134 2.94024C40.326 2.74024 40.546 2.58424 40.794 2.47224C41.042 2.35224 41.314 2.29224 41.61 2.29224ZM48.9246 5.61624C48.9246 6.15224 48.8526 6.62824 48.7086 7.04424C48.5726 7.45224 48.3726 7.80024 48.1086 8.08824C47.8526 8.37624 47.5366 8.59624 47.1606 8.74824C46.7926 8.89224 46.3806 8.96424 45.9246 8.96424C45.5006 8.96424 45.1086 8.89224 44.7486 8.74824C44.3886 8.59624 44.0766 8.37624 43.8126 8.08824C43.5486 7.80024 43.3406 7.45224 43.1886 7.04424C43.0446 6.62824 42.9726 6.15224 42.9726 5.61624C42.9726 4.90424 43.0926 4.30424 43.3326 3.81624C43.5726 3.32024 43.9166 2.94424 44.3646 2.68824C44.8126 2.42424 45.3446 2.29224 45.9606 2.29224C46.5446 2.29224 47.0566 2.42424 47.4966 2.68824C47.9446 2.94424 48.2926 3.32024 48.5406 3.81624C48.7966 4.30424 48.9246 4.90424 48.9246 5.61624ZM44.0646 5.61624C44.0646 6.12024 44.1286 6.56024 44.2566 6.93624C44.3926 7.30424 44.6006 7.58824 44.8806 7.78824C45.1606 7.98824 45.5166 8.08824 45.9486 8.08824C46.3806 8.08824 46.7366 7.98824 47.0166 7.78824C47.2966 7.58824 47.5006 7.30424 47.6286 6.93624C47.7646 6.56024 47.8326 6.12024 47.8326 5.61624C47.8326 5.10424 47.7646 4.66824 47.6286 4.30824C47.4926 3.94824 47.2846 3.67224 47.0046 3.48024C46.7326 3.28024 46.3766 3.18024 45.9366 3.18024C45.2806 3.18024 44.8046 3.39624 44.5086 3.82824C44.2126 4.26024 44.0646 4.85624 44.0646 5.61624ZM49.8422 11.7242C49.6422 11.7242 49.4662 11.7082 49.3142 11.6762C49.1622 11.6522 49.0302 11.6202 48.9182 11.5802V10.7282C49.0382 10.7602 49.1622 10.7882 49.2902 10.8122C49.4182 10.8362 49.5582 10.8482 49.7102 10.8482C49.9662 10.8482 50.1782 10.7762 50.3462 10.6322C50.5142 10.4962 50.5982 10.2322 50.5982 9.84024V2.41224H51.6542V9.80424C51.6542 10.2042 51.5902 10.5482 51.4622 10.8362C51.3342 11.1242 51.1382 11.3442 50.8742 11.4962C50.6102 11.6482 50.2662 11.7242 49.8422 11.7242ZM50.5142 0.672238C50.5142 0.440238 50.5742 0.272238 50.6942 0.168238C50.8142 0.0562377 50.9622 0.000237703 51.1382 0.000237703C51.2982 0.000237703 51.4382 0.0562377 51.5582 0.168238C51.6862 0.272238 51.7502 0.440238 51.7502 0.672238C51.7502 0.896238 51.6862 1.06424 51.5582 1.17624C51.4382 1.28824 51.2982 1.34424 51.1382 1.34424C50.9622 1.34424 50.8142 1.28824 50.6942 1.17624C50.5742 1.06424 50.5142 0.896238 50.5142 0.672238ZM56.128 2.30424C56.912 2.30424 57.492 2.47624 57.868 2.82024C58.244 3.16424 58.432 3.71224 58.432 4.46424V8.84424H57.664L57.46 7.93224H57.412C57.228 8.16424 57.036 8.36024 56.836 8.52024C56.644 8.67224 56.42 8.78424 56.164 8.85624C55.916 8.92824 55.612 8.96424 55.252 8.96424C54.868 8.96424 54.52 8.89624 54.208 8.76024C53.904 8.62424 53.664 8.41624 53.488 8.13624C53.312 7.84824 53.224 7.48824 53.224 7.05624C53.224 6.41624 53.476 5.92424 53.98 5.58024C54.484 5.22824 55.26 5.03624 56.308 5.00424L57.4 4.96824V4.58424C57.4 4.04824 57.284 3.67624 57.052 3.46824C56.82 3.26024 56.492 3.15624 56.068 3.15624C55.732 3.15624 55.412 3.20824 55.108 3.31224C54.804 3.40824 54.52 3.52024 54.256 3.64824L53.932 2.85624C54.212 2.70424 54.544 2.57624 54.928 2.47224C55.312 2.36024 55.712 2.30424 56.128 2.30424ZM56.44 5.73624C55.64 5.76824 55.084 5.89624 54.772 6.12024C54.468 6.34424 54.316 6.66024 54.316 7.06824C54.316 7.42824 54.424 7.69224 54.64 7.86024C54.864 8.02824 55.148 8.11224 55.492 8.11224C56.036 8.11224 56.488 7.96424 56.848 7.66824C57.208 7.36424 57.388 6.90024 57.388 6.27624V5.70024L56.44 5.73624ZM62.9986 8.96424C62.4306 8.96424 61.9226 8.84824 61.4746 8.61624C61.0346 8.38424 60.6866 8.02424 60.4306 7.53624C60.1826 7.04824 60.0586 6.42424 60.0586 5.66424C60.0586 4.87224 60.1906 4.22824 60.4546 3.73224C60.7186 3.23624 61.0746 2.87224 61.5226 2.64024C61.9786 2.40824 62.4946 2.29224 63.0706 2.29224C63.3986 2.29224 63.7146 2.32824 64.0186 2.40024C64.3226 2.46424 64.5706 2.54424 64.7626 2.64024L64.4386 3.51624C64.2466 3.44424 64.0226 3.37624 63.7666 3.31224C63.5106 3.24824 63.2706 3.21624 63.0466 3.21624C62.6146 3.21624 62.2586 3.30824 61.9786 3.49224C61.6986 3.67624 61.4906 3.94824 61.3546 4.30824C61.2186 4.66824 61.1506 5.11624 61.1506 5.65224C61.1506 6.16424 61.2186 6.60024 61.3546 6.96024C61.4906 7.32024 61.6946 7.59224 61.9666 7.77624C62.2386 7.96024 62.5786 8.05224 62.9866 8.05224C63.3386 8.05224 63.6466 8.01624 63.9106 7.94424C64.1826 7.87224 64.4306 7.78424 64.6546 7.68024V8.61624C64.4386 8.72824 64.1986 8.81224 63.9346 8.86824C63.6786 8.93224 63.3666 8.96424 62.9986 8.96424ZM68.3322 8.10024C68.4922 8.10024 68.6562 8.08824 68.8242 8.06424C68.9922 8.03224 69.1282 8.00024 69.2322 7.96824V8.77224C69.1202 8.82824 68.9602 8.87224 68.7522 8.90424C68.5442 8.94424 68.3442 8.96424 68.1522 8.96424C67.8162 8.96424 67.5042 8.90824 67.2162 8.79624C66.9362 8.67624 66.7082 8.47224 66.5322 8.18424C66.3562 7.89624 66.2682 7.49224 66.2682 6.97224V3.22824H65.3562V2.72424L66.2802 2.30424L66.7002 0.936238H67.3242V2.41224H69.1842V3.22824H67.3242V6.94824C67.3242 7.34024 67.4162 7.63224 67.6002 7.82424C67.7922 8.00824 68.0362 8.10024 68.3322 8.10024Z" fill="currentColor" />
                  <path d="M33.7563 0.276238C34.8763 0.276238 35.6923 0.496238 36.2043 0.936238C36.7163 1.37624 36.9723 1.99624 36.9723 2.79624C36.9723 3.14824 36.9123 3.48824 36.7923 3.81624C36.6803 4.13624 36.4923 4.42424 36.2283 4.68024C35.9643 4.93624 35.6123 5.14024 35.1723 5.29224C34.7323 5.43624 34.1923 5.50824 33.5523 5.50824H32.5683V8.84424H31.4883V0.276238H33.7563ZM33.6603 1.20024H32.5683V4.58424H33.4323C33.9763 4.58424 34.4283 4.52824 34.7883 4.41624C35.1483 4.29624 35.4163 4.10824 35.5923 3.85224C35.7683 3.59624 35.8563 3.26024 35.8563 2.84424C35.8563 2.29224 35.6803 1.88024 35.3283 1.60824C34.9763 1.33624 34.4203 1.20024 33.6603 1.20024Z" fill="#0080EC" />
                </svg>
              </div>
              <p className={cn('text-xs text-zinc-500 font-semibold mb-2 tracking-wide', isRTL && 'text-right')}>
                {isRTL ? `${projects.length} פרויקטים • ${tasks.length} משימות` : `${projects.length} projects • ${tasks.length} tasks`}
              </p>
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
                className={cn('flex items-center gap-2 px-5 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-2xl text-xs font-semibold transition-all cursor-pointer icon-action', isRTL && 'flex-row-reverse')}
              >
                <Flash variant="Linear" color="currentColor" size={14} className="text-zinc-900 icon-micro" />
                {isRTL ? 'שאל AI' : 'Ask AI'}
              </Link>
              <Link
                to="/projects/new"
                className={cn('flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-semibold transition-all shadow-sm cursor-pointer icon-action', isRTL && 'flex-row-reverse')}
              >
                <AddCircle variant="Linear" color="currentColor" size={14} className="icon-micro" />
                {isRTL ? 'פרויקט חדש' : 'New Project'}
              </Link>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label={t('dash.active_projects')}
            value={stats.active}
            icon={<Folder2 variant="Linear" color="currentColor" size={18} />}
            trend={isRTL ? `${projects.length} סה״כ` : `${projects.length} total`}
            description={isRTL ? 'מספר הפרויקטים שעדיין לא הסתיימו.' : 'Non-completed projects in the portfolio.'}
          />
          <KPICard label={t('dash.pending_tasks')}
            value={stats.openTasks}
            icon={<Clock variant="Linear" color="currentColor" size={18} />}
            trend={isRTL ? `${stats.critical} קריטיות` : `${stats.critical} critical`}
            description={isRTL ? 'משימות פתוחות הדורשות טיפול.' : 'Open tasks still in the pipeline.'}
          />
          <KPICard label={t('dash.blocked_paths') || 'Blocked Paths'}
            value={stats.blocked}
            icon={<InfoCircle variant="Linear" color="currentColor" size={18} />}
            warning={stats.blocked > 0}
            description={isRTL ? 'משימות חסומות הדורשות פתרון דחוף.' : 'Tasks impeded — unblock to resume delivery.'}
          />
          <KPICard label={t('dash.reliability') || 'Reliability'}
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
                  <div className="icon-shell h-8 w-8">
                    <Folder2 variant="Linear" color="currentColor" size={15} className="icon-micro text-zinc-800" />
                  </div>
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
                <div className={cn('flex items-center gap-3 w-full md:w-auto min-w-0', isRTL && 'flex-row-reverse')}>
                  <div className="flex items-center gap-1 p-1 bg-zinc-50/80 rounded-xl border border-zinc-200/60 overflow-x-auto w-full md:w-auto min-w-0 no-scrollbar">
                    <div className="px-2 text-zinc-400 shrink-0">
                      <Filter variant="Linear" color="currentColor" size={13} className="icon-micro" />
                    </div>
                    <button
                      onClick={() => setViewType('all')}
                      className={cn(
                        'px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                        viewType === 'all' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'הכל' : 'All'}
                    </button>
                    <button
                      onClick={() => setViewType('active')}
                      className={cn(
                        'px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                        viewType === 'active' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'פעילים' : 'Active'}
                    </button>
                    <button
                      onClick={() => setViewType('on_track')}
                      className={cn(
                        'px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                        viewType === 'on_track' ? 'bg-white text-emerald-600 shadow-sm border border-zinc-200/50 font-bold' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'במסלול' : 'On Track'}
                    </button>
                    <button
                      onClick={() => setViewType('at_risk')}
                      className={cn(
                        'px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                        viewType === 'at_risk' ? 'bg-white text-amber-600 shadow-sm border border-zinc-200/50 font-bold' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'בסיכון' : 'At Risk'}
                    </button>
                    <button
                      onClick={() => setViewType('blocked')}
                      className={cn(
                        'px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                        viewType === 'blocked' ? 'bg-white text-red-600 shadow-sm border border-zinc-200/50 font-bold' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'חסומים' : 'Blocked'}
                    </button>
                    <button
                      onClick={() => setViewType('completed')}
                      className={cn(
                        'px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                        viewType === 'completed' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50 font-bold' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      {isRTL ? 'הושלמו' : 'Completed'}
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
