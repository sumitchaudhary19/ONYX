import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, Smile, Mic, X, Reply } from 'lucide-react'
import { supabase } from '../supabaseClient'
import EmojiPicker from 'emoji-picker-react'

function throttle(fn, ms) {
  let last = 0
  return (...args) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...args) } }
}

export default function TypingBar({ text, setText, onSend, disabled, placeholder, onFileSelect, presenceChannel, myId, myName, replyTo, onCancelReply }) {
  const inputRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const typingTimer = useRef(null)

  const [showEmoji, setShowEmoji] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const [uploading, setUploading] = useState(false)
  const recIntervalRef = useRef(null)

  const broadcastTyping = useCallback(
    throttle((typing) => {
      presenceChannel?.send({ type: 'broadcast', event: 'typing', payload: { userId: myId, name: myName, typing } })
    }, 400),
    [presenceChannel, myId, myName]
  )

  const handleChange = (e) => {
    setText(e.target.value)
    broadcastTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => broadcastTyping(false), 2000)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const handleSend = () => {
    clearTimeout(typingTimer.current)
    broadcastTyping(false)
    onSend()
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const onEmoji = (e) => {
    const inp = inputRef.current
    if (!inp) { setText(t => t + e.emoji); setShowEmoji(false); return }
    const start = inp.selectionStart ?? inp.value.length
    const end = inp.selectionEnd ?? inp.value.length
    const next = inp.value.slice(0, start) + e.emoji + inp.value.slice(end)
    setText(next)
    setShowEmoji(false)
    setTimeout(() => { inp.focus(); const pos = start + e.emoji.length; inp.setSelectionRange(pos, pos) }, 10)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = ev => { if (ev.data.size > 0) chunksRef.current.push(ev.data) }
      mr.start(100)
      mediaRef.current = { recorder: mr, stream }
      setRecording(true); setRecSecs(0)
      recIntervalRef.current = setInterval(() => setRecSecs(s => s + 1), 1000)
    } catch (err) { console.error('[Mic] denied:', err) }
  }

  const stopRecording = async (cancel = false) => {
    clearInterval(recIntervalRef.current)
    setRecording(false); setRecSecs(0)
    const ref = mediaRef.current
    if (!ref) return
    ref.stream.getTracks().forEach(t => t.stop())
    if (cancel) { mediaRef.current = null; return }
    await new Promise(resolve => { ref.recorder.onstop = resolve; ref.recorder.stop() })
    mediaRef.current = null
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    setUploading(true)
    try {
      const path = `${myId}/${Date.now()}.webm`
      const { error: upErr } = await supabase.storage.from('voice_notes').upload(path, blob, { contentType: 'audio/webm' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('voice_notes').getPublicUrl(path)
      onSend(null, publicUrl)
    } catch (e) { console.error('[Voice] upload:', e) }
    finally { setUploading(false) }
  }

  const micDown = (e) => { e.preventDefault(); startRecording() }
  const micUp = (e) => { e.preventDefault(); stopRecording(false) }
  const fmtSec = (s) => { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}` }
  const isBusy = disabled || uploading || recording

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-2">
      
      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md">
            <Reply className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-blue-400">Replying to message</p>
              <p className="text-sm text-slate-300 truncate">{replyTo.content || 'Attachment'}</p>
            </div>
            <button onClick={onCancelReply} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmoji && EmojiPicker && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-2 mb-2 z-50 drop-shadow-2xl">
            <EmojiPicker theme="dark" onEmojiClick={onEmoji} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2 bg-[#0d162d]/90 backdrop-blur-xl border border-white/10 p-2 rounded-[24px]">
        {recording ? (
          <div className="flex-1 flex items-center gap-3 px-4 h-[44px]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-semibold text-sm">Recording {fmtSec(recSecs)}</span>
            <div className="flex-1" />
            <span className="text-xs text-slate-500">Release to send</span>
          </div>
        ) : (
          <>
            <button onClick={() => setShowEmoji(!showEmoji)} className="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 transition-colors shrink-0">
              <Smile className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <textarea
                ref={inputRef} value={text} onChange={handleChange} onKeyDown={handleKeyDown} disabled={isBusy}
                placeholder={uploading ? 'Uploading voice note…' : placeholder}
                className="w-full bg-transparent text-white placeholder-slate-500 text-[15px] resize-none outline-none py-[12px] px-2 max-h-[120px] overflow-y-auto block"
                style={{ minHeight: '44px' }} rows={1}
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <label className="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 cursor-pointer transition-colors">
                <Paperclip className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) onFileSelect(e.target.files[0]) }} disabled={isBusy} />
              </label>
            </div>
          </>
        )}

        <div className="shrink-0 flex items-center justify-center w-[44px] h-[44px]">
          {text.trim() || uploading ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={isBusy}
              className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-50">
              <Send className="w-4 h-4 ml-0.5" />
            </motion.button>
          ) : (
            <motion.button
              onTouchStart={micDown} onTouchEnd={micUp} onMouseDown={micDown} onMouseUp={micUp} onMouseLeave={(e) => { if (recording) micUp(e) }}
              whileTap={{ scale: 0.9, backgroundColor: '#ef4444' }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors select-none">
              <Mic className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
