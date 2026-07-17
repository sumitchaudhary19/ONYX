import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { getCampusAcronym } from '../utils/campusUtils'
import { ArrowLeft, Zap, X, Send, Clock, Sparkles, ChevronUp, RotateCcw, Search, Plus } from 'lucide-react'

// ── Constants ──
const DAILY_LIMIT = 15
const CAMPUS_NODES = [
  { id: 'college_1', name: 'College 1', short: 'C1', color: '#818cf8', x: 30, y: 25 },
  { id: 'college_2', name: 'College 2', short: 'C2', color: '#34d399', x: 70, y: 35 },
  { id: null,         name: 'MNIT Jaipur', short: 'MNIT', color: '#60a5fa', x: 50, y: 60 },
]

const ICEBREAKERS = [
  (tags) => `Loved your ${tags[0] || 'profile'} skills! Let's collaborate 🚀`,
  (tags) => `Fellow ${tags[0] || 'tech'} enthusiast! What are you building? 🛠️`,
  (tags) => `Your profile is 🔥 — would love to connect and share ideas!`,
]

const SKILL_COLORS = {
  Python: '#3b82f6', React: '#22d3ee', 'UI/UX': '#a78bfa', 'Video Production': '#f472b6',
  Streamlit: '#ef4444', JavaScript: '#fbbf24', Figma: '#f97316', Flutter: '#06b6d4',
  'Machine Learning': '#8b5cf6', 'Data Science': '#10b981', 'Web Dev': '#6366f1',
  default: '#64748b',
}

function getSkillColor(skill) {
  return SKILL_COLORS[skill] || SKILL_COLORS.default
}

function calcSynergy(myTags, theirTags) {
  if (!myTags?.length || !theirTags?.length) return Math.floor(Math.random() * 30) + 50
  const mySet = new Set(myTags.map(t => t.toLowerCase()))
  const overlap = theirTags.filter(t => mySet.has(t.toLowerCase())).length
  const union = new Set([...myTags, ...theirTags].map(t => t.toLowerCase())).size
  return Math.min(99, Math.floor((overlap / Math.max(union, 1)) * 100) + 45)
}

function getCountdown() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const midnight = new Date(ist)
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight - ist
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0')
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// ── Vibe Check ──
const VIBE_CATEGORIES = [
  { name: 'The Builder', tags: ['Python', 'Streamlit', 'React', 'UI/UX Design', 'AI Agent'] },
  { name: 'The Creator', tags: ['Video Production', 'Hip-Hop/Rap', 'Storyteller', 'Digital Media'] },
  { name: 'The Hustler', tags: ['Looking for Co-founder', 'Marketing', 'Strategy'] },
  { name: 'The Chill Zone', tags: ['Cricket Fanatic', 'Late Night Gamer', 'Anime'] },
]

function VibeCheckModal({ profile, onComplete }) {
  const [selectedTags, setSelectedTags] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) setSelectedTags(prev => prev.filter(t => t !== tag))
    else if (selectedTags.length < 7) setSelectedTags(prev => [...prev, tag])
  }

  const handleCreate = () => {
    if (search.trim() && !selectedTags.includes(search.trim()) && selectedTags.length < 7) {
      setSelectedTags(prev => [...prev, search.trim()])
      setSearch('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ skills: selectedTags }).eq('id', profile.id)
    onComplete(selectedTags)
  }

  const allTags = VIBE_CATEGORIES.flatMap(c => c.tags)
  const filteredTags = search.trim() ? allTags.filter(t => t.toLowerCase().includes(search.toLowerCase())) : []
  const showCreate = search.trim() && !filteredTags.some(t => t.toLowerCase() === search.trim().toLowerCase())

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col bg-black overflow-hidden px-6 pt-16 pb-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black pointer-events-none" />
      
      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full min-h-0">
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-2">
          What defines your vibe?
        </motion.h1>
        <p className="text-slate-400 mb-8">Select up to 7 tags to tune your serendipity engine.</p>
        
        {/* Tag Forge (Search) */}
        <div className="relative mb-6 shrink-0">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-cyan-400" />
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Search or create a tag..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 backdrop-blur-xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pb-4 space-y-8 no-scrollbar pr-2">
          {search.trim() ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Search Results</h3>
              <div className="flex flex-wrap gap-3">
                {filteredTags.map(tag => (
                  <TagPill key={tag} tag={tag} selected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)} />
                ))}
                {showCreate && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCreate}
                    className="px-5 py-2.5 rounded-full border border-cyan-400/50 bg-cyan-400/10 text-cyan-300 font-semibold text-sm flex items-center gap-2 backdrop-blur-md"
                    style={{ boxShadow: '0 0 20px rgba(34,211,238,0.2)' }}>
                    Create Tag: {search} <Plus size={16} />
                  </motion.button>
                )}
              </div>
            </div>
          ) : (
            VIBE_CATEGORIES.map(category => (
              <div key={category.name} className="space-y-3">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{category.name}</h3>
                <div className="flex flex-wrap gap-3">
                  {category.tags.map(tag => (
                    <TagPill key={tag} tag={tag} selected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 flex items-center justify-between mt-auto shrink-0 border-t border-white/5">
          <span className="text-sm font-medium text-slate-400">{selectedTags.length}/7 Selected</span>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleSave} disabled={selectedTags.length === 0 || saving}
            className={`px-8 py-3 rounded-full font-bold text-white transition-all ${selectedTags.length > 0 ? 'bg-gradient-to-r from-violet-500 to-cyan-500 shadow-[0_0_30px_rgba(139,92,246,0.3)]' : 'bg-white/5 text-slate-500'}`}
          >
            {saving ? 'Tuning...' : 'Engage'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function TagPill({ tag, selected, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all backdrop-blur-md border ${
        selected
          ? 'bg-white/10 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
          : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
      }`}
    >
      {tag}
    </motion.button>
  )
}

// ── Galaxy View ──
function GalaxyView({ onSelect, profile }) {
  const [hovered, setHovered] = useState(null)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [jumpingTo, setJumpingTo] = useState(null) // store node id
  
  const filteredNodes = CAMPUS_NODES.filter(n => {
    if (!search.trim()) return true
    return n.name.toLowerCase().includes(search.toLowerCase()) || n.short.toLowerCase().includes(search.toLowerCase())
  })

  const handleJump = (node) => {
    setJumpingTo(node)
    setTimeout(() => {
      onSelect(node)
    }, 800) // length of hyperspace jump
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && search.trim() && filteredNodes.length > 0) {
      handleJump(filteredNodes[0])
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 overflow-hidden bg-black flex flex-col items-center justify-center">

      {/* Camera Pan Wrapper */}
      <motion.div
        animate={jumpingTo ? {
          x: `calc(50% - ${jumpingTo.x}%)`,
          y: `calc(50% - ${jumpingTo.y}%)`,
          scale: 4,
          opacity: 0
        } : { x: 0, y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute w-full h-full left-0 top-0 origin-top-left"
      >
        {/* Stars BG */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <motion.div key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              }}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>

        {/* Orbital Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          {CAMPUS_NODES.map((node, i) => (
            <motion.circle key={i} cx={node.x} cy={node.y} r="12" fill="none" stroke={node.color} strokeWidth="0.15"
              strokeDasharray="2 2" initial={{ opacity: 0 }} animate={{ opacity: search.trim() && !filteredNodes.includes(node) ? 0.05 : 0.3 }}
              transition={{ delay: 0.3 + i * 0.15 }} />
          ))}
        </svg>

        {/* Campus Nodes */}
        {CAMPUS_NODES.map((node, i) => {
          const isMatched = search.trim() && filteredNodes.includes(node)
          const isFaded = search.trim() && !filteredNodes.includes(node)
          const isActive = hovered === node.id || isMatched || jumpingTo?.id === node.id
          const isMine = (profile?.tenant_id || null) === node.id
          return (
            <motion.button key={node.id ?? 'main'} onClick={() => handleJump(node)}
              onHoverStart={() => setHovered(node.id)} onHoverEnd={() => setHovered(null)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: isFaded ? 0.2 : 1 }}
              transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 200, damping: 20 }}
              className="absolute z-10 flex flex-col items-center gap-2 group"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}>

              {/* Glow ring */}
              <motion.div
                animate={{
                  boxShadow: isActive
                    ? `0 0 40px ${node.color}80, 0 0 80px ${node.color}40`
                    : `0 0 20px ${node.color}30, 0 0 40px ${node.color}15`,
                  scale: jumpingTo?.id === node.id ? [1, 1.5, 1, 1.5, 1] : isActive ? 1.15 : 1,
                }}
                transition={{ duration: jumpingTo?.id === node.id ? 0.8 : 0.3 }}
                className="w-16 h-16 rounded-full flex items-center justify-center relative"
                style={{ background: `radial-gradient(circle at 35% 35%, ${node.color}40, ${node.color}15)`, border: `2px solid ${node.color}60` }}>

                {/* Inner orb */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                  className="w-8 h-8 rounded-full"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${node.color}, ${node.color}60)` }}
                />

                {/* My campus indicator */}
                {isMine && (
                  <motion.div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 border-2 border-black flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </motion.div>
                )}
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{ opacity: isActive ? 1 : 0.6 }}
                className="text-xs font-bold tracking-wider whitespace-nowrap"
                style={{ color: node.color }}>
                {node.short}
              </motion.span>
              {isMine && <span className="text-[9px] text-cyan-400/60 -mt-1.5">YOUR CAMPUS</span>}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Warp Search / Command Center UI */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className={`text-center transition-all duration-500 pointer-events-none ${searchOpen ? 'opacity-0 scale-95 h-0 mb-0' : 'opacity-100 scale-100 h-auto mb-6'}`}>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400">
            ONYX PULSE
          </h1>
          <p className="text-sm text-slate-500 mt-2 tracking-widest uppercase">Select Your Orbit</p>
        </motion.div>

        <motion.div layout className="relative">
          <motion.div 
            layout
            className={`flex items-center backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-300 ${
              searchOpen ? 'w-80 bg-white/10 rounded-2xl px-4 py-3 shadow-[0_0_40px_rgba(34,211,238,0.15)]' : 'w-14 h-14 bg-white/5 rounded-full cursor-pointer hover:bg-white/10 justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]'
            }`}
            onClick={() => !searchOpen && setSearchOpen(true)}
          >
            <Search className={`w-5 h-5 text-cyan-400 shrink-0 ${searchOpen ? 'mr-3' : ''}`} />
            {searchOpen && (
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => !search && setSearchOpen(false)}
                placeholder="Enter Campus Code (e.g., MNIT)..."
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-slate-500"
              />
            )}
          </motion.div>
        </motion.div>
      </div>

    </motion.div>
  )
}

// ── Swipe Card ──
function SwipeCard({ user, synergy, onSwipeLeft, onSwipeUp, isTop }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const leftOpacity = useTransform(x, [-100, 0], [1, 0])
  const upOpacity = useTransform(y, [-100, 0], [1, 0])
  const cardScale = useTransform(y, [-100, 0, 100], [1.02, 1, 0.98])

  const tags = user.skills || user.branch ? [user.branch, ...(user.skills || [])].filter(Boolean) : ['Student']

  return (
    <motion.div
      style={{ x, y, rotate, scale: cardScale, zIndex: isTop ? 10 : 1 }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x < -120) onSwipeLeft()
        else if (info.offset.y < -100) onSwipeUp(user)
      }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: -400, opacity: 0, rotate: -20, transition: { duration: 0.3 } }}
      className="absolute inset-0 mx-4 my-2 cursor-grab active:cursor-grabbing"
    >
      <div className="relative h-full rounded-[28px] overflow-hidden border border-white/10 bg-gradient-to-b from-[#0c1229] to-[#060b18]"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1)' }}>

        {/* Profile image */}
        <div className="relative h-[55%] overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-600/30 to-cyan-600/30 flex items-center justify-center">
              <span className="text-7xl font-black text-white/20">
                {(user.first_name?.[0] || '?').toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-transparent" />

          {/* Synergy badge */}
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full backdrop-blur-xl border border-cyan-400/30"
            style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))' }}>
            <span className="text-sm font-bold text-cyan-300">{synergy}% Match ✨</span>
          </motion.div>

          {/* Campus badge */}
          <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg backdrop-blur-xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-black text-violet-300 tracking-widest">
              [ {getCampusAcronym(user.tenant_id)} ]
            </span>
          </div>

          {/* Left overlay */}
          <motion.div style={{ opacity: leftOpacity }} className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm pointer-events-none">
            <div className="px-6 py-3 rounded-2xl border-4 border-red-400 rotate-[-20deg]">
              <span className="text-4xl font-black text-red-400">SKIP</span>
            </div>
          </motion.div>

          {/* Up overlay */}
          <motion.div style={{ opacity: upOpacity }} className="absolute inset-0 flex items-center justify-center bg-cyan-500/20 backdrop-blur-sm pointer-events-none">
            <div className="px-6 py-3 rounded-2xl border-4 border-cyan-400">
              <span className="text-4xl font-black text-cyan-400">SPARK ⚡</span>
            </div>
          </motion.div>
        </div>

        {/* Card content */}
        <div className="p-5 flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">
              {user.first_name} {user.last_name}
            </h2>
            <p className="text-sm text-slate-500">@{user.username} • {user.btech_year || 'Student'}</p>
          </div>

          {user.bio && <p className="text-xs text-slate-400 line-clamp-2">{user.bio}</p>}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 5).map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                style={{
                  color: getSkillColor(tag),
                  borderColor: `${getSkillColor(tag)}40`,
                  background: `${getSkillColor(tag)}15`,
                }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Gesture hint */}
          <div className="flex items-center justify-center gap-6 mt-auto pt-2">
            <div className="flex items-center gap-1.5 text-slate-600 text-[10px]">
              <X size={12} /> Swipe left
            </div>
            <div className="flex items-center gap-1.5 text-cyan-500/60 text-[10px]">
              <ChevronUp size={12} /> Swipe up to Spark
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Spark Bottom Sheet ──
function SparkSheet({ user, onClose, onSend }) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const tags = user.skills || user.branch ? [user.branch, ...(user.skills || [])].filter(Boolean) : ['Student']

  const send = async () => {
    setSending(true)
    await onSend(msg || ICEBREAKERS[0](tags))
    setSending(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>

      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 rounded-t-[32px] border-t border-white/10 p-6 flex flex-col gap-5"
        style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(6,11,24,0.99))', backdropFilter: 'blur(40px)' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="self-center w-10 h-1 rounded-full bg-white/20 mb-1" />

        {/* Header */}
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
              {(user.first_name?.[0] || '?').toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-lg">{user.first_name} {user.last_name}</p>
            <p className="text-xs text-slate-500">Send a Spark to connect ⚡</p>
          </div>
        </div>

        {/* Icebreakers */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Suggested Icebreakers</p>
          {ICEBREAKERS.map((fn, i) => (
            <motion.button key={i} whileTap={{ scale: 0.97 }}
              onClick={() => setMsg(fn(tags))}
              className={`text-left px-4 py-3 rounded-2xl border text-sm transition-all ${msg === fn(tags)
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06]'
                }`}>
              {fn(tags)}
            </motion.button>
          ))}
        </div>

        {/* Custom message */}
        <div className="flex gap-2">
          <input type="text" value={msg} onChange={e => setMsg(e.target.value)}
            placeholder="Write a custom spark..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/30"
          />
        </div>

        {/* Send Button */}
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={send} disabled={sending}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', boxShadow: '0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(139,92,246,0.2)' }}>
          {sending ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RotateCcw size={18} />
            </motion.div>
          ) : (
            <><Send size={18} /> Send Spark ⚡</>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ── Orbit Depleted Screen ──
function OrbitDepleted({ campus, onBack }) {
  const [countdown, setCountdown] = useState(getCountdown())

  useEffect(() => {
    const iv = setInterval(() => setCountdown(getCountdown()), 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">

      {/* Depleted Icon */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="w-24 h-24 rounded-full flex items-center justify-center relative"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)', border: '2px solid rgba(139,92,246,0.2)' }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-4xl">🌙</motion.div>
      </motion.div>

      <div>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
          Orbit Depleted
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          You've discovered all {DAILY_LIMIT} profiles in {campus?.short || 'this campus'} today
        </p>
      </div>

      {/* Countdown */}
      <div className="px-6 py-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-xl">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Next Orbit Drop In</p>
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-violet-400" />
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-mono tracking-wider">
            {countdown}
          </span>
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.95 }} onClick={onBack}
        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-400 font-semibold hover:bg-white/10 transition-colors">
        ← Back to Galaxy
      </motion.button>
    </motion.div>
  )
}

// ── Main OnyxPulse Component ──
export default function OnyxPulse({ profile, onTabChange }) {
  const [phase, setPhase] = useState('galaxy') // galaxy | stack | depleted
  const [selectedCampus, setSelectedCampus] = useState(null)
  const [stack, setStack] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sparkTarget, setSparkTarget] = useState(null)
  const [seenCount, setSeenCount] = useState(0)
  const [vibeCheckComplete, setVibeCheckComplete] = useState((profile?.skills?.length || 0) > 0)
  const myTags = [profile?.branch, ...(profile?.skills || [])].filter(Boolean)

  const loadStack = useCallback(async (campus) => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Check how many the user has already seen today for this campus
      const storageKey = `pulse_seen_${profile.id}_${campus.id ?? 'main'}_${today}`
      const seenIds = JSON.parse(localStorage.getItem(storageKey) || '[]')
      setSeenCount(seenIds.length)

      if (seenIds.length >= DAILY_LIMIT) {
        setPhase('depleted')
        setLoading(false)
        return
      }

      const remaining = DAILY_LIMIT - seenIds.length

      let query = supabase.from('profiles')
        .select('id, first_name, last_name, username, avatar_url, bio, branch, btech_year, skills, tenant_id')
        .neq('id', profile.id)
        .limit(remaining)

      // Tenant isolation
      if (campus.id) {
        query = query.eq('tenant_id', campus.id)
      } else {
        query = query.is('tenant_id', null)
      }

      // Exclude already seen
      if (seenIds.length > 0) {
        query = query.not('id', 'in', `(${seenIds.join(',')})`)
      }

      const { data } = await query

      if (!data || data.length === 0) {
        setPhase('depleted')
        setLoading(false)
        return
      }

      // Sort by synergy (highest first)
      const sorted = data.map(u => ({
        ...u,
        synergy: calcSynergy(myTags, [u.branch, ...(u.skills || [])].filter(Boolean))
      })).sort((a, b) => b.synergy - a.synergy)

      setStack(sorted)
      setCurrentIndex(0)
      setPhase('stack')
    } catch (err) {
      console.error('[OnyxPulse] loadStack error:', err)
    }
    setLoading(false)
  }, [profile, myTags])

  const handleSelectCampus = (campus) => {
    setSelectedCampus(campus)
    loadStack(campus)
  }

  const markSeen = (userId) => {
    const today = new Date().toISOString().split('T')[0]
    const storageKey = `pulse_seen_${profile.id}_${selectedCampus?.id ?? 'main'}_${today}`
    const seenIds = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (!seenIds.includes(userId)) {
      seenIds.push(userId)
      localStorage.setItem(storageKey, JSON.stringify(seenIds))
    }
    setSeenCount(seenIds.length)
  }

  const handleSwipeLeft = () => {
    const user = stack[currentIndex]
    if (user) markSeen(user.id)

    if (currentIndex + 1 >= stack.length) {
      setPhase('depleted')
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  const handleSwipeUp = (user) => {
    setSparkTarget(user)
  }

  const handleSendSpark = async (message) => {
    if (!sparkTarget) return
    try {
      await supabase.from('friend_requests').insert({
        sender_id: profile.id,
        receiver_id: sparkTarget.id,
        status: 'pending',
        metadata: { source: 'pulse', message }
      })
    } catch (err) {
      console.error('[OnyxPulse] sendSpark error:', err)
    }

    markSeen(sparkTarget.id)
    setSparkTarget(null)

    if (currentIndex + 1 >= stack.length) {
      setPhase('depleted')
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  const handleBackToGalaxy = () => {
    setPhase('galaxy')
    setSelectedCampus(null)
    setStack([])
    setCurrentIndex(0)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-black relative">
      {/* Ambient BG */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      {phase !== 'galaxy' && (
        <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-xl z-20 relative">
          <button onClick={handleBackToGalaxy} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 tracking-wider">
              {selectedCampus?.short || 'PULSE'}
            </h2>
            <p className="text-[10px] text-slate-600">{seenCount}/{DAILY_LIMIT} discovered today</p>
          </div>
          <div className="w-9" />
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex-1 z-10">
        <AnimatePresence mode="wait">
          {!vibeCheckComplete && (
            <VibeCheckModal 
              key="vibe" 
              profile={profile} 
              onComplete={(tags) => {
                if (profile) profile.skills = tags
                setVibeCheckComplete(true)
              }} 
            />
          )}

          {vibeCheckComplete && phase === 'galaxy' && (
            <GalaxyView key="galaxy" onSelect={handleSelectCampus} profile={profile} />
          )}

          {phase === 'stack' && (
            <motion.div key="stack" className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4 }}>

              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="w-8 h-8 text-violet-400" />
                  </motion.div>
                </div>
              ) : (
                <AnimatePresence>
                  {stack[currentIndex] && (
                    <SwipeCard
                      key={stack[currentIndex].id}
                      user={stack[currentIndex]}
                      synergy={stack[currentIndex].synergy}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeUp={handleSwipeUp}
                      isTop={true}
                    />
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          )}

          {phase === 'depleted' && (
            <OrbitDepleted key="depleted" campus={selectedCampus} onBack={handleBackToGalaxy} />
          )}
        </AnimatePresence>

        {/* Spark Sheet */}
        <AnimatePresence>
          {sparkTarget && (
            <SparkSheet
              user={sparkTarget}
              onClose={() => setSparkTarget(null)}
              onSend={handleSendSpark}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
