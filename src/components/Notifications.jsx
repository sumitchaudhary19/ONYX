import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Check, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

/**
 * Notifications — subscribes to friend_requests inserts in real-time.
 * Shows a toast popup for each incoming request.
 */
export default function Notifications({ profile }) {
  const [requests, setRequests] = useState([]) // pending toasts
  const [senderCache, setSenderCache] = useState({}) // id → profile

  const fetchSender = async (senderId) => {
    if (senderCache[senderId]) return senderCache[senderId]
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, username, avatar_url')
      .eq('id', senderId)
      .single()
    if (data) setSenderCache(c => ({ ...c, [senderId]: data }))
    return data
  }

  /* ── Real-time subscription ── */
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel(`friend-requests-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${profile.id}`,
        },
        async (payload) => {
          const req = payload.new
          const sender = await fetchSender(req.sender_id)
          if (!sender) return
          setRequests(prev => [
            ...prev,
            { id: req.id, senderId: req.sender_id, sender },
          ])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile?.id])

  const dismiss = (id) => setRequests(prev => prev.filter(r => r.id !== id))

  const handleAction = async (reqId, action) => {
    try {
      await supabase
        .from('friend_requests')
        .update({ status: action }) // 'accepted' | 'declined'
        .eq('id', reqId)
    } catch (err) {
      console.error('Error updating request:', err)
    }
    dismiss(reqId)
  }

  return (
    <div style={{ position: 'fixed', top: '72px', right: '16px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px' }}>
      <AnimatePresence>
        {requests.map((req) => {
          const initials = [req.sender?.first_name, req.sender?.last_name]
            .filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?'

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                background: 'rgba(22,22,30,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Avatar */}
                {req.sender?.avatar_url ? (
                  <img src={req.sender.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '12px', objectFit: 'cover' }}/>
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserPlus style={{ width: 12, height: 12, color: '#60a5fa', flexShrink: 0 }}/>
                    <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Friend Request</span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[req.sender?.first_name, req.sender?.last_name].filter(Boolean).join(' ')}
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>@{req.sender?.username}</p>
                </div>
                {/* Dismiss */}
                <button
                  onClick={() => dismiss(req.id)}
                  style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                >
                  <X style={{ width: 14, height: 14 }}/>
                </button>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <motion.button
                  onClick={() => handleAction(req.id, 'accepted')}
                  whileTap={{ scale: 0.95 }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
                >
                  <Check style={{ width: 14, height: 14 }}/> Accept
                </motion.button>
                <motion.button
                  onClick={() => handleAction(req.id, 'declined')}
                  whileTap={{ scale: 0.95 }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <X style={{ width: 14, height: 14 }}/> Decline
                </motion.button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
