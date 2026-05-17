import React from 'react';
import { Book, PlayCircle, Code, TickCircle, ArrowRight, Shield, Box, EyeSlash, Profile2User, Message } from 'iconsax-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';

export default function Submission() {
  const navigate = useNavigate();
  const { t, isRTL } = useI18n();
  const copy = getSubmissionCopy(isRTL);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-16 pb-24">
      <header className={cn('space-y-6', isRTL && 'text-right')}>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-zinc-900 text-[10px] font-bold uppercase tracking-widest">
          {t('submission.artifact_label') || copy.artifact}
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight font-display">{copy.title}</h1>
          <p className="text-lg font-medium text-zinc-500">{copy.subtitle}</p>
        </div>
      </header>

      <section className="bg-white border border-zinc-100 rounded-3xl p-8 md:p-10 shadow-sm space-y-10">
        <SectionHeader icon={<Book variant="Linear" color="currentColor" className="text-zinc-900" size={24} />} title={copy.productBriefTitle} isRTL={isRTL} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <BriefBlock icon={<Box variant="Linear" color="currentColor" size={14} />} title={copy.problemTitle} body={copy.problemBody} isRTL={isRTL} />
          <BriefBlock icon={<Profile2User variant="Linear" color="currentColor" size={14} />} title={copy.userTitle} body={copy.userBody} isRTL={isRTL} />
          <BriefBlock icon={<TickCircle variant="Linear" color="currentColor" size={14} />} title={copy.mvpTitle} body={copy.mvpBody} isRTL={isRTL} />
          <BriefBlock icon={<EyeSlash variant="Linear" color="currentColor" size={14} />} title={copy.outTitle} body={copy.outBody} isRTL={isRTL} />
        </div>

        <div className="rounded-3xl bg-zinc-50 border border-zinc-100 p-8 space-y-4">
          <h3 className={cn('text-[10px] font-bold text-zinc-400 uppercase tracking-widest', isRTL && 'text-right')}>{copy.workflowTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {copy.workflow.map((step, index) => (
              <div key={step} className="rounded-2xl bg-white border border-zinc-100 p-5">
                <p className="text-zinc-900 font-mono font-bold text-sm">0{index + 1}</p>
                <p className={cn('text-sm font-bold text-zinc-900 mt-2 leading-tight', isRTL && 'text-right')}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 rounded-3xl p-8 md:p-10 text-white space-y-10 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800/40 blur-[100px] -mr-32 -mt-32" />
        <SectionHeader icon={<PlayCircle variant="Linear" color="currentColor" className="text-zinc-300" size={24} />} title={copy.demoTitle} isRTL={isRTL} dark />

        <div className="space-y-4 relative z-10">
          {copy.demo.map(item => (
            <div key={item.step} className={cn('flex gap-8 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all', isRTL && 'flex-row-reverse text-right')}>
              <span className="text-zinc-300 font-mono font-bold text-xl opacity-60">{item.step}</span>
              <div>
                <h4 className="font-bold uppercase text-[10px] tracking-widest mb-1 text-zinc-400">{item.action}</h4>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-zinc-100 rounded-3xl p-8 md:p-10 shadow-sm space-y-10">
        <SectionHeader icon={<Shield variant="Linear" color="currentColor" className="text-zinc-900" size={24} />} title={copy.customerTitle} isRTL={isRTL} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {copy.decisions.map(item => (
            <DecisionCard key={item.title} title={item.title} body={item.body} isRTL={isRTL} />
          ))}
        </div>
      </section>

      <section className="bg-white border border-zinc-100 rounded-3xl p-8 md:p-10 shadow-sm space-y-10">
        <SectionHeader icon={<Code variant="Linear" color="currentColor" className="text-zinc-900" size={24} />} title={copy.promptTitle} isRTL={isRTL} />

        <div className="space-y-10">
          {copy.prompts.map(item => (
            <PromptItem key={item.title} {...item} isRTL={isRTL} />
          ))}
        </div>
      </section>

      <div className="flex justify-center pt-12">
        <button
          onClick={() => navigate('/')}
          className={cn('group flex items-center gap-4 bg-zinc-950 text-white px-12 py-6 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-xl hover:bg-zinc-800 transition-all active:scale-95', isRTL && 'flex-row-reverse')}
        >
          {copy.openApp} <ArrowRight variant="Linear" color="currentColor" size={18} className={cn('group-hover:translate-x-1 transition-transform', isRTL && 'rotate-180 group-hover:-translate-x-1')} />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, isRTL, dark }: { icon: React.ReactNode; title: string; isRTL: boolean; dark?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 relative z-10', isRTL && 'flex-row-reverse text-right')}>
      {icon}
      <h2 className={cn('text-2xl font-bold tracking-tight font-display', dark ? 'text-white' : 'text-zinc-900')}>{title}</h2>
    </div>
  );
}

function BriefBlock({ icon, title, body, isRTL }: { icon: React.ReactNode; title: string; body: string; isRTL: boolean }) {
  return (
    <div className={cn('space-y-3', isRTL && 'text-right')}>
      <h3 className={cn('text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2', isRTL && 'flex-row-reverse')}>
        {icon} {title}
      </h3>
      <p className="text-sm text-zinc-500 leading-relaxed font-medium">{body}</p>
    </div>
  );
}

function DecisionCard({ title, body, isRTL }: { title: string; body: string; isRTL: boolean; key?: React.Key }) {
  return (
    <div className="rounded-3xl bg-zinc-50 border border-zinc-100 p-6">
      <div className={cn('flex items-center gap-2 mb-3', isRTL && 'flex-row-reverse text-right')}>
        <Message variant="Linear" color="currentColor" size={14} className="text-zinc-900" />
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{title}</h3>
      </div>
      <p className={cn('text-sm text-zinc-500 font-medium leading-relaxed', isRTL && 'text-right')}>{body}</p>
    </div>
  );
}

function PromptItem({ title, prompt, worked, didnt, isRTL }: { title: string; prompt: string; worked: string; didnt: string; isRTL: boolean; key?: React.Key }) {
  return (
    <div className={cn('space-y-5 border-l-2 border-zinc-100 pl-8 relative', isRTL && 'border-l-0 border-r-2 pl-0 pr-8 text-right')}>
      <div className={cn('absolute w-2 h-2 bg-zinc-900 rounded-full -left-[5px] top-1', isRTL && 'left-auto -right-[5px]')} />
      <h4 className="font-bold text-zinc-900 text-sm tracking-tight">{title}</h4>
      <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-2xl">
        <code className="text-zinc-900 text-xs font-semibold leading-relaxed">"{prompt}"</code>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
        <div>
          <span className="font-bold uppercase text-[9px] text-zinc-500 tracking-widest block mb-1">{isRTL ? 'מה עבד' : 'What worked'}</span>
          <p className="text-zinc-500 font-medium leading-relaxed">{worked}</p>
        </div>
        <div>
          <span className="font-bold uppercase text-[9px] text-zinc-400 tracking-widest block mb-1">{isRTL ? 'מה לא עבד' : 'What did not'}</span>
          <p className="text-zinc-500 font-medium leading-relaxed">{didnt}</p>
        </div>
      </div>
    </div>
  );
}

function getSubmissionCopy(isRTL: boolean) {
  if (isRTL) {
    return {
      artifact: 'תיעוד הגשה',
      title: 'SyncPro Product Brief',
      subtitle: 'MVP עובד לניהול פרויקטים ומשימות עם סיוע AI עבור כמה לקוחות ארגוניים במקביל.',
      productBriefTitle: '1. תקציר מוצר',
      problemTitle: 'בעיה',
      problemBody: 'מנהלי פרויקט ב־Linnovate צריכים מקום אחד אמין להבנת מצב פרויקטים, חסמים, עדיפויות וצרכי תקשורת מול לקוחות.',
      userTitle: 'משתמש יעד',
      userBody: 'המשתמש המרכזי הוא מנהל פרויקט טכנולוגי או מוביל מסירה. המשתמש המשני הוא לקוח לא טכני שצריך תמונת סטטוס ברורה ובטוחה.',
      mvpTitle: 'MVP מוגדר',
      mvpBody: 'SyncPro תומך ביצירת פרויקטים, ניהול משימות, סימון חסמים, נראות פורטפוליו, סיכומי AI פנימיים, עדכוני לקוח מסוננים ופורטל לקוח.',
      outTitle: 'מחוץ לתכולה',
      outBody: 'ה־MVP לא כולל הרשאות, אינטגרציות, התראות, העלאת קבצים, תכנון קיבולת מורכב או בסיס נתונים production.',
      workflowTitle: 'Workflow מרכזי',
      workflow: ['סקירת בריאות הפורטפוליו', 'פתיחת פרויקט בסיכון', 'עדכון משימות וחסמים', 'הפקת סטטוס פנימי או בטוח ללקוח'],
      demoTitle: '2. מסלול הדגמה',
      demo: [
        { step: '01', action: 'לוח בקרה', detail: 'הדשבורד מציג פרויקטים פעילים, משימות פתוחות, חסמים ואמינות השלמה.' },
        { step: '02', action: 'חקירת פרויקט', detail: 'בפרויקט רואים התקדמות, בעלים, תאריכי יעד, חסמים ופעולה מומלצת.' },
        { step: '03', action: 'ניהול משימות', detail: 'יוצרים או עורכים משימה, מגדירים סטטוס ועדיפות קנוניים, ומסמנים חסם עם סיבה.' },
        { step: '04', action: 'תקשורת AI', detail: 'מפיקים סיכום פנימי או עדכון לקוח. Gemini פעיל כשיש מפתח, fallback שומר על יציבות.' },
        { step: '05', action: 'פורטל לקוח', detail: 'תצוגת הלקוח מציגה התקדמות וסיכונים בלי הערות פנימיות או פרטי חסם טכניים.' },
      ],
      customerTitle: '3. פרספקטיבת לקוח והחלטות UX',
      decisions: [
        { title: 'נראות', body: 'לקוחות רואים התקדמות, עבודה פעילה, משוב ממתין, סיכוני מסירה ותאריך יעד בפורטל קריא בלבד.' },
        { title: 'בטיחות מידע', body: 'הערות פנימיות ופרטי חסם טכניים נשארים במרחב ה־PM. תצוגת הלקוח משתמשת בשפה עסקית קצרה.' },
        { title: 'פשרה', body: 'ה־MVP מתעדף בהירות ואמינות דמו על פני קונפיגורציה עמוקה, הרשאות enterprise או workflow מותאם אישית.' },
      ],
      promptTitle: '4. יומן Promptים',
      prompts: [
        { title: 'תכולת MVP', prompt: 'Define the smallest working product for PMs managing multiple client projects, with tasks, blockers, status visibility, and customer communication.', worked: 'הוגדרה תכולה ממוקדת: דשבורד, פרויקטים, משימות, חסמים, סיכומי AI ותצוגת לקוח.', didnt: 'רעיונות ראשוניים נטו להוסיף יותר מדי יכולות enterprise, ולכן הרשאות ואינטגרציות הוצאו במפורש.' },
        { title: 'תקשורת בטוחה ללקוח', prompt: 'Generate customer-facing status updates from project data without internal notes or raw technical blocker details.', worked: 'נוצרה הפרדה ברורה בין מודיעין פנימי למנהל הפרויקט לבין שפה חיצונית ללקוח.', didnt: 'הנוסח הראשון היה תפעולי מדי, ולכן ה־fallback הסופי משתמש בשפה עסקית קצרה.' },
        { title: 'אמינות דמו', prompt: 'Make the app work end-to-end even without external AI credentials, while still using Gemini when available.', worked: 'השרת כולל fallback דטרמיניסטי, כך שהבודק יכול להריץ את כל הזרימה גם בלי תלות חיצונית.', didnt: 'תלות מלאה ב־Gemini הייתה יוצרת חסם דמו מיותר אם סודות חסרים או אם הקריאה נכשלת.' },
        { title: 'שמירת נתונים', prompt: 'Persist demo projects and tasks locally without adding a production database or new dependency.', worked: 'קובץ JSON מקומי שומר פרויקטים ומשימות אחרי ריסטארט בלי להוסיף DB.', didnt: 'DB מלא מתאים יותר לייצור, אבל לא נחוץ לתכולת ההגשה.' },
      ],
      openApp: 'פתח את האפליקציה',
    };
  }

  return {
    artifact: 'Artifact Documentation',
    title: 'SyncPro Product Brief',
    subtitle: 'A working MVP for AI-assisted project and task management across multiple enterprise clients.',
    productBriefTitle: '1. Product Brief',
    problemTitle: 'Problem',
    problemBody: 'Project managers at Linnovate need one reliable place to understand project health, blockers, priorities, and customer communication needs across several enterprise accounts.',
    userTitle: 'Box User',
    userBody: 'The primary user is a technical project manager or delivery lead. The secondary user is a non-technical customer stakeholder who needs a safe, clear status view.',
    mvpTitle: 'Defined MVP',
    mvpBody: 'SyncPro supports project creation, task tracking, blocker marking, portfolio-level visibility, internal AI summaries, customer-safe updates, and a stakeholder portal.',
    outTitle: 'Out of Scope',
    outBody: 'The MVP intentionally excludes auth, permissions, billing, integrations, notifications, file uploads, complex capacity planning, and a production database.',
    workflowTitle: 'Primary Workflow',
    workflow: ['Review portfolio health', 'Open a risky project', 'Update tasks and blockers', 'Generate internal or customer-safe status'],
    demoTitle: '2. Demo Walkthrough',
    demo: [
      { step: '01', action: 'Portfolio Command Center', detail: 'Use the dashboard to see active projects, open tasks, blocked work, and completion reliability.' },
      { step: '02', action: 'Project Investigation', detail: 'Open a project to review progress, owners, due dates, blocker ledger, and the PM next action.' },
      { step: '03', action: 'Task Operations', detail: 'Create or edit a task, set canonical status and priority values, and mark blockers with an explicit reason.' },
      { step: '04', action: 'AI-Assisted Communication', detail: 'Generate an internal summary or customer update. Gemini is used when available; local fallback keeps the demo working.' },
      { step: '05', action: 'Stakeholder Portal', detail: 'Open the customer view to see progress and risks without internal notes or raw technical blocker details.' },
    ],
    customerTitle: '3. Customer Perspective and UX Decisions',
    decisions: [
      { title: 'Visibility', body: 'Customers see progress, active work, pending feedback, delivery risks, and target date in a read-only portal.' },
      { title: 'Safety', body: 'Internal notes and raw blocker details stay inside the PM workspace. The customer view uses concise business language.' },
      { title: 'Trade-off', body: 'The MVP optimizes for clarity and demo reliability over deep configuration, custom workflows, or enterprise permissions.' },
    ],
    promptTitle: '4. Prompt Log',
    prompts: [
      { title: 'MVP Scope', prompt: 'Define the smallest working product for PMs managing multiple client projects, with tasks, blockers, status visibility, and customer communication.', worked: 'It produced a focused scope: dashboard, projects, tasks, blockers, AI summaries, and customer view.', didnt: 'Initial ideas drifted toward too many enterprise features, so auth and integrations were explicitly excluded.' },
      { title: 'Customer-Safe Communication', prompt: 'Generate customer-facing status updates from project data without internal notes or raw technical blocker details.', worked: 'It clarified the split between internal PM intelligence and external stakeholder language.', didnt: 'The first version still sounded too operational, so the final fallback uses concise business wording.' },
      { title: 'Demo Reliability', prompt: 'Make the app work end-to-end even without external AI credentials, while still using Gemini when available.', worked: 'The backend now has deterministic fallback summaries and updates, so the reviewer can test the full flow locally.', didnt: 'Pure Gemini dependency would have created an avoidable demo blocker when secrets are missing.' },
      { title: 'Data Persistence', prompt: 'Persist demo projects and tasks locally without adding a production database or new dependency.', worked: 'A small JSON store keeps created projects and tasks after restart while preserving MVP simplicity.', didnt: 'A full database would be more production-ready, but it is unnecessary for the assignment scope.' },
    ],
    openApp: 'Open Working Application',
  };
}
