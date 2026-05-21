import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Camera, PenSquare, Users, Aperture, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function ActionHubFAB({ profile, onSnap, onPost, onNewGroup }) {
  const [isOpen, setIsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const toggle = () => setIsOpen(!isOpen)

  const handleStorySelect = () => {
    setIsOpen(false)
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage.from('onyx_stories').upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('onyx_stories').getPublicUrl(path)
      
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      
      const { error: insertError } = await supabase.from('stories').insert({
        user_id: profile.id,
        media_url: publicUrl,
        media_type: mediaType
      })

      if (insertError) throw insertError
      
      // Optionally show a success toast here
    } catch (err) {
      console.error('Error uploading story:', err)
      alert('Failed to upload story')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const actions = [
    { id: 'snap', label: 'Snap', icon: Camera, color: 'text-yellow-400', bg: 'bg-yellow-500/20', action: () => { setIsOpen(false); onSnap() } },
    { id: 'post', label: 'Post', icon: PenSquare, color: 'text-violet-400', bg: 'bg-violet-500/20', action: () => { setIsOpen(false); onPost() } },
    { id: 'group', label: 'New Group', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20', action: () => { setIsOpen(false); onNewGroup() } },
    { id: 'story', label: 'Story', icon: Aperture, color: 'text-pink-400', bg: 'bg-pink-500/20', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]', action: handleStorySelect },
  ]

  return (
    <>
      <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFileUpload} />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 md:bottom-10 right-6 z-[450] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isOpen && actions.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ delay: (actions.length - 1 - i) * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              onClick={item.action}
              className="flex items-center gap-3"
            >
              <span className="px-3 py-1.5 rounded-lg bg-[#0d1630] text-slate-200 text-sm font-semibold shadow-lg border border-white/10">
                {item.label}
              </span>
              <div className={`w-12 h-12 rounded-full ${item.bg} border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center backdrop-blur-md ${item.glow || ''}`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        <motion.button
          whileTap={!uploading ? { scale: 0.9 } : {}}
          onClick={uploading ? undefined : toggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden ${uploading ? 'bg-slate-700 shadow-none' : 'bg-gradient-to-r from-blue-600 to-violet-600 shadow-[0_0_24px_rgba(124,58,237,0.6)]'}`}
        >
          {uploading ? (
            <Loader2 className="w-7 h-7 text-white animate-spin z-10" />
          ) : (
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="z-10"
            >
              <Plus className="w-8 h-8 text-white" />
            </motion.div>
          )}
          {!uploading && <div className="absolute inset-0 bg-white/20 blur-md rounded-full" />}
        </motion.button>
      </div>
    </>
  )
}
