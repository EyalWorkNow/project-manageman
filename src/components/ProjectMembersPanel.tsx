import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Profile2User, AddCircle, Edit2, Trash, TickCircle, CloseCircle, Send,
} from 'iconsax-react';
import { cn } from '../lib/utils';
import { ProjectMember } from '../types';
import { api } from '../services/api';
import { useI18n } from '../lib/i18n';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  '#0073EA', '#A25DDC', '#00C875', '#FDAB3D', '#E2445C',
  '#579BFC', '#FF7575', '#FFCB00', '#03A9F4', '#9C27B0',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface MemberRowProps {
  key?: React.Key;
  member: ProjectMember;
  onTitleChange: (id: string, title: string) => void;
  onRemove: (id: string) => void;
}

function MemberRow({ member, onTitleChange, onRemove }: MemberRowProps) {
  const { isRTL } = useI18n();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(member.title);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveTitle() {
    const title = titleInput.trim();
    if (!title || title === member.title) { setEditingTitle(false); return; }
    setSaving(true);
    try {
      await onTitleChange(member.id, title);
      setEditingTitle(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn('flex items-center gap-3 py-3 border-b border-[#F0F2F7] last:border-0', isRTL && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{ backgroundColor: avatarColor(member.name) }}
      >
        {getInitials(member.name)}
      </div>

      {/* Info */}
      <div className={cn('flex-1 min-w-0', isRTL && 'text-right')}>
        <p className="text-sm font-semibold text-[#1F2D3D] truncate">{member.name}</p>
        <p className="text-xs text-[#6B7A8D] truncate">{member.email}</p>
        {editingTitle ? (
          <div className={cn('flex items-center gap-1.5 mt-1', isRTL && 'flex-row-reverse')}>
            <input
              autoFocus
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') { setEditingTitle(false); setTitleInput(member.title); }
              }}
              className="text-[11px] border border-[#0073EA] rounded-lg px-2 py-0.5 outline-none text-[#1F2D3D] bg-white w-32"
            />
            <button onClick={saveTitle} disabled={saving} className="text-[#00C875] hover:text-[#00854D] transition-colors cursor-pointer">
              <TickCircle size={16} variant="Bold" color="currentColor" />
            </button>
            <button onClick={() => { setEditingTitle(false); setTitleInput(member.title); }} className="text-[#6B7A8D] hover:text-[#E2445C] transition-colors cursor-pointer">
              <CloseCircle size={16} variant="Bold" color="currentColor" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className={cn('text-[11px] text-[#6B7A8D] hover:text-[#0073EA] transition-colors mt-0.5 cursor-pointer flex items-center gap-1', isRTL && 'flex-row-reverse')}
          >
            <span className="italic">{member.title || (isRTL ? 'ללא תפקיד' : 'No role')}</span>
            <Edit2 size={10} color="currentColor" />
          </button>
        )}
      </div>

      {/* Actions */}
      {!confirmRemove ? (
        <button
          onClick={() => setConfirmRemove(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#C5CAD6] hover:text-[#E2445C] hover:bg-[#FFEEF1] transition-all cursor-pointer flex-shrink-0"
        >
          <Trash size={14} color="currentColor" />
        </button>
      ) : (
        <div className={cn('flex items-center gap-1.5', isRTL && 'flex-row-reverse')}>
          <button
            onClick={() => onRemove(member.id)}
            className="text-[10px] font-bold px-2 py-1 bg-[#E2445C] text-white rounded-lg hover:bg-[#C5263A] transition-colors cursor-pointer"
          >
            {isRTL ? 'הסר' : 'Remove'}
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="text-[10px] font-semibold px-2 py-1 text-[#6B7A8D] hover:text-[#1F2D3D] transition-colors cursor-pointer"
          >
            {isRTL ? 'ביטול' : 'Cancel'}
          </button>
        </div>
      )}
    </div>
  );
}

interface ProjectMembersPanelProps {
  projectId: string;
  members: ProjectMember[];
  onMembersChange: (members: ProjectMember[]) => void;
}

export default function ProjectMembersPanel({ projectId, members, onMembersChange }: ProjectMembersPanelProps) {
  const { isRTL } = useI18n();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  async function handleAdd() {
    const name = addName.trim();
    const email = addEmail.trim();
    const title = addTitle.trim();
    if (!name || !email) return;
    setAddLoading(true);
    try {
      const member = await api.members.add(projectId, name, email, title || 'Team Member');
      onMembersChange([...members, member]);
      setInviteSent(email);
      setAddName('');
      setAddEmail('');
      setAddTitle('');
      setShowAddForm(false);
      setTimeout(() => setInviteSent(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleTitleChange(memberId: string, title: string) {
    try {
      const updated = await api.members.updateTitle(projectId, memberId, title);
      onMembersChange(members.map(m => m.id === memberId ? updated : m));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await api.members.remove(projectId, memberId);
      onMembersChange(members.filter(m => m.id !== memberId));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header row */}
      <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
        <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          <Profile2User size={18} color="#0073EA" variant="Bold" />
          <span className="text-sm font-bold text-[#1F2D3D]">
            {isRTL ? `משתתפי הפרויקט (${members.length})` : `Project Members (${members.length})`}
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className={cn(
            'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer',
            showAddForm
              ? 'bg-[#F0F2F7] text-[#6B7A8D]'
              : 'bg-[#0073EA] text-white hover:bg-[#0060C2]'
          )}
        >
          <AddCircle size={14} color="currentColor" />
          {isRTL ? 'הוסף משתתף' : 'Add Member'}
        </button>
      </div>

      {/* Invite sent banner */}
      <AnimatePresence>
        {inviteSent && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn('flex items-center gap-2 bg-[#E6F9F1] border border-[#B3E8D0] rounded-xl px-4 py-3', isRTL && 'flex-row-reverse')}
          >
            <Send size={14} color="#00C875" variant="Bold" />
            <p className="text-xs font-semibold text-[#00854D]">
              {isRTL ? `הזמנה נשלחה אל ${inviteSent}` : `Invite sent to ${inviteSent}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#F6F7FB] border border-[#E6E9EF] rounded-xl p-4 space-y-3"
          >
            <p className={cn('text-xs font-bold text-[#1F2D3D]', isRTL && 'text-right')}>
              {isRTL ? 'הזמן משתתף חדש' : 'Invite a new member'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder={isRTL ? 'שם מלא' : 'Full name'}
                className={cn('input-field text-xs h-9', isRTL && 'text-right')}
              />
              <input
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder={isRTL ? 'כתובת מייל' : 'Email address'}
                className={cn('input-field text-xs h-9', isRTL && 'text-right')}
              />
              <input
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                placeholder={isRTL ? 'תפקיד (אופציונלי)' : 'Role (optional)'}
                className={cn('input-field text-xs h-9', isRTL && 'text-right')}
              />
            </div>
            <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
              <button
                onClick={handleAdd}
                disabled={!addName.trim() || !addEmail.trim() || addLoading}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-[#0073EA] text-white rounded-lg hover:bg-[#0060C2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Send size={12} color="white" variant="Bold" />
                {isRTL ? 'שלח הזמנה' : 'Send Invite'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs font-semibold px-3 py-2 text-[#6B7A8D] hover:text-[#1F2D3D] transition-colors cursor-pointer"
              >
                {isRTL ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members list */}
      <div className="card p-4">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Profile2User size={36} color="#C5CAD6" variant="Bold" />
            <p className="text-sm font-semibold text-[#6B7A8D] mt-3">
              {isRTL ? 'אין משתתפים עדיין' : 'No members yet'}
            </p>
            <p className="text-xs text-[#C5CAD6] mt-1">
              {isRTL ? 'הוסף את חברי הצוות לפרויקט' : 'Add team members to this project'}
            </p>
          </div>
        ) : (
          <div>
            {members.map(member => (
              <MemberRow
                key={member.id}
                member={member}
                onTitleChange={handleTitleChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Note about invites */}
      <p className={cn('text-[10px] text-[#6B7A8D] leading-relaxed', isRTL && 'text-right')}>
        {isRTL
          ? 'הזמנות ישלחו למייל של המשתתף עם קישור כניסה לפרויקט. פעולה זו תצריך את אישורך.'
          : 'Invites are sent to the member\'s email with a project access link. This action requires your approval.'}
      </p>
    </div>
  );
}
