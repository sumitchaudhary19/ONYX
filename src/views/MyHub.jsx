import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Crown, AlertTriangle, CheckCircle2, ChevronRight, Send, Plus,
  Paperclip, X, Image, FileText, Users, Shield, BookOpen, Flame, Download,
  Search, ExternalLink, ToggleLeft, ToggleRight, Trash2, School, Loader2
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { processMediaFile } from '../utils/mediaUtils'

// ── Hub type definitions ──
const HUB_TYPES = [
  { key: 'core',    label: 'Core Hub',    desc: 'Year + Branch group',    matchFields: ['btech_year', 'branch'] },
  { key: 'section', label: 'Section Hub', desc: 'Your section class',     matchFields: ['btech_year', 'branch', 'section'] },
  { key: 'lab',     label: 'Lab Hub',     desc: 'Lab practical group',    matchFields: ['btech_year', 'branch', 'section'] },
]

const VAULT_CATEGORIES = ['All', 'Lab Manuals', 'Mid-Term', 'PYQs', 'IMP', 'Notes', 'Assignments']
const VAULT_ICONS = { 'Lab Manuals': '#3b82f6', 'Mid-Term': '#f59e0b', 'PYQs': '#ef4444', 'IMP': '#ec4899', 'Notes': '#8b5cf6', 'Assignments': '#10b981' }

// ── Shared UI ──
function GlassCapsule({ children, onClick, active, dimmed, className = '' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`w-full py-3.5 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-all duration-300
        ${active ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-500/40 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' : ''}
        ${dimmed ? 'bg-white/[0.03] border border-white/[0.06] text-slate-500 opacity-60' : ''}
        ${!active && !dimmed ? 'bg-white/[0.05] border border-white/10 text-slate-200 hover:bg-white/[0.08] hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]' : ''}
        backdrop-blur-sm ${className}`}
    >
      {children}
    </motion.button>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function MyHub({ profile, session }) {
  // ── Top-level state ──
  const [phase, setPhase] = useState('selector') // selector | chat | details | vault
  const [hubs, setHubs] = useState({})           // { core: hubRow|null, section: hubRow|null, lab: hubRow|null }
  const [memberships, setMemberships] = useState({}) // { core: bool, section: bool, lab: bool }
  const [activeHub, setActiveHub] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showCrWarning, setShowCrWarning] = useState(false)
  const [crWarningType, setCrWarningType] = useState(null)
  const [crConfirmed, setCrConfirmed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showCrown, setShowCrown] = useState(false)

  // ── Load hubs on mount ──
  useEffect(() => {
    if (!profile?.id) return
    loadHubs()
  }, [profile?.id])

  const loadHubs = async () => {
    setLoading(true)
    try {
      const hubData = {}
      const memberData = {}

      for (const ht of HUB_TYPES) {
        // Build match query
        let q = supabase.from('hubs').select('*').eq('type', ht.key)
        for (const f of ht.matchFields) {
          if (profile[f]) q = q.eq(f, profile[f])
        }
        const { data } = await q.maybeSingle()
        hubData[ht.key] = data || null

        // Check membership
        if (data) {
          const { data: mem } = await supabase.from('hub_members')
            .select('id').eq('hub_id', data.id).eq('user_id', profile.id).maybeSingle()
          memberData[ht.key] = !!mem
        } else {
          memberData[ht.key] = false
        }
      }
      setHubs(hubData)
      setMemberships(memberData)
    } catch (err) {
      console.error('[MyHub] loadHubs error:', err)
    }
    setLoading(false)
  }

  // ── Create Hub (CR action) ──
  const createHub = async (type) => {
    setCreating(true)
    try {
      const ht = HUB_TYPES.find(h => h.key === type)
      const nameParts = []
      if (profile.branch) nameParts.push(profile.branch)
      if (type !== 'core' && profile.section) nameParts.push('Section ' + profile.section)
      nameParts.push(type === 'lab' ? 'Lab Hub' : type === 'section' ? 'Virtual Class' : 'Core Hub')
      const hubName = nameParts.join(' - ')

      const insertData = {
        type,
        btech_year: profile.btech_year || null,
        branch: profile.branch || null,
        section: (type !== 'core') ? (profile.section || null) : null,
        name: hubName,
        cr_id: profile.id,
      }

      const { data: newHub, error } = await supabase.from('hubs').insert(insertData).select().single()
      if (error) throw error

      // Auto-join as member
      await supabase.from('hub_members').insert({ hub_id: newHub.id, user_id: profile.id })

      setHubs(prev => ({ ...prev, [type]: newHub }))
      setMemberships(prev => ({ ...prev, [type]: true }))
      setShowCrWarning(false)
      setCrConfirmed(false)

      // Show crown celebration
      setShowCrown(true)
      setTimeout(() => {
        setShowCrown(false)
        setActiveHub(newHub)
        setPhase('chat')
      }, 2800)
    } catch (err) {
      console.error('[MyHub] createHub error:', err)
      alert('Failed to create hub: ' + (err.message || 'Unknown error'))
    }
    setCreating(false)
  }

  // ── Join Hub ──
  const joinHub = async (type) => {
    const hub = hubs[type]
    if (!hub) return
    try {
      await supabase.from('hub_members').insert({ hub_id: hub.id, user_id: profile.id })
      setMemberships(prev => ({ ...prev, [type]: true }))
      setActiveHub(hub)
      setPhase('chat')
    } catch (err) {
      console.error('[MyHub] joinHub error:', err)
    }
  }

  // ── Enter existing hub ──
  const enterHub = (type) => {
    setActiveHub(hubs[type])
    setPhase('chat')
  }

  // ── Handle tab click ──
  const handleTabClick = (type) => {
    const hub = hubs[type]
    if (!hub) {
      // Not created yet -> CR warning
      setCrWarningType(type)
      setShowCrWarning(true)
      setCrConfirmed(false)
    } else if (!memberships[type]) {
      // Exists but not joined
      joinHub(type)
    } else {
      enterHub(type)
    }
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#060b18] relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'selector' && (
          <motion.div key="selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative z-10">
            <HubSelector
              profile={profile}
              hubs={hubs}
              memberships={memberships}
              onTabClick={handleTabClick}
            />
          </motion.div>
        )}

        {phase === 'chat' && activeHub && (
          <motion.div key="chat" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col relative z-10 h-full">
            <HubChat
              hub={activeHub}
              profile={profile}
              onBack={() => { setPhase('selector'); setActiveHub(null) }}
              onDetails={() => setPhase('details')}
              onVault={() => setPhase('vault')}
            />
          </motion.div>
        )}

        {phase === 'details' && activeHub && (
          <motion.div key="details" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="flex-1 flex flex-col relative z-10 h-full">
            <HubDetails
              hub={activeHub}
              profile={profile}
              onBack={() => setPhase('chat')}
            />
          </motion.div>
        )}

        {phase === 'vault' && activeHub && (
          <motion.div key="vault" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="flex-1 flex flex-col relative z-10 h-full">
            <HubVault
              hub={activeHub}
              profile={profile}
              onBack={() => setPhase('chat')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CR Warning Modal ── */}
      <AnimatePresence>
        {showCrWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCrWarning(false)}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-[#0a0f1e]/95 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(239,68,68,0.15)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-red-300">CR Authorization</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                <span className="text-red-400 font-bold">Warning:</span> Only the official Class Representative (CR) can create this Virtual Class Setup. False claims will result in a
                <span className="text-red-400 font-bold"> Rs.500 penalty</span> and an
                <span className="text-red-400 font-bold"> immediate account ban</span>.
              </p>
              <label className="flex items-start gap-3 mb-5 cursor-pointer group">
                <input type="checkbox" checked={crConfirmed} onChange={e => setCrConfirmed(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-red-500 cursor-pointer" />
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  I confirm I am the official CR and accept the penalty for false claims.
                </span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowCrWarning(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/10 transition-colors">
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={!crConfirmed || creating}
                  onClick={() => createHub(crWarningType)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300
                    ${crConfirmed ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                  Create Hub
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Crown Celebration Modal ── */}
      <AnimatePresence>
        {showCrown && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-5">
              <motion.div
                animate={{ y: [0, -12, 0], filter: ['drop-shadow(0 0 20px rgba(251,191,36,0.6))', 'drop-shadow(0 0 50px rgba(251,191,36,0.9))', 'drop-shadow(0 0 20px rgba(251,191,36,0.6))'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="text-8xl select-none"
              >
                {"\u{1F451}"}
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 tracking-wide">
                Crown Unlocked!
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="text-sm text-slate-400 text-center max-w-[250px]">
                Welcome Admin. You now control this Hub.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// HUB SELECTOR
// ══════════════════════════════════════════════════════════════
function HubSelector({ profile, hubs, memberships, onTabClick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <div className="flex flex-col items-center gap-2 mb-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center">
          <School className="w-7 h-7 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-white">My Hub</h2>
        <p className="text-xs text-slate-500 text-center max-w-[260px]">Your virtual class ecosystem. Select a hub below.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {HUB_TYPES
          .filter(ht => {
            // Section Hub only visible for 1st Year / Fresher students
            if (ht.key === 'section') {
              const year = (profile?.btech_year || '').toLowerCase()
              return year === '1st year' || year === 'fresher'
            }
            return true
          })
          .map(ht => {
          const hub = hubs[ht.key]
          const isMember = memberships[ht.key]

          let statusText = 'Not Created Yet'
          let dimmed = true
          let active = false
          if (hub && isMember) {
            statusText = hub.name
            dimmed = false
            active = true
          } else if (hub && !isMember) {
            statusText = 'Enter Hub'
            dimmed = false
          }

          return (
            <GlassCapsule key={ht.key} onClick={() => onTabClick(ht.key)} active={active} dimmed={dimmed && !hub}>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[13px]">{ht.label}</span>
                <span className={`text-[10px] ${active ? 'text-purple-300/70' : dimmed ? 'text-slate-600' : 'text-slate-400'}`}>{statusText}</span>
              </div>
              {hub && !isMember && (
                <span className="text-xs text-cyan-400 font-bold flex items-center gap-1">
                  Enter <ChevronRight className="w-3.5 h-3.5" />
                </span>
              )}
              {hub && isMember && (
                <ChevronRight className="w-4 h-4 text-purple-400" />
              )}
              {!hub && (
                <span className="text-[10px] text-slate-600 italic">tap to create</span>
              )}
            </GlassCapsule>
          )
        })}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// HUB CHAT
// ══════════════════════════════════════════════════════════════
function HubChat({ hub, profile, onBack, onDetails, onVault }) {
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [members, setMembers] = useState([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Load messages + subscribe
  useEffect(() => {
    if (!hub?.id) return
    loadMessages()
    loadMembers()

    const channel = supabase.channel(`hub-msgs-${hub.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hub_messages', filter: `hub_id=eq.${hub.id}` },
        async (payload) => {
          const msg = payload.new
          // Fetch sender profile if missing
          if (!profiles[msg.sender_id]) {
            const { data: p } = await supabase.from('profiles').select('id,first_name,last_name,avatar_url,username').eq('id', msg.sender_id).single()
            if (p) setProfiles(prev => ({ ...prev, [p.id]: p }))
          }
          setMessages(prev => [...prev, msg])
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100)
        })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [hub?.id])

  const loadMessages = async () => {
    const { data } = await supabase.from('hub_messages')
      .select('*').eq('hub_id', hub.id).order('created_at', { ascending: true }).limit(200)
    if (data) {
      setMessages(data)
      // Load all sender profiles
      const ids = [...new Set(data.map(m => m.sender_id))]
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id,first_name,last_name,avatar_url,username').in('id', ids)
        if (profs) {
          const map = {}
          profs.forEach(p => map[p.id] = p)
          setProfiles(map)
        }
      }
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100)
    }
  }

  const loadMembers = async () => {
    const { data } = await supabase.from('hub_members')
      .select('user_id, profiles:user_id(id,first_name,last_name,avatar_url,username)')
      .eq('hub_id', hub.id)
    if (data) setMembers(data.map(d => d.profiles).filter(Boolean))
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    setShowMentions(false)

    // Extract mentions
    const mentionRegex = /@(\w+)/g
    const mentionedUsernames = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.push(match[1])
    }
    const mentionIds = members.filter(m => mentionedUsernames.includes(m.username)).map(m => m.id)

    try {
      await supabase.from('hub_messages').insert({
        hub_id: hub.id,
        sender_id: profile.id,
        content,
        mentions: mentionIds
      })
    } catch (err) {
      console.error('[HubChat] send error:', err)
    }
    setSending(false)
  }

  const handleInputChange = (val) => {
    setInput(val)
    // Check for @ mentions
    const lastAt = val.lastIndexOf('@')
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentions(true)
      setMentionFilter('')
    } else if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1)
      if (!afterAt.includes(' ')) {
        setShowMentions(true)
        setMentionFilter(afterAt.toLowerCase())
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (member) => {
    const lastAt = input.lastIndexOf('@')
    const before = input.slice(0, lastAt)
    setInput(before + '@' + member.username + ' ')
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const isCR = hub.cr_id === profile.id

  const filteredMembers = showMentions
    ? members.filter(m => m.username?.toLowerCase().includes(mentionFilter) || m.first_name?.toLowerCase().includes(mentionFilter))
    : []

  // File upload with limits
  const handleFileUpload = async (type) => {
    const inp = document.createElement('input')
    inp.type = 'file'
    if (type === 'image') inp.accept = 'image/*'
    inp.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Client-side limits
      if (type === 'image' && file.size > 2 * 1024 * 1024) {
        alert('Image must be under 2MB'); return
      }
      if (type === 'file' && file.size > 5 * 1024 * 1024) {
        alert('File must be under 5MB'); return
      }
      setSending(true)
      try {
        const ext = file.name.split('.').pop()
        const filePath = `hub/${hub.id}/${Date.now()}.${ext}`
        const bucket = type === 'image' ? 'chat-media' : 'chat-media'
        const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
        const msgData = {
          hub_id: hub.id,
          sender_id: profile.id,
          ...(type === 'image' ? { image_url: urlData.publicUrl } : { file_url: urlData.publicUrl, file_name: file.name }),
        }
        await supabase.from('hub_messages').insert(msgData)
      } catch (err) {
        console.error('[HubChat] upload error:', err)
        alert('Upload failed: ' + err.message)
      }
      setSending(false)
    }
    inp.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#060b18]/90 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </motion.button>
          <button onClick={onDetails} className="flex flex-col">
            <span className="text-sm font-bold text-white">{hub.name}</span>
            <span className="text-[10px] text-slate-500">{members.length} members</span>
          </button>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onVault}
          className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center hover:bg-purple-500/20 transition-colors">
          <BookOpen className="w-4 h-4 text-purple-400" />
        </motion.button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-600 text-center">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === profile.id
          const isCrMsg = msg.sender_id === hub.cr_id
          const sender = profiles[msg.sender_id]
          const senderName = sender ? (sender.first_name || sender.username || 'Unknown') : 'Unknown'
          const senderAvatar = sender?.avatar_url
          const initials = sender ? [sender.first_name, sender.last_name].filter(Boolean).map(s => s[0]?.toUpperCase()).join('') : '?'

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-2`}>
              {!isMine && (
                <div className="flex items-center gap-1.5 mb-1 pl-1">
                  {senderAvatar ? (
                    <img src={senderAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[8px] font-bold text-white">{initials}</div>
                  )}
                  <span className={`text-[10px] font-semibold ${isCrMsg ? 'text-purple-400' : 'text-slate-500'}`}>
                    {senderName} {isCrMsg && '\u{1F451}'}
                  </span>
                </div>
              )}

              {msg.image_url && (
                <img src={msg.image_url} alt="" className={`max-w-[220px] rounded-2xl shadow-lg mb-1 ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`} />
              )}
              {msg.file_url && (
                <a href={msg.file_url} target="_blank" rel="noreferrer"
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${isMine ? 'bg-blue-600/30 text-blue-300' : 'bg-white/5 text-slate-300'} border border-white/10`}>
                  <FileText className="w-4 h-4" /> {msg.file_name || 'File'} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {msg.content && (
                <div className={`max-w-[75vw] md:max-w-md px-4 py-2.5 text-[14px] leading-relaxed break-words
                  ${isMine
                    ? (isCrMsg
                      ? 'rounded-[18px_18px_4px_18px] bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                      : 'rounded-[18px_18px_4px_18px] bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md')
                    : (isCrMsg
                      ? 'rounded-[18px_18px_18px_4px] bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                      : 'rounded-[18px_18px_18px_4px] bg-white/[0.06] border border-white/10 text-slate-100')
                  }`}>
                  {msg.content}
                </div>
              )}
              <span className="text-[9px] text-slate-600 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
      </div>

      {/* @ Mention popup */}
      <AnimatePresence>
        {showMentions && filteredMembers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-1 max-h-[180px] overflow-y-auto rounded-2xl bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            {filteredMembers.slice(0, 8).map(m => (
              <button key={m.id} onClick={() => insertMention(m)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {m.first_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">{m.first_name} {m.last_name}</span>
                  <span className="text-[10px] text-slate-500">@{m.username}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing bar */}
      <div className="px-3 py-2.5 border-t border-white/5 bg-[#060b18]/90 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleFileUpload('image')}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
            <Plus className="w-4 h-4 text-slate-400" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleFileUpload('file')}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
            <Paperclip className="w-4 h-4 text-slate-400" />
          </motion.button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none px-2 py-1.5"
          />
          <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage} disabled={!input.trim() || sending}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all
              ${input.trim() ? 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'bg-white/5'}`}>
            <Send className={`w-4 h-4 ${input.trim() ? 'text-white' : 'text-slate-600'}`} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// HUB DETAILS
// ══════════════════════════════════════════════════════════════
function HubDetails({ hub, profile, onBack }) {
  const [members, setMembers] = useState([])
  const [crProfile, setCrProfile] = useState(null)
  const [tab, setTab] = useState('info') // info | students
  const isCR = hub.cr_id === profile.id

  useEffect(() => {
    loadDetails()
  }, [hub.id])

  const loadDetails = async () => {
    // Load members
    const { data: mems } = await supabase.from('hub_members')
      .select('user_id, profiles:user_id(id,first_name,last_name,avatar_url,username)')
      .eq('hub_id', hub.id)
    if (mems) setMembers(mems.map(m => m.profiles).filter(Boolean))

    // Load CR profile
    if (hub.cr_id) {
      const { data: cr } = await supabase.from('profiles')
        .select('id,first_name,last_name,avatar_url,username').eq('id', hub.cr_id).single()
      if (cr) setCrProfile(cr)
    }
  }

  const removeMember = async (userId) => {
    if (!isCR || userId === profile.id) return
    if (!confirm('Remove this student from the Hub?')) return
    await supabase.from('hub_members').delete().eq('hub_id', hub.id).eq('user_id', userId)
    setMembers(prev => prev.filter(m => m.id !== userId))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#060b18]/90 backdrop-blur-xl flex-shrink-0">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </motion.button>
        <h2 className="text-sm font-bold text-white">Hub Details</h2>
      </div>

      {/* Tabs (CR gets Students tab) */}
      <div className="flex px-4 pt-3 gap-2 flex-shrink-0">
        <button onClick={() => setTab('info')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'info' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
          Info
        </button>
        {isCR && (
          <button onClick={() => setTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${tab === 'students' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
            <Users className="w-3.5 h-3.5" /> Students
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'info' && (
          <div className="flex flex-col gap-4">
            {/* Member count */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
              <p className="text-xs text-slate-500 mb-1">Total Members</p>
              <p className="text-2xl font-bold text-white">{members.length}</p>
            </div>

            {/* CR Card */}
            {crProfile && (
              <div className="rounded-2xl bg-gradient-to-br from-purple-600/10 to-cyan-600/10 border border-purple-500/20 p-4 flex items-center gap-3">
                {crProfile.avatar_url ? (
                  <img src={crProfile.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-purple-500/30" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg font-bold text-white">
                    {crProfile.first_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{crProfile.first_name} {crProfile.last_name}</span>
                    <span className="text-base">{"\u{1F451}"}</span>
                  </div>
                  <p className="text-[11px] text-purple-300/70">Class Representative</p>
                </div>
              </div>
            )}

            {/* Timetable placeholder */}
            <div className="rounded-2xl bg-white/[0.03] border border-dashed border-white/10 p-6 flex flex-col items-center gap-2">
              <span className="text-3xl opacity-30">{"\u{1F4C5}"}</span>
              <p className="text-xs text-slate-600">Class Timetable</p>
              <p className="text-[10px] text-slate-700">Coming soon</p>
            </div>
          </div>
        )}

        {tab === 'students' && (
          <div className="flex flex-col gap-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                      {m.first_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">{m.first_name} {m.last_name}</p>
                    <p className="text-[10px] text-slate-500">@{m.username}</p>
                  </div>
                </div>
                {m.id !== profile.id && m.id !== hub.cr_id && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeMember(m.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remove
                  </motion.button>
                )}
                {m.id === hub.cr_id && (
                  <span className="text-[10px] text-purple-400 font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3" /> CR
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// HUB VAULT
// ══════════════════════════════════════════════════════════════
function HubVault({ hub, profile, onBack }) {
  const [links, setLinks] = useState([])
  const [filter, setFilter] = useState('All')
  const [panicMode, setPanicMode] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadData, setUploadData] = useState({ title: '', category: 'Notes', url: '' })
  const [uploading, setUploading] = useState(false)
  const isCR = hub.cr_id === profile.id

  useEffect(() => {
    loadLinks()
  }, [hub.id])

  const loadLinks = async () => {
    const { data } = await supabase.from('vault_links')
      .select('*').eq('hub_id', hub.id).order('created_at', { ascending: false })
    if (data) setLinks(data)
  }

  const handleUpload = async () => {
    if (!uploadData.title.trim() || !uploadData.url.trim()) return
    setUploading(true)
    try {
      await supabase.from('vault_links').insert({
        hub_id: hub.id,
        title: uploadData.title.trim(),
        category: uploadData.category,
        url: uploadData.url.trim(),
        uploaded_by: profile.id,
      })
      setUploadData({ title: '', category: 'Notes', url: '' })
      setShowUpload(false)
      loadLinks()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setUploading(false)
  }

  const activeFilter = panicMode ? 'PYQs' : filter
  const filtered = activeFilter === 'All'
    ? links
    : links.filter(l => panicMode ? (l.category === 'PYQs' || l.category === 'IMP') : l.category === activeFilter)

  const trendingLinks = [...links].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 3)

  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ${panicMode ? 'bg-[#0a0408]' : 'bg-[#060b18]'}`}>
      {/* Panic mode ambient glow */}
      {panicMode && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)' }} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-transparent backdrop-blur-xl flex-shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </motion.button>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" /> Vault
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isCR && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowUpload(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/25 transition-colors">
              + Upload
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPanicMode(!panicMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border
              ${panicMode ? 'bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 text-slate-400'}`}>
            <Flame className="w-3.5 h-3.5" />
            {panicMode ? 'PANIC' : 'Panic'}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 relative z-10">
        {/* Trending */}
        {!panicMode && trendingLinks.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-orange-600/10 to-red-600/10 border border-orange-500/20">
            <p className="text-xs font-bold text-orange-300 mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Trending Now
            </p>
            {trendingLinks.map(l => (
              <a key={l.id} href={l.url} target="_blank" rel="noreferrer"
                className="block text-[11px] text-slate-300 py-1 hover:text-white transition-colors truncate">
                {l.title}
              </a>
            ))}
          </div>
        )}

        {/* Filter tags */}
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {(panicMode ? ['PYQs', 'IMP'] : VAULT_CATEGORIES).map(cat => (
            <button key={cat} onClick={() => !panicMode && setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border
                ${(panicMode ? (cat === 'PYQs' || cat === 'IMP') : activeFilter === cat)
                  ? (panicMode ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-purple-500/20 border-purple-500/30 text-purple-300')
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-2.5 mt-1">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <BookOpen className="w-8 h-8 text-slate-700" />
              <p className="text-xs text-slate-600">No resources yet</p>
            </div>
          )}
          {filtered.map(link => {
            const catColor = VAULT_ICONS[link.category] || '#8b5cf6'
            return (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                  style={{ background: catColor + '15', borderColor: catColor + '30' }}>
                  <FileText className="w-5 h-5" style={{ color: catColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{link.title}</p>
                  <p className="text-[10px] text-slate-500">{link.category} {"\u{00B7}"} ~{Math.floor(Math.random() * 4 + 1)}.{Math.floor(Math.random() * 9)}MB</p>
                </div>
                <motion.div animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all">
                  <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-300" />
                </motion.div>
              </a>
            )
          })}
        </div>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUpload(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-[#0f172a] border-t border-white/10 p-6 pb-10">
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <h3 className="text-sm font-bold text-white mb-4">Upload to Vault</h3>
              <div className="flex flex-col gap-3">
                <input value={uploadData.title} onChange={e => setUploadData(d => ({...d, title: e.target.value}))}
                  placeholder="Document Title" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors" />
                <select value={uploadData.category} onChange={e => setUploadData(d => ({...d, category: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-purple-500/50 transition-colors appearance-none">
                  {VAULT_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c} className="bg-[#0a0f1e]">{c}</option>)}
                </select>
                <input value={uploadData.url} onChange={e => setUploadData(d => ({...d, url: e.target.value}))}
                  placeholder="Google Drive URL" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors" />
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleUpload} disabled={uploading || !uploadData.title.trim() || !uploadData.url.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Link'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
