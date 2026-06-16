import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, UserPlus, Check, Clock, MoreVertical, ShieldOff, UserMinus, Share2, X, Play, Aperture } from 'lucide-react'
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

function StoryViewerModal({ story, currentProfile, onClose }) {
  useEffect(() => {
    async function logView() {
      if (!currentProfile?.id || !story?.id) return
      const { error } = await supabase.from('story_views').insert({
        story_id: story.id,
        viewer_id: currentProfile.id
      })
      if (error && error.code !== '23505') {
        console.error('Error logging view:', error)
      }
    }
    logView()
  }, [currentProfile?.id, story?.id])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex gap-1 flex-1 mr-4">
          <div className="h-1 bg-white/50 rounded-full flex-1 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 5 }} className="h-full bg-white" />
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md"><X className="w-5 h-5" /></button>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#0d0d0d]">
        {story?.media_type === 'video' ? (
          <video src={story?.media_url} autoPlay controls className="w-full h-full object-contain" />
        ) : (
          <img src={story?.media_url} alt="Story" className="w-full h-full object-contain" />
        )}
      </div>
    </motion.div>
  )
}

function FriendPickerModal({ title, currentProfile, onSelect, onClose }) {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!currentProfile?.id) return
      const { data: reqs } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`)
        
      if (!reqs || reqs.length === 0) { setFriends([]); setLoading(false); return }
      
      const ids = reqs.map(r => r?.sender_id === currentProfile.id ? r?.receiver_id : r?.sender_id).filter(Boolean)
      if (ids.length === 0) { setFriends([]); setLoading(false); return }

      const { data: profiles } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id', ids)
      setFriends(profiles || [])
      setLoading(false)
    }
    load()
  }, [currentProfile?.id])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[300] bg-black/75 flex items-end justify-center px-3 pb-6"
    >
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[460px] bg-gradient-to-b from-[#0d1630] to-[#080e22] border border-white/10 rounded-t-[24px] rounded-b-[20px] p-5 max-h-[70vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[15px] font-bold text-[#f0f4ff]">{title}</h3>
          <button onClick={onClose} className="bg-white/5 border-none rounded-lg p-1.5 cursor-pointer text-slate-400 flex"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="overflow-y-auto flex flex-col gap-1.5">
          {loading && <p className="text-slate-500 text-[13px] text-center p-5">Loading friends…</p>}
          {!loading && (!friends || friends.length === 0) && <p className="text-slate-500 text-[13px] text-center p-5">No friends yet.</p>}
          {friends && friends.length > 0 && friends.map((f, i) => {
            const name = [f?.first_name, f?.last_name].filter(Boolean).join(' ') || 'Unknown'
            const init = name.split(' ').map(s => s?.[0]?.toUpperCase()).join('') || '?'
            return (
              <motion.button key={f?.id} whileTap={{ scale: 0.97 }} onClick={() => onSelect(f)}
                className="flex items-center gap-3 p-2.5 rounded-[14px] bg-white/5 border border-white/5 cursor-pointer text-left">
                {f?.avatar_url
                  ? <img src={f.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                  : <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-[13px] font-bold text-white" style={{ background: GRADIENTS[i % GRADIENTS.length] }}>{init}</div>
                }
                <div>
                  <p className="text-[14px] font-semibold text-slate-100">{name}</p>
                  <p className="text-xs text-slate-400">@{f?.username || 'user'}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ExpandedPostModal({ post, currentProfile, onClose }) {
  if (!post) return null
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

// ── Premium Loading Skeleton ──
function ProfileSkeleton() {
  return (
    <div className="h-full w-full bg-[#0a0a12] flex flex-col overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="shrink-0 flex justify-between items-center px-5 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-white/10" />
        <div className="w-32 h-4 rounded-md bg-white/10" />
        <div className="w-8 h-8 rounded-xl bg-white/10" />
      </div>

      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 border-b border-white/5 pb-10">
          <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 w-full flex flex-col items-center md:items-start gap-4">
            <div className="w-48 h-6 rounded-md bg-white/10" />
            <div className="w-32 h-4 rounded-md bg-white/5" />
            
            <div className="flex items-center gap-8 md:gap-10 mt-2">
              <div className="flex flex-col items-center gap-2"><div className="w-8 h-6 rounded bg-white/10" /><div className="w-12 h-3 rounded bg-white/5" /></div>
              <div className="flex flex-col items-center gap-2"><div className="w-8 h-6 rounded bg-white/10" /><div className="w-12 h-3 rounded bg-white/5" /></div>
            </div>
            
            <div className="w-full md:w-64 h-10 rounded-xl bg-white/10 mt-4" />
          </div>
        </div>
        
        {/* Grid Skeleton */}
        <div className="grid grid-cols-3 gap-1 md:gap-2 mt-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-square bg-white/5 rounded-md md:rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UserProfile({ currentProfile }) {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requestStatus, setRequestStatus] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSharePicker, setShowSharePicker] = useState(false)
  const [toast, setToast] = useState(null)
  const [posts, setPosts] = useState([])
  const [friendCount, setFriendCount] = useState(0)
  const [expandedPost, setExpandedPost] = useState(null)
  const [activeStory, setActiveStory] = useState(null)
  const [showStoryViewer, setShowStoryViewer] = useState(false)

  const menuRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    function handler(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    async function load() {
      try {
        setIsLoading(true)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        
        const [
          { data: userData, error: userError },
          { count: fCount },
          { data: rawPosts },
          { data: storyData }
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('friend_requests').select('*', { count: 'exact', head: true })
            .eq('status', 'accepted').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
          supabase.from('posts').select('*,profiles:user_id(id,first_name,last_name,avatar_url)').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('stories').select('*').eq('user_id', userId).gt('created_at', twentyFourHoursAgo).neq('is_deleted', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ])

        if (userError || !userData) {
          setUser(null)
          return
        }
        
        setUser(userData)
        setFriendCount(fCount ?? 0)
        setActiveStory(storyData || null)

        if (rawPosts && Array.isArray(rawPosts) && rawPosts.length > 0) {
          const ids = rawPosts.map(p => p?.id).filter(Boolean)
          const [{ data: likes }, { data: commentCounts }] = await Promise.all([
            supabase.from('post_likes').select('post_id,user_id').in('post_id', ids),
            supabase.from('post_comments').select('post_id').in('post_id', ids),
          ])

          const likeMap = {}; const cntMap = {}
          ;(likes || []).forEach(l => { likeMap[l.post_id] = likeMap[l.post_id] || []; likeMap[l.post_id].push(l.user_id) })
          ;(commentCounts || []).forEach(c => { cntMap[c.post_id] = (cntMap[c.post_id] || 0) + 1 })

          const enriched = rawPosts.map(p => ({
            ...p,
            like_count: (likeMap[p?.id] || []).length,
            user_liked: currentProfile?.id ? (likeMap[p?.id] || []).includes(currentProfile.id) : false,
            comment_count: cntMap[p?.id] ?? 0,
          }))
          setPosts(enriched)
        } else {
          setPosts([])
        }
      } catch (err) {
        console.error('Error loading user:', err)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId, currentProfile?.id])

  useEffect(() => {
    if (!currentProfile?.id || !userId) return
    async function checkStatus() {
      try {
        const { data } = await supabase
          .from('friend_requests')
          .select('status')
          .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentProfile.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) setRequestStatus(data.status)
      } catch(err) {
        console.error('Status check error:', err)
      }
    }
    checkStatus()
  }, [currentProfile?.id, userId])

  const sendRequest = async () => {
    if (requestStatus || !currentProfile?.id || !userId) return
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

  const blockUser = async () => {
    setMenuOpen(false)
    if(!currentProfile?.id || !userId) return
    try {
      const { error } = await supabase.from('blocks').insert({ blocker_id: currentProfile.id, blocked_id: userId })
      if (error) throw error
      showToast('User blocked successfully.')
      setTimeout(() => navigate(-1), 1200)
    } catch (err) {
      showToast('Failed to block user.', 'error')
    }
  }

  const removeFriend = async () => {
    setMenuOpen(false)
    if(!currentProfile?.id || !userId) return
    try {
      const { error } = await supabase.from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentProfile.id})`)
      if (error) throw error
      setRequestStatus(null)
      setFriendCount(prev => Math.max(0, prev - 1))
      showToast('Friend removed.')
    } catch (err) {
      showToast('Failed to remove friend.', 'error')
    }
  }

  const shareProfileTo = async (friend) => {
    setShowSharePicker(false)
    if(!currentProfile?.id || !friend?.id || !userId) return
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: currentProfile.id,
        receiver_id: friend.id,
        content: null,
        is_profile_share: true,
        shared_profile_id: userId,
      })
      if (error) throw error
      showToast(`Profile shared with ${friend?.first_name || 'friend'}!`)
    } catch (err) {
      showToast('Failed to share profile.', 'error')
    }
  }

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (!user) {
    return (
      <div className="h-full w-full bg-[#0a0a12] flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <UserMinus className="w-10 h-10 text-slate-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-200 mb-1">User Not Found</h2>
          <p className="text-slate-500 text-sm max-w-[250px] mx-auto">This account may have been deleted or the link is invalid.</p>
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full transition-colors shadow-lg shadow-blue-500/20">
          Go Back
        </button>
      </div>
    )
  }

  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unknown'
  const initials = [user?.first_name, user?.last_name].filter(Boolean).map(s => s?.[0]?.toUpperCase()).join('') || '?'

  return (
    <div className="h-[100dvh] w-full bg-[#0a0a12] flex flex-col overflow-hidden relative">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500] px-5 py-2.5 rounded-xl text-[13px] font-bold backdrop-blur-xl border ${toast.type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shrink-0 flex justify-between items-center px-5 py-4 border-b border-white/5 bg-[#0a0a12]/80 backdrop-blur-xl z-10">
        <motion.button onClick={() => navigate(-1)} whileTap={{ scale: 0.92 }} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-slate-300 font-medium text-sm hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>
        <div className="font-bold text-white tracking-wide truncate max-w-[150px]">@{user?.username || 'user'}</div>
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

      <div className="flex-1 overflow-y-auto pb-20 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 p-6 md:p-10 border-b border-white/5">
            <div className="shrink-0 relative">
              <motion.div
                whileTap={activeStory ? { scale: 0.95 } : {}}
                onClick={activeStory ? () => setShowStoryViewer(true) : undefined}
                className={`w-24 h-24 md:w-36 md:h-36 rounded-full relative ${activeStory ? 'p-[3px] bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 cursor-pointer shadow-[0_0_20px_rgba(236,72,153,0.5)]' : 'border-[3px] border-[#0a0a12]'}`}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover border-[3px] border-[#0a0a12] shadow-inner" />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-4xl md:text-5xl font-bold text-white border-[3px] border-[#0a0a12] bg-gradient-to-br from-blue-500 to-purple-600">
                    {initials}
                  </div>
                )}
                {activeStory && (
                  <div className="absolute inset-0 bg-black/10 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white drop-shadow-md" fill="white" />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="flex-1 w-full flex flex-col items-center md:items-start gap-4">
              <div className="flex flex-col items-center md:items-start gap-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white text-center md:text-left">{userName}</h1>
                <p className="text-sm text-slate-400 font-medium">MNIT Jaipur {user?.btech_year ? `• ${user.btech_year}` : ''}</p>
              </div>
              
              <div className="flex items-center gap-8 md:gap-10 w-full justify-center md:justify-start">
                <div className="flex flex-col items-center">
                  <span className="text-xl md:text-2xl font-bold text-white">{posts?.length || 0}</span>
                  <span className="text-xs text-slate-400 font-medium">Posts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl md:text-2xl font-bold text-white">{friendCount || 0}</span>
                  <span className="text-xs text-slate-400 font-medium">Friends</span>
                </div>
              </div>

              {user?.bio && <p className="text-[14px] text-slate-300 text-center md:text-left max-w-sm whitespace-pre-wrap leading-relaxed">{user.bio}</p>}

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

          <div className="p-1 md:p-2">
            {!posts || !Array.isArray(posts) || posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center"><Aperture className="w-8 h-8 text-slate-600" /></div>
                <p className="text-lg font-bold text-slate-300">No Posts Yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {posts.map(post => {
                  if (!post?.id) return null
                  return (
                    <motion.div key={post.id} whileHover={{ opacity: 0.85 }} onClick={() => setExpandedPost(post)}
                      className="aspect-square relative cursor-pointer bg-slate-900 overflow-hidden rounded-md md:rounded-lg">
                      {post?.media_type === 'video' ? (
                        <>
                          <video src={post?.media_url} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"><Play className="w-3 h-3 text-white" fill="white" /></div>
                        </>
                      ) : (
                        <img src={post?.media_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSharePicker && <FriendPickerModal title={`Share ${user?.first_name || 'Profile'}`} currentProfile={currentProfile} onSelect={shareProfileTo} onClose={() => setShowSharePicker(false)} />}
        {expandedPost && <ExpandedPostModal post={expandedPost} currentProfile={currentProfile} onClose={() => setExpandedPost(null)} />}
        {showStoryViewer && activeStory && <StoryViewerModal story={activeStory} currentProfile={currentProfile} onClose={() => setShowStoryViewer(false)} />}
      </AnimatePresence>
    </div>
  )
}
