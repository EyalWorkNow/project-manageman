import re

with open('src/pages/ProjectDetails.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
if 'Send2' not in content:
    content = content.replace("FolderOpen,", "FolderOpen, Send2, DocumentText, MessageText, Flash,")

# 2. Add ProjectChatMessage type
type_def = """type ProjectChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'internal_report' | 'customer_update';
  data?: any;
  timestamp: Date;
};
"""
if 'type ProjectChatMessage' not in content:
    content = content.replace("type Tab = 'board' | 'ai' | 'members';", type_def + "\ntype Tab = 'board' | 'ai' | 'members';")

# 3. Update state
old_state = """  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [customerUpdate, setCustomerUpdate] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);"""

new_state = """  const [aiMessages, setAiMessages] = useState<ProjectChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'ai') {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [aiMessages, generatingAI, activeTab]);"""

if 'const [aiMessages' not in content:
    content = content.replace(old_state, new_state)

# 4. Update handlers
old_handlers = """  // ── AI handlers ─────────────────────────────────────────────────────────────
  async function generateAISummary() {
    if (!project) return;
    setGeneratingAI(true); setAiError(null); setCustomerUpdate(null); setActiveTab('ai');
    try {
      setAiSummary(await api.ai.summarize(project, tasks, language));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Could not generate summary.');
    } finally { setGeneratingAI(false); }
  }

  async function generateCustomerUpdate() {
    if (!project) return;
    setGeneratingAI(true); setAiError(null); setAiSummary(null); setActiveTab('ai');
    try {
      const res = await api.ai.customerUpdate(project, tasks, language);
      setCustomerUpdate(res.update);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Could not generate customer update.');
    } finally { setGeneratingAI(false); }
  }"""

new_handlers = """  // ── AI handlers ─────────────────────────────────────────────────────────────
  async function generateAISummary() {
    if (!project) return;
    const userMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'user', content: isRTL ? 'הפק דוח סטטוס פנימי' : 'Generate Internal Status Report', type: 'text', timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setGeneratingAI(true); 
    try {
      const summary = await api.ai.summarize(project, tasks, language);
      const aiMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', type: 'internal_report', data: summary, timestamp: new Date() };
      setAiMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setAiMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: err instanceof Error ? err.message : 'Could not generate summary.', type: 'text', timestamp: new Date() }]);
    } finally { setGeneratingAI(false); }
  }

  async function generateCustomerUpdate() {
    if (!project) return;
    const userMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'user', content: isRTL ? 'נסח עדכון סטטוס ללקוח' : 'Draft Customer Update', type: 'text', timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setGeneratingAI(true); 
    try {
      const res = await api.ai.customerUpdate(project, tasks, language);
      const aiMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', type: 'customer_update', data: res.update, timestamp: new Date() };
      setAiMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setAiMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: err instanceof Error ? err.message : 'Could not generate update.', type: 'text', timestamp: new Date() }]);
    } finally { setGeneratingAI(false); }
  }

  async function handleSendChat() {
    if (!chatInput.trim() || !project || generatingAI) return;
    const text = chatInput.trim();
    setChatInput('');
    const userMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, type: 'text', timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: aiContext, language }),
      });
      const data = await res.json();
      const aiMsg: ProjectChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.reply || 'No response.', type: 'text', timestamp: new Date() };
      setAiMessages(prev => [...prev, aiMsg]);
    } catch {
      setAiMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: isRTL ? 'אירעה שגיאה. נסה שנית.' : 'Error occurred. Please try again.', type: 'text', timestamp: new Date() }]);
    } finally { setGeneratingAI(false); }
  }
  
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendChat();
    }
  }"""

if 'handleSendChat' not in content:
    content = content.replace(old_handlers, new_handlers)

# 5. Update Tab Title
content = content.replace("{ id: 'ai',      label: isRTL ? 'AI' : 'AI' }", "{ id: 'ai',      label: isRTL ? 'עוזר חכם' : 'Smart Assistant' }")

# 6. Replace AI Tab UI
import re

start_marker = "{/* ── AI TAB ────────────────────────────────────────────────────── */}"
end_marker = "{/* ── MEMBERS TAB ───────────────────────────────────────────────── */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_ui = """{/* ── AI TAB ────────────────────────────────────────────────────── */}
          {activeTab === 'ai' && (
            <div className="bg-[#F6F7FB] border-t border-zinc-200/50" style={{ height: '600px' }}>
              <div className="flex h-full flex-col lg:flex-row">
                
                {/* Right Pane: Quick Actions */}
                <div className={cn(
                  "w-full lg:w-80 bg-white border-b lg:border-b-0 flex flex-col shrink-0 overflow-y-auto",
                  isRTL ? "lg:border-l border-zinc-200/50" : "lg:border-r border-zinc-200/50"
                )}>
                  <div className="p-5 border-b border-zinc-100">
                    <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                        <Magicpen size={20} color="white" variant="Bold" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h3 className="text-sm font-bold text-zinc-900">{isRTL ? 'פעולות חכמות' : 'Smart Actions'}</h3>
                        <p className="text-xs text-zinc-500">{isRTL ? 'תובנות ודוחות בלחיצה' : 'One-click insights & reports'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    <button
                      onClick={generateAISummary}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-semibold text-zinc-700 hover:text-blue-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <DocumentText size={18} className="text-blue-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'דוח סטטוס פנימי' : 'Internal Status Report'}</span>
                    </button>
                    
                    <button
                      onClick={generateCustomerUpdate}
                      disabled={generatingAI}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200/60 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-semibold text-zinc-700 hover:text-indigo-700 disabled:opacity-50",
                        isRTL && "flex-row-reverse text-right"
                      )}
                    >
                      <MessageText size={18} className="text-indigo-500 flex-shrink-0" variant="Bold" />
                      <span>{isRTL ? 'טיוטת עדכון לקוח' : 'Customer Update Draft'}</span>
                    </button>
                  </div>
                  
                  <div className="mt-auto p-5 bg-zinc-50/50 border-t border-zinc-100">
                    <div className={cn('flex items-center gap-2 mb-2', isRTL && 'flex-row-reverse')}>
                      <Flash size={14} className="text-amber-500" variant="Bold" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{isRTL ? 'הקשר המודל' : 'Model Context'}</span>
                    </div>
                    <p className={cn("text-xs leading-relaxed text-zinc-600", isRTL && "text-right")}>
                      {isRTL 
                        ? 'העוזר החכם קורא את נתוני הפרויקט הנוכחי בזמן אמת ויודע לענות על שאלות, לנסח הודעות ולזהות סיכונים באופן אוטומטי.'
                        : 'The smart assistant reads current project data in real-time and can answer questions, draft messages, and identify risks automatically.'}
                    </p>
                  </div>
                </div>

                {/* Left Pane: Interactive Chat */}
                <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {aiMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                          <Magicpen size={32} className="text-blue-500" variant="Bold" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">
                          {isRTL ? 'איך אפשר לעזור עם הפרויקט?' : 'How can I help with this project?'}
                        </h2>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          {isRTL 
                            ? 'אפשר לבקש סיכומים, לנסח מיילים ללקוח, או פשוט לשאול אותי מה תוקע את הפרויקט כרגע.'
                            : 'You can ask for summaries, draft client emails, or just ask what is blocking the project right now.'}
                        </p>
                      </div>
                    ) : (
                      aiMessages.map(msg => (
                        <div key={msg.id} className={cn('flex w-full', msg.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start'))}>
                          <div className={cn(
                            'max-w-[85%] lg:max-w-[70%]',
                            msg.role === 'user' && (isRTL ? 'text-right' : 'text-left')
                          )}>
                            
                            {/* User message */}
                            {msg.role === 'user' && (
                              <div className={cn(
                                "inline-block px-4 py-3 rounded-2xl text-sm font-medium",
                                "bg-zinc-900 text-white shadow-md",
                                isRTL ? "rounded-tl-sm" : "rounded-tr-sm"
                              )}>
                                {msg.content}
                              </div>
                            )}

                            {/* Assistant generic text */}
                            {msg.role === 'assistant' && msg.type === 'text' && (
                              <div className={cn(
                                "inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed",
                                "bg-zinc-50 border border-zinc-200 text-zinc-800 shadow-sm whitespace-pre-wrap",
                                isRTL ? "rounded-tr-sm text-right" : "rounded-tl-sm text-left"
                              )}>
                                {msg.content}
                              </div>
                            )}

                            {/* Assistant Internal Report */}
                            {msg.role === 'assistant' && msg.type === 'internal_report' && msg.data && (
                              <div className={cn(
                                "bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 overflow-hidden",
                                isRTL && "text-right"
                              )}>
                                <div className={cn("flex items-center gap-3 mb-4 pb-4 border-b border-zinc-100", isRTL && "flex-row-reverse")}>
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <DocumentText size={16} className="text-blue-600" variant="Bold" />
                                  </div>
                                  <h4 className="text-sm font-bold text-zinc-900">{isRTL ? 'דוח סטטוס פנימי' : 'Internal Status Report'}</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <Section label={isRTL ? 'מצב כללי' : 'Overall Health'} content={msg.data.overallStatus} />
                                  <Section label={isRTL ? 'פעולה הבאה' : 'Next Action'} content={msg.data.recommendedNextAction} accent />
                                  <Section label={isRTL ? 'סיכונים וחסמים' : 'Risks & Blockers'} content={msg.data.risksAndBlockers} />
                                  <Section label={isRTL ? 'התקדמות' : 'Key Progress'} content={msg.data.keyProgress} />
                                </div>
                              </div>
                            )}

                            {/* Assistant Customer Update */}
                            {msg.role === 'assistant' && msg.type === 'customer_update' && msg.data && (
                              <div className={cn(
                                "bg-[#1F2D3D] border border-[#2D3E50] shadow-md rounded-2xl p-5 overflow-hidden",
                                isRTL && "text-right"
                              )}>
                                <div className={cn("flex items-center gap-3 mb-4 pb-4 border-b border-[#2D3E50]", isRTL && "flex-row-reverse")}>
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <MessageText size={16} className="text-indigo-400" variant="Bold" />
                                  </div>
                                  <h4 className="text-sm font-bold text-white">{isRTL ? 'טיוטת עדכון ללקוח' : 'Customer Update Draft'}</h4>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                  "{msg.data}"
                                </p>
                              </div>
                            )}

                            <div className={cn("text-[10px] text-zinc-400 mt-1.5 px-1", isRTL ? (msg.role === 'user' ? 'text-left' : 'text-right') : (msg.role === 'user' ? 'text-right' : 'text-left'))}>
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Typing Indicator */}
                    {generatingAI && (
                      <div className={cn('flex w-full', isRTL ? 'justify-end' : 'justify-start')}>
                        <div className="bg-zinc-50 border border-zinc-200 px-4 py-3 rounded-2xl shadow-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-zinc-200/50">
                    <div className={cn("flex items-center gap-3 max-w-4xl mx-auto", isRTL && "flex-row-reverse")}>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isRTL ? "שאל את המודל שאלה על הפרויקט..." : "Ask the model about the project..."}
                        className={cn(
                          "flex-1 h-12 px-5 bg-zinc-50 border border-zinc-200/80 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all",
                          isRTL && "text-right"
                        )}
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || generatingAI}
                        className={cn(
                          "w-12 h-12 flex items-center justify-center rounded-xl transition-all flex-shrink-0 cursor-pointer shadow-sm",
                          !chatInput.trim() || generatingAI
                            ? "bg-zinc-100 text-zinc-400"
                            : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                        )}
                      >
                        <Send2 size={20} color="currentColor" variant="Bold" className={isRTL ? 'rotate-180' : ''} />
                      </button>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-[10px] text-zinc-400">
                        {isRTL ? 'המודל מנתח את הנתונים בזמן אמת. תשובות עשויות להשתנות.' : 'The model analyzes data in real-time. Answers may vary.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBERS TAB ───────────────────────────────────────────────── */}"""
    content = content[:start_idx] + new_ui + content[end_idx + len(end_marker):]
    with open('src/pages/ProjectDetails.tsx', 'w') as f:
        f.write(content)
        print("Updated ProjectDetails.tsx successfully.")
else:
    print("Could not find markers.")
