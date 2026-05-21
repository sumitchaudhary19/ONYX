import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, UserPlus, Check, Clock, MoreVertical, ShieldOff, UserMinus, Share2, X, Play } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { PostCard } from './Feed'

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

/* ── Expanded Post Modal ── */
function ExpandedPostModal({ post, currentProfile, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto pt-10 pb-10">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg mx-auto relative">
        <button onClick={onClose} className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <PostCard post={post} currentProfile={currentProfile} />
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
  const [posts, setPosts] = useState([])
  const [friendCount, setFriendCount] = useState(0)
  const [expandedPost, setExpandedPost] = useState(null)

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

  /* ── Fetch target user's profile, posts, and stats ── */
  useEffect(() => {
    if (!userId) return
    async function load() {
      try {
        setLoading(true)
        const [
          { data: userData, error: userError },
          { count: fCount },
          { data: rawPosts }
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase.from('friend_requests').select('*', { count: 'exact', head: true })
            .eq('status', 'accepted').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
          supabase.from('posts').select('*,profiles:user_id(id,first_name,last_name,avatar_url)').eq('user_id', userId).order('created_at', { ascending: false })
        ])

        if (userError || !userData) throw userError
        setUser(userData)
        setFriendCount(fCount || 0)

        // Enrich posts with like & comment counts
        if (rawPosts && rawPosts.length > 0) {
          const ids = rawPosts.map(p => p.id)
          const [{ data: likes }, { data: commentCounts }] = await Promise.all([
            supabase.from('post_likes').select('post_id,user_id').in('post_id', ids),
            supabase.from('post_comments').select('post_id').in('post_id', ids),
          ])

          const likeMap = {}; const cntMap = {}
          ;(likes || []).forEach(l => { likeMap[l.post_id] = likeMap[l.post_id] || []; likeMap[l.post_id].push(l.user_id) })
          ;(commentCounts || []).forEach(c => { cntMap[c.post_id] = (cntMap[c.post_id] || 0) + 1 })

          const enriched = rawPosts.map(p => ({
            ...p,
            like_count: (likeMap[p.id] || []).length,
            user_liked: (likeMap[p.id] || []).includes(currentProfile?.id),
            comment_count: cntMap[p.id] || 0,
          }))
          setPosts(enriched)
        } else {
          setPosts([])
        }
      } catch (err) {
        console.error('Error loading user:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, currentProfile?.id])

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

  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  return (
    <div style={{ height: '100vh', width: '100%', background: '#0a0a12', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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
      <div className="shrink-0 flex justify-between items-center px-5 py-4 border-b border-white/5 bg-[#0a0a12]/80 backdrop-blur-xl z-10">
        <motion.button onClick={() => navigate(-1)} whileTap={{ scale: 0.92 }} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-slate-300 font-medium text-sm hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>
        <div className="font-bold text-white tracking-wide">@{user.username}</div>
        <div ref={menuRef} className="relative">
          <motion.button onClick={() => setMenuOpen(v => !v)} whileTap={{ scale: 0.88 }} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <MoreVertical className="w-4 h-4" />
          </motion.button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.88, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: -8 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-11 right-0 w-48 bg-gradient-to-b from-[#0d1630] to-[#080e22] border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl">
                {[
                  { icon: ShieldOff, label: 'Block', color: '#f87171', action: blockUser },
                  { icon: UserMinus, label: 'Unfriend', color: '#fb923c', action: removeFriend },
                  { icon: Share2, label: 'Share Profile', color: '#60a5fa', action: () => { setMenuOpen(false); setShowSharePicker(true) } },
                ].map(({ icon: Icon, label, color, action }) => (
                  <motion.button key={label} onClick={action} className="w-full flex items-center gap-3 px-4 py-3 bg-transparent hover:bg-white/5 border-none cursor-pointer transition-colors" style={{ color }}>
                    <Icon className="w-4 h-4" /><span className="text-[14px] font-medium">{label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20 relative">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header (Instagram style) */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 p-6 md:p-10 border-b border-white/5">
            {/* Avatar */}
            <div className="shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-24 h-24 md:w-36 md:h-36 rounded-full object-cover border-[3px] border-[#0a0a12] shadow-[0_0_0_3px_rgba(37,99,235,0.4),0_10px_30px_rgba(0,0,0,0.5)]" />
              ) : (
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-full flex items-center justify-center text-4xl md:text-5xl font-bold text-white border-[3px] border-[#0a0a12] shadow-[0_0_0_3px_rgba(37,99,235,0.4)] bg-gradient-to-br from-blue-500 to-purple-600">
                  {initials}
                </div>
              )}
            </div>

            <div className="flex-1 w-full flex flex-col items-center md:items-start gap-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center md:text-left">{userName}</h1>
              
              {/* Stats */}
              <div className="flex items-center gap-8 md:gap-10 w-full justify-center md:justify-start">
                <div className="flex flex-col items-center">
                  <span className="text-xl md:text-2xl font-bold text-white">{posts.length}</span>
                  <span className="text-xs text-slate-400 font-medium">Posts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl md:text-2xl font-bold text-white">{friendCount}</span>
                  <span className="text-xs text-slate-400 font-medium">Friends</span>
                </div>
              </div>

              {/* Bio */}
              {user.bio && <p className="text-[14px] text-slate-300 text-center md:text-left max-w-sm whitespace-pre-wrap leading-relaxed">{user.bio}</p>}

              {/* Add Friend Button */}
              <motion.button
                id="btn-add-friend"
                onClick={sendRequest}
                disabled={!!requestStatus || requestStatus === 'sending'}
                whileTap={!requestStatus ? { scale: 0.97 } : {}}
                className={`w-full md:w-auto px-6 py-2.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${
                  requestStatus === 'accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  requestStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.3)] hover:bg-blue-500'
                }`}
              >
                {requestStatus === 'accepted' ? <><Check className="w-4 h-4" /> Friends</>
                  : requestStatus === 'pending' ? <><Clock className="w-4 h-4" /> Request Sent</>
                    : requestStatus === 'sending' ? 'Sending…'
                      : <><UserPlus className="w-4 h-4" /> ADD AS FRIEND</>}
              </motion.button>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="p-1 md:p-2">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center"><Camera className="w-8 h-8 text-slate-600" /></div>
                <p className="text-lg font-bold text-slate-300">No Posts Yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {posts.map(post => (
                  <motion.div key={post.id} whileHover={{ opacity: 0.85 }} onClick={() => setExpandedPost(post)}
                    className="aspect-square relative cursor-pointer bg-slate-900 overflow-hidden rounded-md md:rounded-lg">
                    {post.media_type === 'video' ? (
                      <>
                        <video src={post.media_url} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"><Play className="w-3 h-3 text-white" fill="white" /></div>
                      </>
                    ) : (
                      <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSharePicker && <FriendPickerModal title={`Share ${user.first_name}'s profile`} currentProfile={currentProfile} onSelect={shareProfileTo} onClose={() => setShowSharePicker(false)} />}
        {expandedPost && <ExpandedPostModal post={expandedPost} currentProfile={currentProfile} onClose={() => setExpandedPost(null)} />}
      </AnimatePresence>
    </div>
  )
}
