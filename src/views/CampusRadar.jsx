import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, X, MapPin, Clock, Camera, ChevronRight, Send,
  CreditCard, Smartphone, BookOpen, Key, Watch, AlertTriangle,
  Check, Lock, UserPlus, MessageCircle, Loader2, Crosshair, ImagePlus
} from 'lucide-react'
import { supabase } from '../supabaseClient'

// ── Constants ──
const CATEGORIES = [
  { key: 'All', label: 'All', icon: null },
  { key: 'ID & Wallets', label: 'ID & Wallets', emoji: '\u{1F4B3}', icon: CreditCard, color: '#60a5fa' },
  { key: 'Electronics', label: 'Electronics', emoji: '\u{1F4F1}', icon: Smartphone, color: '#a78bfa' },
  { key: 'Books & Notes', label: 'Books & Notes', emoji: '\u{1F4DA}', icon: BookOpen, color: '#34d399' },
  { key: 'Keys', label: 'Keys', emoji: '\u{1F511}', icon: Key, color: '#fbbf24' },
  { key: 'Accessories', label: 'Accessories', emoji: '\u{231A}', icon: Watch, color: '#f472b6' },
]

const LOCATIONS = [
  'All', 'PMC', 'VLTC', 'Prabha Bhawan', 'Day Canteen', 'Night Canteen',
  'OAT Ground', 'OAT Back Stage', 'Central Lawn', 'Library'
]

function relativeTime(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function CampusRadar({ profile, session }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('All')
  const [locFilter, setLocFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDrop, setShowSearchDrop] = useState(false)
  const [showFAB, setShowFAB] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState('lost')
  const [claimPost, setClaimPost] = useState(null)
  const [toast, setToast] = useState(null)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Clear notification blinker on mount ──
  useEffect(() => {
    localStorage.setItem('onyx_radar_new', 'false')
  }, [])

  // ── Load posts ──
  useEffect(() => {
    loadPosts()
    const channel = supabase.channel('radar-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_radar' }, () => {
        loadPosts()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('campus_radar')
      .select('*, owner:owner_id(id,first_name,last_name,avatar_url,username)')
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
    if (error) console.error('[Radar] load error:', error)
    setLoading(false)
  }

  // ── Search with debounce ──
  const handleSearch = (val) => {
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) { setSearchResults([]); setShowSearchDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from('campus_radar')
        .select('id,title,location,post_type')
        .neq('status', 'resolved')
        .or(`title.ilike.%${val.trim()}%,location.ilike.%${val.trim()}%`)
        .limit(8)
      if (data) {
        setSearchResults(data)
        setShowSearchDrop(data.length > 0)
      }
    }, 300)
  }

  // ── Filtered posts ──
  const filtered = posts.filter(p => {
    if (catFilter !== 'All' && p.category !== catFilter) return false
    if (locFilter !== 'All' && p.location !== locFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!p.title.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── Claim handler ──
  const handleClaim = async (post) => {
    try {
      await supabase.from('campus_radar')
        .update({ status: 'pending_verification', claimer_id: profile.id })
        .eq('id', post.id)
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'pending_verification', claimer_id: profile.id } : p))
      setClaimPost({ ...post, status: 'pending_verification', claimer_id: profile.id })
    } catch (err) {
      showToast('Claim failed: ' + err.message)
    }
  }

  // ── Resolve handler (owner marks recovered) ──
  const handleResolve = async (postId) => {
    try {
      await supabase.from('campus_radar')
        .update({ status: 'resolved' })
        .eq('id', postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
      showToast('Item marked as recovered!')
    } catch (err) {
      showToast('Failed: ' + err.message)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#060b18] relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(248,113,113,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="flex-1 overflow-y-auto relative z-10 pb-24">
        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Campus Radar</h2>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase">Lost & Found</p>
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="relative mb-3" ref={searchRef}>
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 backdrop-blur-sm">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchDrop(true)}
                onBlur={() => setTimeout(() => setShowSearchDrop(false), 200)}
                placeholder="Search items, locations..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDrop(false) }}>
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>

            {/* Search dropdown */}
            <AnimatePresence>
              {showSearchDrop && searchResults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden max-h-[240px] overflow-y-auto">
                  {searchResults.map(r => (
                    <button key={r.id} onClick={() => { setSearchQuery(r.title); setShowSearchDrop(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/[0.04] last:border-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${r.post_type === 'lost' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {r.post_type === 'lost' ? '!' : '\u2713'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{r.title}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{r.location}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Filter Row 1: Categories ── */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setCatFilter(cat.key)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shrink-0
                  ${catFilter === cat.key
                    ? 'bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_12px_rgba(248,113,113,0.25)]'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:bg-white/[0.06]'
                  }`}>
                {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
              </button>
            ))}
          </div>

          {/* ── Filter Row 2: Locations ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1 mt-1">
            {LOCATIONS.map(loc => (
              <button key={loc} onClick={() => setLocFilter(loc)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border shrink-0
                  ${locFilter === loc
                    ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                    : 'bg-white/[0.02] border-white/[0.05] text-slate-600 hover:bg-white/[0.05]'
                  }`}>
                {loc === 'All' ? '\u{1F4CD} All Spots' : loc}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card Grid ── */}
        <div className="px-4 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 text-red-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Crosshair className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-sm text-slate-600 font-semibold">No items found</p>
              <p className="text-[11px] text-slate-700 text-center max-w-[200px]">Try adjusting your filters or be the first to post!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(post => (
                <RadarCard
                  key={post.id}
                  post={post}
                  profile={profile}
                  onClaim={() => handleClaim(post)}
                  onResolve={() => handleResolve(post.id)}
                  onClaimSheet={() => { handleClaim(post); }}
                  setClaimPost={setClaimPost}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Action Button ── */}
      <div className="absolute bottom-6 right-5 z-30">
        <AnimatePresence>
          {showFAB && (
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-16 right-0 flex flex-col gap-2 items-end">
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setCreateType('lost'); setShowCreateModal(true); setShowFAB(false) }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold backdrop-blur-xl whitespace-nowrap shadow-[0_4px_20px_rgba(248,113,113,0.2)]">
                {"\u{1F6A8}"} I Lost Something
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setCreateType('found'); setShowCreateModal(true); setShowFAB(false) }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold backdrop-blur-xl whitespace-nowrap shadow-[0_4px_20px_rgba(52,211,153,0.2)]">
                {"\u{1F3AF}"} I Found Something
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => setShowFAB(!showFAB)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_4px_25px_rgba(248,113,113,0.4)] transition-all duration-300 ${showFAB ? 'bg-white/10 border border-white/20 rotate-45' : 'bg-gradient-to-br from-red-500 to-red-600 border border-red-400/30'}`}>
          <Plus className={`w-6 h-6 ${showFAB ? 'text-white' : 'text-white'}`} />
        </motion.button>
      </div>

      {/* ── Create Post Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRadarPost
            type={createType}
            profile={profile}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => { setShowCreateModal(false); loadPosts(); showToast('Post published!') }}
          />
        )}
      </AnimatePresence>

      {/* ── Claim Bottom Sheet ── */}
      <AnimatePresence>
        {claimPost && (
          <ClaimModal
            post={claimPost}
            profile={profile}
            onClose={() => setClaimPost(null)}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] px-5 py-2.5 rounded-full bg-emerald-500/90 text-white text-xs font-bold shadow-[0_0_15px_rgba(52,211,153,0.4)] backdrop-blur-md whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// RADAR CARD
// ══════════════════════════════════════════════════════════════
function RadarCard({ post, profile, onClaim, onResolve, setClaimPost }) {
  const isMine = post.owner_id === profile.id
  const isLost = post.post_type === 'lost'
  const isPending = post.status === 'pending_verification'
  const cat = CATEGORIES.find(c => c.key === post.category)
  const CatIcon = cat?.icon || CreditCard
  const catColor = cat?.color || '#60a5fa'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl overflow-hidden bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm flex flex-col hover:border-white/[0.12] transition-all group"
    >
      {/* Top half: Photo or icon */}
      <div className="relative h-[130px] bg-gradient-to-br from-white/[0.02] to-white/[0.01] flex items-center justify-center overflow-hidden">
        {post.photo_url ? (
          <img src={post.photo_url} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border"
              style={{ background: catColor + '12', borderColor: catColor + '30' }}>
              <CatIcon className="w-7 h-7" style={{ color: catColor }} />
            </div>
          </div>
        )}

        {/* Time tag - top left */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md border
          ${isLost ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'}`}>
          {isLost ? 'Lost' : 'Found'} {relativeTime(post.created_at)}
        </div>

        {/* Status tag - top right */}
        {isPending && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md bg-yellow-500/20 border border-yellow-500/30 text-yellow-300">
            Pending {"\u23F3"}
          </div>
        )}
      </div>

      {/* Bottom half */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-[13px] font-bold text-white leading-tight line-clamp-2">{post.title}</h3>
        <p className="text-[10px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-600" />
          {post.location}
        </p>
        {post.description && (
          <p className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">{post.description}</p>
        )}

        {/* Action button */}
        <div className="mt-auto pt-2">
          {isMine && isPending ? (
            <motion.button whileTap={{ scale: 0.95 }} onClick={onResolve}
              className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500/25 transition-colors">
              <Check className="w-3.5 h-3.5" /> Item Recovered {"\u2705"}
            </motion.button>
          ) : isMine ? (
            <div className="w-full py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-600 text-[11px] font-bold flex items-center justify-center">
              Your Post
            </div>
          ) : isPending ? (
            <div className="w-full py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/70 text-[11px] font-bold flex items-center justify-center">
              Pending {"\u23F3"}
            </div>
          ) : (
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => setClaimPost(post)}
              className="w-full py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-500/25 transition-colors shadow-[0_0_12px_rgba(34,211,238,0.15)]">
              {isLost ? (<>I Found This {"\u270B"}</>) : (<>Claim as Owner</>)}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════════════
// CLAIM MODAL (Bottom Sheet with Handshake Flow)
// ══════════════════════════════════════════════════════════════
function ClaimModal({ post, profile, onClose, showToast }) {
  const [isFriend, setIsFriend] = useState(false)
  const [checking, setChecking] = useState(true)
  const [requestSent, setRequestSent] = useState(false)
  const [sending, setSending] = useState(false)
  const ownerId = post.owner_id

  useEffect(() => {
    checkFriendship()
  }, [])

  const checkFriendship = async () => {
    setChecking(true)
    try {
      const { data } = await supabase.from('friend_requests')
        .select('id,status')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${ownerId}),and(sender_id.eq.${ownerId},receiver_id.eq.${profile.id})`)
        .eq('status', 'accepted')
        .limit(1)
      setIsFriend(data && data.length > 0)
    } catch (e) {
      console.error('[ClaimModal] friend check error:', e)
    }
    setChecking(false)
  }

  const handleFollow = async () => {
    setSending(true)
    try {
      // First update the post status
      await supabase.from('campus_radar')
        .update({ status: 'pending_verification', claimer_id: profile.id })
        .eq('id', post.id)
      // Send friend request
      await supabase.from('friend_requests').insert({
        sender_id: profile.id,
        receiver_id: ownerId,
        status: 'pending'
      })
      setRequestSent(true)
      showToast('Request sent! You can message once accepted.')
    } catch (e) {
      if (e.message?.includes('duplicate') || e.code === '23505') {
        setRequestSent(true)
        showToast('Request already sent!')
      } else {
        showToast('Failed: ' + e.message)
      }
    }
    setSending(false)
  }

  const handleMessage = () => {
    // Navigate to chat with owner — using window location for simplicity
    window.location.href = `/chat/room/${ownerId}`
  }

  const ownerName = post.owner?.first_name || 'Owner'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-[#0f172a] border-t border-white/10 p-6 pb-10">
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${post.post_type === 'lost' ? 'bg-red-500/15 border-red-500/30' : 'bg-emerald-500/15 border-emerald-500/30'}`}>
            <Crosshair className={`w-6 h-6 ${post.post_type === 'lost' ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{post.title}</h3>
            <p className="text-[11px] text-slate-500">
              {post.post_type === 'lost' ? 'Lost' : 'Found'} by {ownerName} {"\u00B7"} {post.location}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
          <p className="text-xs text-slate-400 leading-relaxed">
            {post.post_type === 'lost'
              ? `You're about to let ${ownerName} know that you found their item. This will change the post status to "Pending Verification".`
              : `You're claiming this item as yours. ${ownerName} will be notified for verification.`
            }
          </p>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
        ) : isFriend ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleMessage}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <MessageCircle className="w-4 h-4" /> Message {ownerName} {"\u{1F4AC}"}
          </motion.button>
        ) : requestSent ? (
          <div className="w-full py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-sm font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" /> Request Sent {"\u2713"}
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleFollow} disabled={sending}
            className="w-full py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-colors backdrop-blur-md">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 text-slate-400" /> Follow to Message {"\u279C"}</>}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════════════
// CREATE RADAR POST
// ══════════════════════════════════════════════════════════════
function CreateRadarPost({ type, profile, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', category: 'ID & Wallets', location: 'PMC',
    customLocation: '', description: '', photo: null
  })
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const isLost = type === 'lost'

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB')
      return
    }
    setForm(f => ({ ...f, photo: file }))
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      let photoUrl = null
      if (form.photo) {
        const ext = form.photo.name.split('.').pop()
        const path = `radar/${profile.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('chat_images').upload(path, form.photo)
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      const finalLocation = form.location === 'Custom' ? form.customLocation.trim() : form.location

      await supabase.from('campus_radar').insert({
        owner_id: profile.id,
        post_type: type,
        title: form.title.trim(),
        category: form.category,
        location: finalLocation || 'Unknown',
        description: form.description.trim() || null,
        photo_url: photoUrl,
      })

      // Set blinker for other users (realtime will trigger)
      localStorage.setItem('onyx_radar_new', 'true')
      onCreated()
    } catch (err) {
      alert('Failed: ' + err.message)
    }
    setSubmitting(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#0a0f1e] border-t border-white/10 p-6">
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isLost ? 'bg-red-500/15 border-red-500/30' : 'bg-emerald-500/15 border-emerald-500/30'}`}>
            <AlertTriangle className={`w-5 h-5 ${isLost ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{isLost ? 'Report Lost Item' : 'Report Found Item'}</h3>
            <p className="text-[10px] text-slate-500">Fill in the details below</p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Title */}
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Item name (e.g., Blue Wallet, iPhone 15)"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/40 transition-colors" />

          {/* Category */}
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none appearance-none focus:border-red-500/40 transition-colors">
            {CATEGORIES.filter(c => c.key !== 'All').map(c => (
              <option key={c.key} value={c.key} className="bg-[#0a0f1e]">{c.emoji} {c.label}</option>
            ))}
          </select>

          {/* Location */}
          <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none appearance-none focus:border-red-500/40 transition-colors">
            {LOCATIONS.filter(l => l !== 'All').map(l => (
              <option key={l} value={l} className="bg-[#0a0f1e]">{l}</option>
            ))}
            <option value="Custom" className="bg-[#0a0f1e]">Custom Location...</option>
          </select>

          {form.location === 'Custom' && (
            <input value={form.customLocation} onChange={e => setForm(f => ({ ...f, customLocation: e.target.value }))}
              placeholder="Enter custom location..."
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/40 transition-colors" />
          )}

          {/* Description */}
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe the item (color, brand, any identifiers...)"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/40 transition-colors resize-none" />

          {/* Photo */}
          <div>
            {preview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/[0.08]">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => { setForm(f => ({ ...f, photo: null })); setPreview(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.1] cursor-pointer text-slate-500 text-xs font-semibold hover:bg-white/[0.05] transition-colors">
                <ImagePlus className="w-4 h-4" /> Add Photo (optional, max 2MB)
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
            )}
          </div>

          {/* Submit */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit}
            disabled={!form.title.trim() || submitting}
            className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${form.title.trim()
                ? (isLost
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_20px_rgba(248,113,113,0.3)]'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(52,211,153,0.3)]')
                : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
              }`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isLost ? 'Report Lost Item' : 'Report Found Item'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
