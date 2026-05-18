import React from 'react';
import { Book, PlayCircle, Code, TickCircle, ArrowRight, Shield, Box, EyeSlash, Profile2User, Message, Magicpen } from 'iconsax-react';
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
        <div className={cn('space-y-2', isRTL && 'text-right')}>
          <h1 className={cn('text-4xl font-bold text-zinc-900 tracking-tight font-display', isRTL && 'text-right')}>{copy.title}</h1>
          <p className={cn('text-lg font-medium text-zinc-500', isRTL && 'text-right')}>{copy.subtitle}</p>
        </div>
      </header>

      <section className="bg-white border border-zinc-100 rounded-3xl p-8 md:p-10 shadow-sm space-y-10">
        <SectionHeader icon={<Book variant="Linear" color="currentColor" className="text-zinc-900" size={24} />} title={copy.productBriefTitle} isRTL={isRTL} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <BriefBlock icon={<Box variant="Linear" color="currentColor" size={14} />} title={copy.problemTitle} body={copy.problemBody} isRTL={isRTL} />
          <BriefBlock icon={<Profile2User variant="Linear" color="currentColor" size={14} />} title={copy.userTitle} body={copy.userBody} isRTL={isRTL} />
          <BriefBlock icon={<Message variant="Linear" color="currentColor" size={14} />} title={copy.thesisTitle} body={copy.thesisBody} isRTL={isRTL} />
          <BriefBlock icon={<TickCircle variant="Linear" color="currentColor" size={14} />} title={copy.mvpTitle} body={copy.mvpBody} isRTL={isRTL} />
          <BriefBlock icon={<Shield variant="Linear" color="currentColor" size={14} />} title={copy.optimizationTitle} body={copy.optimizationBody} isRTL={isRTL} />
          <BriefBlock icon={<EyeSlash variant="Linear" color="currentColor" size={14} />} title={copy.outTitle} body={copy.outBody} isRTL={isRTL} />
          <BriefBlock icon={<ArrowRight variant="Linear" color="currentColor" size={14} />} title={copy.interactionTitle} body={copy.interactionBody} isRTL={isRTL} />
          <BriefBlock icon={<Shield variant="Linear" color="currentColor" size={14} />} title={copy.uxTitle} body={copy.uxBody} isRTL={isRTL} />
          <BriefBlock icon={<TickCircle variant="Linear" color="currentColor" size={14} />} title={copy.metricsTitle} body={copy.metricsBody} isRTL={isRTL} />
        </div>

        <div className="rounded-3xl bg-zinc-50 border border-zinc-100 p-8 space-y-4">
          <h3 className={cn('text-[10px] font-bold text-zinc-400 uppercase tracking-widest', isRTL && 'text-right')}>{copy.workflowTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {copy.workflow.map((step, index) => (
              <div key={step} className={cn('rounded-2xl bg-white border border-zinc-100 p-5', isRTL && 'text-right')}>
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
            <div key={item.step} className="flex gap-8 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all">
              <span className="text-zinc-300 font-mono font-bold text-xl opacity-60">{item.step}</span>
              <div className={isRTL ? 'text-right' : ''}>
                <h4 className="font-bold uppercase text-[10px] tracking-widest mb-1 text-zinc-400">{item.action}</h4>
                <p className={cn('text-zinc-400 text-sm font-medium leading-relaxed', isRTL && 'text-right')}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-zinc-100 rounded-3xl p-8 md:p-10 shadow-sm space-y-10">
        <SectionHeader icon={<Shield variant="Linear" color="currentColor" className="text-zinc-900" size={24} />} title={copy.customerTitle} isRTL={isRTL} />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {copy.decisions.map(item => (
            <DecisionCard key={item.title} title={item.title} body={item.body} isRTL={isRTL} />
          ))}
        </div>
      </section>

      <section className="bg-white border border-zinc-100 rounded-3xl p-8 md:p-10 shadow-sm space-y-10">
        <SectionHeader icon={<Magicpen variant="Linear" color="currentColor" className="text-zinc-900" size={24} />} title={copy.aiTitle} isRTL={isRTL} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {copy.aiIntegrations.map(item => (
            <div key={item.title} className={cn('rounded-3xl bg-zinc-50 border border-zinc-100 p-6 space-y-4', isRTL && 'text-right')}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Message variant="Linear" color="currentColor" size={14} className="text-zinc-900" />
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.title}</h3>
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg border', item.engineTone)}>
                  {item.engine}
                </span>
              </div>

              <div className="space-y-3">
                <AiRow label={copy.aiWhereLabel} value={item.where} isRTL={isRTL} />
                <AiRow label={copy.aiHowLabel} value={item.how} isRTL={isRTL} />
                <AiRow label={copy.aiWhyLabel} value={item.why} isRTL={isRTL} />
              </div>
            </div>
          ))}
        </div>

        <p className={cn('text-[11px] text-zinc-400 font-medium leading-relaxed', isRTL && 'text-right')}>
          {copy.aiNote}
        </p>
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
          className="group flex items-center gap-4 bg-zinc-950 text-white px-12 py-6 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
        >
          {copy.openApp} <ArrowRight variant="Linear" color="currentColor" size={18} className={cn('group-hover:translate-x-1 transition-transform', isRTL && 'rotate-180 group-hover:-translate-x-1')} />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, isRTL, dark }: { icon: React.ReactNode; title: string; isRTL: boolean; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3 relative z-10">
      {icon}
      <h2 className={cn('text-2xl font-bold tracking-tight font-display', dark ? 'text-white' : 'text-zinc-900')}>{title}</h2>
    </div>
  );
}

function BriefBlock({ icon, title, body, isRTL }: { icon: React.ReactNode; title: string; body: string; isRTL: boolean }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
        {icon} {title}
      </h3>
      <p className="text-sm text-zinc-500 leading-relaxed font-medium">{body}</p>
    </div>
  );
}

function DecisionCard({ title, body, isRTL }: { title: string; body: string; isRTL: boolean; key?: React.Key }) {
  return (
    <div className="rounded-3xl bg-zinc-50 border border-zinc-100 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Message variant="Linear" color="currentColor" size={14} className="text-zinc-900" />
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{title}</h3>
      </div>
      <p className="text-sm text-zinc-500 font-medium leading-relaxed">{body}</p>
    </div>
  );
}

function AiRow({ label, value, isRTL }: { label: string; value: string; isRTL: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        {label}
      </span>
      <p className="text-sm text-zinc-500 font-medium leading-relaxed">{value}</p>
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
      title: 'Product Brief: linnoproject',
      subtitle: 'מרכז שליטה קצר וממוקד לניהול פרויקטים, משימות וחסמים מול כמה לקוחות וצוותים במקביל.',
      productBriefTitle: 'Product Brief: linnoproject',
      problemTitle: 'בעיה',
      problemBody: 'מנהלי פרויקטים מבזבזים זמן על איסוף סטטוסים, הבנת חסמים וניסוח עדכונים. כשהמידע מפוזר, החלטות מתעכבות, חסמים מתגלים מאוחר, והלקוח מקבל תמונה חלקית או לא עקבית.',
      userTitle: 'משתמש יעד',
      userBody: 'המשתמש העיקרי הוא מנהל פרויקט, Delivery Lead או מנהל חשבון טכנולוגי בארגון שירותים. הוא עובד מול כמה צוותים ולקוחות, וצריך להבין במהירות מה מתקדם, מה תקוע ומה בטוח לתקשר החוצה.',
      thesisTitle: 'הגדרת המוצר',
      thesisBody: 'linnoproject הוא מרכז שליטה לניהול execution: מקום אחד שמרכז פורטפוליו, פרויקט, משימות, חסמים ותקשורת, כך שה־PM עובר מזיהוי מצב לפעולה ולעדכון לקוח באותה זרימה.',
      mvpTitle: 'MVP מוגדר',
      mvpBody: 'ה־MVP כולל דשבורד פורטפוליו, סביבת פרויקט ומשימות ב־Kanban, וסיכום/עדכון מבוססי AI. אלה מספיקים כדי לבדוק את לולאת הערך: זיהוי מצב, עדכון משימה, קבלת החלטה ותקשורת החוצה.',
      optimizationTitle: 'עבור מה בוצעה אופטימיזציה',
      optimizationBody: 'העדיפות הראשונה היא בהירות, אחריה מהירות התמצאות, ורק אחר כך גמישות. לכן linnoproject מדגיש סטטוסים, חסמים ופעולות המשך, ומפריד בין מרחב עבודה פנימי לתצוגת לקוח.',
      outTitle: 'מחוץ לתכולה',
      outBody: 'לא נבנו בשלב הראשון הרשאות מורכבות, אינטגרציות Slack/Jira/Email, אוטומציות מתקדמות, תכנון קיבולת מלא והעלאת קבצים אמיתית. כולן חשובות בהמשך, אך אינן חיוניות לאימות ערך הליבה.',
      interactionTitle: 'אינטראקציה עם המוצר',
      interactionBody: 'המשתמש נכנס לדשבורד, מזהה פרויקט בסיכון או משימה חסומה, נכנס לפרויקט, מעדכן סטטוס/אחראי/חסם, ומפיק סיכום פנימי או עדכון לקוח. הצלחה היא להבין מצב בתוך דקות ולצאת עם פעולה או מסר מוכן.',
      uxTitle: 'עקרונות UX',
      uxBody: 'בהירות לפני עומק, מינימום חיכוך, הפרדה בין פנימי לחיצוני, משוב מיידי ותחושת שליטה. כל מסך צריך להראות מה דורש תשומת לב ומה הצעד הבא.',
      metricsTitle: 'מדדי הצלחה ראשוניים',
      metricsBody: 'זמן מזיהוי סיכון עד פעולה ראשונה; שיעור משימות עם אחראי, דדליין וסטטוס תקין; שימוש בסיכום פנימי או עדכון לקוח; ירידה בחסמים ללא תיאור; שביעות רצון מנהלי פרויקטים.',
      workflowTitle: 'Workflow מרכזי',
      workflow: ['סריקת בריאות הפורטפוליו', 'כניסה לפרויקט בסיכון', 'עדכון משימות, בעלים וחסמים', 'יצירת סיכום פנימי למנהל הפרויקט', 'שיתוף עדכון בטוח ללקוח'],
      demoTitle: '2. מסלול הדגמה',
      demo: [
        { step: '01', action: 'לוח בקרה', detail: 'הדשבורד מציג פרויקטים פעילים, משימות פתוחות, חסמים ואמינות השלמה.' },
        { step: '02', action: 'חקירת פרויקט', detail: 'בפרויקט רואים התקדמות, בעלים, תאריכי יעד, חסמים ופעולה מומלצת.' },
        { step: '03', action: 'ניהול משימות', detail: 'יוצרים או עורכים משימה, מגדירים סטטוס ועדיפות קנוניים, ומסמנים חסם עם סיבה.' },
        { step: '04', action: 'תקשורת AI', detail: 'מפיקים סיכום פנימי או עדכון לקוח. Gemini פעיל כשיש מפתח, fallback שומר על יציבות.' },
        { step: '05', action: 'פורטל לקוח', detail: 'תצוגת הלקוח מציגה התקדמות וסיכונים בלי הערות פנימיות או פרטי חסם טכניים.' },
      ],
      customerTitle: '3. לקוח, UX ופשרות',
      decisions: [
        { title: 'שקיפות ללקוח', body: 'הלקוח רואה סטטוס התקדמות, עבודה פעילה, נקודות שממתינות ממנו, סיכוני מסירה ומועד יעד, בלי להיכנס לפעולות תפעול פנימיות.' },
        { title: 'הבנת סיכונים', body: 'במקום להציג ללקוח חסם טכני גולמי, המערכת מתרגמת אותו למשמעות עסקית: מה הושפע, מה הבא בתור, והאם נדרש ממנו אישור או משוב.' },
        { title: 'לימוד מהיר', body: 'משתמש חדש מבין את המערכת דרך flow ברור: מתחילים בדשבורד, נכנסים לפרויקט חריג, מעדכנים משימות, ואז מייצרים סיכום או עדכון לקוח. אין צורך בקונפיגורציה לפני הערך הראשון.' },
        { title: 'הפרדת מצבים', body: 'מרחב ה־PM מיועד לשליטה ולחקירה. פורטל הלקוח הוא מצב נפרד, נקי ומסונן, כדי שלא תהיה דליפה של internal notes או פרטי חסם שלא אמורים לצאת החוצה.' },
        { title: 'פשרות', body: 'ויתרתי בשלב הזה על אוטומציות, הרשאות מורכבות ו־custom workflows כדי לשמור על מוצר ברור, דמו אמין וזרימת שימוש קלה להסבר בזמן קצר.' },
      ],
      aiTitle: '4. איפה שולב AI, איך ולמה',
      aiWhereLabel: 'איפה',
      aiHowLabel: 'איך',
      aiWhyLabel: 'למה',
      aiIntegrations: [
        {
          title: 'תדרוך יומי פורטפוליו',
          engine: 'Gemini + fallback',
          engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          where: 'בדשבורד הראשי תחת “סיכום יומי”.',
          how: 'קריאה ל־`/api/ai/daily-brief` שמייצרת תדרוך קצר על בסיס נתוני הפרויקטים/משימות. אם Gemini לא זמין, מתקבל טקסט fallback כדי שהמסך לא יישבר.',
          why: 'כדי לתת ל־PM “תמונה ראשונה” מהירה: מה חריג, מה בסיכון, ומה דורש תשומת לב בלי לעבור ידנית על כל פרויקט.',
        },
        {
          title: 'סיכום פרויקט פנימי (PM)',
          engine: 'Gemini + fallback',
          engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          where: 'בתוך פרויקט, בטאב ה־AI ובפעולות הסיכום.',
          how: 'קריאה ל־`/api/ai/summarize` עם פרויקט + משימות. השרת מנרמל תשובה ומחזיר fallback דטרמיניסטי במקרה כשל.',
          why: 'כדי להאיץ חקירה של מצב הפרויקט: להבליט חסמים, עדיפויות, נקודות החלטה ו־next actions מתוך הנתונים שכבר נמצאים במערכת.',
        },
        {
          title: 'עדכון לקוח “בטוח”',
          engine: 'Gemini + fallback',
          engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          where: 'בפרויקט ובפורטל הלקוח (תצוגת stakeholder).',
          how: 'קריאה ל־`/api/ai/customer-update` שמייצרת ניסוח עסקי קצר ומסונן. Internal notes ופרטי חסם גולמיים לא אמורים להופיע בתוצר ללקוח.',
          why: 'כדי לתקשר סטטוס וסיכונים בצורה ברורה ללקוח, בלי דליפת מידע פנימי ובלי להעמיס בפרטים טכניים שלא משרתים בעל עניין.',
        },
        {
          title: 'צ׳אט AI פרויקטואלי',
          engine: 'Gemini + fallback',
          engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          where: 'בטאב ה־AI בעמוד הפרויקט.',
          how: 'שימוש ב־`/api/ai/chat` (multi‑turn) או `chat/stream` (SSE) עם היסטוריה ו־projectId. יש מענה fallback כש־AI לא זמין כדי לשמור על זרימה שמישה.',
          why: 'כדי לאפשר שאלות “בגובה העיניים” על מצב הפרויקט, החלטות נדרשות, סיכונים ודיון, בלי לצאת מהקונטקסט של העבודה.',
        },
        {
          title: 'AI Draft בתוך משימה',
          engine: 'Gemini + fallback',
          engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          where: 'בחלון פרטי משימה (Task Detail).',
          how: 'קריאה ל־`/api/ai/draft` עם prompt + הקשר שנבנה מהמשימה (סטטוס, דדליין, dependencies, פעילות אחרונה ותגובות).',
          why: 'כדי לנסח מהר טקסטים שימושיים: עדכון, הודעה, בקשת מידע או ניסוח פעולה, מתוך ההקשר האמיתי של המשימה ולא טקסט כללי.',
        },
      ],
      aiNote: 'בכל נקודת AI המוצר נשאר שמיש גם בלי מפתח Gemini: השרת מחזיר fallback מקומי כדי להבטיח שהדמו וה־workflow לא תלויים בשירות חיצוני.',
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
    title: 'Product Brief: linnoproject',
    subtitle: 'A focused command center for managing projects, tasks, blockers, and stakeholder updates across multiple client accounts.',
    productBriefTitle: 'Product Brief: linnoproject',
    problemTitle: 'Problem',
    problemBody: 'Project managers lose time collecting status, understanding blockers, and writing client updates. When information is scattered, decisions are delayed, risks surface late, and clients receive partial or inconsistent visibility.',
    userTitle: 'Target User',
    userBody: 'The primary user is a project manager, delivery lead, or technical account owner managing several teams and clients. They need to know what is moving, what is stuck, and what can safely be communicated outward.',
    thesisTitle: 'Product Definition',
    thesisBody: 'linnoproject is an execution command center that connects portfolio visibility, project investigation, task operations, blockers, and stakeholder communication in one flow.',
    mvpTitle: 'Defined MVP',
    mvpBody: 'The MVP includes a portfolio dashboard, project/task Kanban workspace, and AI-assisted internal summaries plus customer-safe updates. This validates the core loop: identify status, update work, decide, and communicate.',
    optimizationTitle: 'Optimization Focus',
    optimizationBody: 'The product optimizes first for clarity, then speed, then flexibility. Status, blockers, and next actions are foregrounded, while internal PM work and customer-facing visibility remain separate.',
    outTitle: 'Out of Scope',
    outBody: 'The first release excludes complex RBAC, Slack/Jira/Email integrations, advanced automations, full capacity planning, and real file hosting. These add complexity before the core product value is validated.',
    interactionTitle: 'Product Interaction',
    interactionBody: 'The user enters the dashboard, identifies a risky project or blocked task, opens the project, updates ownership/status/blockers, then generates an internal brief or customer update. Success means reaching clarity and action within minutes.',
    uxTitle: 'UX Principles',
    uxBody: 'Clarity before depth, minimal friction, separation of internal and external information, immediate feedback, and a strong sense of control. Every screen should show what needs attention and what happens next.',
    metricsTitle: 'Initial Success Metrics',
    metricsBody: 'Time from risk discovery to first action; share of tasks with owner, due date, and valid status; usage of internal brief/customer update; reduction of blockers without descriptions; PM satisfaction with clarity and speed.',
    workflowTitle: 'Primary Workflow',
    workflow: ['Scan portfolio health', 'Open a risky project', 'Update tasks, owners, and blockers', 'Generate an internal PM summary', 'Share a customer-safe update'],
    demoTitle: '2. Demo Walkthrough',
    demo: [
      { step: '01', action: 'Portfolio Command Center', detail: 'Use the dashboard to see active projects, open tasks, blocked work, and completion reliability.' },
      { step: '02', action: 'Project Investigation', detail: 'Open a project to review progress, owners, due dates, blocker ledger, and the PM next action.' },
      { step: '03', action: 'Task Operations', detail: 'Create or edit a task, set canonical status and priority values, and mark blockers with an explicit reason.' },
      { step: '04', action: 'AI-Assisted Communication', detail: 'Generate an internal summary or customer update. Gemini is used when available; local fallback keeps the demo working.' },
      { step: '05', action: 'Stakeholder Portal', detail: 'Open the customer view to see progress and risks without internal notes or raw technical blocker details.' },
    ],
    customerTitle: '3. Customer Perspective, UX, and Trade-offs',
    decisions: [
      { title: 'Customer Transparency', body: 'The customer sees progress, active work, pending inputs, delivery risks, and target date in a read-only view that is easy to scan.' },
      { title: 'Risk Framing', body: 'Instead of exposing raw technical blocker detail, the product translates issues into business impact, next step, and whether customer input is required.' },
      { title: 'Fast Learnability', body: 'A new user learns the product through a clear path: start on the dashboard, open an exception project, update tasks, then generate an internal brief or customer update. No setup is needed before the first value moment.' },
      { title: 'Mode Separation', body: 'The PM workspace is built for control and investigation. The stakeholder portal is a separate, filtered mode so internal notes and raw blocker details never leak outward.' },
      { title: 'Trade-off', body: 'The MVP prioritizes clarity and demo reliability over deep configuration, complex permissions, automations, or custom workflows.' },
    ],
    aiTitle: '4. Where AI Is Used (How and Why)',
    aiWhereLabel: 'Where',
    aiHowLabel: 'How',
    aiWhyLabel: 'Why',
    aiIntegrations: [
      {
        title: 'Daily Portfolio Brief',
        engine: 'Gemini + fallback',
        engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        where: 'On the main dashboard under “Daily Summary”.',
        how: 'Calls `GET /api/ai/daily-brief` to produce a short morning-style brief from the current projects/tasks state. If Gemini is unavailable, a local fallback string is returned so the UI stays functional.',
        why: 'To give the PM a fast first scan of what is at risk and what needs attention without manually opening every project.',
      },
      {
        title: 'Internal Project Summary',
        engine: 'Gemini + fallback',
        engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        where: 'Inside a project, in the AI tab and summary actions.',
        how: 'Calls `POST /api/ai/summarize` with `project + tasks`. The server normalizes the response and returns a deterministic fallback when the AI call fails.',
        why: 'To accelerate project investigation by highlighting blockers, priorities, decisions needed, and next actions from existing structured data.',
      },
      {
        title: 'Customer-Safe Status Update',
        engine: 'Gemini + fallback',
        engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        where: 'On the project page and in the stakeholder portal view.',
        how: 'Calls `POST /api/ai/customer-update` to generate concise business wording. Internal notes and raw blocker detail are intentionally kept out of the customer-facing output.',
        why: 'To communicate progress and risk clearly to stakeholders without leaking internal notes or overwhelming them with technical details.',
      },
      {
        title: 'Project-Aware AI Chat',
        engine: 'Gemini + fallback',
        engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        where: 'In the project page AI tab.',
        how: 'Uses `POST /api/ai/chat` (multi-turn) or `POST /api/ai/chat/stream` (SSE) with message history + `projectId`. A local fallback response is returned when AI is unavailable so the workflow remains usable.',
        why: 'To let users ask questions about current state, decisions, risks, and planning without leaving the context of the project.',
      },
      {
        title: 'Task Context Drafting',
        engine: 'Gemini + fallback',
        engineTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        where: 'Inside the task detail slide-in modal.',
        how: 'Calls `POST /api/ai/draft` with the user prompt plus computed context (task fields, dependencies, recent activity, and recent comments).',
        why: 'To speed up writing useful task-level content (updates, requests, follow-ups) grounded in the actual task context rather than generic text.',
      },
    ],
    aiNote: 'Across all AI surfaces, the app remains end-to-end usable without a Gemini key: the backend returns local fallbacks so demos and critical workflows do not depend on external services.',
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
