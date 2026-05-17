import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Element4,
  ClipboardText,
  AddCircle,
  Book,
  Messages2,
  ShieldTick,
  ArrowRight2,
  Data,
  Flash,
  Chart,
  HambergerMenu,
  CloseCircle,
} from 'iconsax-react';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import ProjectForm from './pages/ProjectForm';
import TaskForm from './pages/TaskForm';
import CustomerView from './pages/CustomerView';
import Submission from './pages/Submission';
import AiChat from './pages/AiChat';
import SignIn from './pages/SignIn';
import { api } from './services/api';
import { cn } from './lib/utils';
import { I18nProvider, useI18n } from './lib/i18n';
import type { SystemStatus } from './types';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  highlight?: boolean;
}

function NavLink({ to, icon, label, badge, highlight }: NavItem) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group cursor-pointer',
        isActive
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
        highlight && !isActive && 'text-zinc-100 hover:text-white'
      )}
    >
      <span className={cn('shrink-0 transition-transform duration-200', isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300 group-hover:scale-110')}>
        {icon}
      </span>
      <span className="tracking-tight flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-bold bg-zinc-700 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge}
        </span>
      )}
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
      )}
    </Link>
  );
}

function Navigation({ mobileOpen, onClose, onSignOut }: { mobileOpen: boolean; onClose: () => void; onSignOut: () => void }) {
  const location = useLocation();
  const { t, language, setLanguage, isRTL } = useI18n();
  const isCustomerView = location.pathname.includes('customer-view');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    api.system.status()
      .then(setSystemStatus)
      .catch(console.error);
  }, []);

  if (isCustomerView) return null;

  const storageLabel = systemStatus?.storage === 'postgres'
    ? (isRTL ? 'Postgres DB' : 'Postgres DB')
    : (isRTL ? 'אחסון מקומי' : 'Local Storage');

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="LinnoProjact Logo" className="h-7 object-contain" />
        </div>
        <button onClick={onClose} className="md:hidden text-zinc-500 hover:text-white transition-colors cursor-pointer">
          <CloseCircle variant="Linear" color="currentColor" size={18} />
        </button>
      </div>

      <div className="mx-5 h-px bg-white/5 shrink-0" />

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2">
          {isRTL ? 'תפריט ראשי' : 'Main HambergerMenu'}
        </p>
        <div className="space-y-0.5">
          <NavLink to="/" icon={<Element4 variant="Linear" color="currentColor" size={17} />} label={t('nav.home')} />
          <NavLink to="/projects/new" icon={<AddCircle variant="Linear" color="currentColor" size={17} />} label={t('nav.add_project') || 'Add Project'} />
          <NavLink to="/tasks/new" icon={<ClipboardText variant="Linear" color="currentColor" size={17} />} label={t('nav.new_task') || 'New Task'} />
          <NavLink to="/submission" icon={<Book variant="Linear" color="currentColor" size={17} />} label={t('nav.submission')} />
        </div>

        <div className="pt-5 pb-1">
          <p className="px-3 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2">
            {isRTL ? 'כלי AI' : 'AI Tools'}
          </p>
          <div className="space-y-0.5">
            <NavLink to="/ai-chat"
              icon={<Messages2 variant="Linear" color="currentColor" size={17} />}
              label={isRTL ? 'צ׳אט AI' : 'AI Assistant'}
              highlight
            />
          </div>
        </div>

        {/* System info */}
        <div className="mt-5 mx-1 rounded-2xl bg-white/5 border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
              {isRTL ? 'מערכת פעילה' : 'Live System'}
            </span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500">
              <Data variant="Linear" color="currentColor" size={13} className="text-zinc-400" />
              <span>{storageLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500">
              <Flash variant="Linear" color="currentColor" size={13} className="text-zinc-400" />
              <span>Gemini AI</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500">
              <Chart variant="Linear" color="currentColor" size={13} className="text-zinc-400" />
              <span>{isRTL ? 'ניתוח בזמן אמת' : 'Real-time Analytics'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom: User + Language */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5 space-y-2 shrink-0">
        <button
          onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-all cursor-pointer text-sm"
        >
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[11px] font-bold text-white">
            {language === 'en' ? 'HE' : 'EN'}
          </div>
          <span className="text-xs font-medium">{language === 'en' ? 'עברית' : 'English'}</span>
        </button>

        <div
          onClick={onSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/10">
            EA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">EYAL ATIA</p>
            <p className="text-[10px] text-zinc-500 font-medium">{isRTL ? 'מנהל מערכת' : 'Administrator'}</p>
          </div>
          <ArrowRight2 variant="Linear" color="currentColor" size={14} className="text-zinc-600 shrink-0" />
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/8 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer text-sm font-medium"
        >
          <CloseCircle variant="Linear" color="currentColor" size={16} />
          <span>{isRTL ? 'התנתקות' : 'Sign out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex flex-col fixed top-0 bottom-0 w-64 bg-zinc-950 z-40 border-r border-zinc-800',
        isRTL ? 'right-0 border-r-0 border-l' : 'left-0'
      )}>
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <aside className={cn('relative w-72 bg-zinc-950 flex flex-col z-10', isRTL ? 'ml-auto' : '')}>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

function MobileTopBar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const location = useLocation();
  const isCustomerView = location.pathname.includes('customer-view');
  if (isCustomerView) return null;

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-4 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="LinnoProjact Logo" className="h-5 object-contain" />
      </div>
      <button onClick={onMenuOpen} className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 bg-white/5 rounded-lg">
        <HambergerMenu variant="Linear" color="currentColor" size={18} />
      </button>
    </div>
  );
}

function Layout({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  const location = useLocation();
  const { isRTL } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCustomerView = location.pathname.includes('customer-view');

  return (
    <div className={cn('min-h-screen bg-[#F6F7FB] flex text-zinc-900', isRTL && 'rtl')}>
      <Navigation mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onSignOut={onSignOut} />
      <MobileTopBar onMenuOpen={() => setMobileOpen(true)} />
      <main className={cn(
        'flex-1 min-w-0',
        !isCustomerView && (isRTL ? 'md:mr-64' : 'md:ml-64'),
        'pt-14 md:pt-0'
      )}>
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function AppShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pm-auth') === '1' || sessionStorage.getItem('pm-auth') === '1';
  });

  function handleSignIn(rememberMe: boolean) {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    storage.setItem('pm-auth', '1');
    otherStorage.removeItem('pm-auth');
    setIsAuthenticated(true);
  }

  function handleSignOut() {
    localStorage.removeItem('pm-auth');
    sessionStorage.removeItem('pm-auth');
    setIsAuthenticated(false);
  }

  if (!isAuthenticated) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <Layout onSignOut={handleSignOut}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/submission" element={<Submission />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/edit/:id" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/projects/:id/customer-view" element={<CustomerView />} />
        <Route path="/tasks/new" element={<TaskForm />} />
        <Route path="/tasks/edit/:taskId" element={<TaskForm />} />
        <Route path="/ai-chat" element={<AiChat />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </I18nProvider>
  );
}
