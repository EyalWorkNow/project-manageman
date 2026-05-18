import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft2, Save2, Refresh2, InfoCircle, Folder2, Profile2User, Calendar1, DocumentText, StatusUp } from 'iconsax-react';
import { api } from '../services/api';
import { Project, PROJECT_STATUSES, STATUS_TRANSLATION_KEYS } from '../types';
import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, isRTL } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    clientName: '',
    description: '',
    status: 'On Track',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    projectManager: ''
  });

  useEffect(() => {
    async function load() {
      if (id) {
        setLoading(true);
        try {
          const detail = await api.projects.get(id);
          setFormData(detail);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const saved = id
        ? await api.projects.update(id, formData)
        : await api.projects.create(formData);
      navigate(`/projects/${saved.id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className={cn('flex items-center gap-4', isRTL && 'flex-row-reverse')}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary w-10 h-10 !p-0 rounded-2xl flex items-center justify-center flex-shrink-0 text-zinc-700 hover:text-zinc-900 icon-action"
          >
            <ArrowLeft2 variant="Linear" color="currentColor" size={16} className={cn('icon-micro', isRTL ? 'rotate-180' : '')} />
          </button>
          <div className={cn('flex items-center gap-3', isRTL ? 'flex-row-reverse text-right' : '')}>
            <div className="icon-shell">
              <Folder2 variant="Linear" color="currentColor" size={16} className="icon-micro text-zinc-800" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-xl font-bold text-zinc-900">
              {id ? t('project.form.title_edit') : t('project.form.title_new')}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">{t('project.form.subtitle') || 'Configure project details'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-7 space-y-6">

          {error && (
            <div className={cn('flex items-start gap-3 bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-lg px-4 py-3', isRTL && 'flex-row-reverse border-l-0 border-r-4 border-r-red-500')}>
              <InfoCircle variant="Linear" color="currentColor" size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="label-with-icon">
              <Folder2 variant="Linear" color="currentColor" size={14} className="text-zinc-500" />
              {t('project.form.identity') || 'Project Name'} <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder={isRTL ? 'לדוגמה: הטמעת פורטל לקוחות Q3' : 'e.g., Q3 Cloud Migration'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label-with-icon">
                <Profile2User variant="Linear" color="currentColor" size={14} className="text-zinc-500" />
                {t('project.form.client') || 'Client'} <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={formData.clientName}
                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                className="input-field"
                placeholder={isRTL ? 'שם הלקוח' : 'Partner Organization'}
              />
            </div>
            <div>
              <label className="label-with-icon">
                <Profile2User variant="Linear" color="currentColor" size={14} className="text-zinc-500" />
                {t('project.form.steward') || 'Lead PM'} <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={formData.projectManager}
                onChange={e => setFormData({ ...formData, projectManager: e.target.value })}
                className="input-field"
                placeholder={isRTL ? 'שם מנהל הפרויקט' : 'Designated PM'}
              />
            </div>
          </div>

          <div>
            <label className="label-with-icon">
              <DocumentText variant="Linear" color="currentColor" size={14} className="text-zinc-500" />
              {t('project.form.scope') || 'Description'}
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="input-field resize-none"
              placeholder={isRTL ? 'מה נמסר ללקוח, מה גבולות הפרויקט ומה חשוב לדעת?' : 'Describe the initiative deliverables...'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label-with-icon">
                <StatusUp variant="Linear" color="currentColor" size={14} className="text-zinc-500" />
                {t('project.form.status') || 'Status'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="input-field cursor-pointer"
              >
                {PROJECT_STATUSES.map(status => (
                  <option key={status} value={status}>{t(STATUS_TRANSLATION_KEYS[status]) || status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-with-icon">
                <Calendar1 variant="Linear" color="currentColor" size={14} className="text-zinc-500" />
                {t('project.form.target') || 'Deadline'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className={cn('input-field', isRTL ? 'text-right' : 'text-left')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn('btn-primary w-full py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm icon-action', isRTL && 'flex-row-reverse')}
          >
            {loading ? <Refresh2 variant="Linear" color="currentColor" className="animate-spin icon-micro" size={16} /> : <Save2 variant="Linear" color="currentColor" className="icon-micro" size={16} />}
            {id ? t('project.form.submit_edit') : t('project.form.submit_new')}
          </button>
        </form>
      </div>
    </div>
  );
}
