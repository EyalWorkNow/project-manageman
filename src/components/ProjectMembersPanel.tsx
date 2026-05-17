import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Profile2User, AddCircle, Edit2, Trash, TickCircle, CloseCircle, Send, Sms, Message2, More
} from 'iconsax-react';
import { cn } from '../lib/utils';
import { ProjectMember } from '../types';
import { api } from '../services/api';
import { useI18n } from '../lib/i18n';

// Tailored vibrant HSL gradient pairs for premium avatar designs
const AVATAR_GRADIENTS = [
  'from-[#FF416C] to-[#FF4B2B]', // Sunset Crimson
  'from-[#1A2980] to-[#26D0CE]', // Deep Ocean
  'from-[#00B4DB] to-[#0083B0]', // Aqua Breeze
  'from-[#7F00FF] to-[#E100FF]', // Royal Violet
  'from-[#11998e] to-[#38ef7d]', // Emerald Glow
  'from-[#F9D423] to-[#FF4E50]', // Sunfire Orange
  'from-[#8A2387] to-[#E94057]', // Purple Rose
  'from-[#2c3e50] to-[#3498db]', // Slate Blue
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

interface MemberCardProps {
  key?: React.Key;
  member: ProjectMember;
  onTitleChange: (id: string, title: string) => void;
  onRemoveInitiate: (member: ProjectMember) => void;
  onContactInitiate: (member: ProjectMember) => void;
}

function MemberCard({ member, onTitleChange, onRemoveInitiate, onContactInitiate }: MemberCardProps) {
  const { isRTL, t } = useI18n();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(member.title);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="relative bg-white border border-zinc-100 hover:border-zinc-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
    >
      {/* 3-dots Menu trigger */}
      <div className="absolute top-4 right-4" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <More variant="Linear" color="currentColor" size={18} className="rotate-90" />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute right-0 mt-1 w-40 bg-white border border-zinc-100 rounded-2xl shadow-xl py-2 z-10 text-right"
            >
              <button
                onClick={() => { setEditingTitle(true); setMenuOpen(false); }}
                className={cn(
                  "w-full px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors flex items-center gap-2 cursor-pointer",
                  isRTL ? "flex-row-reverse text-right" : "text-left"
                )}
              >
                <Edit2 size={13} variant="Linear" />
                {isRTL ? 'ערוך תפקיד' : 'Edit Role'}
              </button>
              <button
                onClick={() => { onRemoveInitiate(member); setMenuOpen(false); }}
                className={cn(
                  "w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50/50 transition-colors flex items-center gap-2 cursor-pointer",
                  isRTL ? "flex-row-reverse text-right" : "text-left"
                )}
              >
                <Trash size={13} variant="Linear" />
                {isRTL ? 'הסר משתתף' : 'Remove Member'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative gradient blob background behind avatar */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-zinc-50/50 to-transparent rounded-t-3xl -z-10" />

      {/* Modern Gradient Avatar */}
      <div className="relative mb-4 mt-2">
        <div className={cn(
          "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-xl font-bold text-white shadow-md ring-4 ring-white transition-transform duration-300 group-hover:scale-105",
          getGradient(member.name)
        )}>
          {getInitials(member.name)}
        </div>
        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-green-500 border-2 border-white" title="Active" />
      </div>

      {/* Member Details */}
      <h3 className="text-base font-bold text-zinc-900 tracking-tight mb-1">{member.name}</h3>

      {/* Role / Title field with fast-edit trigger */}
      {editingTitle ? (
        <div className="flex items-center gap-1 mt-1 mb-2 bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-1 max-w-[180px]">
          <input
            autoFocus
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') { setEditingTitle(false); setTitleInput(member.title); }
            }}
            className="text-xs bg-transparent outline-none w-full text-zinc-800 text-center"
          />
          <button onClick={saveTitle} disabled={saving} className="text-green-500 hover:text-green-600 transition-colors cursor-pointer">
            <TickCircle size={14} variant="Bold" />
          </button>
        </div>
      ) : (
        <p
          onClick={() => setEditingTitle(true)}
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors mb-3 flex items-center justify-center gap-1 hover:bg-zinc-50 px-2.5 py-0.5 rounded-full"
        >
          {member.title || (isRTL ? 'ללא תפקיד' : 'No role')}
          <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </p>
      )}

      {/* Email Badge */}
      <a
        href={`mailto:${member.email}`}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-100 rounded-2xl text-[11px] font-semibold transition-all duration-300 mb-6"
      >
        <Sms size={11} variant="Linear" />
        {member.email}
      </a>

      {/* Action Button: Personal Contact / פניה אישית */}
      <button
        onClick={() => onContactInitiate(member)}
        className="w-full mt-auto py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow cursor-pointer"
      >
        <Message2 size={13} variant="Bold" />
        {isRTL ? 'פניה אישית' : 'Direct Message'}
      </button>
    </motion.div>
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

  // States for confirmation & DM modals
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const REQUIRED_CONFIRM_WORD = isRTL ? 'הסר' : 'REMOVE';

  const [memberToContact, setMemberToContact] = useState<ProjectMember | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [messageSentStatus, setMessageSentStatus] = useState(false);

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
      onMembersChange(members.map(m => m.id === memberId ? { ...m, title: updated.title } : m));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemove() {
    if (!memberToRemove || confirmInput !== REQUIRED_CONFIRM_WORD) return;
    try {
      await api.members.remove(projectId, memberToRemove.id);
      onMembersChange(members.filter(m => m.id !== memberToRemove.id));
      setMemberToRemove(null);
      setConfirmInput('');
    } catch (err) {
      console.error(err);
    }
  }

  function handleSendDm() {
    if (!contactMessage.trim()) return;
    setMessageSentStatus(true);
    setTimeout(() => {
      setMemberToContact(null);
      setContactMessage('');
      setMessageSentStatus(false);
    }, 2000);
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header row */}
      <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5', isRTL && 'sm:flex-row-reverse')}>
        <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center text-white">
            <Profile2User size={20} color="currentColor" variant="Bold" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-base font-bold text-zinc-950">
              {isRTL ? `צוות הפרויקט (${members.length})` : `Project Team (${members.length})`}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isRTL ? 'נהל את משתתפי ותפקידי הפרויקט' : 'Manage project participants and their active roles.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className={cn(
            'flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow',
            showAddForm
              ? 'bg-zinc-100 text-zinc-600'
              : 'bg-zinc-950 text-white hover:bg-zinc-800'
          )}
        >
          <AddCircle size={15} color="currentColor" />
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
            className={cn('flex items-center gap-2 bg-[#E6F9F1] border border-[#B3E8D0] rounded-2xl px-4 py-3.5', isRTL && 'flex-row-reverse')}
          >
            <Send size={14} color="#00C875" variant="Bold" />
            <p className="text-xs font-semibold text-[#00854D]">
              {isRTL ? `הזמנה נשלחה אל ${inviteSent}` : `Invite successfully sent to ${inviteSent}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50 border border-zinc-200/60 rounded-3xl p-5 space-y-4">
              <p className={cn('text-xs font-bold text-zinc-900', isRTL && 'text-right')}>
                {isRTL ? 'הזמן משתתף חדש לפרויקט' : 'Invite a new participant'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 text-right">
                  <input
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    placeholder={isRTL ? 'שם מלא' : 'Full name'}
                    className={cn('input-field text-xs h-10', isRTL && 'text-right')}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <input
                    type="email"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder={isRTL ? 'כתובת מייל' : 'Email address'}
                    className={cn('input-field text-xs h-10', isRTL && 'text-right')}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <input
                    value={addTitle}
                    onChange={e => setAddTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                    placeholder={isRTL ? 'תפקיד (לדוגמה: Frontend Lead)' : 'Role (optional)'}
                    className={cn('input-field text-xs h-10', isRTL && 'text-right')}
                  />
                </div>
              </div>
              <div className={cn('flex items-center gap-2 pt-1', isRTL && 'flex-row-reverse')}>
                <button
                  onClick={handleAdd}
                  disabled={!addName.trim() || !addEmail.trim() || addLoading}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                >
                  <Send size={13} color="white" variant="Bold" />
                  {isRTL ? 'שלח הזמנה' : 'Send Invite'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold px-3 py-2 text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  {isRTL ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid of Team Member Cards */}
      <div>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-zinc-200 rounded-3xl text-center">
            <Profile2User size={42} color="#D4D9E3" variant="Bold" />
            <p className="text-sm font-bold text-zinc-800 mt-4">
              {isRTL ? 'אין משתתפים עדיין' : 'No team members yet'}
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
              {isRTL ? 'הזמן את המשתתפים הראשונים כדי להתחיל לעבוד יחד.' : 'Invite team members to assign task ownership.'}
            </p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                onTitleChange={handleTitleChange}
                onRemoveInitiate={setMemberToRemove}
                onContactInitiate={setMemberToContact}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* 1. Remove Confirmation Modal */}
      <AnimatePresence>
        {memberToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemberToRemove(null)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-zinc-100 rounded-3xl p-6 shadow-2xl z-10 text-center"
            >
              <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash size={22} variant="Bold" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">
                {isRTL ? `האם אתה בטוח שברצונך להסיר את ${memberToRemove.name}?` : `Remove ${memberToRemove.name}?`}
              </h3>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                {isRTL 
                  ? `פעולה זו תסיר את המשתמש מכל משימות הפרויקט. כדי לאשר, אנא הקלד את המילה ` 
                  : `This will disassociate them from all project operations. To confirm, type the word `}
                <strong className="text-zinc-900 underline font-extrabold">{REQUIRED_CONFIRM_WORD}</strong>:
              </p>

              <input
                autoFocus
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder={isRTL ? 'הקלד את המילה כאן...' : 'Type confirmation word...'}
                className={cn('input-field text-center text-xs h-10 mb-5 tracking-widest font-bold', isRTL && 'text-center')}
              />

              <div className="flex gap-2">
                <button
                  onClick={handleRemove}
                  disabled={confirmInput !== REQUIRED_CONFIRM_WORD}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isRTL ? 'הסר משתתף לצמיתות' : 'Confirm Removal'}
                </button>
                <button
                  onClick={() => { setMemberToRemove(null); setConfirmInput(''); }}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {isRTL ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Direct Message / פניה אישית Modal */}
      <AnimatePresence>
        {memberToContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemberToContact(null)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-zinc-100 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className={cn("flex items-center gap-3 mb-4", isRTL && "flex-row-reverse text-right")}>
                <div className={cn(
                  "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shadow-sm",
                  getGradient(memberToContact.name)
                )}>
                  {getInitials(memberToContact.name)}
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {isRTL ? `פניה אישית אל ${memberToContact.name}` : `Direct Message to ${memberToContact.name}`}
                  </h3>
                  <p className="text-[10px] text-zinc-400">{memberToContact.email}</p>
                </div>
              </div>

              {messageSentStatus ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center animate-bounce">
                    <TickCircle size={24} variant="Bold" />
                  </div>
                  <p className="text-xs font-bold text-green-600">
                    {isRTL ? 'הודעה נשלחה בהצלחה!' : 'Message dispatched successfully!'}
                  </p>
                </div>
              ) : (
                <>
                  <textarea
                    rows={4}
                    autoFocus
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    placeholder={isRTL ? 'הקלד את ההודעה שלך כאן...' : 'Type your direct message here...'}
                    className={cn('w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-zinc-400 outline-none text-xs text-zinc-900 transition-colors resize-none mb-4', isRTL && 'text-right')}
                  />
                  <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
                    <button
                      onClick={handleSendDm}
                      disabled={!contactMessage.trim()}
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send size={12} color="white" variant="Bold" />
                      {isRTL ? 'שלח הודעה' : 'Send Message'}
                    </button>
                    <button
                      onClick={() => { setMemberToContact(null); setContactMessage(''); }}
                      className="py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isRTL ? 'ביטול' : 'Cancel'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
