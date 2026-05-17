import React, { useState, useRef, useEffect } from 'react';
import { Messages2, Send2, Magicpen, Cpu, User, Refresh2, ArrowDown2, Data, Folder2, ClipboardText, Warning2, Flash, InfoCircle, ArrowLeft2 } from 'iconsax-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'gemini' | 'local-fallback';
}

interface SuggestionGroup {
  label: string;
  items: string[];
}

export default function AiChat() {
  const { isRTL, language } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<{ projects: number; tasks: number; blocked: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions: SuggestionGroup[] = isRTL
    ? [
        {
          label: 'סטטוס פרויקטים',
          items: [
            'אילו פרויקטים בסיכון?',
            'מה המשימות הקריטיות שממתינות?',
            'מה ההתקדמות הכוללת?',
          ],
        },
        {
          label: 'צוות ומשימות',
          items: [
            'מי עובד על מה עכשיו?',
            'אילו משימות חסומות?',
            'מה נמסר השבוע?',
          ],
        },
        {
          label: 'המלצות',
          items: [
            'מה כדאי לטפל ראשון?',
            'האם יש פרויקטים שיפגרו בדדליין?',
            'אילו לקוחות דורשים עדכון?',
          ],
        },
      ]
    : [
        {
          label: 'Project Status',
          items: [
            'Which projects are at risk?',
            'What critical tasks are pending?',
            "What's the overall delivery progress?",
          ],
        },
        {
          label: 'Team & Tasks',
          items: [
            "Who's working on what right now?",
            'Which tasks are blocked?',
            'What was delivered this week?',
          ],
        },
        {
          label: 'Recommendations',
          items: [
            'What should I prioritize first?',
            'Are any projects likely to miss their deadline?',
            'Which clients need an update?',
          ],
        },
      ];

  useEffect(() => {
    fetch('/api/system/stats')
      .then(r => r.json())
      .then(d => setSystemStats(d))
      .catch(() => {
        fetch('/api/projects')
          .then(r => r.json())
          .then(projects => {
            fetch('/api/tasks')
              .then(r => r.json())
              .then(tasks => {
                setSystemStats({
                  projects: projects.length,
                  tasks: tasks.length,
                  blocked: tasks.filter((t: any) => t.isBlocked).length,
                });
              });
          })
          .catch(() => setSystemStats({ projects: 0, tasks: 0, blocked: 0 }));
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language }),
      });

      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        source: data.source,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: isRTL
          ? 'מצטער, לא הצלחתי לקבל תשובה כרגע. בדוק שהשרת פועל ונסה שוב.'
          : 'Sorry, I could not get a response right now. Check that the server is running and try again.',
        timestamp: new Date(),
        source: 'local-fallback',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className={cn('flex h-screen flex-col md:flex-row bg-slate-50', isRTL && 'rtl')}>

      {/* Sidebar: context panel */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-slate-200 bg-white">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Cpu variant="Linear" color="currentColor" size={16} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {isRTL ? 'עוזר AI' : 'AI Assistant'}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {isRTL
              ? 'שאל כל שאלה על הפרויקטים, המשימות, הצוות ומצב המערכת.'
              : 'Ask anything about projects, tasks, team workload, and system status.'}
          </p>
        </div>

        {/* System context */}
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            {isRTL ? 'הקשר זמין' : 'Available Context'}
          </p>
          <div className="space-y-2.5">
            <ContextItem icon={<Folder2 variant="Linear" color="currentColor" size={13} className="text-blue-500" />}
              label={isRTL ? 'פרויקטים' : 'Projects'}
              value={systemStats ? `${systemStats.projects}` : '...'}
              color="blue"
            />
            <ContextItem icon={<ClipboardText variant="Linear" color="currentColor" size={13} className="text-violet-500" />}
              label={isRTL ? 'משימות' : 'Tasks'}
              value={systemStats ? `${systemStats.tasks}` : '...'}
              color="violet"
            />
            <ContextItem icon={<Warning2 variant="Linear" color="currentColor" size={13} className="text-amber-500" />}
              label={isRTL ? 'חסומים' : 'Blocked'}
              value={systemStats ? `${systemStats.blocked}` : '...'}
              color={systemStats?.blocked ? 'amber' : 'green'}
              alert={!!systemStats?.blocked}
            />
            <ContextItem icon={<Data variant="Linear" color="currentColor" size={13} className="text-slate-400" />}
              label={isRTL ? 'מקור נתונים' : 'Data Source'}
              value={isRTL ? 'מקומי' : 'Local JSON'}
              color="slate"
            />
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex-1 overflow-y-auto px-5 py-4 light-scrollbar">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            {isRTL ? 'שאלות מוצעות' : 'Suggested Questions'}
          </p>
          <div className="space-y-4">
            {suggestions.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-slate-500 mb-2">{group.label}</p>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => { setInput(item); inputRef.current?.focus(); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-100 hover:border-blue-200 transition-all cursor-pointer leading-relaxed"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI info badge */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Flash variant="Linear" color="currentColor" size={11} className="text-violet-400" />
            <span>{isRTL ? 'מופעל על ידי Gemini AI' : 'Powered by Gemini AI'}</span>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <button
              onClick={() => window.history.back()}
              className="btn-secondary w-9 h-9 !p-0 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-slate-100 transition-colors text-zinc-700 hover:text-zinc-900"
              title={isRTL ? 'חזור' : 'Back'}
            >
              <ArrowLeft2 size={16} color="currentColor" className={isRTL ? 'rotate-180' : ''} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
              <Messages2 variant="Linear" color="currentColor" size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {isRTL ? 'צ׳אט AI לניהול פרויקטים' : 'AI Project Assistant'}
              </h1>
              <p className="text-[11px] text-slate-400">
                {isRTL ? 'שאל על פרויקטים, משימות וסטטוס מערכת' : 'Ask about projects, tasks, and system status'}
              </p>
            </div>
          </div>
          {!isEmpty && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <Refresh2 variant="Linear" color="currentColor" size={13} />
              {isRTL ? 'נקה' : 'Clear'}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto light-scrollbar px-4 md:px-8 py-6">
          {isEmpty ? (
            <EmptyState isRTL={isRTL} onSuggestion={(q) => { setInput(q); inputRef.current?.focus(); }} suggestions={suggestions} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('flex gap-3', msg.role === 'user' ? (isRTL ? 'flex-row' : 'flex-row-reverse') : 'flex-row')}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1',
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-violet-600 shadow-sm shadow-blue-500/20'
                        : 'bg-white border border-slate-200 shadow-sm'
                    )}>
                      {msg.role === 'user'
                        ? <User variant="Linear" color="currentColor" size={14} className="text-white" />
                        : <Cpu variant="Linear" color="currentColor" size={14} className="text-violet-500" />
                      }
                    </div>

                    {/* Bubble */}
                    <div className={cn('max-w-[75%]', msg.role === 'user' && (isRTL ? 'items-start' : 'items-end'), 'flex flex-col gap-1')}>
                      <div className={cn(
                        'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                        msg.role === 'user'
                          ? 'chat-bubble-user text-white rounded-tr-md'
                          : 'chat-bubble-ai text-slate-800 rounded-tl-md'
                      )}>
                        {msg.content}
                      </div>
                      <div className={cn('flex items-center gap-2 px-1', msg.role === 'user' && !isRTL && 'flex-row-reverse')}>
                        <span className="text-[10px] text-slate-400">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.role === 'assistant' && msg.source && (
                          <span className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-md',
                            msg.source === 'gemini'
                              ? 'bg-violet-50 text-violet-500'
                              : 'bg-slate-100 text-slate-400'
                          )}>
                            {msg.source === 'gemini' ? 'Gemini' : 'Fallback'}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    <Cpu variant="Linear" color="currentColor" size={14} className="text-violet-500" />
                  </div>
                  <div className="chat-bubble-ai px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-1.5">
                    <span className="typing-dot w-2 h-2 rounded-full bg-slate-400" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-slate-400" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-slate-400" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 md:px-8 py-4 bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRTL ? 'שאל על הפרויקטים...' : 'Ask about your projects...'}
                  rows={1}
                  className={cn(
                    'w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all leading-relaxed',
                    isRTL && 'text-right'
                  )}
                  style={{ minHeight: '48px', maxHeight: '140px' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                  }}
                />
                <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-300">
                  ↵
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {loading
                  ? <Refresh2 variant="Linear" color="currentColor" size={16} className="animate-spin" />
                  : <Send2 variant="Linear" color="currentColor" size={16} className={isRTL ? 'rotate-180' : ''} />
                }
              </button>
            </form>
            <p className="text-center text-[10px] text-slate-400 mt-2">
              {isRTL
                ? 'Enter לשליחה • Shift+Enter לשורה חדשה'
                : 'Enter to send • Shift+Enter for new line'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextItem({ icon, label, value, color, alert }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 rounded-xl',
      alert ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'
    )}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-medium text-slate-600">{label}</span>
      </div>
      <span className={cn(
        'text-[11px] font-bold',
        alert ? 'text-amber-600' : 'text-slate-700'
      )}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ isRTL, onSuggestion, suggestions }: {
  isRTL: boolean;
  onSuggestion: (q: string) => void;
  suggestions: SuggestionGroup[];
}) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Hero area */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
          <Magicpen variant="Linear" color="currentColor" size={28} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isRTL ? 'שאל את ה-AI על הפרויקטים' : 'Ask AI about your projects'}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {isRTL
            ? 'הצ׳אט מחובר לכל הנתונים של פרויקטים ומשימות. שאל שאלות בשפה טבעית וקבל תשובות מיידיות.'
            : 'Connected to all your project and task data. Ask questions in natural language and get instant answers.'}
        </p>
      </div>

      {/* Suggestions grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map((group) => (
          <div key={group.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</p>
            </div>
            <div className="p-3 space-y-2">
              {group.items.map((item) => (
                <button
                  key={item}
                  onClick={() => onSuggestion(item)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 transition-all cursor-pointer leading-snug"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="mt-6 flex items-center gap-2 justify-center text-[11px] text-slate-400">
        <InfoCircle variant="Linear" color="currentColor" size={12} />
        {isRTL
          ? 'כל השיחות מבוצעות בצד השרת ומאובטחות'
          : 'All conversations are server-side and private'}
      </div>
    </div>
  );
}
