import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { PostCard } from './Feed'
import { Sparkles, Aperture, Eye, X, Play, Trash2, Users, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCampusAcronym } from '../utils/campusUtils'

function StoryViewsModal({ story, onClose }) {
  const [views, setViews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('story_views')
        .select('viewer_id, profiles:viewer_id(id, first_name, last_name, username, avatar_url), viewed_at')
        .eq('story_id', story.id)
        .order('viewed_at', { ascending: false })
      
      setViews(data || [])
      setLoading(false)
    }
    load()
  }, [story.id])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full h-2/3 bg-gradient-to-t from-[#060b18] to-[#0a1428] rounded-t-3xl border-t border-white/10 flex flex-col p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
          <h3 className="text-white font-bold text-lg flex items-center gap-2"><Eye className="w-5 h-5 text-slate-400" /> Story Views ({views.length})</h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3">
          {loading ? (
            <div className="text-center py-10 text-slate-500">Loading views...</div>
          ) : views.length > 0 ? (
            views.map(v => {
              const p = v.profiles
              if (!p) return null
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
              return (
                <div key={v.viewer_id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">{(name[0]||'?').toUpperCase()}</div>
                  )}
                  <div className="flex-1">
                    <p className="text-white font-semibold text-[15px]">{name}</p>
                    <p className="text-slate-400 text-xs">@{p.username}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-10 text-slate-500">No views yet.</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function OwnStoryModal({ story, onClose, onDelete }) {
  const [showViews, setShowViews] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if(!window.confirm("Delete this story?")) return
    setDeleting(true)
    // Try hard delete first, fall back to soft-delete
    let error = null
    const { error: delErr } = await supabase.from('stories').delete().eq('id', story.id)
    if (delErr) {
      // Fallback: soft-delete
      const { error: updErr } = await supabase.from('stories').update({ is_deleted: true }).eq('id', story.id)
      error = updErr
    }
    setDeleting(false)
    if (!error && !delErr) {
      if (onDelete) onDelete()
      onClose()
    } else if (!error) {
      // soft-delete succeeded
      if (onDelete) onDelete()
      onClose()
    } else {
      alert("Failed to delete story: " + (error?.message || "Unknown error"))
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex gap-1 flex-1 mr-4">
          <div className="h-1 bg-white/50 rounded-full flex-1 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 5 }} onAnimationComplete={onClose} className="h-full bg-white" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDelete} disabled={deleting} className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md hover:bg-red-500/80 transition-colors"><Trash2 className="w-5 h-5" /></button>
          <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md"><X className="w-5 h-5" /></button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#0d0d0d]">
        {story.media_type === 'video' ? (
          <video src={story.media_url} autoPlay controls className="w-full h-full object-contain" />
        ) : (
          <img src={story.media_url} alt="Story" className="w-full h-full object-contain" />
        )}
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
        <button onClick={() => setShowViews(true)} className="flex items-center gap-2 px-5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full text-white font-semibold text-sm hover:bg-black/70 transition-colors shadow-lg">
          <Eye className="w-4 h-4" /> View Count
        </button>
      </div>

      <AnimatePresence>
        {showViews && <StoryViewsModal story={story} onClose={() => setShowViews(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

export default function HomeFeed({ profile }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStory, setActiveStory] = useState(null)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [followingAll, setFollowingAll] = useState(false)
  const [followedSet, setFollowedSet] = useState(new Set())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const myId = profile?.id
      if (!myId) return

      // Load own active story
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: storyData } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', myId)
        .gt('created_at', twentyFourHoursAgo)
        .neq('is_deleted', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (storyData) {
        setActiveStory(storyData)
      } else {
        setActiveStory(null)
      }

      // Load ALL public posts instead
      let postsQuery = supabase
        .from('posts')
        .select('*,profiles:user_id(id,first_name,last_name,avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (profile?.tenant_id) {
        postsQuery = postsQuery.eq('tenant_id', profile.tenant_id)
      } else {
        postsQuery = postsQuery.is('tenant_id', null)
      }
      
      const { data: rawPosts } = await postsQuery
      
      if (!rawPosts || rawPosts.length === 0) { 
        setPosts([])
        setHasMore(false)
        setLoading(false)
        return 
      }
      if (rawPosts.length < 20) setHasMore(false)

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
        user_liked: (likeMap[p.id] || []).includes(myId),
        comment_count: cntMap[p.id] ?? 0,
      }))
      setPosts(enriched)
      setLoading(false)
    }
    load()
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    const hasSeen = localStorage.getItem(`onyx_suggestions_seen_${profile.id}`)
    if (!hasSeen) {
      fetchSuggestions()
    }
  }, [profile?.id])

  async function fetchSuggestions() {
    try {
      let query = supabase.from('profiles')
        .select('id, first_name, last_name, username, avatar_url, branch, btech_year, section')
        .neq('id', profile.id)
      
      if (profile?.tenant_id) {
        query = query.eq('tenant_id', profile.tenant_id)
      } else {
        query = query.is('tenant_id', null)
      }

      if (profile.branch) query = query.eq('branch', profile.branch)
      if (profile.btech_year === '1st Year' && profile.section) {
        query = query.eq('section', profile.section)
      }
      
      const { data } = await query.limit(10)
      if (data && data.length > 0) {
        setSuggestions(data)
        setShowSuggestions(true)
      } else {
        // Mark as seen even if no suggestions
        localStorage.setItem(`onyx_suggestions_seen_${profile.id}`, 'true')
      }
    } catch (err) {
      console.error('[HomeFeed] fetchSuggestions:', err)
    }
  }

  async function followAll() {
    setFollowingAll(true)
    try {
      const requests = suggestions
        .filter(s => !followedSet.has(s.id))
        .map(s => ({
          sender_id: profile.id,
          receiver_id: s.id,
          status: 'pending'
        }))
      if (requests.length > 0) {
        await supabase.from('friend_requests').insert(requests)
      }
    } catch (err) {
      console.error('[HomeFeed] followAll:', err)
    }
    localStorage.setItem(`onyx_suggestions_seen_${profile.id}`, 'true')
    setFollowingAll(false)
    setShowSuggestions(false)
  }

  async function followSingleUser(userId) {
    try {
      await supabase.from('friend_requests').insert({
        sender_id: profile.id,
        receiver_id: userId,
        status: 'pending'
      })
      setFollowedSet(prev => new Set(prev).add(userId))
    } catch (err) {
      console.error('[HomeFeed] followSingleUser:', err)
    }
  }

  function dismissSuggestions() {
    localStorage.setItem(`onyx_suggestions_seen_${profile.id}`, 'true')
    setShowSuggestions(false)
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const myId = profile?.id
      let postsQuery = supabase
        .from('posts')
        .select('*,profiles:user_id(id,first_name,last_name,avatar_url)')
        .order('created_at', { ascending: false })
        .range(posts.length, posts.length + 19)

      if (profile?.tenant_id) {
        postsQuery = postsQuery.eq('tenant_id', profile.tenant_id)
      } else {
        postsQuery = postsQuery.is('tenant_id', null)
      }

      const { data: rawPosts } = await postsQuery
      
      if (!rawPosts || rawPosts.length === 0) { 
        setHasMore(false)
        return 
      }
      if (rawPosts.length < 20) setHasMore(false)
      
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
        user_liked: (likeMap[p.id] || []).includes(myId),
        comment_count: cntMap[p.id] ?? 0,
      }))
      
      setPosts(prev => [...prev, ...enriched])
    } catch (e) {
      console.error('[HomeFeed] loadMore:', e)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-[#060b18] to-[#0a1428]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)] tracking-wide">
              {getCampusAcronym(profile?.tenant_id)} FEED
            </h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              LATEST FROM {getCampusAcronym(profile?.tenant_id)}
            </p>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pb-20">
        {loading && (
          <div className="flex justify-center pt-10">
            <svg className="w-8 h-8 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
        {!loading && (!posts || posts.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner">
              🌍
            </div>
            <p className="text-lg font-bold text-slate-200">It's quiet here...</p>
            <p className="text-sm text-slate-500 max-w-[240px]">Be the first to post something globally!</p>
          </div>
        )}
        {posts && posts.length > 0 && posts.map(p => <PostCard key={p.id} post={p} currentProfile={profile} />)}
        
        {hasMore && posts.length > 0 && (
          <motion.button 
            onClick={loadMore} 
            disabled={loadingMore} 
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 mt-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            {loadingMore ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : 'Load More'}
          </motion.button>
        )}
      </div>

      {/* Smart Follow Suggestions Modal */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl"
              style={{ background: 'linear-gradient(180deg, #0d1630 0%, #080e22 100%)', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.15)' }}>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.5)]">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-white">Find Your Batchmates</h3>
                    <p className="text-[11px] text-slate-400">People from your branch{profile.section ? ` · Section ${profile.section}` : ''}</p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={dismissSuggestions}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* User list */}
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 mb-5">
                {suggestions.map((s, i) => {
                  const name = [s.first_name, s.last_name].filter(Boolean).join(' ')
                  const initials = [s.first_name, s.last_name].filter(Boolean).map(n => n[0]?.toUpperCase()).join('')
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">{initials}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-slate-100 truncate">{name}</p>
                        <p className="text-[11px] text-slate-500">@{s.username || '\u2014'} • {s.branch || ''}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); followSingleUser(s.id); }}
                        disabled={followedSet.has(s.id)}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 ${
                          followedSet.has(s.id)
                            ? 'bg-white/10 text-gray-300 cursor-default border border-white/5'
                            : 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] cursor-pointer'
                        }`}
                      >
                        {followedSet.has(s.id) ? 'Following' : 'Follow'}
                      </button>
                    </motion.div>
                  )
                })}
              </div>

              {/* Follow All Button */}
              <motion.button
                onClick={followAll}
                disabled={followingAll}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-2xl border-none text-[14px] font-bold text-white flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  boxShadow: '0 8px 24px rgba(37,99,235,0.4), 0 0 40px rgba(124,58,237,0.2)',
                }}>
                {followingAll ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Sending Requests…</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Follow All Batchmates</>
                )}
              </motion.button>

              <button onClick={dismissSuggestions}
                className="w-full mt-3 py-2 text-[12px] text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer transition-colors">
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Own Story FAB */}
      <AnimatePresence>
        {activeStory && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: -20 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowStoryViewer(true)}
            className="fixed bottom-24 md:bottom-10 left-6 z-[450] w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-[3px] shadow-[0_0_24px_rgba(236,72,153,0.6)] cursor-pointer"
          >
            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden relative bg-[#0d0d0d]">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="My Story" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-lg bg-blue-600">
                  {(profile?.firstName?.[0] ?? 'M').toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Aperture className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStoryViewer && activeStory && (
          <OwnStoryModal story={activeStory} onClose={() => setShowStoryViewer(false)} onDelete={() => setActiveStory(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
