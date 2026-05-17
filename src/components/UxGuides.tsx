import React from 'react';
import { ArrowRight, Cpu, TickCircle, Data, Eye, MessageQuestion, Global, TaskSquare, Message, Mouse, Routing, ShieldTick, Magicpen } from 'iconsax-react';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import type { SystemStatus } from '../types';

export function WorkflowGuide({ compact = false }: { compact?: boolean }) {
  const { isRTL } = useI18n();
  const steps = isRTL
    ? [
        { title: 'בדיקת תמונה כוללת', body: 'התחל בלוח הבקרה ובדוק עומסים, חסמים ופרויקטים בסיכון.', icon: <Eye variant="Linear" color="currentColor" size={15} /> },
        { title: 'כניסה לפרויקט', body: 'פתח פרויקט בעייתי, בדוק משימות ובעלים, ועדכן סטטוס.', icon: <TaskSquare variant="Linear" color="currentColor" size={15} /> },
        { title: 'תקשורת חכמה', body: 'הפק סיכום פנימי או עדכון בטוח ללקוח בעזרת Gemini.', icon: <Message variant="Linear" color="currentColor" size={15} /> },
      ]
    : [
        { title: 'Scan portfolio', body: 'Start at the dashboard and identify load, blockers, and at-risk projects.', icon: <Eye variant="Linear" color="currentColor" size={15} /> },
        { title: 'Open project', body: 'Drill into a risky project, inspect owners, and update task state.', icon: <TaskSquare variant="Linear" color="currentColor" size={15} /> },
        { title: 'Communicate', body: 'Generate an internal brief or a customer-safe update with Gemini.', icon: <Message variant="Linear" color="currentColor" size={15} /> },
      ];

  return (
    <div className={cn(
      'rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm',
      compact ? 'p-4' : 'p-6'
    )}>
      <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse text-right')}>
        <Routing variant="Linear" color="currentColor" size={16} className="text-blue-600" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            {isRTL ? 'מפת עבודה' : 'Workflow Map'}
          </p>
          <p className="text-xs font-semibold text-zinc-500">
            {isRTL ? 'שלושה צעדים להתמצאות מהירה' : 'Three steps to stay oriented'}
          </p>
        </div>
      </div>

      <div className={cn('mt-5 grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3')}>
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse text-right')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                {step.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">0{index + 1}</p>
                <p className="text-sm font-bold text-zinc-900">{step.title}</p>
              </div>
            </div>
            {!compact && <p className={cn('mt-3 text-xs font-medium leading-relaxed text-zinc-500', isRTL && 'text-right')}>{step.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemStatusPanel({ status }: { status: SystemStatus | null }) {
  const { isRTL } = useI18n();
  const isGemini = status?.aiMode === 'gemini';
  const items = [
    {
      label: isRTL ? 'מנוע AI' : 'AI Engine',
      value: isGemini ? 'Gemini' : isRTL ? 'Fallback מקומי' : 'Local fallback',
      icon: <Cpu variant="Linear" color="currentColor" size={15} />,
      tone: isGemini ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      label: isRTL ? 'שמירה' : 'Storage',
      value: isRTL ? 'JSON מקומי' : 'Local JSON',
      icon: <Data variant="Linear" color="currentColor" size={15} />,
      tone: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      label: isRTL ? 'מצב דמו' : 'Demo State',
      value: isRTL ? 'נשמר אחרי ריסטארט' : 'Persists after restart',
      icon: <TickCircle variant="Linear" color="currentColor" size={15} />,
      tone: 'text-zinc-600 bg-zinc-50 border-zinc-100',
    },
  ];

  return (
    <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className={cn('mb-5 flex items-center justify-between', isRTL && 'flex-row-reverse text-right')}>
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-zinc-900">
            {isRTL ? 'מצב מערכת' : 'System Readiness'}
          </h3>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            {isRTL ? 'מה פעיל כרגע בדמו' : 'What is active in this demo'}
          </p>
        </div>
        <ShieldTick variant="Linear" color="currentColor" size={18} className="text-zinc-300" />
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className={cn('flex items-center justify-between rounded-2xl border p-3', item.tone, isRTL && 'flex-row-reverse')}>
            <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
              {item.icon}
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </div>
            <span className="text-xs font-bold">{item.value}</span>
          </div>
        ))}
      </div>

      <p className={cn('mt-4 text-[11px] font-medium leading-relaxed text-zinc-500', isRTL && 'text-right')}>
        {isRTL
          ? 'אם Gemini נכשל, המערכת חוזרת אוטומטית לסיכום מקומי כדי שהזרימה לא תישבר.'
          : 'If Gemini fails, the system automatically falls back to local summaries so the workflow never breaks.'}
      </p>
    </div>
  );
}

export function LanguageClarityCard({ onSwitch }: { onSwitch: () => void }) {
  const { language, isRTL } = useI18n();
  return (
    <button
      type="button"
      onClick={onSwitch}
      className="w-full rounded-2xl border border-zinc-100 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/40"
    >
      <div className={cn('flex items-center justify-between gap-3', isRTL && 'flex-row-reverse text-right')}>
        <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Global variant="Linear" color="currentColor" size={15} />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-900">{isRTL ? 'שפת ממשק' : 'Interface Language'}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {language === 'en' ? 'English active' : 'עברית פעילה'}
            </p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-black text-blue-600', isRTL && 'flex-row-reverse')}>
          {language === 'en' ? 'עברית' : 'English'}
          <ArrowRight variant="Linear" color="currentColor" size={13} className={isRTL ? 'rotate-180' : ''} />
        </div>
      </div>
    </button>
  );
}

export function GuidanceStrip({ items }: { items: Array<{ title: string; body: string }> }) {
  const { isRTL } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map(item => (
        <div key={item.title} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <div className={cn('mb-3 flex items-center gap-2', isRTL && 'flex-row-reverse text-right')}>
            <Mouse variant="Linear" color="currentColor" size={14} className="text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">{item.title}</h3>
          </div>
          <p className={cn('text-xs font-medium leading-relaxed text-zinc-500', isRTL && 'text-right')}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export function PageCoach({
  title,
  body,
  steps,
  actionLabel,
}: {
  title: string;
  body: string;
  steps: string[];
  actionLabel?: string;
}) {
  const { isRTL } = useI18n();
  return (
    <aside className={cn(
      'rounded-3xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/70 to-blue-50/80 p-6 shadow-sm',
      isRTL && 'text-right'
    )}>
      <div className={cn('flex items-start gap-3', isRTL && 'flex-row-reverse')}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/20">
          <MessageQuestion variant="Linear" color="currentColor" size={18} />
        </div>
        <div>
          <p className="ux-kicker text-teal-700">{isRTL ? 'עזרה במסך' : 'Screen Guide'}</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-zinc-950">{title}</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-zinc-600">{body}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <div key={step} className={cn('flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm', isRTL && 'flex-row-reverse')}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-[11px] font-black text-white">
              {index + 1}
            </span>
            <p className="text-xs font-bold leading-6 text-zinc-700">{step}</p>
          </div>
        ))}
      </div>

      {actionLabel && (
        <div className={cn('mt-5 flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-600 px-4 py-3 text-white shadow-lg shadow-teal-500/15', isRTL && 'flex-row-reverse')}>
          <Magicpen variant="Linear" color="currentColor" size={15} />
          <span className="text-xs font-black">{actionLabel}</span>
        </div>
      )}
    </aside>
  );
}

export function ConceptGlossary() {
  const { isRTL } = useI18n();
  const items = isRTL
    ? [
        { title: 'פרויקט', body: 'מסגרת עבודה מול לקוח עם יעד, מנהל, סטטוס ומשימות.', icon: <Routing variant="Linear" color="currentColor" size={16} /> },
        { title: 'משימה', body: 'יחידת ביצוע בתוך פרויקט. ממנה נגזרים מדדי עומס והתקדמות.', icon: <TaskSquare variant="Linear" color="currentColor" size={16} /> },
        { title: 'חסם', body: 'בעיה שמונעת התקדמות ודורשת בעלות ברורה או קלט מהלקוח.', icon: <ShieldTick variant="Linear" color="currentColor" size={16} /> },
        { title: 'עדכון לקוח', body: 'ניסוח בטוח שמסנן הערות פנימיות ופרטים טכניים גולמיים.', icon: <Message variant="Linear" color="currentColor" size={16} /> },
      ]
    : [
        { title: 'Project', body: 'A client-facing workstream with owner, status, deadline, and tasks.', icon: <Routing variant="Linear" color="currentColor" size={16} /> },
        { title: 'Task', body: 'A delivery unit inside a project. Metrics are derived from task state.', icon: <TaskSquare variant="Linear" color="currentColor" size={16} /> },
        { title: 'Blocker', body: 'A delivery issue that needs ownership, resolution, or customer input.', icon: <ShieldTick variant="Linear" color="currentColor" size={16} /> },
        { title: 'Customer update', body: 'A safe status message that excludes internal notes and raw blockers.', icon: <Message variant="Linear" color="currentColor" size={16} /> },
      ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map(item => (
        <article key={item.title} className={cn('rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-100 hover:shadow-md', isRTL && 'text-right')}>
          <div className={cn('mb-4 flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              {item.icon}
            </div>
            <h3 className="text-sm font-extrabold text-zinc-950">{item.title}</h3>
          </div>
          <p className="text-xs font-semibold leading-6 text-zinc-500">{item.body}</p>
        </article>
      ))}
    </section>
  );
}

export function SafeDataNotice({ compact = false }: { compact?: boolean }) {
  const { isRTL } = useI18n();
  return (
    <div className={cn(
      'rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 text-emerald-950',
      compact ? 'shadow-none' : 'shadow-sm',
      isRTL && 'text-right'
    )}>
      <div className={cn('flex items-start gap-3', isRTL && 'flex-row-reverse')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <ShieldTick variant="Linear" color="currentColor" size={16} />
        </div>
        <div>
          <p className="ux-kicker text-emerald-700">{isRTL ? 'בטיחות מידע' : 'Data Safety'}</p>
          <h3 className="mt-1 text-sm font-extrabold">
            {isRTL ? 'מה שנכתב כפנימי נשאר פנימי' : 'Internal notes stay internal'}
          </h3>
          <p className="mt-2 text-xs font-semibold leading-6 text-emerald-800/80">
            {isRTL
              ? 'תצוגת הלקוח וסיכומי הלקוח לא מציגים internalNotes ולא מפרטים חסמים טכניים גולמיים. הם מתרגמים אותם לשפה עסקית בטוחה.'
              : 'Customer view and customer updates exclude internalNotes and avoid raw technical blocker detail. They translate risk into business-safe wording.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AiUsageCard() {
  const { isRTL } = useI18n();
  return (
    <div className={cn('rounded-3xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm', isRTL && 'text-right')}>
      <div className={cn('flex items-start gap-3', isRTL && 'flex-row-reverse')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Magicpen variant="Linear" color="currentColor" size={16} />
        </div>
        <div>
          <p className="ux-kicker text-blue-700">{isRTL ? 'שימוש נכון ב־AI' : 'AI Usage'}</p>
          <h3 className="mt-1 text-sm font-extrabold text-zinc-950">
            {isRTL ? 'השתמש ב־AI אחרי שהמשימות מעודכנות' : 'Use AI after task state is current'}
          </h3>
          <p className="mt-2 text-xs font-semibold leading-6 text-zinc-600">
            {isRTL
              ? 'Gemini מסכם את מצב הפרויקט מתוך הנתונים הקיימים. ככל שהסטטוסים, החסמים והאחראים מדויקים יותר, כך הסיכום שימושי ובטוח יותר.'
              : 'Gemini summarizes the project from current data. The more accurate the statuses, blockers, and owners are, the safer and more useful the output is.'}
          </p>
        </div>
      </div>
    </div>
  );
}
