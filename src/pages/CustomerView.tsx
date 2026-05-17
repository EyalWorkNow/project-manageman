import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, 
  TickCircle, 
  Clock, 
  Warning2, 
  Refresh2,
  Calendar,
  Magicpen,
  Export,
  InfoCircle,
  Global
} from 'iconsax-react';
import { Project, Task } from '../types';
import { api } from '../services/api';
import { cn, formatDate, STATUS_COLORS } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import { SafeDataNotice } from '../components/UxGuides';

export default function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const { t, isRTL, language, setLanguage } = useI18n();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generatingUpdate, setGeneratingUpdate] = useState(false);
  const [customerUpdate, setCustomerUpdate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        setLoadError(null);
        setCustomerUpdate(null);
        const data = await api.projects.get(id);
        if (cancelled) return;
        setProject(data);
        setLoading(false);
        setGeneratingUpdate(true);
        try {
          const aiUpdate = await api.ai.customerUpdate(data, data.tasks || [], language);
          if (cancelled) return;
          setCustomerUpdate(aiUpdate.update);
        } finally {
          if (!cancelled) {
            setGeneratingUpdate(false);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load project.');
          setLoading(false);
          setGeneratingUpdate(false);
        }
      }
    }
    loadData();

    return () => {
      cancelled = true;
    };
  }, [id, language]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
          <Refresh2 variant="Linear" color="currentColor" className="animate-spin text-blue-600" size={32} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('ai.synthesizing')}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-sm font-semibold text-zinc-500">
          {loadError && loadError !== 'Project not found.'
            ? (isRTL ? 'לא ניתן לטעון את הפרויקט כרגע.' : 'Could not load the project right now.')
            : (isRTL ? 'פרויקט לא נמצא.' : 'Project not found.')}
        </p>
      </div>
    );
  }

  const tasks = project.tasks || [];
  const completed = tasks.filter(t => t.status === 'Done');
  const inProgress = tasks.filter(t => t.status === 'In Progress' || t.status === 'To Do');
  const waitingForCustomer = tasks.filter(t => t.status === 'Waiting for Client');
  const blockers = tasks.filter(t => t.isBlocked);
  const progress = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Global Brand Navigation */}
      <nav className="px-8 py-4 border-b border-zinc-200/50 bg-white/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-zinc-950 rounded flex items-center justify-center">
            <Shield variant="Linear" color="currentColor" size={12} className="text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{t('customer.portal_title') || 'Stakeholder Portal'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
            className="flex items-center gap-2 rounded-xl border border-zinc-200/50 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-all hover:border-blue-200 hover:text-blue-600"
          >
            <Global variant="Linear" color="currentColor" size={12} />
            {language === 'en' ? 'עברית' : 'English'}
          </button>
          <Link 
            to={`/projects/${project.id}`} 
            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            {t('customer.dev_workspace') || 'Dev Workspace'} <Export variant="Linear" color="currentColor" size={12} className={isRTL ? "scale-x-[-1]" : ""} />
          </Link>
        </div>
      </nav>

      <div className={cn("max-w-4xl mx-auto px-6 md:px-8 py-16 md:py-20 space-y-16 md:space-y-24", isRTL && "text-right")}>
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", isRTL && "md:flex-row-reverse")}>
            <div>
              <p className="ux-kicker text-blue-600">{isRTL ? 'איך לקרוא את הפורטל' : 'How to read this portal'}</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">
                {isRTL ? 'זוהי תצוגה עסקית בטוחה ללקוח' : 'This is a business-safe customer view'}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-zinc-500">
                {isRTL
                  ? 'הפורטל מציג התקדמות, נקודות שדורשות משוב וסיכוני מסירה בשפה שאינה חושפת הערות פנימיות או פרטים טכניים גולמיים.'
                  : 'The portal shows progress, feedback needs, and delivery risks without exposing internal notes or raw technical detail.'}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-black px-5 py-4 text-white">
              <p className="text-[10px] font-black text-zinc-400">{isRTL ? 'מצב שיתוף' : 'Sharing Mode'}</p>
              <p className="mt-1 text-sm font-extrabold">{isRTL ? 'בטוח ללקוח' : 'Customer-safe'}</p>
            </div>
          </div>
        </div>

        {/* Executive Presentation Header */}
        <header className="space-y-8">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em]">{t('customer.report_type') || 'Operational Readiness Report'}</p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-zinc-900 tracking-tight font-display">{project.name}</h1>
              <p className="text-xl text-zinc-500 font-medium">{t('customer.briefing_for') || 'Strategic Briefing for'} <span className="text-zinc-900 font-bold underline decoration-blue-500 decoration-2 underline-offset-4">{project.clientName}</span></p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-zinc-200/50 shadow-sm flex flex-col items-center">
              <div className="text-5xl font-black text-zinc-900 tracking-tighter tabular-nums">{progress}%</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-2">{t('customer.completion_total') || 'Aggregate Completion'}</p>
            </div>
          </div>
        </header>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusTile label={t('customer.in_sprint') || 'In Active Sprint'} count={inProgress.length} icon={<Clock variant="Linear" color="currentColor" size={16} className="text-blue-500" />} isRTL={isRTL} />
          <StatusTile label={t('customer.completed_obj') || 'Completed Objectives'} count={completed.length} icon={<TickCircle variant="Linear" color="currentColor" size={16} className="text-emerald-500" />} isRTL={isRTL} />
          <StatusTile label={t('customer.pending_feedback') || 'Pending Feedback'} count={waitingForCustomer.length} icon={<InfoCircle variant="Linear" color="currentColor" size={16} className="text-amber-500" />} highlighted={waitingForCustomer.length > 0} isRTL={isRTL} />
          <StatusTile label={t('customer.delivery_risks') || 'Delivery Risks'} count={blockers.length} icon={<Warning2 variant="Linear" color="currentColor" size={16} className="text-red-500" />} risk={blockers.length > 0} isRTL={isRTL} />
        </div>

        <SafeDataNotice />

        {/* Neural Synthesis Section */}
        <div className="p-12 bg-zinc-950 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800/40 blur-3xl" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2">
              <Magicpen variant="Linear" color="currentColor" size={16} className="text-zinc-300" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{isRTL ? 'סקירה אסטרטגית' : 'Strategic Overview'}</h3>
            </div>
            <p className="text-2xl font-bold text-white leading-snug font-display italic">
               "{customerUpdate || (generatingUpdate
                 ? (isRTL ? "מכין עדכון לקוח בעזרת Gemini..." : "Preparing a customer-safe update with Gemini...")
                 : (isRTL ? "הפרויקט מתקדם, והצוות מתמקד כרגע ביעדים המרכזיים הבאים." : "The project remains on track. We are currently focusing on the next set of high-impact technical objectives."))}"
            </p>
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('customer.target_date') || 'Expected Release'}: {formatDate(project.deadline)}</span>
          <button className="text-[10px] font-bold text-white uppercase tracking-widest hover:text-zinc-300 transition-colors">{t('customer.download') || 'Download Digest'}</button>
        </div>
          </div>
        </div>

        {/* Detailed Roadmaps */}
        <div className="space-y-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight font-display">{isRTL ? 'מפת התקדמות' : 'Target Roadmap'}</h2>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{isRTL ? 'יעדים פעילים' : 'Active Objectives'}</div>
          </div>

          <div className="grid gap-4">
             {blockers.map(t => (
               <div key={t.id} className="p-6 bg-white border border-red-100 rounded-3xl flex items-center justify-between group shadow-sm transition-all hover:bg-red-50/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Warning2 variant="Linear" color="currentColor" size={14} className="text-red-500" />
                      <span className="text-[9px] font-black uppercase text-red-500 tracking-widest">{isRTL ? 'סיכון מסירה בבדיקה' : 'Delivery Risk Under Review'}</span>
                    </div>
                    <h4 className="text-lg font-bold text-zinc-900">{t.title}</h4>
                    <p className="text-xs text-zinc-500 font-medium italic">
                      {isRTL ? 'סטטוס: צוות הפרויקט מתאם את נקודת הבקרה הבאה.' : 'Status: The project team is coordinating the next recovery checkpoint.'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-red-200" />
               </div>
             ))}

             {waitingForCustomer.map(t => (
                <div key={t.id} className="p-6 bg-white border border-amber-100 rounded-3xl flex items-center justify-between group shadow-sm transition-all hover:bg-amber-50/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <InfoCircle variant="Linear" color="currentColor" size={14} className="text-amber-500" />
                       <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">{isRTL ? 'נדרשת פעולה: ממתין למשוב' : 'Action Required: Awaiting Feedback'}</span>
                    </div>
                    <h4 className="text-lg font-bold text-zinc-900">{t.title}</h4>
                    <p className="text-xs text-zinc-500 font-medium">{t.description}</p>
                  </div>
                  <ChevronRight size={16} className="text-amber-200" />
                </div>
             ))}

             {inProgress.filter(t => !t.isBlocked && t.status !== 'Waiting for Client').slice(0, 3).map(t => (
                <div key={t.id} className="p-6 bg-white border border-zinc-200/50 rounded-3xl flex items-center justify-between group shadow-sm transition-all">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{isRTL ? 'בביצוע פעיל' : 'In Active Production'}</span>
                    <h4 className="text-lg font-bold text-zinc-900">{t.title}</h4>
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">{t.description}</p>
                  </div>
                  <Clock variant="Linear" color="currentColor" size={16} className="text-slate-200" />
                </div>
             ))}
          </div>
        </div>

        {/* Minimal Footer Signature */}
        <footer className="pt-32 pb-12 border-t border-zinc-200/50 text-center">
           <div className="flex flex-col items-center gap-6 opacity-30">
              <Shield variant="Linear" color="currentColor" size={24} className="text-zinc-900" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-900">{isRTL ? 'פרוטוקול שקיפות ללקוח' : 'Enterprise Assurance Protocol'}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{isRTL ? 'שער סטטוס מאובטח' : 'Secured Digital Gateway'} • © 2026</p>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
}

function StatusTile({ label, count, icon, highlighted, risk }: any) {
  return (
    <div className={cn(
      "p-6 bg-white rounded-2xl border flex flex-col items-center gap-3 shadow-sm",
      highlighted ? "border-amber-200 bg-amber-50/50" : 
      risk ? "border-red-200 bg-red-50/50" : "border-zinc-200/50"
    )}>
       <div className={cn(
          "p-2.5 rounded-xl",
          highlighted ? "bg-amber-100" : risk ? "bg-red-100" : "bg-zinc-50"
       )}>
         {icon}
       </div>
       <div className="text-center">
         <div className="text-2xl font-bold text-zinc-900 tabular-nums">{count}</div>
         <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mt-1">{label}</p>
       </div>
    </div>
  );
}

function ChevronRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
