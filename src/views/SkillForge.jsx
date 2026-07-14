import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Zap, Search, Star, ChevronRight, Send, Lock, UserPlus, Check,
  MessageCircle, Loader2, Gem, Rocket, Lightbulb, Settings2, Code, Video,
  Palette, PenTool, TrendingUp, ArrowRight, Eye, EyeOff
} from 'lucide-react'
import { supabase } from '../supabaseClient'

// ── Constants ──
const LISTING_TYPES = [
  { key: 'looking_for_skill', label: 'Looking for Skills', emoji: '\u{1F50D}', short: 'Looking' },
  { key: 'offering_skill',    label: 'Offering Skills',    emoji: '\u{1F6E0}', short: 'Offering' },
  { key: 'startup_cofounder', label: 'Startups & Co-Founders', emoji: '\u{1F680}', short: 'Startups' },
]

const SKILL_CATEGORIES = [
  { key: 'All', label: 'All', icon: null },
  { key: 'Web Dev', label: 'Web Dev', emoji: '\u{1F4BB}', icon: Code, color: '#60a5fa' },
  { key: 'Video/Audio', label: 'Video/Audio', emoji: '\u{1F3AC}', icon: Video, color: '#f472b6' },
  { key: 'UI/UX Design', label: 'UI/UX Design', emoji: '\u{1F3A8}', icon: Palette, color: '#a78bfa' },
  { key: 'Content', label: 'Content', emoji: '\u{270D}', icon: PenTool, color: '#34d399' },
  { key: 'Marketing', label: 'Marketing', emoji: '\u{1F4C8}', icon: TrendingUp, color: '#fbbf24' },
]

const STAGE_MAP = {
  idea:  { label: 'Idea',      emoji: '\u{1F4A1}', color: '#fbbf24' },
  mvp:   { label: 'MVP',       emoji: '\u{2699}',  color: '#60a5fa' },
  ready: { label: 'Launching',  emoji: '\u{1F680}', color: '#34d399' },
}

function relativeTime(dateStr) {
  const now = new Date(), d = new Date(dateStr)
  const mins = Math.floor((now - d) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function SkillForge({ profile, session }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('looking_for_skill')
  const [skillFilter, setSkillFilter] = useState('All')
  const [showFAB, setShowFAB] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [proposeTarget, setProposeTarget] = useState(null) // gig proposal
  const [pitchTarget, setPitchTarget] = useState(null)     // startup pitch
  const [reviewTarget, setReviewTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    loadListings()
    const ch = supabase.channel('forge-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forge_listings' }, () => loadListings())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const loadListings = async () => {
    setLoading(true)
    const { data } = await supabase.from('forge_listings')
      .select('*, owner:owner_id(id,first_name,last_name,avatar_url,username,forge_rating_avg,total_gigs_completed,top_hustler)')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
    if (data) setListings(data)
    setLoading(false)
  }

  const handleComplete = async (listing) => {
    await supabase.from('forge_listings').update({ status: 'completed' }).eq('id', listing.id)
    await supabase.from('profiles').update({
      total_gigs_completed: (profile.total_gigs_completed || 0) + 1
    }).eq('id', profile.id)
    setListings(prev => prev.filter(l => l.id !== listing.id))
    setReviewTarget(listing)
    showToast('Marked as completed!')
  }

  const filtered = listings.filter(l => {
    if (l.listing_type !== activeType) return false
    if (skillFilter !== 'All' && l.required_skill !== skillFilter) return false
    return true
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#060b18] relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="flex-1 overflow-y-auto relative z-10 pb-24">
        {/* Header */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Skill-Forge</h2>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase">Gigs, Barter & Co-Founders</p>
            </div>
          </div>

          {/* ── Tri-State Toggle ── */}
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 mb-3">
            {LISTING_TYPES.map(lt => (
              <button key={lt.key} onClick={() => setActiveType(lt.key)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all relative
                  ${activeType === lt.key
                    ? 'bg-gradient-to-r from-purple-600/30 to-cyan-600/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}>
                {activeType === lt.key && (
                  <motion.div layoutId="forge-toggle" className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30" />
                )}
                <span className="relative z-10">{lt.emoji} {lt.short}</span>
              </button>
            ))}
          </div>

          {/* ── Skill Categories ── */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
            {SKILL_CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setSkillFilter(cat.key)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shrink-0
                  ${skillFilter === cat.key
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:bg-white/[0.06]'
                  }`}>
                {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card Grid ── */}
        <div className="px-4 mt-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 text-yellow-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Zap className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-sm text-slate-600 font-semibold">No listings yet</p>
              <p className="text-[11px] text-slate-700 text-center max-w-[220px]">Be the first to post a gig or find a co-founder!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(listing => (
                activeType === 'startup_cofounder'
                  ? <StartupCard key={listing.id} listing={listing} profile={profile}
                      onPitch={() => setPitchTarget(listing)}
                      onComplete={() => handleComplete(listing)} />
                  : <GigCard key={listing.id} listing={listing} profile={profile}
                      onPropose={() => setProposeTarget(listing)}
                      onComplete={() => handleComplete(listing)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <div className="absolute bottom-6 right-5 z-30">
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreate(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 border border-yellow-400/30 flex items-center justify-center shadow-[0_4px_25px_rgba(251,191,36,0.4)]">
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showCreate && (
          <CreateForgeModal profile={profile} onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); loadListings(); showToast('Listing published!') }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {proposeTarget && (
          <ProposeSheet listing={proposeTarget} profile={profile}
            onClose={() => setProposeTarget(null)} showToast={showToast} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pitchTarget && (
          <PitchSheet listing={pitchTarget} profile={profile}
            onClose={() => setPitchTarget(null)} showToast={showToast} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewTarget && (
          <ReviewModal listing={reviewTarget} profile={profile}
            onClose={() => setReviewTarget(null)} showToast={showToast} />
        )}
      </AnimatePresence>

      {/* Toast */}
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
// GIG / BARTER CARD
// ══════════════════════════════════════════════════════════════
function HustlerBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-cyan-300" title="Top Rated Hustler">
      <Gem className="w-3 h-3 text-cyan-400" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' }} />
    </span>
  )
}

function GigCard({ listing, profile, onPropose, onComplete }) {
  const isMine = listing.owner_id === profile.id
  const owner = listing.owner
  const isBarter = listing.compensation_type === 'barter'
  const isEquity = listing.compensation_type === 'equity'

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-4 flex flex-col gap-3 hover:border-white/[0.12] transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-white leading-tight mb-1">{listing.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {listing.required_skill && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-[10px] font-bold text-purple-300">
                {listing.required_skill}
              </span>
            )}
            <span className="text-[10px] text-slate-600">{relativeTime(listing.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-3">{listing.description}</p>
      )}

      {/* Compensation tag */}
      <div className="flex items-center gap-2 flex-wrap">
        {isBarter ? (
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
              Barter {"\u{1F504}"}
            </span>
            {listing.barter_offer_details && (
              <span className="text-[10px] text-slate-500 italic">Offering: {listing.barter_offer_details}</span>
            )}
          </div>
        ) : isEquity ? (
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300">
            Equity Share {"\u{1F4C8}"}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
            Cash {"\u{1F4B8}"}
          </span>
        )}
      </div>

      {/* Owner row + Action */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          {owner?.avatar_url ? (
            <img src={owner.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white">
              {owner?.first_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span className="text-[11px] text-slate-400 font-semibold">
            {owner?.first_name || 'Unknown'}
            {owner?.top_hustler && <HustlerBadge />}
          </span>
        </div>

        {isMine ? (
          listing.status === 'in_progress' ? (
            <motion.button whileTap={{ scale: 0.95 }} onClick={onComplete}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Mark Done
            </motion.button>
          ) : (
            <span className="text-[10px] text-slate-600 font-semibold">Your Listing</span>
          )
        ) : (
          <motion.button whileTap={{ scale: 0.95 }} onClick={onPropose}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(34,211,238,0.15)] hover:bg-cyan-500/25 transition-colors">
            <Zap className="w-3 h-3" /> Propose Collab {"\u26A1"}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════════════
// STARTUP / CO-FOUNDER CARD
// ══════════════════════════════════════════════════════════════
function StartupCard({ listing, profile, onPitch, onComplete }) {
  const isMine = listing.owner_id === profile.id
  const owner = listing.owner
  const stage = STAGE_MAP[listing.startup_stage] || STAGE_MAP.idea
  const isStealth = listing.stealth_mode

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl backdrop-blur-sm p-4 flex flex-col gap-3 transition-all border
        ${isStealth
          ? 'bg-gradient-to-br from-white/[0.02] to-purple-900/[0.05] border-purple-500/15 hover:border-purple-500/30'
          : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
        }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-[14px] font-bold text-white leading-tight">
              {isStealth ? `Stealth Startup in ${listing.required_skill || 'Tech'}` : listing.title}
            </h3>
            {isStealth && <EyeOff className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
          </div>

          {/* Stage indicator */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
            style={{ background: stage.color + '15', borderColor: stage.color + '30', color: stage.color }}>
            {stage.emoji} {stage.label}
          </span>
        </div>
      </div>

      {/* Description (blurred if stealth) */}
      {listing.description && (
        <div className={`relative ${isStealth ? 'select-none' : ''}`}>
          <p className={`text-[12px] text-slate-400 leading-relaxed line-clamp-3 ${isStealth ? 'blur-[6px]' : ''}`}>
            {listing.description}
          </p>
          {isStealth && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300">
                {"\u{1F512}"} Stealth Mode
              </span>
            </div>
          )}
        </div>
      )}

      {/* Compensation */}
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300">
          {listing.compensation_type === 'equity' ? 'Equity Share \u{1F4C8}' : 'Equal Partner \u{1F91D}'}
        </span>
        {listing.required_skill && (
          <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-semibold text-slate-500">
            {listing.required_skill}
          </span>
        )}
      </div>

      {/* Owner + Action */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          {owner?.avatar_url ? (
            <img src={owner.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white">
              {owner?.first_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span className="text-[11px] text-slate-400 font-semibold">
            {isStealth ? 'Anonymous Founder' : (owner?.first_name || 'Unknown')}
            {owner?.top_hustler && <HustlerBadge />}
          </span>
        </div>

        {isMine ? (
          listing.status === 'in_progress' ? (
            <motion.button whileTap={{ scale: 0.95 }} onClick={onComplete}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Mark Done
            </motion.button>
          ) : (
            <span className="text-[10px] text-slate-600 font-semibold">Your Listing</span>
          )
        ) : (
          <motion.button whileTap={{ scale: 0.95 }} onClick={onPitch}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/25 to-purple-700/25 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(139,92,246,0.2)] hover:from-purple-600/35 transition-all">
            <Rocket className="w-3 h-3" /> Let's Build {"\u{1F680}"}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════════════
// PROPOSE SHEET (Gig/Barter)
// ══════════════════════════════════════════════════════════════
function ProposeSheet({ listing, profile, onClose, showToast }) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!msg.trim() || sending) return
    setSending(true)
    try {
      const ownerId = listing.owner_id
      // Check friendship
      const { data: fr } = await supabase.from('friend_requests')
        .select('id,status')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${ownerId}),and(sender_id.eq.${ownerId},receiver_id.eq.${profile.id})`)
        .eq('status', 'accepted').limit(1)

      if (!fr || fr.length === 0) {
        // Auto-send friend request
        await supabase.from('friend_requests').upsert({
          sender_id: profile.id, receiver_id: ownerId, status: 'pending'
        }, { onConflict: 'sender_id,receiver_id' })
        showToast('Friend request sent! They can view your proposal once accepted.')
        onClose()
        setSending(false)
        return
      }

      // Send formatted DM
      const content = `\u26A1 Skill-Forge Proposal\n\nListing: ${listing.title}\nFrom: @${profile.username}\n\n${msg.trim()}\n\n\u2014 View profile: /user/${profile.id}`
      await supabase.from('messages').insert({
        sender_id: profile.id, receiver_id: ownerId, content
      })
      await supabase.from('forge_listings').update({ status: 'in_progress' }).eq('id', listing.id)
      showToast('Proposal sent via DM!')
      onClose()
    } catch (e) {
      showToast('Failed: ' + e.message)
    }
    setSending(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-[#0f172a] border-t border-white/10 p-6 pb-10">
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <h3 className="text-sm font-bold text-white mb-1">Propose Collaboration</h3>
        <p className="text-[11px] text-slate-500 mb-4">for "{listing.title}"</p>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4}
          placeholder="Why are you a good fit? What can you bring to this project?"
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none resize-none focus:border-cyan-500/40 transition-colors mb-4" />
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={!msg.trim() || sending}
          className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
            ${msg.trim() ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'}`}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Proposal</>}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════════════
// PITCH SHEET (Startups)
// ══════════════════════════════════════════════════════════════
function PitchSheet({ listing, profile, onClose, showToast }) {
  const [pitch, setPitch] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!pitch.trim() || sending) return
    setSending(true)
    try {
      const ownerId = listing.owner_id
      const { data: fr } = await supabase.from('friend_requests')
        .select('id,status')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${ownerId}),and(sender_id.eq.${ownerId},receiver_id.eq.${profile.id})`)
        .eq('status', 'accepted').limit(1)

      if (!fr || fr.length === 0) {
        await supabase.from('friend_requests').upsert({
          sender_id: profile.id, receiver_id: ownerId, status: 'pending'
        }, { onConflict: 'sender_id,receiver_id' })
        showToast('Friend request sent! Pitch will be visible once accepted.')
        onClose()
        setSending(false)
        return
      }

      const content = `\u{1F680} Skill-Forge Co-Founder Pitch\n\nStartup: ${listing.stealth_mode ? '[Stealth]' : listing.title}\nFrom: @${profile.username}\n\nMini-Pitch:\n${pitch.trim()}\n\n\u2014 View profile: /user/${profile.id}`
      await supabase.from('messages').insert({
        sender_id: profile.id, receiver_id: ownerId, content
      })
      await supabase.from('forge_listings').update({ status: 'in_progress' }).eq('id', listing.id)
      showToast('Pitch sent via DM!')
      onClose()
    } catch (e) {
      showToast('Failed: ' + e.message)
    }
    setSending(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-[#0f172a] border-t border-white/10 p-6 pb-10">
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Your Mini-Pitch</h3>
            <p className="text-[10px] text-slate-500">Why are you the perfect co-founder?</p>
          </div>
        </div>
        <textarea value={pitch} onChange={e => setPitch(e.target.value)} rows={5}
          placeholder="Tell them about your skills, experience, and why you're excited about this idea..."
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none resize-none focus:border-purple-500/40 transition-colors mb-4" />
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={!pitch.trim() || sending}
          className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
            ${pitch.trim() ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'}`}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Rocket className="w-4 h-4" /> Send Pitch</>}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════════════
// REVIEW MODAL
// ══════════════════════════════════════════════════════════════
function ReviewModal({ listing, profile, onClose, showToast }) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // reviewee is the other party (not the owner who is completing)
  const revieweeId = listing.owner_id === profile.id ? null : listing.owner_id

  const handleSubmit = async () => {
    if (rating === 0 || !revieweeId) { onClose(); return }
    setSubmitting(true)
    try {
      await supabase.from('forge_reviews').insert({
        listing_id: listing.id,
        reviewer_id: profile.id,
        reviewee_id: revieweeId,
        rating,
        review_text: text.trim() || null,
      })
      showToast('Review submitted!')
    } catch (e) {
      if (e.code !== '23505') showToast('Review failed: ' + e.message)
    }
    setSubmitting(false)
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-[#0a0f1e]/95 border border-white/10 backdrop-blur-xl p-6">
        <h3 className="text-sm font-bold text-white mb-1">Rate this collaboration</h3>
        <p className="text-[11px] text-slate-500 mb-5">How was your experience with "{listing.title}"?</p>

        {/* Stars */}
        <div className="flex gap-2 justify-center mb-5">
          {[1, 2, 3, 4, 5].map(n => (
            <motion.button key={n} whileTap={{ scale: 0.85 }} onClick={() => setRating(n)}
              className="p-1">
              <Star className={`w-8 h-8 transition-colors ${n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`}
                style={n <= rating ? { filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.5))' } : {}} />
            </motion.button>
          ))}
        </div>

        <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
          placeholder="Write a short review (optional)..."
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none resize-none focus:border-yellow-500/40 transition-colors mb-4" />

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-colors">
            Skip
          </button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmit} disabled={rating === 0 || submitting}
            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${rating > 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════════════
// CREATE FORGE LISTING
// ══════════════════════════════════════════════════════════════
function CreateForgeModal({ profile, onClose, onCreated }) {
  const [form, setForm] = useState({
    listing_type: 'looking_for_skill',
    title: '', description: '', required_skill: 'Web Dev',
    compensation_type: 'cash', barter_offer_details: '',
    startup_stage: 'idea', stealth_mode: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const isStartup = form.listing_type === 'startup_cofounder'

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      await supabase.from('forge_listings').insert({
        owner_id: profile.id,
        listing_type: form.listing_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        required_skill: form.required_skill,
        compensation_type: isStartup ? 'equity' : form.compensation_type,
        barter_offer_details: form.compensation_type === 'barter' ? form.barter_offer_details.trim() || null : null,
        startup_stage: isStartup ? form.startup_stage : null,
        stealth_mode: isStartup ? form.stealth_mode : false,
      })
      onCreated()
    } catch (e) {
      alert('Failed: ' + e.message)
    }
    setSubmitting(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#0a0f1e] border-t border-white/10 p-6">
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> New Listing</h3>

        <div className="flex flex-col gap-3.5">
          {/* Type selector */}
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 gap-1">
            {LISTING_TYPES.map(lt => (
              <button key={lt.key} onClick={() => setForm(f => ({ ...f, listing_type: lt.key }))}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all
                  ${form.listing_type === lt.key ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-500'}`}>
                {lt.emoji} {lt.short}
              </button>
            ))}
          </div>

          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={isStartup ? 'Startup name / concept' : 'What do you need? (e.g., React Developer)'}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none focus:border-yellow-500/40 transition-colors" />

          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={isStartup ? 'Describe your startup idea / vision...' : 'Describe what you need / are offering...'}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none resize-none focus:border-yellow-500/40 transition-colors" />

          <select value={form.required_skill} onChange={e => setForm(f => ({ ...f, required_skill: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none appearance-none">
            {SKILL_CATEGORIES.filter(c => c.key !== 'All').map(c => (
              <option key={c.key} value={c.key} className="bg-[#0a0f1e]">{c.emoji} {c.label}</option>
            ))}
          </select>

          {!isStartup && (
            <>
              <select value={form.compensation_type} onChange={e => setForm(f => ({ ...f, compensation_type: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none appearance-none">
                <option value="cash" className="bg-[#0a0f1e]">Cash Payment</option>
                <option value="barter" className="bg-[#0a0f1e]">Barter / Skill Swap</option>
              </select>
              {form.compensation_type === 'barter' && (
                <input value={form.barter_offer_details} onChange={e => setForm(f => ({ ...f, barter_offer_details: e.target.value }))}
                  placeholder="What skill/service are you offering in return?"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/40 transition-colors" />
              )}
            </>
          )}

          {isStartup && (
            <>
              <div className="flex gap-2">
                {Object.entries(STAGE_MAP).map(([key, val]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, startup_stage: key }))}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all
                      ${form.startup_stage === key
                        ? `border-[${val.color}] text-white`
                        : 'border-white/[0.06] text-slate-500'}`}
                    style={form.startup_stage === key ? { background: val.color + '20', borderColor: val.color + '40', color: val.color } : {}}>
                    {val.emoji} {val.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer px-1">
                <button onClick={() => setForm(f => ({ ...f, stealth_mode: !f.stealth_mode }))}
                  className={`w-11 h-6 rounded-full transition-all relative ${form.stealth_mode ? 'bg-purple-600' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.stealth_mode ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
                <div>
                  <span className="text-xs font-semibold text-white">Stealth Mode</span>
                  <p className="text-[10px] text-slate-500">Hide your description until you approve a co-founder</p>
                </div>
              </label>
            </>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!form.title.trim() || submitting}
            className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
              ${form.title.trim()
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'}`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Listing'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
