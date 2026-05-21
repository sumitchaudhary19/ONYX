import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, X, Send, ImagePlus, Video, ChevronDown } from 'lucide-react'
import { supabase } from '../supabaseClient'

const GRADS = ['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)','linear-gradient(135deg,#f59e0b,#f97316)','linear-gradient(135deg,#a855f7,#7c3aed)']

function Avatar({ profile, size = 36, index = 0 }) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User'
  const init = name.split(' ').map(s => s[0]?.toUpperCase()).join('') || '?'
  if (profile?.avatar_url)
    return <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  return <div className="rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ width: size, height: size, background: GRADS[index % GRADS.length] }}>{init}</div>
}

/* ── Create Post Modal ── */
function CreatePostModal({ currentProfile, onClose, onPosted }) {
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const pickFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const submit = async () => {
    if (!file) { setError('Please select a photo or video.'); return }
    setUploading(true); setError(null)
    try {
      const ext = file.name.split('.').pop()
      const path = `${currentProfile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('onyx_posts').upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('onyx_posts').getPublicUrl(path)
      const isVideo = file.type.startsWith('video/')
      const { data: post, error: postErr } = await supabase.from('posts').insert({
        user_id: currentProfile.id,
        media_url: publicUrl,
        media_type: isVideo ? 'video' : 'image',
        caption: caption.trim() || null,
      }).select('*').single()
      if (postErr) throw postErr
      onPosted(post)
      onClose()
    } catch (e) { console.error('[Feed] create post:', e); setError(e.message) }
    finally { setUploading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full max-w-[420px] bg-[#0a1428] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-[17px] font-bold text-white">New Post</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Media picker */}
        <div onClick={() => fileRef.current?.click()} className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${preview ? 'border-blue-500/30' : 'border-white/10 hover:border-blue-500/40'}`} style={{ minHeight: 220 }}>
          {preview ? (
            file?.type?.startsWith('video/')
              ? <video src={preview} className="w-full h-full object-cover max-h-[280px] rounded-2xl" controls />
              : <img src={preview} alt="" className="w-full max-h-[280px] object-cover rounded-2xl" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-500 p-8">
              <div className="flex gap-4">
                <ImagePlus className="w-8 h-8" />
                <Video className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium">Tap to upload photo or video</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
        </div>

        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption…" rows={3}
          className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-[#f0f4ff] text-sm resize-none outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500" />

        {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>}

        <motion.button onClick={submit} disabled={uploading} whileTap={{ scale: 0.97 }}
          className="py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
          {uploading ? 'Uploading…' : 'Share Post'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/* ── Share Post Modal ── */
function SharePostModal({ post, currentProfile, onClose }) {
  const [friends, setFriends] = useState([])
  const [sending, setSending] = useState(null)
  const [sent, setSent] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data: reqs } = await supabase.from('friend_requests').select('sender_id,receiver_id').eq('status', 'accepted').or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`)
      if (!reqs?.length) return
      const ids = reqs.map(r => r.sender_id === currentProfile.id ? r.receiver_id : r.sender_id)
      const { data } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id', ids)
      setFriends(data || [])
    }
    load()
  }, [currentProfile.id])

  const shareToFriend = async (friend) => {
    setSending(friend.id)
    const content = `📸 Check out this post! ${post.caption ? `"${post.caption}"` : ''}`
    await supabase.from('messages').insert({
      sender_id: currentProfile.id,
      receiver_id: friend.id,
      content,
      image_url: post.media_type === 'image' ? post.media_url : null,
    })
    setSent(prev => ({ ...prev, [friend.id]: true }))
    setSending(null)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-end justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-[460px] bg-[#0a1428] border border-white/10 rounded-3xl p-5 flex flex-col gap-3 shadow-2xl max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-[15px] font-bold text-white">Share with…</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400"><X className="w-3.5 h-3.5" /></button>
        </div>
        {friends.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No friends yet.</p>}
        {Array.isArray(friends) && friends.length > 0 && friends.map((f, i) => {
          const name = [f.first_name, f.last_name].filter(Boolean).join(' ')
          return (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <Avatar profile={f} size={38} index={i} />
              <p className="flex-1 text-[13px] font-semibold text-slate-100 truncate">{name}</p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => shareToFriend(f)} disabled={!!sent[f.id] || sending === f.id}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${sent[f.id] ? 'bg-green-500/20 text-green-400' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'}`}>
                {sent[f.id] ? 'Sent ✓' : sending === f.id ? '…' : 'Send'}
              </motion.button>
            </div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

/* ── Post Card ── */
export function PostCard({ post, currentProfile }) {
  const [liked, setLiked] = useState(post.user_liked || false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [author, setAuthor] = useState(post.profiles || null)
  const myId = currentProfile?.id

  useEffect(() => {
    if (!author && post.user_id) {
      supabase.from('profiles').select('id,first_name,last_name,avatar_url').eq('id', post.user_id).single().then(({ data }) => { if (data) setAuthor(data) })
    }
  }, [post.user_id])

  useEffect(() => {
    if (!showComments) return
    supabase.from('post_comments').select('id,content,created_at,user_id,profiles:user_id(first_name,last_name,avatar_url)').eq('post_id', post.id).order('created_at', { ascending: true })
      .then(({ data }) => setComments(data || []))
  }, [showComments, post.id])

  const toggleLike = async () => {
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', myId)
      setLiked(false); setLikeCount(c => c - 1)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: myId })
      setLiked(true); setLikeCount(c => c + 1)
    }
  }

  const addComment = async () => {
    const txt = commentText.trim(); if (!txt) return
    setCommentText('')
    const { data } = await supabase.from('post_comments').insert({ post_id: post.id, user_id: myId, content: txt }).select('id,content,created_at,user_id').single()
    if (data) setComments(prev => [...prev, { ...data, profiles: { first_name: currentProfile.firstName, last_name: currentProfile.lastName, avatar_url: currentProfile.avatarUrl } }])
  }

  const authorName = [author?.first_name, author?.last_name].filter(Boolean).join(' ') || 'User'
  const timeAgo = (ts) => {
    const diff = (Date.now() - new Date(ts)) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="w-full max-w-[540px] mx-auto bg-[#0d1830]/80 border border-white/8 rounded-3xl overflow-hidden shadow-xl backdrop-blur-sm mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar profile={author} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white truncate">{authorName}</p>
          <p className="text-[11px] text-slate-500">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      {/* Media */}
      {post.media_type === 'video'
        ? <video src={post.media_url} controls className="w-full max-h-[520px] object-cover bg-black" />
        : <img src={post.media_url} alt="" className="w-full max-h-[520px] object-cover" />
      }

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pt-3">
          <p className="text-[14px] text-slate-100 leading-relaxed"><span className="font-bold text-white">{authorName} </span>{post.caption}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 px-4 py-3">
        <motion.button whileTap={{ scale: 0.8 }} onClick={toggleLike} className="flex items-center gap-1.5">
          <motion.div animate={liked ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
            <Heart className={`w-6 h-6 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
          </motion.div>
          <span className={`text-sm font-semibold ${liked ? 'text-red-400' : 'text-slate-400'}`}>{likeCount}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowComments(v => !v)} className="flex items-center gap-1.5 text-slate-400 hover:text-blue-400 transition-colors">
          <MessageCircle className="w-6 h-6" />
          <span className="text-sm font-semibold">{comments.length || post.comment_count || 0}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowShare(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-violet-400 transition-colors ml-auto">
          <Share2 className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5">
            <div className="px-4 py-3 flex flex-col gap-3 max-h-[240px] overflow-y-auto">
              {comments.length === 0 && <p className="text-xs text-slate-500 text-center py-2">No comments yet. Be first!</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar profile={c.profiles} size={28} />
                  <div className="flex-1 bg-white/5 rounded-2xl px-3 py-2">
                    <p className="text-[12px] font-bold text-blue-300">{[c.profiles?.first_name, c.profiles?.last_name].filter(Boolean).join(' ')}</p>
                    <p className="text-[13px] text-slate-200">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-4 pb-3">
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a comment…"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500" />
              <motion.button whileTap={{ scale: 0.88 }} onClick={addComment}
                className="p-2.5 rounded-xl bg-blue-600 text-white flex-shrink-0">
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShare && <SharePostModal post={post} currentProfile={currentProfile} onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Main Feed View ── */
export default function Feed({ profile }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const myId = profile?.id
      const { data: rawPosts } = await supabase.from('posts').select('*,profiles:user_id(id,first_name,last_name,avatar_url)').order('created_at', { ascending: false }).limit(40)
      if (!rawPosts || !Array.isArray(rawPosts) || rawPosts.length === 0) { setPosts([]); setLoading(false); return }

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
        like_count: (likeMap[p.id] || []).length,
        user_liked: (likeMap[p.id] || []).includes(myId),
        comment_count: cntMap[p.id] || 0,
      }))
      setPosts(enriched)
      setLoading(false)
    }
    load()
  }, [profile?.id])

  const onPosted = (post) => setPosts(prev => [{ ...post, like_count: 0, user_liked: false, comment_count: 0 }, ...prev])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div>
          <h2 className="text-[17px] font-bold text-white">Posts</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">{posts.length} posts in your feed</p>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-violet-600 shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_28px_rgba(99,102,241,0.6)] transition-shadow">
          <ImagePlus className="w-4 h-4" /> New Post
        </motion.button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        {loading && (
          <div className="flex justify-center pt-10">
            <svg className="w-7 h-7 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-5xl">📸</div>
            <p className="text-base font-semibold text-slate-400">No posts yet</p>
            <p className="text-sm text-slate-500">Be the first to share something!</p>
          </div>
        )}
        {Array.isArray(posts) && posts.length > 0 && posts.map(p => p?.id ? <PostCard key={p.id} post={p} currentProfile={profile} /> : null)}
      </div>

      <AnimatePresence>
        {showCreate && <CreatePostModal currentProfile={profile} onClose={() => setShowCreate(false)} onPosted={onPosted} />}
      </AnimatePresence>
    </div>
  )
}
