import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, ImagePlus, Video } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { processMediaFile } from '../utils/mediaUtils'

export default function CreatePostModal({ currentProfile, onClose, onPosted }) {
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const pickFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const submit = async () => {
    if (!file) { setError('Please select a photo or video.'); return }
    setUploading(true); setError(null)
    try {
      const processedFile = await processMediaFile(file, setError)
      if (!processedFile) { setUploading(false); return }

      const ext = processedFile.name.split('.').pop()
      const path = `${currentProfile.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('onyx_posts').upload(path, processedFile, { contentType: processedFile.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('onyx_posts').getPublicUrl(path)
      const isVideo = file.type.startsWith('video/')
      const { data: post, error: postErr } = await supabase.from('posts').insert({
        user_id: currentProfile.id,
        media_url: publicUrl,
        media_type: isVideo ? 'video' : 'image',
        caption: caption.trim() || null,
      }).select('*').single()
      if (postErr) throw postErr
      if (onPosted) onPosted(post)
      onClose()
    } catch (e) { console.error('[CreatePostModal]', e); setError(e.message) }
    finally { setUploading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full max-w-[420px] bg-[#0a1428] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-[17px] font-bold text-white">New Post</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Media picker */}
        <div onClick={() => fileRef.current?.click()} className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${preview ? 'border-blue-500/30' : 'border-white/10 hover:border-blue-500/40'}`} style={{ minHeight: 220 }}>
          {preview ? (
            file?.type?.startsWith('video/')
              ? <video src={preview} className="w-full h-full object-cover max-h-[280px] rounded-2xl" controls />
              : <img src={preview} alt="" className="w-full max-h-[280px] object-cover rounded-2xl" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-500 p-8">
              <div className="flex gap-4">
                <ImagePlus className="w-8 h-8" />
                <Video className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium">Tap to upload photo or video</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
        </div>

        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption…" rows={3}
          className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-[#f0f4ff] text-sm resize-none outline-none focus:border-blue-500/50 transition-colors placeholder-slate-500" />

        {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>}

        <motion.button onClick={submit} disabled={uploading} whileTap={{ scale: 0.97 }}
          className="py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
          {uploading ? 'Uploading…' : 'Share Post'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
