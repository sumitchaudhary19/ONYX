import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import GroupDetailsModal from '../components/GroupDetailsModal'
import TypingBar from '../components/TypingBar'

const GRADS = ['linear-gradient(135deg,#3b82f6,#06b6d4)', 'linear-gradient(135deg,#8b5cf6,#ec4899)', 'linear-gradient(135deg,#10b981,#14b8a6)', 'linear-gradient(135deg,#f59e0b,#f97316)', 'linear-gradient(135deg,#a855f7,#7c3aed)']

function SenderAvatar({ profile, size = 32 }) {
  const init = [profile?.first_name, profile?.last_name].filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?'
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  return <div className="rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow-inner" style={{ width: size, height: size, background: GRADS[0] }}>{init}</div>
}

function VoicePlayer({ url, isMine }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const toggle = () => { const a = audioRef.current; if (!a) return; if (playing) { a.pause() } else { a.play() }; setPlaying(!playing) }
  const fmt = (s) => { if (!s || isNaN(s)) return '0:00'; return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` }
  
  return (
    <div className={`inline-flex items-center gap-2.5 p-2.5 pr-3.5 rounded-[18px] min-w-[200px] max-w-[260px] border ${isMine ? 'bg-gradient-to-br from-blue-600/50 to-blue-700/60 border-blue-500/40 shadow-[0_4px_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/10'}`}>
      <motion.button onClick={toggle} whileTap={{ scale: 0.88 }}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-none cursor-pointer ${isMine ? 'bg-white/20' : 'bg-blue-600/25'}`}>
        {playing
          ? <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          : <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white ml-1"><path d="M8 5v14l11-7z" /></svg>
        }
      </motion.button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[2px] h-6">
          {[4, 7, 12, 9, 14, 10, 6, 11, 8, 13, 5, 9, 11, 7, 10, 8, 12, 6, 9, 7].map((h, i) => (
            <motion.div key={i}
              animate={playing ? { scaleY: [1, h / 7, 1] } : { scaleY: 1 }}
              transition={{ repeat: Infinity, duration: 0.4 + i * 0.03, delay: i * 0.02 }}
              className="w-[3px] rounded-[2px] origin-center transition-colors duration-100"
              style={{ height: `${h}px`, backgroundColor: progress > 0 && (i / 20) < progress / 100 ? (isMine ? '#fff' : '#60a5fa') : (isMine ? 'rgba(255,255,255,0.35)' : 'rgba(96,165,250,0.25)') }} />
          ))}
        </div>
        <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-slate-500'}`}>{fmt(duration)}</span>
      </div>
      <audio ref={audioRef} src={url} preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => { const a = audioRef.current; if (a && a.duration) setProgress((a.currentTime / a.duration) * 100) }}
        onEnded={() => { setPlaying(false); setProgress(0) }} />
    </div>
  )
}

function Bubble({ msg, isMine, senderProfile }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-3`}>
      {!isMine && (
        <div className="flex items-center gap-1.5 mb-1 pl-1.5">
          <SenderAvatar profile={senderProfile} size={22} />
          <span className="text-[11px] font-semibold text-slate-400">{senderProfile?.first_name || 'Unknown'}</span>
        </div>
      )}
      {msg.audio_url
        ? <VoicePlayer url={msg.audio_url} isMine={isMine} />
        : (<>
          {msg.image_url && <img src={msg.image_url} alt="" className={`max-w-[220px] shadow-lg ${isMine ? 'rounded-[18px_18px_4px_18px]' : 'rounded-[18px_18px_18px_4px]'} ${msg.content ? 'mb-1.5' : ''}`} />}
          {msg.content && (
            <div className={`max-w-[75vw] md:max-w-md px-4 py-2.5 text-[15px] leading-relaxed break-words ${isMine ? 'rounded-[18px_18px_4px_18px] bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md' : 'rounded-[18px_18px_18px_4px] bg-white/10 border border-white/10 text-slate-100'}`}>
              {msg.content}
            </div>
          )}
        </>)
      }
      <span className="text-[10px] text-slate-500 mt-1 px-1">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </motion.div>
  )
}

function TypingIndicator({ typers }) {
  if (!typers.length) return null
  const label = typers.length === 1 ? `${typers[0]} is typing…` : `${typers.slice(0, -1).join(', ')} and ${typers[typers.length - 1]} are typing…`
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
      className="flex items-center gap-2 px-3 py-1 mb-1">
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map(i => <motion.div key={i} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }} className="w-1.5 h-1.5 rounded-full bg-slate-500" />)}
      </div>
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
    </motion.div>
  )
}

export default function GroupChatRoom({ currentProfile }) {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [typers, setTypers] = useState({})
  const [presenceCh, setPresenceCh] = useState(null)
  const bottomRef = useRef(null)
  const myId = currentProfile?.id
  const myName = currentProfile?.firstName || 'Someone'
  const scroll = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [])

  useEffect(() => {
    if (!groupId) return
    supabase.from('groups').select('*').eq('id', groupId).single().then(({ data }) => { if (data) setGroup(data) })
  }, [groupId])

  useEffect(() => {
    if (!groupId || !myId) return
    setLoading(true)
    supabase.from('group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const msgs = data || []
        setMessages(msgs)
        const uids = [...new Set(msgs.map(m => m.sender_id))]
        if (uids.length) {
          const { data: profs } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id', uids)
          const map = {}; (profs || []).forEach(p => { map[p.id] = p }); setProfiles(map)
        }
        setLoading(false); setTimeout(scroll, 80)
      })
  }, [groupId, myId])

  useEffect(() => {
    if (!groupId || !myId) return
    const ch = supabase.channel(`gchat-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const m = payload.new
          setMessages(prev => prev.find(p => p.id === m.id) ? prev : [...prev, m])
          if (!profiles[m.sender_id]) {
            const { data: p } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').eq('id', m.sender_id).single()
            if (p) setProfiles(prev => ({ ...prev, [p.id]: p }))
          }
          setTimeout(scroll, 60)
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [groupId, myId, profiles])

  useEffect(() => {
    if (!groupId || !myId) return
    const ch = supabase.channel(`gpresence-${groupId}`, { config: { presence: { key: myId } } })
    ch.on('broadcast', { event: 'typing' }, (payload) => {
      const { userId, name, typing } = payload.payload || {}
      if (userId === myId) return
      setTypers(prev => {
        const next = { ...prev }
        if (typing) next[userId] = name
        else delete next[userId]
        return next
      })
    }).subscribe()
    setPresenceCh(ch)
    return () => { supabase.removeChannel(ch); setPresenceCh(null) }
  }, [groupId, myId])

  const sendMessage = async (caption, audioUrl) => {
    if (sending || uploading) return
    if (audioUrl) {
      await supabase.from('group_messages').insert({ group_id: groupId, sender_id: myId, audio_url: audioUrl })
      return
    }
    if (imageFile) { await sendImage(); return }
    const t = text.trim(); if (!t) return
    setSending(true); setText('')
    try {
      const { error } = await supabase.from('group_messages').insert({ group_id: groupId, sender_id: myId, content: t })
      if (error) throw error
    } catch (e) { console.error('[GCR] send:', e); setText(t) }
    finally { setSending(false) }
  }

  const sendImage = async () => {
    if (!imageFile) return
    setUploading(true)
    try {
      const ext = imageFile.name.split('.').pop()
      const path = `${myId}/${Date.now()}.${ext}`
      await supabase.storage.from('chat_images').upload(path, imageFile, { contentType: imageFile.type })
      const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(path)
      await supabase.from('group_messages').insert({ group_id: groupId, sender_id: myId, content: text.trim(), image_url: publicUrl })
      setImageFile(null); setText('')
    } catch (e) { console.error('[GCR] sendImage:', e) }
    finally { setUploading(false) }
  }

  const isBusy = sending || uploading
  const typerNames = Object.values(typers)

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0a0a12] overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[60vw] h-[60vw] rounded-full top-[-20%] left-[-10%]" style={{ background: 'radial-gradient(circle,rgba(37,99,235,0.1),transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <header onClick={() => setShowDetails(true)}
        className="shrink-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0a0a12]/90 backdrop-blur-xl border-b border-white/10 cursor-pointer">
        <motion.button onClick={e => { e.stopPropagation(); navigate(-1) }} whileTap={{ scale: 0.88 }}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        {group?.avatar_url
          ? <img src={group.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold text-white shrink-0 shadow-inner" style={{ background: GRADS[0] }}>{(group?.name || 'G')[0].toUpperCase()}</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-slate-100 truncate">{group?.name || 'Group Chat'}</p>
          <AnimatePresence mode="wait">
            {typerNames.length > 0
              ? <motion.p key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-blue-400 font-medium truncate">
                {typerNames.length === 1 ? `${typerNames[0]} is typing…` : `${typerNames.join(', ')} are typing…`}
              </motion.p>
              : <motion.p key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-slate-500 truncate">Tap to view details</motion.p>
            }
          </AnimatePresence>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 relative z-[1] scroll-smooth">
        {loading && (
          <div className="flex justify-center pt-10">
            <svg className="w-7 h-7 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-3 text-center pb-10">
            <div className="text-5xl">👋</div>
            <p className="text-base font-semibold text-slate-400">No messages yet</p>
            <p className="text-sm text-slate-500">Be the first to say something!</p>
          </motion.div>
        )}
        
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} isMine={msg.sender_id === myId} senderProfile={profiles[msg.sender_id]} />
            ))}
          </AnimatePresence>
        </div>
        
        <AnimatePresence><TypingIndicator typers={typerNames} /></AnimatePresence>
        <div ref={bottomRef} className="h-2" />
      </div>

      <div className="shrink-0 z-10 px-3 pb-4 pt-2 bg-[#0a0a12]/90 backdrop-blur-xl border-t border-white/5 relative">
        <AnimatePresence>
          {imageFile && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="relative inline-block ml-1 mb-2">
              <img src={URL.createObjectURL(imageFile)} alt="" className="h-16 rounded-xl object-cover shadow-lg" />
              <button onClick={() => setImageFile(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-md border-none cursor-pointer">
                <X className="w-3 h-3 text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <TypingBar
          text={text} setText={setText}
          onSend={sendMessage} disabled={isBusy}
          placeholder={messages.length === 0 ? 'Say hello to the group 👋' : 'Message…'}
          onFileSelect={setImageFile} presenceChannel={presenceCh}
          myId={myId} myName={myName}
        />
      </div>

      <AnimatePresence>
        {showDetails && <GroupDetailsModal group={group} currentProfile={currentProfile} onClose={() => setShowDetails(false)} onUpdated={g => setGroup(g)} />}
      </AnimatePresence>
    </div>
  )
}
