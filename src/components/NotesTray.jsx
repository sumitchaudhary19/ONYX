import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { supabase } from '../supabaseClient'

// -- Smart emoji keyword map ------------------------------------------------
export function getSmartEmojis(text = '') {
  const t = text.toLowerCase()
  if (/exam|test|midsem|assignment|sheet/.test(t))  return ['??', '??', '??', '??']
  if (/party|weekend|trip|night/.test(t))           return ['??', '??', '??', '??']
  if (/mess|food|nescafe|hungry/.test(t))           return ['??', '?', '??', '??']
  return ['??', '??', '??', '??', '??']
}

// -- Campus quick-chips ------------------------------------------------------
const CAMPUS_CHIPS = [
  { label: '?? VLTC',    text: 'at VLTC'    },
  { label: '? Nescafe', text: 'at Nescafe' },
  { label: '?? Library', text: 'at Library' },
  { label: '?? Bunking', text: 'bunking'    },
  { label: '?? Mess',    text: 'at Mess'    },
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
    <div style={{
      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
      marginBottom: 8, zIndex: 10, pointerEvents: 'none'
    }}>
      <div style={{
        background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
        padding: '6px 10px', fontSize: 11, fontWeight: 500, color: '#e2e8f0',
        lineHeight: 1.4, textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120
      }}>
        {text}
      </div>
      <div style={{
        width: 0, height: 0, margin: '0 auto',
        borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
        borderTop: '5px solid rgba(255,255,255,0.12)'
      }} />
    </div>
  )
}

function AddNoteModal({ profile, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChip = (chipText) => {
    const joined = text ? `${text} ${chipText}` : chipText
    setText(joined.slice(0, 60))
  }

  const handleSave = async () => {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await supabase.from('notes').delete().eq('user_id', profile.id)
      const { error } = await supabase.from('notes').insert({ user_id: profile.id, content: trimmed })
      if (error) throw error
      onSaved(trimmed)
      onClose()
    } catch (err) {
      console.error('[NotesTray] save:', err)
    } finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
      <motion.div initial={{ scale: 0.88, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 30 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(180deg,#0d1630 0%,#080e22 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Add a Note</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Vanishes in 24 hours ?</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative', paddingTop: 40 }}>
          {text && <NoteBubble text={text} />}
          <div style={{ padding: 2, borderRadius: '50%', background: text ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
            <Avatar profile={profile} size={52} />
          </div>
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input autoFocus type="text" maxLength={60} placeholder="What's on your mind? (60 chars)"
            value={text} onChange={e => setText(e.target.value)}
            style={{ width: '100%', padding: '13px 50px 13px 16px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#f1f5f9', fontSize: 14, outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(59,130,246,0.08)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }} />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: text.length >= 50 ? '#f87171' : '#64748b' }}>{text.length}/60</span>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
          {CAMPUS_CHIPS.map(chip => (
            <button key={chip.label} onClick={() => handleChip(chip.text)}
              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>{chip.label}</button>
          ))}
        </div>
        <button onClick={handleSave} disabled={!text.trim() || saving}
          style={{ width: '100%', padding: '13px 24px', background: text.trim() ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 14, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: saving ? 0.6 : 1, boxShadow: text.trim() ? '0 8px 24px rgba(59,130,246,0.35)' : 'none' }}>
          {saving ? 'Sharing…' : 'Share Note ?'}
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
          <input autoFocus type="text" placeholder="Send a reply…" value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendReply(reply) }}
            style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#f1f5f9', fontSize: 14, outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = '#3b82f6' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendReply(reply)} disabled={!reply.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 14, background: reply.trim() ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.07)', border: 'none', cursor: reply.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: reply.trim() ? '0 4px 16px rgba(59,130,246,0.4)' : 'none' }}>
            ?
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
        {/* Own slot */}
        <motion.div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
          onClick={() => myNote ? handleDeleteNote() : setShowAddModal(true)}>
          <div style={{ position: 'relative', paddingTop: myNote ? 42 : 0 }}>
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
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
              onClick={() => setReplyTarget({ sender: friend, note })}>
              <div style={{ position: 'relative', paddingTop: 42 }}>
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
            onSaved={(text) => setMyNote({ content: text, created_at: new Date().toISOString() })} />
        )}
        {replyTarget && (
          <ReplyNoteModal sender={replyTarget.sender} note={replyTarget.note}
            currentUserId={profile.id} onClose={() => setReplyTarget(null)} />
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:.2}}`}</style>
    </>
  )
}
