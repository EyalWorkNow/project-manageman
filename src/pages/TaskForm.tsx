import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft2, Save2, Refresh2, InfoCircle, Image as ImageIcon, Microphone2, Magicpen, CloseCircle, UserAdd, StopCircle, Play, Paperclip2 } from 'iconsax-react';
import { Task, Project, ProjectMember, TASK_PRIORITIES, TASK_STATUSES, STATUS_TRANSLATION_KEYS, PRIORITY_TRANSLATION_KEYS } from '../types';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/i18n';

export default function TaskForm() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const navigate = useNavigate();
  const { t, isRTL } = useI18n();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    projectId: projectIdParam || '',
    assignee: '',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date().toISOString().split('T')[0],
    isBlocked: false,
    blockerDescription: '',
    internalNotes: ''
  });

  // Mock states for new features
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<number[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  const toggleRecording = () => {
    if (isRecording) {
      setRecordings([...recordings, Math.floor(Math.random() * 45) + 5]);
    }
    setIsRecording(!isRecording);
  };

  const handleAiFormulate = async () => {
    if (!formData.description && !formData.title && !aiPrompt) return;
    setAiLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      setFormData(prev => ({
        ...prev,
        description: (prev.description ? prev.description + '\n\n' : '') + `[AI Optimized based on: "${aiPrompt || 'context'}"]\n- Clear objective\n- Measurable outcome\n- Defined scope`,
      }));
      setShowAiPrompt(false);
      setAiPrompt('');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddUser = (user: string) => {
    if (!taggedUsers.includes(user)) {
      setTaggedUsers([...taggedUsers, user]);
      setFormData(prev => ({ ...prev, assignee: [...taggedUsers, user].join(', ') }));
    }
  };

  const MOCK_USERS = projectMembers.map(m => m.name);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const projectsList = await api.projects.list();
        setProjects(projectsList);
        if (taskId) {
          const allTasks = await api.tasks.list();
          const existing = allTasks.find(t => t.id === taskId);
          if (existing) setFormData(existing);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [taskId]);

  useEffect(() => {
    if (formData.projectId) {
      api.members.list(formData.projectId).then(setProjectMembers).catch(console.error);
    } else {
      setProjectMembers([]);
    }
  }, [formData.projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData };
      let extraDescription = "";
      if (images.length > 0) {
        extraDescription += `\n\n[Attachments: ${images.length} image(s)]`;
      }
      if (recordings.length > 0) {
        extraDescription += `\n\n[Attachments: ${recordings.length} audio recording(s)]`;
      }
      if (extraDescription) {
        payload.description = (payload.description || '') + extraDescription;
      }

      await api.tasks.save(payload);
      navigate(formData.projectId ? `/projects/${formData.projectId}` : '/');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to save task.');
    } finally {
      setLoading(false);
    }
  }

  function updateStatus(status: Task['status']) {
    setFormData({
      ...formData,
      status,
      isBlocked: status === 'Blocked',
      blockerDescription: status === 'Blocked' ? formData.blockerDescription : '',
    });
  }

  function toggleBlocked() {
    const nextBlocked = !formData.isBlocked;
    setFormData({
      ...formData,
      isBlocked: nextBlocked,
      status: nextBlocked ? 'Blocked' : formData.status === 'Blocked' ? 'In Progress' : formData.status,
      blockerDescription: nextBlocked ? formData.blockerDescription : '',
    });
  }

  if (loading && !formData.title && taskId) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] p-6 md:p-8 space-y-6">
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className={cn('flex items-center gap-4', isRTL && 'flex-row-reverse')}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary w-10 h-10 p-0 rounded-2xl flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft2 variant="Linear" color="currentColor" size={16} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-xl font-bold text-zinc-900">
              {taskId ? t('task.form.title_edit') : t('task.form.title_new')}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">{t('task.form.subtitle') || 'Specify task ownership, state, priority, and blockers.'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">

            {error && (
              <div className={cn('flex items-start gap-3 bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-lg px-4 py-3', isRTL && 'flex-row-reverse border-l-0 border-r-4 border-r-red-500')}>
                <InfoCircle variant="Linear" color="currentColor" size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <div className="card p-6 space-y-6">
              <div>
                <label className={cn('block text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'text-right')}>
                  {t('task.form.identity') || 'Task Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder={isRTL ? 'לדוגמה: אישור ארכיטקטורה מול הלקוח' : 'e.g., Finalize architecture review'}
                />
              </div>

              <div>
                <div className={cn('flex items-center justify-between mb-1.5', isRTL && 'flex-row-reverse')}>
                  <label className="block text-sm font-semibold text-zinc-900">
                    {t('task.form.context') || 'Description'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAiPrompt(!showAiPrompt)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <Magicpen variant="Linear" color="currentColor" size={12} />
                    {isRTL ? 'ניסוח בעזרת AI' : 'AI Formulation'}
                  </button>
                </div>

                {showAiPrompt && (
                  <div className={cn('mb-3 p-3 bg-zinc-950 rounded-xl flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                    <input
                      autoFocus
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder={isRTL ? 'מה המטרה של המשימה?' : 'What is the goal of this task?'}
                      className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={handleAiFormulate}
                      disabled={aiLoading}
                      className="bg-white text-zinc-900 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {aiLoading ? <Refresh2 variant="Linear" color="currentColor" size={12} className="animate-spin" /> : <Magicpen variant="Linear" color="currentColor" size={12} />}
                      {isRTL ? 'נסח עכשיו' : 'Optimize'}
                    </button>
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-200/50 bg-zinc-50 focus-within:bg-white focus-within:border-zinc-300 focus-within:ring-4 focus-within:ring-zinc-100 transition-all overflow-hidden">
                  <textarea
                    rows={5}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-transparent px-4 py-3 text-sm text-zinc-900 outline-none resize-none"
                    placeholder={isRTL ? 'מה צריך להיעשות, למה זה חשוב, ומה יחשב כהשלמה?' : 'Provide context for this task...'}
                  />
                  
                  {/* Attachments Display */}
                  {(images.length > 0 || recordings.length > 0) && (
                    <div className={cn('px-4 py-2 border-t border-zinc-100 flex flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
                      {images.map((img, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                          <ImageIcon variant="Linear" color="currentColor" size={10} /> Image_{i+1}.png
                          <button type="button" className="cursor-pointer" onClick={() => setImages(images.filter((_, idx) => idx !== i))}><CloseCircle variant="Linear" color="currentColor" size={10} className="hover:text-red-500" /></button>
                        </div>
                      ))}
                      {recordings.map((rec, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                          <Play variant="Linear" color="currentColor" size={10} /> Audio_{i+1} ({rec}s)
                          <button type="button" className="cursor-pointer" onClick={() => setRecordings(recordings.filter((_, idx) => idx !== i))}><CloseCircle variant="Linear" color="currentColor" size={10} className="hover:text-red-500" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toolbar */}
                  <div className={cn('px-3 py-2 border-t border-zinc-100 flex items-center justify-between bg-white', isRTL && 'flex-row-reverse')}>
                    <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
                      <button
                        type="button"
                        onClick={() => setImages([...images, 'dummy'])}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                        title="Add Image"
                      >
                        <ImageIcon variant="Linear" color="currentColor" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={toggleRecording}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                          isRecording ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                        )}
                        title={isRecording ? "Stop Recording" : "Record Audio"}
                      >
                        {isRecording ? <StopCircle variant="Linear" color="currentColor" size={14} className="animate-pulse" /> : <Microphone2 variant="Linear" color="currentColor" size={14} />}
                      </button>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                        title="Add Attachment"
                      >
                        <Paperclip2 variant="Linear" color="currentColor" size={14} />
                      </button>
                    </div>
                    {isRecording && <span className="text-[10px] font-bold text-red-500 animate-pulse px-2">Recording...</span>}
                  </div>
                </div>
              </div>

              <div>
                <label className={cn('flex items-center gap-2 text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'flex-row-reverse text-right')}>
                  {t('task.form.internal_notes') || 'Internal Notes'}
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {t('label.internal') || 'INTERNAL'}
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={formData.internalNotes}
                  onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                  className="w-full px-4 py-3 bg-amber-50 border border-dashed border-amber-300 rounded-xl outline-none text-sm text-amber-900 placeholder:text-amber-400 focus:border-amber-400 transition-colors resize-none"
                  placeholder={isRTL ? 'מידע לצוות בלבד — לא גלוי ללקוח' : 'Shared notes for technical staff only — not visible to the customer.'}
                />
              </div>
            </div>

            {/* Blocker card */}
            <div className={cn(
              'card p-6 transition-all',
              formData.isBlocked ? 'bg-red-50 border-l-4 border-l-red-500 border-[#fca5a5]' : ''
            )}>
              <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                <div className={cn('flex items-center gap-2.5', isRTL && 'flex-row-reverse')}>
                  <InfoCircle variant="Linear" color="currentColor" size={17} className={formData.isBlocked ? 'text-red-500' : 'text-[#D4D9E3]'} />
                  <span className="text-sm font-semibold text-zinc-900">
                    {formData.isBlocked
                      ? (isRTL ? 'משימה זו חסומה' : 'This task is blocked')
                      : (isRTL ? 'אין חסם' : 'No blocker')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleBlocked}
                  role="switch"
                  aria-checked={formData.isBlocked}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E2445C] cursor-pointer',
                    formData.isBlocked ? 'bg-[#E2445C]' : 'bg-[#D4D9E3]'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200',
                    formData.isBlocked ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')
                  )} />
                </button>
              </div>

              {formData.isBlocked && (
                <div className="mt-5 pt-5 border-t border-red-200 space-y-2">
                  <label className={cn('block text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'text-right')}>
                    {t('task.form.blocker_desc') || 'Blocker description'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required={formData.isBlocked}
                    rows={2}
                    value={formData.blockerDescription}
                    onChange={e => setFormData({ ...formData, blockerDescription: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl focus:border-red-400 outline-none text-sm text-zinc-900 placeholder:text-zinc-500 transition-colors resize-none"
                    placeholder={isRTL ? 'מה עוצר את ההתקדמות ומה צריך לקרות כדי לשחרר אותו?' : 'What is blocking progress and what needs to happen to unblock it?'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-5">
            <div className="card p-6 space-y-5">

              <div>
                <label className={cn('block text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'text-right')}>
                  {t('task.form.parent') || 'Project'} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.projectId}
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                  className="input-field cursor-pointer"
                >
                  <option value="">{t('task.form.select_project') || 'Select project...'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={cn('block text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'text-right')}>
                  {t('task.form.owner') || 'Assignees & Participants'} <span className="text-red-500">*</span>
                </label>
                
                <div className="space-y-3">
                  {taggedUsers.length > 0 && (
                    <div className={cn('flex flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
                      {taggedUsers.map(user => (
                        <span key={user} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 text-white text-[11px] font-bold', isRTL && 'flex-row-reverse')}>
                          <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px]">{user.charAt(0)}</div>
                          {user}
                          <button type="button" className="cursor-pointer" onClick={() => {
                            const newUsers = taggedUsers.filter(u => u !== user);
                            setTaggedUsers(newUsers);
                            setFormData(prev => ({ ...prev, assignee: newUsers.join(', ') }));
                          }}>
                            <CloseCircle variant="Linear" color="currentColor" size={10} className="hover:text-red-400 transition-colors" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative group">
                    <input
                      value={formData.assignee}
                      onChange={e => setFormData({ ...formData, assignee: e.target.value })}
                      className={cn('input-field pl-9', isRTL && 'pr-9 pl-4 text-right')}
                      placeholder={isRTL ? 'הקלד שם או בחר מהרשימה...' : 'Type name or select...'}
                    />
                    <UserAdd variant="Linear" color="currentColor" size={14} className={cn('absolute top-3.5 text-zinc-400 group-focus-within:text-zinc-900 transition-colors', isRTL ? 'right-3.5' : 'left-3.5')} />
                    
                    {/* Quick Add Suggestions */}
                    <div className={cn('flex flex-wrap gap-1 mt-2', isRTL && 'flex-row-reverse')}>
                      {MOCK_USERS.filter(u => !taggedUsers.includes(u)).map(user => (
                        <button
                          key={user}
                          type="button"
                          onClick={() => handleAddUser(user)}
                          className="px-2 py-1 rounded-lg border border-zinc-200/50 text-[10px] font-bold text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all cursor-pointer"
                        >
                          + {user}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={cn('block text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'text-right')}>
                  {t('task.form.state') || 'Status'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={e => updateStatus(e.target.value as Task['status'])}
                  className="input-field cursor-pointer"
                >
                  {TASK_STATUSES.map(status => (
                    <option key={status} value={status}>{t(STATUS_TRANSLATION_KEYS[status]) || status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={cn('block text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'text-right')}>
                  {t('task.form.impact') || 'Priority'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="input-field cursor-pointer"
                >
                  {TASK_PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>{t(PRIORITY_TRANSLATION_KEYS[priority]) || priority}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={cn('block text-sm font-semibold text-zinc-900 mb-1.5', isRTL && 'text-right')}>
                  {t('task.form.due') || 'Due Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className={cn('input-field', isRTL ? 'text-right' : 'text-left')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? <Refresh2 variant="Linear" color="currentColor" className="animate-spin" size={16} /> : <Save2 variant="Linear" color="currentColor" size={16} />}
                {t('task.form.submit') || (taskId ? 'Update Task' : 'Save2 Task')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
