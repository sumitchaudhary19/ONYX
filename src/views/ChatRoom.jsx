import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, CheckCheck, X, Reply, Forward, Edit3, Trash2, Pin, Shield, Lock } from 'lucide-react'
import { supabase } from '../supabaseClient'
import TypingBar from '../components/TypingBar'
import { processMediaFile } from '../utils/mediaUtils'
import { filterEphemeralMessages, getExpirationText } from '../utils/ephemeral'

const GRADIENTS = ['linear-gradient(135deg,#3b82f6,#06b6d4)', 'linear-gradient(135deg,#8b5cf6,#ec4899)', 'linear-gradient(135deg,#10b981,#14b8a6)', 'linear-gradient(135deg,#f59e0b,#f97316)', 'linear-gradient(135deg,#ef4444,#f43f5e)', 'linear-gradient(135deg,#a855f7,#7c3aed)']

function fmtTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

function ReceiptIcon({ msg, myId }) {
  if (msg.sender_id !== myId) return null
  if (msg.read_at) return <CheckCheck className="w-[13px] h-[13px] text-blue-500 shrink-0" />
  if (msg.delivered_at) return <CheckCheck className="w-[13px] h-[13px] text-slate-500 shrink-0" />
  return <Check className="w-[13px] h-[13px] text-slate-500 shrink-0" />
}

function VoicePlayer({ url, isMine }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
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
        <div className="flex justify-between">
          <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-slate-500'}`}>{playing ? fmt(audioRef.current?.currentTime) : fmt(duration)}</span>
          <span className={`text-[10px] ${isMine ? 'text-white/40' : 'text-slate-600'}`}>Voice</span>
        </div>
      </div>
      <audio ref={audioRef} src={url} preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => { const a = audioRef.current; if (a && a.duration) setProgress((a.currentTime / a.duration) * 100) }}
        onEnded={() => { setPlaying(false); setProgress(0) }} />
    </div>
  )
}

function MsgMenu({ msg, isMine, onReply, onForward, onEdit, onDelete, onPin, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 10 }} onClick={e => e.stopPropagation()}
        className="bg-gradient-to-b from-[#0d1630] to-[#080e22] border border-white/10 rounded-2xl p-2 min-w-[200px] w-full max-w-xs shadow-2xl">
        {[
          ...(!isMine ? [
            { icon: Reply, label: 'Reply this text', color: '#60a5fa', action: onReply },
            { icon: Pin, label: msg?.is_pinned ? 'Unpin this text' : 'Pin this text', color: '#f59e0b', action: onPin },
          ] : []),
          { icon: Forward, label: 'Forward', color: '#a78bfa', action: onForward },
          ...(isMine ? [
            { icon: Edit3, label: 'Edit Text', color: '#34d399', action: onEdit },
            { icon: Trash2, label: 'Delete', color: '#f87171', action: onDelete }
          ] : [])
        ].map(({ icon: Icon, label, color, action }) => (
          <motion.button key={label} onClick={() => { action(); onClose() }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 p-3 bg-transparent hover:bg-white/5 border-none cursor-pointer rounded-xl transition-colors" style={{ color }}>
            <Icon className="w-4 h-4 shrink-0" /><span className="text-[15px] font-medium">{label}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  )
}

function Bubble({ msg, isMine, myId, onLongPress, replyMsg, navigate }) {
  const timerRef = useRef(null)
  const startPress = () => { timerRef.current = setTimeout(() => onLongPress(msg), 1000) }
  const endPress = () => clearTimeout(timerRef.current)
  
  return (
    <motion.div initial={{ opacity: 0, scale: 0.88, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-1.5`}
      onTouchStart={startPress} onTouchEnd={endPress} onTouchMove={endPress}
      onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}>
      
      {replyMsg && (
        <div className={`mb-1 px-3 py-1.5 rounded-[14px] text-xs max-w-[70vw] truncate border ${isMine ? 'bg-blue-600/20 border-blue-500/30 text-blue-200' : 'bg-white/5 border-white/10 text-slate-300'}`}>
          <div className="font-semibold mb-0.5 flex items-center gap-1 opacity-70">
            <Reply className="w-3 h-3" /> Replying to
          </div>
          <span className="opacity-80">{replyMsg?.content || 'Voice message'}</span>
        </div>
      )}

      {msg?.audio_url
        ? <VoicePlayer url={msg.audio_url} isMine={isMine} />
        : (<>
          {msg?.image_url && <img src={msg.image_url} alt="shared" className={`max-w-[220px] shadow-lg ${isMine ? 'rounded-[18px_18px_4px_18px]' : 'rounded-[18px_18px_18px_4px]'} ${msg.content ? 'mb-1.5' : ''}`} />}
          {msg?.video_url && <video src={msg.video_url} controls className={`max-w-[220px] shadow-lg bg-black ${isMine ? 'rounded-[18px_18px_4px_18px]' : 'rounded-[18px_18px_18px_4px]'} ${msg.content ? 'mb-1.5' : ''}`} />}
          {msg?.content && (
            <div className={`max-w-[75vw] md:max-w-md px-4 py-2.5 text-[15px] leading-relaxed break-words ${isMine ? 'rounded-[20px_20px_4px_20px] bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md' : 'rounded-[20px_20px_20px_4px] bg-white/10 border border-white/10 text-slate-100'}`}>
              {msg.content}
            </div>
          )}
        </>)
      }
      <div className="flex items-center gap-1 mt-1 px-1">
        {msg?.is_pinned && <Pin className="w-[10px] h-[10px] text-amber-500" />}
        <span className="text-[10px] text-slate-500">{fmtTime(msg?.created_at)}</span>
        {getExpirationText(msg) && (
          <span className="text-[10px] text-red-400 font-medium ml-1 flex items-center gap-0.5">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {getExpirationText(msg)}
          </span>
        )}
        {isMine && <ReceiptIcon msg={msg} myId={myId} />}
      </div>
    </motion.div>
  )
}

function ImagePreview({ file, onRemove }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
      className="relative inline-block mx-4 mb-2">
      <img src={URL.createObjectURL(file)} alt="preview" className="h-20 rounded-xl object-cover shadow-lg" />
      <button onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-none shadow-md">
        <X className="w-3 h-3 text-white" />
      </button>
    </motion.div>
  )
}

function FriendPicker({ title, currentProfile, onSelect, onClose }) {
  const [friends, setFriends] = useState([])
  useEffect(() => {
    async function load() {
      const { data: reqs } = await supabase.from('friend_requests').select('sender_id,receiver_id').eq('status', 'accepted').or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`)
      if (!reqs || reqs.length === 0) { setFriends([]); return }
      const ids = reqs.map(r => r.sender_id === currentProfile.id ? r.receiver_id : r.sender_id)
      const { data: p } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id', ids)
      setFriends(p || [])
    }
    load()
  }, [currentProfile?.id])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-[500] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-4">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-b from-[#0d1630] to-[#080e22] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 max-h-[70vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 flex flex-col gap-2">
          {friends.map((f, i) => {
            const name = [f?.first_name, f?.last_name].filter(Boolean).join(' ') || 'Unknown'
            return (
              <motion.button key={f.id} whileTap={{ scale: 0.98 }} onClick={() => onSelect(f)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-colors">
                {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-inner" style={{ background: GRADIENTS[i % GRADIENTS.length] }}>{(name[0] || '?').toUpperCase()}</div>}
                <div>
                  <p className="text-[15px] font-semibold text-white">{name}</p>
                  <p className="text-xs text-slate-400">@{f.username}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

function EditModal({ msg, onSave, onClose }) {
  const [val, setVal] = useState(msg?.content || '')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!val.trim() || !msg?.id) return; setSaving(true)
    const { error } = await supabase.from('messages').update({ content: val.trim() }).eq('id', msg.id)
    if (!error) onSave(msg.id, val.trim())
    setSaving(false); onClose()
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-[#0d1630] to-[#080e22] border border-white/10 rounded-[24px] p-5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[15px] font-bold text-white">Edit Message</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <textarea value={val} onChange={e => setVal(e.target.value)} rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-[15px] outline-none resize-none" />
        <motion.button onClick={save} disabled={saving} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-[15px] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export default function ChatRoom({ currentProfile }) {
  const { friendId } = useParams()
  const navigate = useNavigate()
  const [friend, setFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [showForward, setShowForward] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [friendTyping, setFriendTyping] = useState(false)
  const [presenceCh, setPresenceCh] = useState(null)
  const [isBlocker, setIsBlocker] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  const bottomRef = useRef(null)
  const myId = currentProfile?.id
  const myName = currentProfile?.firstName || 'Someone'
  const scrollBottom = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [])

  // Pre-populate message from marketplace "Message Seller" flow
  useEffect(() => {
    const marketplaceMsg = sessionStorage.getItem('marketplace_intro_msg')
    if (marketplaceMsg) {
      setText(marketplaceMsg)
      sessionStorage.removeItem('marketplace_intro_msg')
    }
  }, [friendId])

  useEffect(() => {
    if (!friendId || !myId) return
    supabase.from('profiles').select('*').eq('id', friendId).single().then(({ data }) => { if (data) setFriend(data) })
    supabase.from('blocks').select('id').eq('blocker_id', myId).eq('blocked_id', friendId).single().then(({ data }) => { if (data) setIsBlocker(true) })
    
    // Check friendship status
    supabase.from('friend_requests')
      .select('status')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`)
      .eq('status', 'accepted')
      .maybeSingle()
      .then(({ data }) => {
        setIsFriend(!!data)
      })
  }, [friendId, myId])

  useEffect(() => {
    if (!myId || !friendId || !isFriend) {
      if (isFriend === false) setLoading(false)
      return
    }
    setLoading(true)
    supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { 
        const raw = (data || []).reverse()
        const valid = filterEphemeralMessages(raw)
        setMessages(valid)
        setHasMore(raw.length >= 20)
        setLoading(false)
        setTimeout(scrollBottom, 80) 
      })
  }, [myId, friendId, isFriend, scrollBottom])

  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore || !messages.length) return
    setLoadingMore(true)
    try {
      const oldest = messages[0]
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(20)
      const raw = (data || []).reverse()
      const valid = filterEphemeralMessages(raw)
      if (valid.length < 20) setHasMore(false)
      if (valid.length > 0) setMessages(prev => [...valid, ...prev])
    } catch (e) { console.error('[ChatRoom] loadOlder:', e) }
    finally { setLoadingMore(false) }
  }

  useEffect(() => {
    if (!myId || !friendId || !isFriend) return
    supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('receiver_id', myId).eq('sender_id', friendId).is('read_at', null).then(() => {})
  }, [myId, friendId, isFriend])

  useEffect(() => {
    if (!myId || !friendId || !isFriend) return
    const key = [myId, friendId].sort().join('-')
    const ch = supabase.channel(`chat-${key}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        const m = p.new
        const ok = (m.sender_id === myId && m.receiver_id === friendId) || (m.sender_id === friendId && m.receiver_id === myId)
        if (!ok) return
        setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m])
        setTimeout(scrollBottom, 60)
        if (m.sender_id === friendId) supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id).then(() => {})
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (p) => {
        setMessages(prev => prev.map(x => x.id === p.new.id ? { ...x, ...p.new } : x))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [myId, friendId, isFriend, scrollBottom])

  useEffect(() => {
    if (!myId || !friendId || !isFriend) return
    const key = [myId, friendId].sort().join('-')
    const ch = supabase.channel(`presence-${key}`, { config: { presence: { key: myId } } })
    ch.on('broadcast', { event: 'typing' }, (payload) => {
      const { userId, typing } = payload.payload || {}
      if (userId === friendId) setFriendTyping(typing)
    }).subscribe()
    setPresenceCh(ch)
    return () => { supabase.removeChannel(ch); setPresenceCh(null) }
  }, [myId, friendId, isFriend])

  const sendMessage = async (caption, audioUrl) => {
    if (audioUrl) { await supabase.from('messages').insert({ sender_id: myId, receiver_id: friendId, audio_url: audioUrl }); return }
    if (imageFile) { await sendImage(text.trim()); return }
    const trimmed = text.trim(); if (!trimmed) return
    setSending(true); setText('')
    try {
      const row = { sender_id: myId, receiver_id: friendId, content: trimmed }
      if (replyTo) row.reply_to = replyTo.id
      const { error } = await supabase.from('messages').insert(row)
      if (error) throw error
      setReplyTo(null)
    } catch (err) { console.error('[ChatRoom] send:', err); setText(trimmed) }
    finally { setSending(false) }
  }

  const sendImage = async (caption = '') => {
    if (!imageFile) return
    try {
      const processedFile = await processMediaFile(imageFile, window.alert)
      if (!processedFile) return

      const ext = processedFile.name.split('.').pop()
      const path = `${myId}/${Date.now()}.${ext}`
      await supabase.storage.from('chat_images').upload(path, processedFile, { contentType: processedFile.type })
      const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(path)
      const row = { sender_id: myId, receiver_id: friendId, content: caption, image_url: publicUrl }
      if (replyTo) row.reply_to = replyTo.id
      await supabase.from('messages').insert(row)
      setImageFile(null); setText(''); setReplyTo(null)
    } catch (err) { console.error('[ChatRoom] sendImage:', err) }
  }

  const forwardTo = async (f) => {
    setShowForward(false)
    if (selectedMsg && selectedMsg.content) await supabase.from('messages').insert({ sender_id: myId, receiver_id: f.id, content: selectedMsg.content })
    setSelectedMsg(null)
  }

  const deleteMsg = async (msg) => { if(!msg?.id) return; await supabase.from('messages').delete().eq('id', msg.id); setMessages(prev => prev.filter(m => m.id !== msg.id)) }
  const editMsg = (id, txt) => setMessages(prev => prev.map(m => m.id === id ? { ...m, content: txt } : m))
  
  const togglePinMsg = async (msg) => {
    if(!msg?.id) return
    const nextVal = !msg.is_pinned
    await supabase.from('messages').update({ is_pinned: nextVal }).eq('id', msg.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: nextVal } : m))
  }

  const handleUnblock = async () => {
    await supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', friendId)
    setIsBlocker(false)
  }

  const isBusy = sending
  const friendName = friend ? [friend.first_name, friend.last_name].filter(Boolean).join(' ') : '…'
  const friendInit = friend ? [friend.first_name, friend.last_name].filter(Boolean).map(s => s?.[0]?.toUpperCase()).join('') : '?'
  
  const pinnedMessages = messages && messages.length > 0 ? messages.filter(m => m.is_pinned) : []

  // Safety guard — must come after ALL hooks to respect React's rules of hooks
  if (!currentProfile) return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#0a0a12]">
      <svg className="w-8 h-8 text-blue-500 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="text-slate-500 text-sm">Loading…</p>
    </div>
  )

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#0a0a12] relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[60vw] h-[60vw] rounded-full top-[-20%] left-[-10%]" style={{ background: 'radial-gradient(circle,rgba(37,99,235,0.12),transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <header className="shrink-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0a0a12]/90 backdrop-blur-xl border-b border-white/10">
        <motion.button onClick={() => navigate(-1)} whileTap={{ scale: 0.88 }} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        {friend?.avatar_url
          ? <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[13px] font-bold text-white shrink-0">{friendInit}</div>
        }
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${friendId}`)}>
          <p className="text-[15px] font-bold text-slate-100 truncate hover:text-white transition-colors">{friendName}</p>
          <AnimatePresence mode="wait">
            {friendTyping
              ? <motion.p key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-blue-400 font-medium">typing…</motion.p>
              : <motion.p key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-slate-500 truncate">@{friend?.username || '…'}</motion.p>
            }
          </AnimatePresence>
        </div>
      </header>

      {pinnedMessages.length > 0 && (
        <div className="shrink-0 z-10 bg-white/5 border-b border-white/5 px-4 py-2 flex flex-col gap-1 max-h-[60px] overflow-y-auto">
          {pinnedMessages.map(pm => (
            <div key={pm.id} className="flex items-center gap-2 text-xs text-slate-300">
              <Pin className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate flex-1">{pm.content || 'Pinned item'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 relative z-[1] scroll-smooth">
        {loading && (
          <div className="flex justify-center pt-10">
            <svg className="w-7 h-7 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
        {!loading && isFriend && hasMore && messages.length > 0 && (
          <motion.button onClick={loadOlderMessages} disabled={loadingMore} whileTap={{ scale: 0.97 }}
            className="w-full py-2 mb-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 text-xs font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
            {loadingMore ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : '↑ Load older messages'}
          </motion.button>
        )}
        {!loading && !isFriend && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full gap-4 text-center pb-10 max-w-[280px] mx-auto">
             <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 shadow-inner border border-white/10">
               <Lock className="w-8 h-8 text-slate-400" />
             </div>
             <p className="text-lg font-bold text-slate-200">Chat Locked</p>
             <p className="text-sm text-slate-400 leading-relaxed">You must be friends to chat. Send a friend request first.</p>
             <button onClick={() => navigate(`/user/${friendId}`)} className="mt-2 px-5 py-2.5 rounded-full bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-colors">
               View Profile
             </button>
           </motion.div>
        )}
        {!loading && isFriend && (!messages || messages.length === 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-3 text-center pb-10">
            <div className="text-5xl">👋</div>
            <p className="text-base font-semibold text-slate-400">No messages yet</p>
            <p className="text-sm text-slate-500">Say hello to <strong className="text-blue-400">{friend?.first_name || 'your friend'}</strong>!</p>
          </motion.div>
        )}
        
        {isFriend && (
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {messages && messages.length > 0 && messages.map(msg => (
                <Bubble key={msg.id} msg={msg} isMine={msg.sender_id === myId} myId={myId} 
                  replyMsg={msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null}
                  onLongPress={m => setSelectedMsg(m)} navigate={navigate} />
              ))}
            </AnimatePresence>
          </div>
        )}
        
        <AnimatePresence>
          {friendTyping && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex items-center gap-2 px-3 py-1 mb-1">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => <motion.div key={i} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }} className="w-1.5 h-1.5 rounded-full bg-slate-500" />)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">{friend?.first_name} is typing…</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-2" />
      </div>

      {isFriend && (
        <div className="shrink-0 z-10 px-3 pb-4 pt-2 bg-[#0a0a12]/90 backdrop-blur-xl border-t border-white/5">
          {isBlocker ? (
            <div className="w-full bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-[20px] p-4 flex flex-col items-center justify-center text-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <Shield className="w-6 h-6 text-red-400" />
              <p className="text-[14px] text-red-200 font-medium">Unblock the user first to continue the conversation</p>
              <button onClick={handleUnblock} className="text-blue-400 font-semibold text-[15px] hover:text-blue-300 transition-colors mt-1 underline underline-offset-4">
                unblock
              </button>
            </div>
          ) : (
            <>
              <AnimatePresence>{imageFile && <ImagePreview file={imageFile} onRemove={() => setImageFile(null)} />}</AnimatePresence>
              <TypingBar
                text={text} setText={setText}
                onSend={sendMessage} disabled={isBusy}
                placeholder={!messages || messages.length === 0 ? 'Start chatting 👋' : 'Message…'}
                onFileSelect={setImageFile} presenceChannel={presenceCh}
                myId={myId} myName={myName}
                replyTo={replyTo} onCancelReply={() => setReplyTo(null)}
              />
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedMsg && !showForward && !showEdit && (
          <MsgMenu msg={selectedMsg} isMine={selectedMsg.sender_id === myId}
            onReply={() => setReplyTo(selectedMsg)}
            onForward={() => setShowForward(true)}
            onEdit={() => setShowEdit(true)}
            onDelete={() => { deleteMsg(selectedMsg); setSelectedMsg(null) }}
            onPin={() => togglePinMsg(selectedMsg)}
            onClose={() => setSelectedMsg(null)} />
        )}
        {showForward && <FriendPicker title="Forward to…" currentProfile={currentProfile} onSelect={forwardTo} onClose={() => { setShowForward(false); setSelectedMsg(null) }} />}
        {showEdit && selectedMsg && <EditModal msg={selectedMsg} onSave={editMsg} onClose={() => { setShowEdit(false); setSelectedMsg(null) }} />}
      </AnimatePresence>
    </div>
  )
}
