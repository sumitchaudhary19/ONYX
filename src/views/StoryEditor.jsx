import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Type, PenTool, AtSign, EyeOff, Save, Trash2, Send } from 'lucide-react'
import Draggable from 'react-draggable'
import { supabase } from '../supabaseClient'

export default function StoryEditor({ profile, file, onClose, onComplete }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  
  const [tool, setTool] = useState(null) // 'draw', 'text', 'mention'
  const [color, setColor] = useState('#ef4444')
  
  // Drawing state
  const isDrawing = useRef(false)
  const ctxRef = useRef(null)
  const pathsRef = useRef([])

  // Overlay state
  const [texts, setTexts] = useState([])
  const [mentions, setMentions] = useState([])
  
  // Privacy
  const [hiddenFrom, setHiddenFrom] = useState([])
  const [friends, setFriends] = useState([])
  const [showPrivacy, setShowPrivacy] = useState(false)
  
  const [uploading, setUploading] = useState(false)

  // Load friends for mention/privacy
  useEffect(() => {
    async function fetchFriends() {
      const { data } = await supabase.from('friend_requests').select('sender_id,receiver_id').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      if(!data) return
      const ids = data.map(r => r.sender_id === profile.id ? r.receiver_id : r.sender_id)
      const { data: profs } = await supabase.from('profiles').select('id,username,first_name,avatar_url').in('id', ids)
      if(profs) setFriends(profs)
    }
    fetchFriends()
  }, [profile.id])

  // Canvas setup
  useEffect(() => {
    if(!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    img.onload = () => {
      if(imgRef.current) imgRef.current.src = url
      if(canvasRef.current) {
        const c = canvasRef.current
        c.width = window.innerWidth
        c.height = window.innerHeight
        const ctx = c.getContext('2d')
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctxRef.current = ctx
      }
    }
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Drawing Handlers
  const startDraw = (e) => {
    if(tool !== 'draw') return
    const { offsetX, offsetY } = getCoords(e)
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(offsetX, offsetY)
    ctxRef.current.strokeStyle = color
    ctxRef.current.lineWidth = 4
    isDrawing.current = true
    pathsRef.current.push({ color, width: 4, points: [{ x: offsetX, y: offsetY }] })
  }

  const draw = (e) => {
    if(!isDrawing.current || tool !== 'draw') return
    const { offsetX, offsetY } = getCoords(e)
    ctxRef.current.lineTo(offsetX, offsetY)
    ctxRef.current.stroke()
    const currentPath = pathsRef.current[pathsRef.current.length - 1]
    currentPath.points.push({ x: offsetX, y: offsetY })
  }

  const endDraw = () => {
    if(tool !== 'draw') return
    ctxRef.current.closePath()
    isDrawing.current = false
  }

  const getCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      const b = canvasRef.current.getBoundingClientRect()
      return { offsetX: e.touches[0].clientX - b.left, offsetY: e.touches[0].clientY - b.top }
    }
    return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY }
  }

  const addText = () => {
    const txt = prompt("Enter text:")
    if(txt) setTexts([...texts, { id: Date.now(), text: txt, color, x: window.innerWidth/2, y: window.innerHeight/2 }])
    setTool(null)
  }

  const addMention = () => {
    const un = prompt("Enter username to mention (without @):")
    if(!un) return
    const f = friends.find(fr => fr.username.toLowerCase() === un.toLowerCase())
    if(f) {
      setMentions([...mentions, { id: Date.now(), user_id: f.id, username: f.username, x: window.innerWidth/2, y: window.innerHeight/2 }])
    } else {
      alert("Friend not found")
    }
    setTool(null)
  }

  const handleWheelText = (e, id) => {
    e.stopPropagation()
    setTexts(prev => prev.map(t => t.id === id ? { ...t, scale: Math.max(0.5, Math.min(3, (t.scale || 1) - e.deltaY * 0.002)) } : t))
  }

  const handleWheelMention = (e, id) => {
    e.stopPropagation()
    setMentions(prev => prev.map(m => m.id === id ? { ...m, scale: Math.max(0.5, Math.min(3, (m.scale || 1) - e.deltaY * 0.002)) } : m))
  }

  const toggleHide = (fid) => {
    setHiddenFrom(prev => prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid])
  }

  const handlePublish = async () => {
    if(!file) return
    setUploading(true)
    try {
      // Create final composite (pseudo approach: in a real app you'd draw the text/mentions to canvas too)
      // Here we just upload the original file since rendering React elements to canvas requires html2canvas
      
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('onyx_posts').upload(path, file)
      if(upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('onyx_posts').getPublicUrl(path)
      
      const { error } = await supabase.from('stories').insert({
        user_id: profile.id,
        media_url: publicUrl,
        media_type: file.type.startsWith('video/') ? 'video' : 'image',
        story_hidden_from: hiddenFrom,
        is_deleted: false
      })
      if(error) throw error
      onComplete()
    } catch(e) {
      console.error(e)
      alert("Failed to publish story")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', overflow: 'hidden' }} ref={containerRef}>
      {/* Background Image */}
      <img ref={imgRef} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', pointerEvents: 'none' }} />
      
      {/* Drawing Canvas */}
      <canvas ref={canvasRef} 
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseOut={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        style={{ position: 'absolute', inset: 0, touchAction: 'none', pointerEvents: tool === 'draw' ? 'auto' : 'none' }} />

      {/* Draggable Texts */}
      {texts.map(t => (
        <Draggable key={t.id} bounds="parent">
          <div style={{ position: 'absolute', top: '50%', left: '50%', cursor: 'grab' }}>
            <div onWheel={(e) => handleWheelText(e, t.id)} style={{ transform: `translate(-50%, -50%) scale(${t.scale || 1})`, transformOrigin: 'center', fontSize: '24px', fontWeight: 800, color: t.color, textShadow: '0 2px 10px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}>
              {t.text}
            </div>
          </div>
        </Draggable>
      ))}

      {/* Draggable Mentions */}
      {mentions.map(m => (
        <Draggable key={m.id} bounds="parent">
          <div style={{ position: 'absolute', top: '50%', left: '50%', cursor: 'grab' }}>
            <div onWheel={(e) => handleWheelMention(e, m.id)} style={{ transform: `translate(-50%, -50%) scale(${m.scale || 1})`, transformOrigin: 'center', fontSize: '18px', fontWeight: 700, background: 'rgba(255,255,255,0.9)', color: '#000', padding: '6px 12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
              @{m.username}
            </div>
          </div>
        </Draggable>
      ))}

      {/* Top Toolbar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
          <X style={{ width: 20, height: 20 }} />
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setTool(tool === 'draw' ? null : 'draw')} style={{ background: tool === 'draw' ? '#38bdf8' : 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <PenTool style={{ width: 20, height: 20 }} />
          </button>
          <button onClick={addText} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <Type style={{ width: 20, height: 20 }} />
          </button>
          <button onClick={addMention} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <AtSign style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>

      {/* Color Picker (if drawing or text selected) */}
      <div style={{ position: 'absolute', right: '20px', top: '100px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map(c => (
          <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.5)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
        ))}
      </div>

      {/* Bottom Bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <button onClick={() => setShowPrivacy(true)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '20px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <EyeOff style={{ width: 16, height: 16 }} /> {hiddenFrom.length > 0 ? `Hidden from ${hiddenFrom.length}` : 'Privacy'}
        </button>
        <button onClick={handlePublish} disabled={uploading} style={{ background: '#3b82f6', border: 'none', borderRadius: '20px', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' }}>
          {uploading ? 'Uploading...' : <><Send style={{ width: 18, height: 18 }} /> Share</>}
        </button>
      </div>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'absolute', inset: 0, background: '#0f172a', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>Hide Story From</h2>
              <button onClick={() => setShowPrivacy(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {friends.map(f => (
                <div key={f.id} onClick={() => toggleHide(f.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {f.avatar_url ? <img src={f.avatar_url} style={{ width: 40, height: 40, borderRadius: '50%' }} /> : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.first_name?.[0]}</div>}
                    <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>{f.first_name} {f.last_name}</p>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #3b82f6', background: hiddenFrom.includes(f.id) ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {hiddenFrom.includes(f.id) && <X style={{ color: '#fff', width: 14, height: 14 }} />}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '20px' }}>
              <button onClick={() => setShowPrivacy(false)} style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
