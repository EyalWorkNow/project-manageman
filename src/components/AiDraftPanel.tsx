import React, { useState, useRef, useEffect } from 'react';
import { Magicpen, Send2, CloseCircle, ArrowDown2 } from 'iconsax-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/i18n';

interface Message { role: 'user' | 'ai'; content: string; }

interface AiDraftPanelProps {
  context?: string;
}

export default function AiDraftPanel({ context }: AiDraftPanelProps) {
  const { isRTL, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const suggestions = isRTL
    ? ['תרגם לאנגלית', 'שפר את הניסוח', 'כתוב עדכון ללקוח', 'סכם את הסטטוס']
    : ['Translate to Hebrew', 'Improve the wording', 'Draft a client update', 'Summarize the status'];

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context, language }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply || 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: isRTL ? 'שגיאה. נסה שוב.' : 'Error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 z-50 w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all cursor-pointer',
          isRTL ? 'left-6' : 'right-6',
          open ? 'bg-[#1F2D3D] rotate-12' : 'bg-[#0073EA] hover:bg-[#0060C2]'
        )}
        title={isRTL ? 'עוזר AI לניסוח' : 'AI Draft Assistant'}
      >
        {open
          ? <ArrowDown2 size={20} color="white" />
          : <Magicpen size={20} color="white" variant="Bold" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed bottom-22 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-[#E6E9EF] flex flex-col overflow-hidden',
              isRTL && 'right-auto left-6'
            )}
            style={{ maxHeight: '420px' }}
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between px-4 py-3 border-b border-[#E6E9EF] bg-[#F6F7FB]', isRTL && 'flex-row-reverse')}>
              <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <Magicpen size={16} color="#0073EA" variant="Bold" />
                <span className="text-sm font-bold text-[#1F2D3D]">{isRTL ? 'עוזר AI' : 'AI Assistant'}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#6B7A8D] hover:text-[#1F2D3D] transition-colors cursor-pointer">
                <CloseCircle size={18} color="currentColor" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 light-scrollbar" style={{ maxHeight: '260px' }}>
              {messages.length === 0 && (
                <div className={cn('space-y-2', isRTL && 'text-right')}>
                  <p className="text-xs text-[#6B7A8D] font-medium">{isRTL ? 'נסה אחת מהאפשרויות:' : 'Try one of these:'}</p>
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="block w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F2D3D] bg-[#F6F7FB] hover:bg-[#E8F3FF] hover:text-[#0073EA] border border-[#E6E9EF] transition-all cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start'))}>
                  <div className={cn(
                    'max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-[#0073EA] text-white'
                      : 'bg-[#F6F7FB] text-[#1F2D3D] border border-[#E6E9EF]'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className={cn('flex', isRTL ? 'justify-end' : 'justify-start')}>
                  <div className="bg-[#F6F7FB] border border-[#E6E9EF] px-3 py-2 rounded-xl flex gap-1">
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#6B7A8D]" />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#6B7A8D]" />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#6B7A8D]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[#E6E9EF]">
              <div className={cn('flex items-end gap-2', isRTL && 'flex-row-reverse')}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={isRTL ? 'שאל משהו...' : 'Ask anything...'}
                  rows={1}
                  className={cn(
                    'flex-1 text-xs px-3 py-2 rounded-xl border border-[#E6E9EF] bg-[#F6F7FB] outline-none focus:border-[#0073EA] transition-colors resize-none text-[#1F2D3D] placeholder:text-[#6B7A8D]',
                    isRTL && 'text-right'
                  )}
                  style={{ minHeight: 36, maxHeight: 80 }}
                  onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 80) + 'px'; }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-[#0073EA] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0060C2] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                >
                  <Send2 size={16} color="white" variant="Bold" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
