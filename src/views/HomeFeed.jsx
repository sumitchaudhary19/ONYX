import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { PostCard } from './Feed'
import { Sparkles, Aperture, Eye, X, Play, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

      // Load ALL public posts instead of just friends
      const { data: rawPosts } = await supabase
        .from('posts')
        .select('*,profiles:user_id(id,first_name,last_name,avatar_url)')
        .order('created_at', { ascending: false })
        .limit(40)
      
      if (!rawPosts || rawPosts.length === 0) { 
        setPosts([])
        setLoading(false)
        return 
      }

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

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-[#060b18] to-[#0a1428]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)] tracking-wide">GLOBAL FEED</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">LATEST FROM EVERYONE</p>
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
      </div>

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
