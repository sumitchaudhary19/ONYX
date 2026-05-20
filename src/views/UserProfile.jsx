import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, UserPlus, Check, Clock, MoreVertical, ShieldOff, UserMinus, Share2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const GRADIENTS = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#ef4444,#f43f5e)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
]

/* ── Friend picker for Share Profile ── */
function FriendPickerModal({ title, currentProfile, onSelect, onClose }) {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: reqs } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`)
      if (!reqs?.length) { setFriends([]); setLoading(false); return }
      const ids = reqs.map(r => r.sender_id === currentProfile.id ? r.receiver_id : r.sender_id)
      const { data: profiles } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id', ids)
      setFriends(profiles || [])
      setLoading(false)
    }
    load()
  }, [currentProfile.id])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 12px 24px' }}
    >
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '460px', background: 'linear-gradient(180deg,#0d1630,#080e22)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 20px 20px', padding: '20px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f0f4ff' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading && <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading friends…</p>}
          {!loading && friends.length === 0 && <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No friends yet.</p>}
          {friends.map((f, i) => {
            const name = [f.first_name, f.last_name].filter(Boolean).join(' ')
            const init = name.split(' ').map(s => s[0]?.toUpperCase()).join('') || '?'
            return (
              <motion.button key={f.id} whileTap={{ scale: 0.97 }} onClick={() => onSelect(f)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left' }}>
                {f.avatar_url
                  ? <img src={f.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 38, height: 38, borderRadius: '12px', flexShrink: 0, background: GRADIENTS[i % GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>{init}</div>
                }
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{name}</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>@{f.username}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function UserProfile({ currentProfile }) {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requestStatus, setRequestStatus] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSharePicker, setShowSharePicker] = useState(false)
  const [toast, setToast] = useState(null)
  const menuRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  /* ── Close menu on outside click ── */
  useEffect(() => {
    function handler(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Fetch target user's profile ── */
  useEffect(() => {
    if (!userId) return
    async function load() {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (error || !data) throw error
        setUser(data)
      } catch (err) {
        console.error('Error loading user:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  /* ── Check friend request status ── */
  useEffect(() => {
    if (!currentProfile?.id || !userId) return
    async function checkStatus() {
      const { data } = await supabase
        .from('friend_requests')
        .select('status')
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentProfile.id})`)
        .single()
      if (data) setRequestStatus(data.status)
    }
    checkStatus()
  }, [currentProfile?.id, userId])

  const sendRequest = async () => {
    if (requestStatus) return
    setRequestStatus('sending')
    try {
      const { error } = await supabase.from('friend_requests').insert({ sender_id: currentProfile.id, receiver_id: userId, status: 'pending' })
      if (error) throw error
      setRequestStatus('pending')
    } catch (err) {
      console.error('Error sending request:', err)
      setRequestStatus(null)
    }
  }

  /* ── Block user ── */
  const blockUser = async () => {
    setMenuOpen(false)
    try {
      const { error } = await supabase.from('blocks').insert({ blocker_id: currentProfile.id, blocked_id: userId })
      if (error) throw error
      showToast('User blocked successfully.')
      setTimeout(() => navigate(-1), 1200)
    } catch (err) {
      showToast('Failed to block user.', 'error')
    }
  }

  /* ── Remove friend ── */
  const removeFriend = async () => {
    setMenuOpen(false)
    try {
      const { error } = await supabase.from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentProfile.id})`)
      if (error) throw error
      setRequestStatus(null)
      showToast('Friend removed.')
    } catch (err) {
      showToast('Failed to remove friend.', 'error')
    }
  }

  /* ── Share profile to a friend ── */
  const shareProfileTo = async (friend) => {
    setShowSharePicker(false)
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: currentProfile.id,
        receiver_id: friend.id,
        content: null,
        is_profile_share: true,
        shared_profile_id: userId,
      })
      if (error) throw error
      showToast(`Profile shared with ${friend.first_name}!`)
    } catch (err) {
      showToast('Failed to share profile.', 'error')
    }
  }

  const initials = user
    ? [user.first_name, user.last_name].filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?'
    : '?'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg className="animate-spin" style={{ width: 36, height: 36, color: '#3b82f6' }} fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.75 }} />
        </svg>
        <style>{`.animate-spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <p style={{ color: '#64748b', fontSize: '16px' }}>User not found.</p>
        <button onClick={() => navigate(-1)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Go Back</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0d0d0d', display: 'flex', flexDirection: 'column' }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 500, padding: '10px 20px', borderRadius: '12px', background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, color: toast.type === 'error' ? '#f87171' : '#34d399', fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(16px)' }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row with back + hamburger */}
      <div style={{ padding: '16px 20px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={{ scale: 0.92 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px 14px', color: '#cbd5e1', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back
        </motion.button>

        {/* Hamburger menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <motion.button
            onClick={() => setMenuOpen(v => !v)}
            whileTap={{ scale: 0.88 }}
            style={{ width: 38, height: 38, borderRadius: '12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
          >
            <MoreVertical style={{ width: 18, height: 18 }} />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: 'absolute', top: '46px', right: 0, width: '210px', background: 'linear-gradient(180deg,#0d1630,#080e22)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', overflow: 'hidden', zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
              >
                {[
                  { icon: ShieldOff, label: 'Block this user', color: '#f87171', action: blockUser },
                  { icon: UserMinus, label: 'Remove as friend', color: '#fb923c', action: removeFriend },
                  { icon: Share2, label: 'Share this profile', color: '#60a5fa', action: () => { setMenuOpen(false); setShowSharePicker(true) } },
                ].map(({ icon: Icon, label, color, action }) => (
                  <motion.button key={label} onClick={action} whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color }}>
                    <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profile card */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 24px 40px' }}>
        <div style={{ width: '100%', maxWidth: '420px', borderRadius: '28px', background: 'linear-gradient(160deg,rgba(37,99,235,0.18) 0%,rgba(13,13,13,0) 60%)', padding: '40px 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Avatar */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: '20px' }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} style={{ width: '100px', height: '100px', borderRadius: '28px', objectFit: 'cover', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '28px', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 800, color: '#fff', boxShadow: '0 12px 40px rgba(37,99,235,0.35)' }}>
                {initials}
              </div>
            )}
          </motion.div>

          {/* Name & username */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {[user.first_name, user.last_name].filter(Boolean).join(' ')}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>@{user.username}</p>
          </motion.div>

          {/* Bio */}
          {user.bio && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px', maxWidth: '300px' }}>
              {user.bio}
            </motion.p>
          )}

          {/* ADD AS FRIEND button */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} style={{ width: '100%' }}>
            <motion.button
              id="btn-add-friend"
              onClick={sendRequest}
              disabled={!!requestStatus || requestStatus === 'sending'}
              whileHover={!requestStatus ? { scale: 1.03, y: -2 } : {}}
              whileTap={!requestStatus ? { scale: 0.97 } : {}}
              style={{
                width: '100%', padding: '15px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.18)',
                background: requestStatus === 'accepted' ? 'rgba(16,185,129,0.15)' : requestStatus === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                color: requestStatus === 'accepted' ? '#34d399' : requestStatus === 'pending' ? '#fbbf24' : '#fff',
                fontSize: '15px', fontWeight: 700, cursor: requestStatus ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: requestStatus ? 'none' : '0 8px 32px rgba(0,0,0,0.3)', transition: 'all 0.3s ease',
              }}
            >
              {requestStatus === 'accepted' ? <><Check style={{ width: 18, height: 18 }} /> Friends</>
                : requestStatus === 'pending' ? <><Clock style={{ width: 18, height: 18 }} /> Request Sent</>
                  : requestStatus === 'sending' ? 'Sending…'
                    : <><UserPlus style={{ width: 18, height: 18 }} /> ADD AS FRIEND</>}
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Friend Picker for Share */}
      <AnimatePresence>
        {showSharePicker && (
          <FriendPickerModal
            title={`Share ${user.first_name}'s profile`}
            currentProfile={currentProfile}
            onSelect={shareProfileTo}
            onClose={() => setShowSharePicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
