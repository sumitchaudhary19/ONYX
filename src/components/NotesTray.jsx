import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Smile } from 'lucide-react'
import { supabase } from '../supabaseClient'

// ── Smart emoji keyword map ────────────────────────────────────────────────
export function getSmartEmojis(text = '') {
  const t = text.toLowerCase()
  if (/exam|test|midsem|assignment|sheet/.test(t))  return ['😭', '📚', '✍️', '🥲']
  if (/party|weekend|trip|night/.test(t))           return ['🥳', '🍻', '🔥', '🕺']
  if (/mess|food|nescafe|hungry/.test(t))           return ['🍕', '☕', '🤢', '🍔']
  return ['😂', '😍', '😲', '🥺']
}

// ── Quick emoji picker rows ────────────────────────────────────────────────
const EMOJI_ROWS = [
  ['😀','😂','😍','😔','😭','😲','🥺','🔥'],
  ['👍','🔥','❤️','🥳','🤢','🍕','☕','🍻'],
  ['📚','✍️','🏃','😴','💪','🧠','🚀','🎯'],
]

// ── Campus quick-chips ──────────────────────────────────────────────────────
const CAMPUS_CHIPS = [
  { label: '📍 VLTC',    text: 'at VLTC'    },
  { label: '☕ Nescafe', text: 'at Nescafe' },
  { label: '📚 Library', text: 'at Library' },
  { label: '😴 Bunking', text: 'bunking'    },
  { label: '🍲 Mess',    text: 'at Mess'    },
]

const GRADIENTS = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
]

function Avatar({ profile, index = 0, size = 44 }) {
  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean).map(s => s?.[0]?.toUpperCase()).join('') || '?'
  return profile?.avatar_url
    ? <img src={profile.avatar_url} alt={initials}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: GRADIENTS[index % GRADIENTS.length],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: '#fff'
      }}>{initials}</div>
}

function NoteBubble({ text }) {
  return (
    <div className="absolute -top-12 bg-white text-[#0f172a] text-xs font-semibold px-3 py-1.5 rounded-2xl shadow-xl truncate max-w-[120px] border border-slate-100 flex items-center justify-center z-10">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white" />
    </div>
  )
}

function AddNoteModal({ profile, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const emojiRef = useRef(null)

  // Close emoji picker on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleChip = (chipText) => {
    const joined = (text + (text ? ' ' : '') + chipText).slice(0, 60)
    setText(joined)
  }

  const appendEmoji = (emoji) => {
    const next = (text + emoji).slice(0, 60)
    setText(next)
    setShowEmoji(false)
  }

  const handleSave = async () => {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)
    try {
      // Delete previous note first (1 active note per user)
      await supabase.from('notes').delete().eq('user_id', profile.id)

      const { error: insertError } = await supabase
        .from('notes')
        .insert({ user_id: profile.id, content: trimmed })

      if (insertError) {
        console.error('[NotesTray] insert error:', insertError)
        setError(insertError.message || 'Failed to save note. Check RLS policies.')
        setSaving(false)
        return
      }

      onSaved(trimmed)
      onClose()
    } catch (err) {
      console.error('[NotesTray] save exception:', err)
      setError(err.message || 'Unexpected error saving note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
      <motion.div initial={{ scale: 0.88, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 30 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(180deg,#0d1630 0%,#080e22 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Add a Note</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Vanishes in 24 hours ✨</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Avatar live preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative', paddingTop: 40 }}>
          {text && <NoteBubble text={text} />}
          <div style={{ padding: 2, borderRadius: '50%', background: text ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
            <Avatar profile={profile} size={52} />
          </div>
        </div>

        {/* Text input with emoji toggle */}
        <div style={{ position: 'relative', marginBottom: 12 }} ref={emojiRef}>
          <input
            autoFocus
            type="text"
            maxLength={60}
            placeholder="What's on your mind? (60 chars)"
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ width: '100%', padding: '13px 76px 13px 16px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#f1f5f9', fontSize: 14, outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(59,130,246,0.08)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
          />
          {/* Char count */}
          <span style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: text.length >= 50 ? '#f87171' : '#475569', pointerEvents: 'none' }}>{text.length}/60</span>
          {/* Emoji toggle button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowEmoji(v => !v) }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: showEmoji ? '#3b82f6' : '#475569', display: 'flex', padding: 4, borderRadius: 8, transition: 'color 0.15s' }}>
            <Smile style={{ width: 18, height: 18 }} />
          </button>

          {/* Emoji Picker popover */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100,
                  background: 'rgba(11,11,18,0.97)', backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18,
                  padding: '10px 12px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                  minWidth: 220
                }}>
                {EMOJI_ROWS.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 4, marginBottom: ri < EMOJI_ROWS.length - 1 ? 4 : 0 }}>
                    {row.map(emoji => (
                      <button key={emoji} onClick={() => appendEmoji(emoji)}
                        style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error message */}
        {error && (
          <p style={{ fontSize: 12, color: '#f87171', marginBottom: 10, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10 }}>
            ⚠️ {error}
          </p>
        )}

        {/* Campus Chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
          {CAMPUS_CHIPS.map(chip => (
            <button key={chip.label} onClick={() => handleChip(chip.text)}
              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>{chip.label}</button>
          ))}
        </div>

        {/* Submit */}
        <button onClick={handleSave} disabled={!text.trim() || saving}
          style={{ width: '100%', padding: '13px 24px', background: text.trim() ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 14, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: saving ? 0.6 : 1, boxShadow: text.trim() ? '0 8px 24px rgba(59,130,246,0.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? (
            <><svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}/><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Sharing...</>
          ) : 'Share Note ✨'}
        </button>
      </motion.div>
    </motion.div>
  )
}

function ReplyNoteModal({ sender, note, currentUserId, onClose }) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const emojis = getSmartEmojis(note?.content)

  const sendReply = async (text) => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: sender.id,
        content: `[Replied to Note: '${note.content}'] ${text}`
      })
      onClose()
    } catch (err) {
      console.error('[NotesTray] reply:', err)
    } finally { setSending(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(180deg,#0d1630 0%,#080e22 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px 28px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480, boxShadow: '0 -20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Avatar profile={sender} size={40} />
          <div>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{sender?.first_name}&apos;s note</p>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '8px 14px', fontSize: 13, color: '#e2e8f0', maxWidth: 220 }}>
              {note?.content}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick react</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: 'center' }}>
          {emojis.map(emoji => (
            <motion.button key={emoji} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.2 }}
              onClick={() => sendReply(emoji)}
              style={{ width: 48, height: 48, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {emoji}
            </motion.button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input autoFocus type="text" placeholder="Send a reply..." value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendReply(reply) }}
            style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#f1f5f9', fontSize: 14, outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendReply(reply)} disabled={!reply.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 14, background: reply.trim() ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.07)', border: 'none', cursor: reply.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: reply.trim() ? '0 4px 16px rgba(59,130,246,0.4)' : 'none', color: '#fff' }}>
            ↑
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function NotesTray({ profile, friends = [] }) {
  const [myNote, setMyNote]           = useState(null)
  const [friendNotes, setFriendNotes] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null)
  const [loadingNotes, setLoadingNotes] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    fetchNotes()
  }, [profile?.id, friends.length])

  async function fetchNotes() {
    setLoadingNotes(true)
    try {
      const friendIds = friends.map(f => f.id)
      const allIds = [profile.id, ...friendIds]
      if (!allIds.length) { setLoadingNotes(false); return }

      const { data, error } = await supabase
        .from('notes')
        .select('id, user_id, content, created_at')
        .in('user_id', allIds)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      const latestPerUser = {}
      ;(data || []).forEach(n => { if (!latestPerUser[n.user_id]) latestPerUser[n.user_id] = n })

      setMyNote(latestPerUser[profile.id] || null)
      setFriendNotes(
        friends
          .filter(f => latestPerUser[f.id])
          .map(f => ({ friend: f, note: latestPerUser[f.id] }))
      )
    } catch (err) {
      console.error('[NotesTray] fetchNotes:', err)
    } finally { setLoadingNotes(false) }
  }

  const handleDeleteNote = async () => {
    await supabase.from('notes').delete().eq('user_id', profile.id)
    setMyNote(null)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '4px 0 12px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <motion.div
          className="relative flex flex-col items-center flex-shrink-0 cursor-pointer"
          style={{ gap: 6 }}
          onClick={() => myNote ? handleDeleteNote() : setShowAddModal(true)}>
          <div className="relative flex flex-col items-center" style={{ paddingTop: myNote ? 42 : 0 }}>
            {myNote && <NoteBubble text={myNote.content} />}
            <div style={{ padding: 2, borderRadius: '50%', background: myNote ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
              <Avatar profile={profile} size={44} />
              {!myNote && (
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', border: '2px solid #060b18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus style={{ width: 10, height: 10, color: '#fff' }} />
                </div>
              )}
            </div>
          </div>
          <span style={{ fontSize: 11, color: myNote ? '#94a3b8' : '#475569', fontWeight: 500, maxWidth: 52, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {myNote ? 'Tap to clear' : 'Your note'}
          </span>
        </motion.div>

        {friendNotes.length > 0 && (
          <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0, margin: '4px 0', alignSelf: 'stretch' }} />
        )}

        <AnimatePresence>
          {friendNotes.map(({ friend, note }, i) => (
            <motion.div key={friend.id}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: i * 0.05 }}
              className="relative flex flex-col items-center flex-shrink-0 cursor-pointer"
              style={{ gap: 6 }}
              onClick={() => setReplyTarget({ sender: friend, note })}>
              <div className="relative flex flex-col items-center" style={{ paddingTop: 42 }}>
                <NoteBubble text={note.content} />
                <div style={{ padding: 2, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
                  <Avatar profile={friend} index={i + 1} size={44} />
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, maxWidth: 52, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {friend.first_name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {loadingNotes && [1, 2].map(i => (
          <div key={i} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width: 36, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddNoteModal profile={profile} onClose={() => setShowAddModal(false)}
            onSaved={(text) => { setMyNote({ content: text, created_at: new Date().toISOString() }) }} />
        )}
        {replyTarget && (
          <ReplyNoteModal sender={replyTarget.sender} note={replyTarget.note}
            currentUserId={profile.id} onClose={() => setReplyTarget(null)} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.2} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}
