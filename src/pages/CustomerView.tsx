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
  Global,
  DocumentDownload,
  Activity,
  Task as TaskIcon,
  People
} from 'iconsax-react';
import { Project, Task } from '../types';
import { api } from '../services/api';
import { cn, formatDate } from '../lib/utils';
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
          // Filter out any markdown bolding symbols in case AI outputs them
          const cleanUpdate = (aiUpdate.update || '').replace(/\*\*/g, '');
          setCustomerUpdate(cleanUpdate);
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

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F9FD]">
        <div className="flex flex-col items-center gap-4">
          <Refresh2 variant="Linear" color="currentColor" className="animate-spin text-zinc-950" size={36} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('ai.synthesizing')}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FD]">
        <div className="text-center p-8 bg-white border border-zinc-100 rounded-3xl shadow-sm max-w-sm">
          <Warning2 variant="Linear" color="currentColor" className="text-red-500 mx-auto mb-4" size={32} />
          <p className="text-sm font-semibold text-zinc-600">
            {loadError && loadError !== 'Project not found.'
              ? (isRTL ? 'לא ניתן לטעון את הפרויקט כרגע.' : 'Could not load the project right now.')
              : (isRTL ? 'פרויקט לא נמצא.' : 'Project not found.')}
          </p>
        </div>
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
    <div className={cn("min-h-screen bg-[#F8F9FD] text-zinc-950", isRTL && "rtl")}>
      
      {/* Custom @media print styles to ensure pixel-perfect vector PDF generation */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: #09090b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, .no-print, button, a {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #e4e4e7 !important;
            background-color: white !important;
            page-break-inside: avoid;
          }
          .print-badge-dark {
            background-color: #09090b !important;
            color: white !important;
          }
        }
      `}</style>

      {/* Global Brand Navigation - Hidden in print */}
      <nav className="px-8 py-4 border-b border-zinc-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center shadow-sm">
            <Shield variant="Linear" color="currentColor" size={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-zinc-950 tracking-tight">LinnoProjact</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-zinc-400">{t('customer.portal_title') || 'Stakeholder Portal'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
            className="flex items-center gap-2 rounded-xl border border-zinc-200/50 bg-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-all hover:border-zinc-300 hover:text-zinc-950 cursor-pointer"
          >
            <Global variant="Linear" color="currentColor" size={12} />
            {language === 'en' ? 'עברית' : 'English'}
          </button>
          
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-xl bg-zinc-950 text-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
          >
            <DocumentDownload variant="Linear" color="currentColor" size={13} />
            {isRTL ? 'ייצא כ-PDF' : 'Export PDF'}
          </button>

          <Link 
            to={`/projects/${project.id}`} 
            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-950 uppercase tracking-widest flex items-center gap-2 transition-colors ml-2"
          >
            {t('customer.dev_workspace') || 'Dev Workspace'} 
            <Export variant="Linear" color="currentColor" size={12} className={isRTL ? "scale-x-[-1]" : ""} />
          </Link>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <div className="max-w-4xl mx-auto px-6 md:px-8 py-10 md:py-16 space-y-10 md:space-y-14 print-container">
        
        {/* Safe-Share UX Guide Card - Hidden in print */}
        <div className="rounded-3xl border border-[#0080EC]/20 bg-white p-6 shadow-sm no-print">
          <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", isRTL && "md:flex-row-reverse")}>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#0080EC] uppercase tracking-widest">{isRTL ? 'כיצד להשתמש בפורטל' : 'How to utilize this portal'}</span>
              <h2 className="text-base font-bold text-zinc-950">
                {isRTL ? 'תצוגה עסקית מאובטחת ומסוננת ללקוח' : 'Secure client-facing stakeholder dashboard'}
              </h2>
              <p className="text-xs font-semibold leading-relaxed text-zinc-500">
                {isRTL
                  ? 'ממשק זה מסונן אוטומטית. הוא מציג התקדמות משימות ולוחות זמנים ללא חשיפת הערות פנימיות של מפתחים או פרטים טכניים גולמיים.'
                  : 'This environment is dynamically sanitized. It exposes objective roadmaps and deliveries without surfacing internal team logs or private notes.'}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-zinc-950 px-4 py-3 text-white text-right print-badge-dark">
              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{isRTL ? 'מצב שיתוף' : 'Security Mode'}</p>
              <p className="text-xs font-bold mt-0.5">{isRTL ? 'בטוח ללקוח' : 'Customer-safe'}</p>
            </div>
          </div>
        </div>

        {/* Executive Presentation Header */}
        <header className="space-y-6">
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Activity variant="Linear" color="currentColor" size={13} className="text-[#0080EC]" />
            <span className="text-[10px] font-bold text-[#0080EC] uppercase tracking-[0.25em]">
              {t('customer.report_type') || 'Operational Delivery Summary'}
            </span>
          </div>
          
          <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-6", isRTL && "md:flex-row-reverse")}>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tight font-display">
                {project.name}
              </h1>
              <p className="text-lg text-zinc-500 font-medium">
                {t('customer.briefing_for') || 'Strategic briefing customized for'}{' '}
                <span className="text-zinc-950 font-bold underline decoration-[#0080EC] decoration-2 underline-offset-4">
                  {project.clientName}
                </span>
              </p>
            </div>
            
            {/* Elegant Radial/Box Progress Health Gauge */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm flex items-center gap-5 min-w-[240px] justify-between print-card">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  {t('customer.completion_total') || 'Aggregate Progress'}
                </span>
                <p className="text-xs font-bold text-zinc-500">
                  {completed.length} / {tasks.length} {isRTL ? 'יעדים הושלמו' : 'objectives completed'}
                </p>
              </div>
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#0080EC]"
                    strokeWidth="3.5"
                    strokeDasharray={`${progress}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-xs font-black text-zinc-950 tabular-nums">{progress}%</div>
              </div>
            </div>
          </div>
        </header>

        {/* High-End Intelligence Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusTile 
            label={t('customer.in_sprint') || 'In Active Sprint'} 
            count={inProgress.length} 
            icon={<Clock variant="Linear" color="currentColor" size={16} className="text-[#0080EC]" />} 
            isRTL={isRTL} 
          />
          <StatusTile 
            label={t('customer.completed_obj') || 'Completed'} 
            count={completed.length} 
            icon={<TickCircle variant="Linear" color="currentColor" size={16} className="text-emerald-500" />} 
            isRTL={isRTL} 
          />
          <StatusTile 
            label={t('customer.pending_feedback') || 'Awaiting Feedback'} 
            count={waitingForCustomer.length} 
            icon={<InfoCircle variant="Linear" color="currentColor" size={16} className="text-amber-500" />} 
            highlighted={waitingForCustomer.length > 0} 
            isRTL={isRTL} 
          />
          <StatusTile 
            label={t('customer.delivery_risks') || 'Delivery Risks'} 
            count={blockers.length} 
            icon={<Warning2 variant="Linear" color="currentColor" size={16} className="text-red-500" />} 
            risk={blockers.length > 0} 
            isRTL={isRTL} 
          />
        </div>

        {/* Private Data Warning Guard - Hidden in print */}
        <div className="no-print">
          <SafeDataNotice />
        </div>

        {/* Executive Neural Digest (AI Summary Panel): Premium Slate card */}
        <div className="p-8 md:p-10 bg-zinc-950 rounded-3xl relative overflow-hidden shadow-xl border border-zinc-800 print-card print-badge-dark">
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800/20 blur-3xl rounded-full" />
          <div className="relative z-10 space-y-6">
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Magicpen variant="Linear" color="currentColor" size={15} className="text-[#0080EC]" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                {isRTL ? 'תמצית מנהלים מאת מנוע AI' : 'AI-Synthesized Executive Briefing'}
              </h3>
            </div>
            
            <blockquote className={cn("text-base md:text-lg font-bold text-white leading-relaxed italic border-l-2 border-[#0080EC]/50 pl-4", isRTL && "border-l-0 border-r-2 pr-4 pl-0 text-right")}>
               "{customerUpdate || (generatingUpdate
                 ? (isRTL ? "מנתח נתוני פרויקט ומכין סיכום אקזקיוטיבי..." : "Analyzing project matrices and synthesizing customer-safe digest...")
                 : (isRTL ? "הפרויקט מתקדם, והצוות מתמקד כרגע ביעדים המרכזיים הבאים." : "The project remains on track. We are currently focusing on the next set of high-impact technical objectives."))}"
            </blockquote>
            
            <div className={cn("pt-5 border-t border-zinc-800 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest", isRTL && "flex-row-reverse")}>
              <div className="flex items-center gap-1.5">
                <Calendar variant="Linear" color="currentColor" size={13} className="text-[#0080EC]" />
                <span>{t('customer.target_date') || 'Delivery Deadline'}: {formatDate(project.deadline)}</span>
              </div>
              <span className="text-[8px] font-bold text-zinc-500">LinnoProjact AI Protocol</span>
            </div>
          </div>
        </div>

        {/* Detailed Milestones & Active Roadmaps */}
        <div className="space-y-8">
          <div className={cn("flex items-center justify-between border-b border-zinc-200/60 pb-3", isRTL && "flex-row-reverse")}>
            <div className="flex items-center gap-2">
              <TaskIcon variant="Linear" color="currentColor" size={15} className="text-[#0080EC]" />
              <h2 className="text-lg font-bold text-zinc-950 tracking-tight font-display">
                {isRTL ? 'מפת דרכים ויעדים פעילים' : 'Roadmap & Active Deliverables'}
              </h2>
            </div>
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
              {isRTL ? 'יעדים מסוננים' : 'Sanitized Objectives'}
            </div>
          </div>

          <div className="space-y-4">
             
             {/* Blocked Deliverables */}
             {blockers.map(t => (
               <div key={t.id} className="p-5 bg-white border border-red-150 rounded-2xl flex items-center justify-between group shadow-sm transition-all hover:bg-red-50/10 print-card">
                  <div className="space-y-1">
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase text-red-500 tracking-wider">
                        {isRTL ? 'בבחינת סיכוני מסירה' : 'Delivery Risk Under Evaluation'}
                      </span>
                    </div>
                    <h4 className={cn("text-base font-bold text-zinc-950", isRTL && "text-right")}>{t.title}</h4>
                    <p className={cn("text-xs text-zinc-500 font-medium leading-relaxed", isRTL && "text-right")}>
                      {isRTL 
                        ? 'סטטוס: הצוות מבצע התאמות בלוח הזמנים על מנת לפתור חסמים אלה.' 
                        : 'Status: The project operations team is currently conducting sprint adjustments to mitigate this delivery block.'}
                    </p>
                  </div>
                  <Warning2 variant="Linear" color="currentColor" size={18} className="text-red-400 shrink-0" />
               </div>
             ))}

             {/* Action Items awaiting stakeholder feedback */}
             {waitingForCustomer.map(t => (
                <div key={t.id} className="p-5 bg-white border border-amber-150 rounded-2xl flex items-center justify-between group shadow-sm transition-all hover:bg-amber-50/10 print-card">
                  <div className="space-y-1">
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                       <span className="w-2 h-2 rounded-full bg-amber-500" />
                       <span className="text-[9px] font-bold uppercase text-amber-500 tracking-wider">
                         {isRTL ? 'נדרשת פעולת לקוח: ממתין למשוב' : 'Action Required: Awaiting Feedback'}
                       </span>
                    </div>
                    <h4 className={cn("text-base font-bold text-zinc-950", isRTL && "text-right")}>{t.title}</h4>
                    <p className={cn("text-xs text-zinc-500 font-medium leading-relaxed", isRTL && "text-right")}>{t.description}</p>
                  </div>
                  <InfoCircle variant="Linear" color="currentColor" size={18} className="text-amber-400 shrink-0" />
                </div>
             ))}

             {/* In production deliverables */}
             {inProgress.filter(t => !t.isBlocked && t.status !== 'Waiting for Client').slice(0, 5).map(t => (
                <div key={t.id} className="p-5 bg-white border border-zinc-200/50 rounded-2xl flex items-center justify-between group shadow-sm transition-all hover:border-zinc-300 print-card">
                  <div className="space-y-1">
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                       <span className="w-1.5 h-1.5 rounded-full bg-[#0080EC]" />
                       <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">
                         {isRTL ? 'בביצוע פעיל' : 'Active Engineering Sprint'}
                       </span>
                    </div>
                    <h4 className={cn("text-base font-bold text-zinc-950", isRTL && "text-right")}>{t.title}</h4>
                    <p className={cn("text-xs text-zinc-500 font-medium leading-relaxed", isRTL && "text-right")}>{t.description}</p>
                  </div>
                  <Clock variant="Linear" color="currentColor" size={16} className="text-zinc-300 shrink-0" />
                </div>
             ))}
          </div>
        </div>

        {/* Corporate Signatures & Assurances */}
        <footer className="pt-16 pb-10 border-t border-zinc-200/60 text-center">
           <div className="flex flex-col items-center gap-4 opacity-40">
              <Shield variant="Linear" color="currentColor" size={24} className="text-zinc-900" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-950">
                  {isRTL ? 'פרוטוקול אבטחה ושקיפות של LinnoProjact' : 'LinnoProjact Enterprise Assurance Protocol'}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  {isRTL ? 'שער דיגיטלי מאובטח' : 'Secured Gateway Transaction'} • © 2026
                </p>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
}

interface StatusTileProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  highlighted?: boolean;
  risk?: boolean;
  isRTL: boolean;
}

function StatusTile({ label, count, icon, highlighted, risk, isRTL }: StatusTileProps) {
  return (
    <div className={cn(
      "p-5 bg-white rounded-2xl border flex items-center justify-between shadow-sm transition-all duration-300 print-card",
      highlighted ? "border-amber-200 bg-amber-50/20" : 
      risk ? "border-red-200 bg-red-50/20" : "border-zinc-200/60",
      isRTL && "flex-row-reverse"
    )}>
       <div className="space-y-1">
         <p className={cn("text-[9px] font-bold uppercase tracking-wider text-zinc-400", isRTL && "text-right")}>{label}</p>
         <div className={cn("text-2xl font-black text-zinc-950 tabular-nums", isRTL && "text-right")}>{count}</div>
       </div>
       <div className={cn(
          "p-2.5 rounded-xl shrink-0",
          highlighted ? "bg-amber-100/60 text-amber-600" : risk ? "bg-red-100/60 text-red-600" : "bg-[#F8F9FD] text-[#0080EC]"
       )}>
         {icon}
       </div>
    </div>
  );
}
