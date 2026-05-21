import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { PostCard } from './Feed'
import { Sparkles } from 'lucide-react'

export default function HomeFeed({ profile }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const myId = profile?.id
      if (!myId) return

      // Get friends
      const { data: reqs } = await supabase.from('friend_requests').select('sender_id,receiver_id').eq('status', 'accepted').or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      const friendIds = (reqs || []).map(r => r.sender_id === myId ? r.receiver_id : r.sender_id)

      if (friendIds.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      const { data: rawPosts } = await supabase.from('posts').select('*,profiles:user_id(id,first_name,last_name,avatar_url)').in('user_id', friendIds).order('created_at', { ascending: false }).limit(40)
      
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
        comment_count: cntMap[p.id] || 0,
      }))
      setPosts(enriched)
      setLoading(false)
    }
    load()
  }, [profile?.id])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-[#060b18] to-[#0a1428]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)] tracking-wide">HOME SCREEN</h2>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">LATEST FROM FRIENDS</p>
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
        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner">
              👥
            </div>
            <p className="text-lg font-bold text-slate-200">It's quiet here...</p>
            <p className="text-sm text-slate-500 max-w-[240px]">Add some friends to see their latest posts appear on your Home Screen!</p>
          </div>
        )}
        {posts.map(p => <PostCard key={p.id} post={p} currentProfile={profile} />)}
      </div>
    </div>
  )
}
