import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Messages2, Send2, Magicpen, Cpu, User, Refresh2, Folder2, ClipboardText, Warning2, Flash, InfoCircle, ArrowLeft2, Trash
} from 'iconsax-react';
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
  const { isRTL, language, t } = useI18n();
  const navigate = useNavigate();
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

      // Premium UI/UX double-asterisk filter to completely clean up raw markdown asterisks
      const cleanContent = (data.reply || '').replace(/\*\*/g, '');

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: cleanContent,
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
    <div className={cn('flex h-screen overflow-hidden bg-[#F8F9FD] text-zinc-950', isRTL && 'rtl')}>

      {/* Branded Premium Sidebar: Dark Modern Glassmorphism */}
      <aside className="hidden lg:flex flex-col w-80 shrink-0 bg-zinc-950 text-white border-l border-zinc-800/40 relative z-10">
        
        {/* Sidebar Header */}
        <div className="px-6 py-6 border-b border-zinc-800/60 shrink-0">
          <div className={cn('flex items-center gap-3 mb-2', isRTL && 'flex-row-reverse')}>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
              <Cpu variant="Bold" className="text-white" size={20} />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {isRTL ? 'מומחה AI פרודקטיבי' : 'AI Copilot Specialist'}
              </h2>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {isRTL ? 'ניהול פרויקטים חכם' : 'Smart Project Advisor'}
              </span>
            </div>
          </div>
          <p className={cn('text-xs text-zinc-400 leading-relaxed mt-3', isRTL && 'text-right')}>
            {isRTL
              ? 'עוזר ה-AI מספק תובנות קריטיות בזמן אמת לגבי לוחות זמנים, עומסים, צווארי בקבוק ומשימות חסומות.'
              : 'Our advanced Copilot delivers real-time deep diagnostics across timelines, workload capacity, and blocks.'}
          </p>
        </div>

        {/* Dynamic Context Panel */}
        <div className="px-6 py-5 border-b border-zinc-800/60 shrink-0">
          <p className={cn('text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4.5', isRTL && 'text-right')}>
            {isRTL ? 'הקשר מערכת פעיל' : 'Active System Scope'}
          </p>
          <div className="space-y-2">
            <ContextItem
              icon={<Folder2 variant="Bold" className="text-[#0080EC]" size={14} />}
              label={isRTL ? 'פרויקטים' : 'Projects'}
              value={systemStats ? `${systemStats.projects}` : '...'}
              color="blue"
            />
            <ContextItem
              icon={<ClipboardText variant="Bold" className="text-purple-400" size={14} />}
              label={isRTL ? 'משימות במערכת' : 'Total Tasks'}
              value={systemStats ? `${systemStats.tasks}` : '...'}
              color="purple"
            />
            <ContextItem
              icon={<Warning2 variant="Bold" className="text-red-400" size={14} />}
              label={isRTL ? 'משימות חסומות' : 'Blocked Items'}
              value={systemStats ? `${systemStats.blocked}` : '...'}
              color="red"
              alert={!!systemStats?.blocked}
            />
          </div>
        </div>

        {/* Suggestion list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar space-y-5">
          <p className={cn('text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]', isRTL && 'text-right')}>
            {isRTL ? 'שאלות נפוצות להפעלה' : 'Diagnose Quick Prompts'}
          </p>
          <div className="space-y-4">
            {suggestions.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className={cn('text-[10px] font-bold text-zinc-400', isRTL && 'text-right')}>{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => { setInput(item); inputRef.current?.focus(); }}
                      className={cn(
                        "w-full px-3 py-2 bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/40 hover:border-zinc-700/60 rounded-xl text-[11px] font-semibold text-zinc-300 hover:text-white transition-all duration-300 text-right cursor-pointer leading-relaxed",
                        !isRTL && "text-left"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="px-6 py-5 border-t border-zinc-800/60 bg-zinc-950/80 shrink-0">
          <div className={cn('flex items-center gap-2 text-[10px] text-zinc-500', isRTL && 'flex-row-reverse')}>
            <Flash variant="Bold" className="text-[#0080EC]" size={12} />
            <span>{isRTL ? 'מונע באמצעות מנוע Gemini AI' : 'Powered by active Gemini AI'}</span>
          </div>
        </div>
      </aside>

      {/* Main Premium Workspace */}
      <div className="flex-1 flex flex-col min-h-0 relative z-0">
        
        {/* Header - Glassmorphic design */}
        <header className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            {/* Back Button with specific !p-0 wrapper to keep it perfectly styled */}
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary w-9 h-9 !p-0 rounded-xl flex items-center justify-center flex-shrink-0 text-zinc-700 hover:text-zinc-900 border border-zinc-200 transition-colors shadow-sm"
              title={isRTL ? 'חזור' : 'Back'}
            >
              <ArrowLeft2 size={16} color="currentColor" className={isRTL ? 'rotate-180' : ''} />
            </button>
            
            {/* AI Assistant logo & titles */}
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-sm">
              <Messages2 variant="Bold" className="text-white" size={18} />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-base font-bold text-zinc-950 tracking-tight">
                {isRTL ? 'עוזר AI חכם' : 'LinnoProjact AI Assistant'}
              </h1>
              <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                {isRTL ? 'מחובר לפרוייקטים, משימות ולוחות זמנים' : 'Fully bound to active projects, timelines, and members'}
              </p>
            </div>
          </div>

          {!isEmpty && (
            <button
              onClick={clearChat}
              className={cn("flex items-center gap-1.5 text-xs font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer", isRTL && "flex-row-reverse")}
            >
              <Trash variant="Bold" size={13} />
              {isRTL ? 'נקה שיחה' : 'Reset Conversation'}
            </button>
          )}
        </header>

        {/* Message Ledger */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar bg-[#F8F9FD]">
          {isEmpty ? (
            <EmptyState isRTL={isRTL} onSuggestion={(q) => { setInput(q); inputRef.current?.focus(); }} suggestions={suggestions} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn('flex gap-4.5', msg.role === 'user' ? (isRTL ? 'flex-row' : 'flex-row-reverse') : 'flex-row')}
                  >
                    {/* User / AI Avatar */}
                    <div className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 hover:scale-105',
                      msg.role === 'user'
                        ? 'bg-zinc-900'
                        : 'bg-white border border-zinc-100'
                    )}>
                      {msg.role === 'user'
                        ? <User variant="Bold" className="text-white" size={16} />
                        : <Cpu variant="Bold" className="text-[#0080EC]" size={16} />
                      }
                    </div>

                    {/* Chat Bubble with ultra-polished rounded corners */}
                    <div className={cn('max-w-[80%]', msg.role === 'user' && (isRTL ? 'items-start' : 'items-end'), 'flex flex-col gap-1.5')}>
                      <div className={cn(
                        'px-5 py-4 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm border',
                        msg.role === 'user'
                          ? 'bg-zinc-900 border-zinc-900 text-white rounded-tr-sm'
                          : 'bg-white border-zinc-100 text-zinc-800 rounded-tl-sm'
                      )}>
                        {msg.content}
                      </div>
                      
                      {/* Meta information row */}
                      <div className={cn('flex items-center gap-2 px-1', msg.role === 'user' && !isRTL && 'flex-row-reverse')}>
                        <span className="text-[10px] font-semibold text-zinc-400">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.role === 'assistant' && msg.source && (
                          <span className={cn(
                            'text-[9px] font-bold px-2 py-0.5 rounded-full border',
                            msg.source === 'gemini'
                              ? 'bg-blue-50 border-blue-100 text-blue-600'
                              : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                          )}>
                            {msg.source === 'gemini' ? 'Gemini AI' : 'Local Fallback'}
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4.5"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm">
                    <Cpu variant="Bold" className="text-[#0080EC]" size={16} />
                  </div>
                  <div className="bg-white border border-zinc-100 px-5 py-4 rounded-3xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 animate-bounce" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 md:px-8 py-5 bg-white border-t border-zinc-100 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className={cn("flex gap-3 items-end", isRTL && "flex-row-reverse")}>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRTL ? 'שאל משהו על הפרויקטים (למשל: אילו פרויקטים בסיכון?)' : 'Query your projects (e.g. Which projects are at risk?)'}
                  rows={1}
                  className={cn(
                    'w-full px-5 py-3.5 pr-14 pl-5 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100 focus:border-zinc-400 resize-none transition-all duration-300 leading-relaxed',
                    isRTL ? 'text-right pr-5 pl-14' : 'text-left'
                  )}
                  style={{ minHeight: '52px', maxHeight: '140px' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                  }}
                />
                <div className={cn("absolute bottom-3 text-zinc-300 text-xs font-bold", isRTL ? "left-4" : "right-4")}>
                  ↵
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md hover:shadow-lg"
              >
                {loading
                  ? <Refresh2 variant="Linear" color="currentColor" size={18} className="animate-spin" />
                  : <Send2 variant="Bold" color="currentColor" size={18} className={isRTL ? 'rotate-180' : ''} />
                }
              </button>
            </form>
            <p className="text-center text-[10px] font-bold text-zinc-400 mt-2.5">
              {isRTL
                ? 'לחץ Enter לשליחה • Shift+Enter לירידת שורה'
                : 'Press Enter to transmit query • Shift+Enter for newline'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContextItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  alert?: boolean;
}

function ContextItem({ icon, label, value, alert }: ContextItemProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-300',
      alert 
        ? 'bg-red-950/20 border-red-900/30 text-red-200' 
        : 'bg-zinc-900/30 border-zinc-800/40 text-zinc-300'
    )}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <span className={cn(
        'text-xs font-bold',
        alert ? 'text-red-400' : 'text-white'
      )}>
        {value}
      </span>
    </div>
  );
}

interface EmptyStateProps {
  isRTL: boolean;
  onSuggestion: (q: string) => void;
  suggestions: SuggestionGroup[];
}

function EmptyState({ isRTL, onSuggestion, suggestions }: EmptyStateProps) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      
      {/* Dynamic pulse AI badge */}
      <div className="text-center mb-12">
        <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-zinc-950 animate-ping opacity-15" />
          <div className="relative w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-lg">
            <Magicpen variant="Bold" className="text-white animate-pulse" size={26} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-zinc-950 tracking-tight mb-3">
          {isRTL ? 'כיצד אוכל לסייע לך בפרוייקטים היום?' : 'How can I assist your projects today?'}
        </h2>
        <p className="text-xs font-medium text-zinc-400 max-w-sm mx-auto leading-relaxed">
          {isRTL
            ? 'אני מחובר ישירות לבסיס הנתונים שלך ויכול לתת תובנות, סיכומים, אבחון צווארי בקבוק ומשימות חסומות בזמן אמת.'
            : 'Directly linked to your active PostgreSQL instance. Instantly evaluate delivery progress, blocks, or team load.'}
        </p>
      </div>

      {/* Modern Suggestion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {suggestions.map((group) => (
          <div key={group.label} className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4.5 py-3 bg-zinc-50/50 border-b border-zinc-100">
              <p className={cn("text-[10px] font-bold text-zinc-400 uppercase tracking-widest", isRTL && "text-right")}>{group.label}</p>
            </div>
            <div className="p-3.5 space-y-1.5 flex-1">
              {group.items.map((item) => (
                <button
                  key={item}
                  onClick={() => onSuggestion(item)}
                  className={cn(
                    "w-full text-right px-3 py-2.5 rounded-2xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 border border-transparent hover:border-zinc-150 transition-all duration-300 cursor-pointer leading-relaxed",
                    !isRTL && "text-left"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Safe context info */}
      <div className="mt-8 flex items-center gap-2 justify-center text-[10px] font-bold text-zinc-400">
        <InfoCircle variant="Bold" size={13} />
        {isRTL
          ? 'האינטגרציה עובדת בצורה מאובטחת תחת תקני LinnoProjact'
          : 'Highly secure server-to-server transaction. Data is kept private.'}
      </div>
    </div>
  );
}
