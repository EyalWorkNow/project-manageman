import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'he';

interface Translations {
  [key: string]: {
    [K in Language]: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.home': { en: 'Dashboard', he: 'לוח בקרה' },
  'nav.submission': { en: 'Submission', he: 'הגשה' },
  'nav.back': { en: 'Back', he: 'חזור' },
  'nav.menu_main': { en: 'Main Menu', he: 'תפריט ראשי' },
  'nav.add_project': { en: 'New Project', he: 'פרויקט חדש' },
  'nav.new_task': { en: 'New Task', he: 'משימה חדשה' },
  'nav.workspace': { en: 'Workspace', he: 'סביבת עבודה' },
  'nav.admin': { en: 'Lead PM', he: 'מנהל פרויקט' },
  'nav.ai_chat': { en: 'AI Assistant', he: 'עוזר AI' },
  'nav.ai_tools': { en: 'AI Tools', he: 'כלי AI' },

  // Dashboard
  'dash.title': { en: 'Dashboard', he: 'לוח בקרה' },
  'dash.subtitle': { en: 'Portfolio Overview', he: 'סקירת פורטפוליו' },
  'dash.search': { en: 'Search projects...', he: 'חיפוש פרויקטים...' },
  'dash.live_system': { en: 'Live', he: 'חי' },
  'dash.new_project': { en: 'New Project', he: 'פרויקט חדש' },
  'dash.active_projects': { en: 'Active Projects', he: 'פרויקטים פעילים' },
  'dash.pending_tasks': { en: 'Open Tasks', he: 'משימות פתוחות' },
  'dash.blocked_paths': { en: 'Blocked', he: 'חסומות' },
  'dash.reliability': { en: 'Completion Rate', he: 'אחוז השלמה' },
  'dash.portfolio': { en: 'Portfolio', he: 'פרויקטים' },
  'dash.all': { en: 'All', he: 'הכל' },
  'dash.active': { en: 'Active', he: 'פעילים' },
  'dash.daily_brief': { en: 'Daily Summary', he: 'סיכום יומי' },
  'dash.team_overview': { en: 'Team', he: 'צוות' },
  'dash.security_core': { en: 'Security', he: 'אבטחה' },
  'dash.system_health': { en: 'System Status', he: 'מצב מערכת' },
  'dash.systems_nominal': { en: 'All systems running.', he: 'כל המערכות פעילות.' },

  // Statuses
  'status.on_track': { en: 'On Track', he: 'במסלול' },
  'status.at_risk': { en: 'At Risk', he: 'בסיכון' },
  'status.blocked': { en: 'Blocked', he: 'חסום' },
  'status.completed': { en: 'Completed', he: 'הושלם' },
  'status.todo': { en: 'To Do', he: 'לביצוע' },
  'status.in_progress': { en: 'In Progress', he: 'בביצוע' },
  'status.waiting': { en: 'Waiting for Client', he: 'ממתין ללקוח' },
  'status.done': { en: 'Done', he: 'בוצע' },
  'status.waiting_for_client': { en: 'Waiting for Client', he: 'ממתין ללקוח' },

  // Priorities
  'priority.low': { en: 'Low', he: 'נמוכה' },
  'priority.medium': { en: 'Medium', he: 'בינונית' },
  'priority.high': { en: 'High', he: 'גבוהה' },
  'priority.critical': { en: 'Critical', he: 'קריטית' },

  // Labels
  'label.identity': { en: 'Task', he: 'משימה' },
  'label.status': { en: 'Status', he: 'סטטוס' },
  'label.owner': { en: 'Assignee', he: 'אחראי' },
  'label.priority': { en: 'Priority', he: 'עדיפות' },
  'label.id': { en: 'ID', he: 'מזהה' },
  'label.client': { en: 'Client', he: 'לקוח' },
  'label.on_schedule': { en: 'On Schedule', he: 'לפי לוח זמנים' },
  'label.internal': { en: 'INTERNAL', he: 'פנימי' },

  // Project Form
  'project.form.title_new': { en: 'New Project', he: 'פרויקט חדש' },
  'project.form.title_edit': { en: 'Edit Project', he: 'עריכת פרויקט' },
  'project.form.identity': { en: 'Project Name', he: 'שם הפרויקט' },
  'project.form.client': { en: 'Client', he: 'לקוח' },
  'project.form.steward': { en: 'Project Manager', he: 'מנהל פרויקט' },
  'project.form.scope': { en: 'Description', he: 'תיאור' },
  'project.form.status': { en: 'Status', he: 'סטטוס' },
  'project.form.target': { en: 'Deadline', he: 'תאריך יעד' },
  'project.form.submit_new': { en: 'Create Project', he: 'צור פרויקט' },
  'project.form.submit_edit': { en: 'Save Changes', he: 'שמור שינויים' },
  'project.form.subtitle': { en: 'Fill in the project details below.', he: 'מלא את פרטי הפרויקט למטה.' },

  // Task Form
  'task.form.title_new': { en: 'New Task', he: 'משימה חדשה' },
  'task.form.title_edit': { en: 'Edit Task', he: 'עריכת משימה' },
  'task.form.identity': { en: 'Task Title', he: 'כותרת המשימה' },
  'task.form.context': { en: 'Description', he: 'תיאור' },
  'task.form.internal_notes': { en: 'Internal Notes', he: 'הערות פנימיות' },
  'task.form.blocker': { en: 'Blocked', he: 'חסום' },
  'task.form.owner': { en: 'Assignee', he: 'אחראי' },
  'task.form.impact': { en: 'Priority', he: 'עדיפות' },
  'task.form.submit': { en: 'Save Task', he: 'שמור משימה' },
  'task.form.subtitle': { en: 'Add task details, assignee, and status.', he: 'הוסף פרטי משימה, אחראי וסטטוס.' },
  'task.form.blocker_desc': { en: 'What is blocking this task?', he: 'מה חוסם את המשימה?' },
  'task.form.parent': { en: 'Project', he: 'פרויקט' },
  'task.form.select_project': { en: 'Select project...', he: 'בחר פרויקט...' },
  'task.form.state': { en: 'Status', he: 'סטטוס' },
  'task.form.due': { en: 'Due Date', he: 'תאריך יעד' },

  // Project Details
  'project.details.external_view': { en: 'Customer View', he: 'תצוגת לקוח' },
  'project.details.new_task': { en: 'New Task', he: 'משימה חדשה' },
  'project.details.execution': { en: 'Progress', he: 'התקדמות' },
  'project.details.account_lead': { en: 'Project Manager', he: 'מנהל פרויקט' },
  'project.details.target': { en: 'Deadline', he: 'תאריך יעד' },
  'project.details.objectives': { en: 'Tasks', he: 'משימות' },
  'project.details.intelligence': { en: 'AI Summary', he: 'סיכום AI' },

  // AI
  'ai.synthesizing': { en: 'Generating...', he: 'מייצר...' },
  'ai.initialize': { en: 'Generate Summary', he: 'צור סיכום' },
  'ai.audit': { en: 'Review', he: 'סקירה' },
  'ai.dismiss': { en: 'Dismiss', he: 'סגור' },

  // Customer View
  'customer.portal_title': { en: 'Client Portal', he: 'פורטל לקוח' },
  'customer.dev_workspace': { en: 'Dev Workspace', he: 'סביבת פיתוח' },
  'customer.report_type': { en: 'Status Report', he: 'דוח סטטוס' },
  'customer.briefing_for': { en: 'Report for', he: 'דוח עבור' },
  'customer.completion_total': { en: 'Total Completion', he: 'סך השלמה' },
  'customer.in_sprint': { en: 'In Progress', he: 'בביצוע' },
  'customer.completed_obj': { en: 'Completed', he: 'הושלמו' },
  'customer.pending_feedback': { en: 'Awaiting Feedback', he: 'ממתין למשוב' },
  'customer.delivery_risks': { en: 'Delivery Risks', he: 'סיכוני אספקה' },
  'customer.target_date': { en: 'Expected Delivery', he: 'מועד מסירה' },
  'customer.download': { en: 'Download Report', he: 'הורד דוח' },

  // Submission
  'submission.artifact_label': { en: 'Documentation', he: 'תיעוד' },
  'submission.title': { en: 'PM Sync — Architecture Brief', he: 'PM Sync — סקירה ארכיטקטונית' },
  'submission.subtitle': { en: 'Technical documentation, rationale, and deployment history.', he: 'תיעוד טכני, רציונל ואבולוציית פריסה.' },

  // AI Chat
  'chat.title': { en: 'AI Assistant', he: 'עוזר AI' },
  'chat.placeholder': { en: 'Ask about your projects...', he: 'שאל על הפרויקטים...' },
  'chat.send': { en: 'Send', he: 'שלח' },
  'chat.clear': { en: 'Clear', he: 'נקה' },
  'chat.context': { en: 'Context', he: 'הקשר' },
  'chat.suggested': { en: 'Suggestions', he: 'הצעות' },
  'chat.powered': { en: 'Powered by Gemini', he: 'מופעל על ידי Gemini' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation['en'] || key;
  };

  const isRTL = language === 'he';

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div className={isRTL ? 'font-hebrew' : 'font-sans'}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}
