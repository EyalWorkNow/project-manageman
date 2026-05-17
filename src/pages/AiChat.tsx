import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Messages2, Send2, Magicpen, Cpu, User, Refresh2, Folder2, ClipboardText,
  Warning2, Flash, ArrowLeft2, Trash, TickCircle, TrendUp, Clock,
} from 'iconsax-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import type { ChatMessage } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'gemini' | 'local-fallback';
  streaming?: boolean;
}

interface SuggestionGroup {
  label: string;
  icon: React.ReactNode;
  items: string[];
}

interface SystemStats {
  projects: number;
  tasks: number;
  blocked: number;
  atRisk: number;
  onTrack: number;
  completed: number;
  upcomingDeadlines: Array<{ name: string; deadline: string; status: string }>;
}

// ── Inline markdown renderer ──────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__)/g);
  return parts.map((part, i) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownText({ content, className }: { content: string; className?: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  function flushList() {
    if (!listItems.length) return;
    const items = listItems.map((item, i) => (
      <li key={i}>{parseInline(item)}</li>
    ));
    elements.push(
      listType === 'ol'
        ? <ol key={elements.length} className="list-decimal pl-5 space-y-0.5 my-1">{items}</ol>
        : <ul key={elements.length} className="list-disc pl-5 space-y-0.5 my-1">{items}</ul>
    );
    listItems = [];
    listType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^[-*•]\s+(.*)/);
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);

    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
    } else if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
    } else {
      flushList();
      if (h3) {
        elements.push(<p key={elements.length} className="font-bold text-sm text-zinc-900 mt-3 mb-0.5">{parseInline(h3[1])}</p>);
      } else if (h2) {
        elements.push(<p key={elements.length} className="font-bold text-base text-zinc-900 mt-3 mb-0.5">{parseInline(h2[1])}</p>);
      } else if (h1) {
        elements.push(<p key={elements.length} className="font-bold text-lg text-zinc-900 mt-3 mb-0.5">{parseInline(h1[1])}</p>);
      } else if (!line.trim()) {
        if (i > 0 && i < lines.length - 1) {
          elements.push(<div key={elements.length} className="h-2" />);
        }
      } else {
        elements.push(<p key={elements.length} className="leading-relaxed">{parseInline(line)}</p>);
      }
    }
  }
  flushList();

  return <div className={cn('text-sm space-y-0.5', className)}>{elements}</div>;
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ msg, isRTL }: { key?: React.Key; msg: Message; isRTL: boolean }) {
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex gap-3', isUser ? (isRTL ? 'flex-row' : 'flex-row-reverse') : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1',
        isUser ? 'bg-zinc-900' : 'bg-white border border-zinc-200 shadow-sm'
      )}>
        {isUser
          ? <User size={14} color="white" variant="Linear" />
          : <Cpu size={14} color="#3b82f6" variant="Linear" />
        }
      </div>

      {/* Bubble + meta */}
      <div className={cn('flex flex-col gap-1 max-w-[82%]', isUser && (isRTL ? 'items-start' : 'items-end'))}>
        <div className={cn(
          'px-4 py-3 rounded-2xl border',
          isUser
            ? 'bg-zinc-900 border-zinc-800 text-white text-sm leading-relaxed'
            : 'bg-white border-zinc-100 text-zinc-800 shadow-sm',
          isUser ? (isRTL ? 'rounded-tl-sm' : 'rounded-tr-sm') : (isRTL ? 'rounded-tr-sm' : 'rounded-tl-sm')
        )}>
          {isUser
            ? <p className="text-sm leading-relaxed">{msg.content}</p>
            : (
              <>
                <MarkdownText content={msg.content} />
                {msg.streaming && (
                  <span className="inline-flex gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.1s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                  </span>
                )}
              </>
            )
          }
        </div>

        {/* Meta row */}
        <div className={cn('flex items-center gap-2 px-1', isUser && !isRTL && 'flex-row-reverse')}>
          <span className="text-[10px] text-zinc-400 font-medium">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && msg.source && !msg.streaming && (
            <span className={cn(
              'text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
              msg.source === 'gemini'
                ? 'bg-blue-50 border-blue-100 text-blue-600'
                : 'bg-zinc-50 border-zinc-100 text-zinc-400'
            )}>
              {msg.source === 'gemini' ? 'Gemini' : 'Fallback'}
            </span>
          )}
          {!isUser && msg.content && !msg.streaming && (
            <button
              onClick={copyText}
              className="w-5 h-5 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Copy"
            >
              {copied
                ? <TickCircle size={11} color="#22c55e" variant="Bold" />
                : <ClipboardText size={11} color="currentColor" variant="Linear" />
              }
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: number | string; alert?: boolean }) {
  return (
    <div className={cn(
      'flex flex-col gap-1 p-3 rounded-xl border transition-colors',
      alert
        ? 'bg-red-950/30 border-red-900/30'
        : 'bg-zinc-900/30 border-zinc-800/40'
    )}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
      </div>
      <span className={cn('text-lg font-bold', alert ? 'text-red-400' : 'text-white')}>{value}</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ isRTL, onSuggestion, suggestions }: { isRTL: boolean; onSuggestion: (q: string) => void; suggestions: SuggestionGroup[] }) {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="text-center mb-10">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-2xl bg-blue-600/10 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-lg">
            <Magicpen size={26} color="white" variant="Linear" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">
          {isRTL ? 'כיצד אוכל לסייע לך היום?' : 'How can I help you today?'}
        </h2>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
          {isRTL
            ? 'מחובר לבסיס הנתונים בזמן אמת — שאל על פרויקטים, חסמים, לוחות זמנים ועוד.'
            : 'Connected to your live database — ask about projects, blockers, deadlines, and team load.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map(group => (
          <div key={group.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className={cn('px-4 py-3 bg-zinc-50/70 border-b border-zinc-100 flex items-center gap-2', isRTL && 'flex-row-reverse')}>
              <span className="text-zinc-400">{group.icon}</span>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{group.label}</p>
            </div>
            <div className="p-3 space-y-1">
              {group.items.map(item => (
                <button
                  key={item}
                  onClick={() => onSuggestion(item)}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent hover:border-zinc-100 transition-all cursor-pointer leading-relaxed',
                    isRTL ? 'text-right' : 'text-left'
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
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AiChat() {
  const { isRTL, language } = useI18n();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const suggestions: SuggestionGroup[] = isRTL ? [
    {
      label: 'סטטוס פרויקטים',
      icon: <Folder2 size={13} color="currentColor" variant="Linear" />,
      items: ['אילו פרויקטים בסיכון?', 'מה ההתקדמות הכוללת?', 'אילו פרויקטים פגרו בדדליין?'],
    },
    {
      label: 'צוות ומשימות',
      icon: <ClipboardText size={13} color="currentColor" variant="Linear" />,
      items: ['מי עובד על מה עכשיו?', 'אילו משימות חסומות?', 'משימות קריטיות פתוחות'],
    },
    {
      label: 'המלצות',
      icon: <Flash size={13} color="currentColor" variant="Linear" />,
      items: ['מה כדאי לטפל ראשון?', 'אילו לקוחות דורשים עדכון?', 'סיכום ביצועי הצוות'],
    },
  ] : [
    {
      label: 'Project Status',
      icon: <Folder2 size={13} color="currentColor" variant="Linear" />,
      items: ['Which projects are at risk?', "What's the overall delivery progress?", 'Any projects past their deadline?'],
    },
    {
      label: 'Team & Tasks',
      icon: <ClipboardText size={13} color="currentColor" variant="Linear" />,
      items: ["Who's working on what right now?", 'Which tasks are blocked?', 'Show all critical open tasks'],
    },
    {
      label: 'Recommendations',
      icon: <Flash size={13} color="currentColor" variant="Linear" />,
      items: ['What should I prioritize today?', 'Which clients need an update?', 'Summarize team performance'],
    },
  ];

  useEffect(() => {
    fetch('/api/system/stats')
      .then(r => r.json())
      .then(setSystemStats)
      .catch(() => setSystemStats({ projects: 0, tasks: 0, blocked: 0, atRisk: 0, onTrack: 0, completed: 0, upcomingDeadlines: [] }));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (loading) return;

    const userMsgId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: text, timestamp: new Date() },
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), streaming: true },
    ]);
    setInput('');
    setLoading(true);

    // Snapshot history BEFORE the new messages are added
    const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, language }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              full += parsed.text;
              const snapshot = full;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: snapshot } : m
              ));
            }
          } catch { /* skip malformed chunk */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false, source: 'gemini' } : m
      ));
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: m.content || (isRTL ? 'בוטל.' : 'Cancelled.'), streaming: false }
            : m
        ));
        return;
      }
      // Fallback to non-streaming
      try {
        const r = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history, language }),
        });
        const data = await r.json();
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: data.reply || (isRTL ? 'אין תגובה.' : 'No response.'), streaming: false, source: data.source }
            : m
        ));
      } catch {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: isRTL ? 'לא ניתן לקבל תשובה. בדוק שהשרת פועל.' : 'Could not get a response. Check the server.',
                streaming: false,
                source: 'local-fallback',
              }
            : m
        ));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, loading, language, isRTL]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setLoading(false);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className={cn('flex h-screen overflow-hidden bg-[#F8F9FD] text-zinc-950', isRTL && 'rtl')}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[290px] shrink-0 bg-zinc-950 text-white overflow-hidden">

        {/* Sidebar header */}
        <div className="px-6 py-6 border-b border-zinc-800/60 shrink-0">
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Cpu size={20} color="white" variant="Linear" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h2 className="text-sm font-bold text-white">{isRTL ? 'עוזר AI חכם' : 'AI Copilot'}</h2>
              <span className="text-[10px] font-medium text-zinc-500">{isRTL ? 'מחובר לנתוני פרויקטים' : 'Connected to live data'}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-5 py-5 border-b border-zinc-800/60 shrink-0">
          <p className={cn('text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3', isRTL && 'text-right')}>
            {isRTL ? 'מצב מערכת' : 'System Snapshot'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<Folder2 size={12} color="#3b82f6" variant="Linear" />}
              label={isRTL ? 'פרויקטים' : 'Projects'}
              value={systemStats?.projects ?? '—'}
            />
            <StatCard
              icon={<ClipboardText size={12} color="#8b5cf6" variant="Linear" />}
              label={isRTL ? 'משימות' : 'Tasks'}
              value={systemStats?.tasks ?? '—'}
            />
            <StatCard
              icon={<Warning2 size={12} color="#ef4444" variant="Linear" />}
              label={isRTL ? 'בסיכון' : 'At Risk'}
              value={systemStats?.atRisk ?? '—'}
              alert={!!systemStats?.atRisk}
            />
            <StatCard
              icon={<TrendUp size={12} color="#22c55e" variant="Linear" />}
              label={isRTL ? 'במסלול' : 'On Track'}
              value={systemStats?.onTrack ?? '—'}
            />
          </div>

          {/* Upcoming deadlines */}
          {systemStats?.upcomingDeadlines && systemStats.upcomingDeadlines.length > 0 && (
            <div className="mt-4">
              <div className={cn('flex items-center gap-1.5 mb-2', isRTL && 'flex-row-reverse')}>
                <Clock size={11} color="#f59e0b" />
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {isRTL ? 'דדליינים קרובים' : 'Deadlines Soon'}
                </p>
              </div>
              <div className="space-y-1">
                {systemStats.upcomingDeadlines.map(d => (
                  <div key={d.name} className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/40 rounded-lg">
                    <span className="text-[10px] font-medium text-zinc-300 truncate">{d.name}</span>
                    <span className="text-[9px] font-bold text-amber-400 ml-2 shrink-0">{d.deadline}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Suggestion list */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar">
          <p className={cn('text-[10px] font-bold text-zinc-500 uppercase tracking-widest', isRTL && 'text-right')}>
            {isRTL ? 'שאלות מהירות' : 'Quick Prompts'}
          </p>
          {suggestions.map(group => (
            <div key={group.label}>
              <div className={cn('flex items-center gap-1.5 mb-2', isRTL && 'flex-row-reverse')}>
                <span className="text-zinc-500">{group.icon}</span>
                <p className="text-[10px] font-bold text-zinc-500">{group.label}</p>
              </div>
              <div className="space-y-1">
                {group.items.map(item => (
                  <button
                    key={item}
                    onClick={() => { setInput(item); inputRef.current?.focus(); }}
                    className={cn(
                      'w-full px-3 py-2 bg-zinc-900/30 hover:bg-zinc-800/60 border border-zinc-800/40 hover:border-zinc-700/60 rounded-xl text-[11px] font-medium text-zinc-400 hover:text-white transition-all cursor-pointer leading-relaxed',
                      isRTL ? 'text-right' : 'text-left'
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800/60 shrink-0">
          <div className={cn('flex items-center gap-2 text-[10px] text-zinc-500', isRTL && 'flex-row-reverse')}>
            <Flash size={11} color="#3b82f6" variant="Linear" />
            <span>{isRTL ? 'מונע על ידי Gemini AI' : 'Powered by Gemini AI'}</span>
          </div>
        </div>
      </aside>

      {/* ── Main chat area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Header */}
        <header className="px-5 py-4 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <ArrowLeft2 size={16} color="currentColor" className={isRTL ? 'rotate-180' : ''} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center">
              <Messages2 size={17} color="white" variant="Linear" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h1 className="text-sm font-bold text-zinc-900">{isRTL ? 'עוזר AI לניהול פרויקטים' : 'AI Assistant'}</h1>
              <p className="text-[11px] text-zinc-400">{isRTL ? 'זיכרון שיחה • נתונים בזמן אמת' : 'Conversation memory • Live data'}</p>
            </div>
          </div>

          {!isEmpty && (
            <button
              onClick={clearChat}
              className={cn('flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors cursor-pointer', isRTL && 'flex-row-reverse')}
            >
              <Trash size={13} color="currentColor" variant="Linear" />
              {isRTL ? 'נקה שיחה' : 'Clear'}
            </button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-[#F8F9FD] custom-scrollbar">
          {isEmpty ? (
            <EmptyState isRTL={isRTL} onSuggestion={q => { setInput(q); inputRef.current?.focus(); }} suggestions={suggestions} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <ChatBubble key={msg.id} msg={msg} isRTL={isRTL} />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 md:px-8 py-4 bg-white border-t border-zinc-100 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className={cn('flex gap-3 items-end', isRTL && 'flex-row-reverse')}>
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRTL ? 'שאל על הפרויקטים שלך...' : 'Ask about your projects...'}
                  rows={1}
                  disabled={loading}
                  className={cn(
                    'w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all leading-relaxed disabled:opacity-60',
                    isRTL ? 'text-right' : 'text-left'
                  )}
                  style={{ minHeight: '48px', maxHeight: '140px' }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-2xl bg-zinc-950 hover:bg-blue-600 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {loading
                  ? <Refresh2 size={17} color="white" variant="Linear" className="animate-spin" />
                  : <Send2 size={17} color="white" variant="Bold" className={isRTL ? 'rotate-180' : ''} />
                }
              </button>
            </form>
            <p className="text-center text-[10px] text-zinc-400 mt-2">
              {isRTL ? 'Enter לשליחה • Shift+Enter לירידת שורה' : 'Enter to send • Shift+Enter for newline'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
