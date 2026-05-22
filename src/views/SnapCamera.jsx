import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, FlipHorizontal, Video, Square, Send, Check, ChevronUp } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { processMediaFile } from '../utils/mediaUtils'

const GRADS = ['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)','linear-gradient(135deg,#f59e0b,#f97316)','linear-gradient(135deg,#a855f7,#7c3aed)']

function Avatar({ profile, size = 40, index = 0 }) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User'
  const init = name.split(' ').map(s => s[0]?.toUpperCase()).join('') || '?'
  if (profile?.avatar_url) return <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  return <div className="rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ width: size, height: size, background: GRADS[index % GRADS.length] }}>{init}</div>
}

/* ── Send To Modal ── */
function SendToModal({ capturedBlob, capturedType, currentProfile, onClose }) {
  const [friends, setFriends] = useState([])
  const [selected, setSelected] = useState({})
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: reqs } = await supabase.from('friend_requests').select('sender_id,receiver_id').eq('status', 'accepted').or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`)
      if (!reqs?.length) return
      const ids = reqs.map(r => r.sender_id === currentProfile.id ? r.receiver_id : r.sender_id)
      const { data } = await supabase.from('profiles').select('id,first_name,last_name,avatar_url').in('id', ids)
      setFriends(data || [])
    }
    load()
  }, [currentProfile.id])

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  const selectedCount = Object.values(selected).filter(Boolean).length

  const sendSnap = async () => {
    const targets = friends.filter(f => selected[f.id])
    if (!targets.length) return
    setSending(true)
    try {
      // Upload media
      const ext = capturedType === 'video' ? 'webm' : 'jpg'
      const file = new File([capturedBlob], `snap.${ext}`, { type: capturedBlob.type })
      const processedFile = await processMediaFile(file, window.alert)
      if (!processedFile) { setSending(false); return }

      const path = `${currentProfile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('onyx_snaps').upload(path, processedFile, { contentType: processedFile.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('onyx_snaps').getPublicUrl(path)

      // Send to each selected friend
      const inserts = targets.map(f => ({
        sender_id: currentProfile.id,
        receiver_id: f.id,
        content: text.trim() || null,
        image_url: capturedType === 'image' ? publicUrl : null,
        video_url: capturedType === 'video' ? publicUrl : null,
      }))
      await supabase.from('messages').insert(inserts)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (e) { console.error('[SnapCamera] send:', e) }
    finally { setSending(false) }
  }

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-0 z-20 flex flex-col bg-[#060b18]/98 backdrop-blur-xl">

      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
        <h3 className="text-[17px] font-bold text-white">Send To…</h3>
        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400"><X className="w-4 h-4" /></button>
      </div>

      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)]">
            <Check className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-white font-semibold">Snap Sent!</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {friends.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No friends to send to.</p>}
            {friends.map((f, i) => {
              const name = [f.first_name, f.last_name].filter(Boolean).join(' ')
              const isSelected = !!selected[f.id]
              return (
                <motion.button key={f.id} whileTap={{ scale: 0.97 }} onClick={() => toggle(f.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isSelected ? 'bg-blue-600/20 border-blue-500/40' : 'bg-white/4 border-white/5 hover:bg-white/8'}`}>
                  <Avatar profile={f} size={42} index={i} />
                  <p className="flex-1 text-left text-[14px] font-semibold text-slate-100 truncate">{name}</p>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'border-white/20'}`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Typing bar */}
          <div className="shrink-0 px-4 pb-4 pt-3 border-t border-white/8 flex flex-col gap-3">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a message to your snap…"
              className="w-full px-4 py-3 rounded-2xl bg-white/6 border border-white/10 text-[14px] text-white outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500" />
            <motion.button whileTap={{ scale: 0.95 }} onClick={sendSnap} disabled={!selectedCount || sending}
              className={`py-4 rounded-2xl font-bold text-white text-[15px] flex items-center justify-center gap-2 transition-all ${selectedCount > 0 ? 'bg-gradient-to-r from-blue-600 to-violet-600 shadow-[0_4px_24px_rgba(99,102,241,0.5)]' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}>
              {sending ? 'Sending…' : `Send to ${selectedCount > 0 ? selectedCount : ''} ${selectedCount === 1 ? 'friend' : 'friends'}`}
              {selectedCount > 0 && !sending && <Send className="w-4 h-4" />}
            </motion.button>
          </div>
        </>
      )}
    </motion.div>
  )
}

/* ── Main Snap Camera ── */
export default function SnapCamera({ currentProfile, onClose }) {
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const [facingMode, setFacingMode] = useState('user')
  const [mode, setMode] = useState('photo') // 'photo' | 'video'
  const [recording, setRecording] = useState(false)
  const [captured, setCaptured] = useState(null) // { blob, type, url }
  const [showSendTo, setShowSendTo] = useState(false)
  const [camError, setCamError] = useState(null)
  const [recSec, setRecSec] = useState(0)
  const timerRef = useRef(null)

  const startCamera = useCallback(async (facing) => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setCamError(null)
    } catch (e) {
      console.error('[SnapCamera] cam:', e)
      setCamError('Camera permission denied or not available.')
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
    }
  }, [facingMode])

  const flipCamera = () => setFacingMode(f => f === 'user' ? 'environment' : 'user')

  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      setCaptured({ blob, type: 'image', url })
    }, 'image/jpeg', 0.92)
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' })
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setCaptured({ blob, type: 'video', url })
    }
    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
    setRecSec(0)
    timerRef.current = setInterval(() => setRecSec(s => s + 1), 1000)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  const retake = () => {
    setCaptured(null)
    setShowSendTo(false)
    setRecSec(0)
    startCamera(facingMode)
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      className="fixed inset-0 z-[600] bg-black flex flex-col overflow-hidden">
      
      {/* Close */}
      <button onClick={onClose} className="absolute top-5 left-5 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Flip camera */}
      {!captured && (
        <button onClick={flipCamera} className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
          <FlipHorizontal className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Recording timer */}
      {recording && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/80 backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="text-white text-sm font-bold">{fmt(recSec)}</span>
        </div>
      )}

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {camError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#060b18]">
            <Camera className="w-12 h-12 text-slate-600" />
            <p className="text-slate-400 text-sm text-center px-8">{camError}</p>
          </div>
        ) : null}

        {/* Live preview */}
        {!captured && (
          <video ref={videoRef} autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
        )}

        {/* Captured image preview */}
        {captured?.type === 'image' && (
          <img src={captured.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Captured video preview */}
        {captured?.type === 'video' && (
          <video src={captured.url} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Canvas (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Mode toggle */}
        {!captured && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 flex gap-1 p-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15">
            {['photo', 'video'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all capitalize ${mode === m ? 'bg-white text-black' : 'text-white'}`}>
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Send button overlay after capture */}
        {captured && !showSendTo && (
          <div className="absolute bottom-8 right-6 z-10 flex flex-col items-end gap-3">
            <motion.button whileTap={{ scale: 0.92 }} onClick={retake}
              className="px-5 py-2.5 rounded-2xl bg-black/60 border border-white/20 text-white text-sm font-semibold backdrop-blur-md">
              Retake
            </motion.button>
            <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
              whileTap={{ scale: 0.88 }} onClick={() => setShowSendTo(true)}
              className="flex items-center gap-2.5 px-6 py-4 rounded-[24px] font-bold text-white text-[16px] shadow-[0_0_30px_rgba(99,102,241,0.6)] bg-gradient-to-br from-blue-500 to-violet-600">
              <Send className="w-5 h-5" />
              Send
            </motion.button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {!captured && (
        <div className="shrink-0 pb-10 pt-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
          {mode === 'photo' ? (
            <motion.button whileTap={{ scale: 0.88 }} onClick={takePhoto}
              className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <div className="w-14 h-14 rounded-full bg-white" />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.88 }} onClick={recording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full border-[5px] flex items-center justify-center transition-all ${recording ? 'border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.6)]' : 'border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}>
              {recording
                ? <Square className="w-8 h-8 text-red-500 fill-red-500" />
                : <div className="w-12 h-12 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.7)]" />
              }
            </motion.button>
          )}
          <p className="text-[11px] text-white/50 font-medium">{mode === 'photo' ? 'Tap to capture' : recording ? 'Tap to stop' : 'Hold to record'}</p>
        </div>
      )}

      {/* Send To modal */}
      <AnimatePresence>
        {showSendTo && (
          <SendToModal capturedBlob={captured?.blob} capturedType={captured?.type} currentProfile={currentProfile} onClose={onClose} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
