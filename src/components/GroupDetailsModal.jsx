import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Save, Users, Crown, LogOut } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { processMediaFile } from '../utils/mediaUtils'

const GRADS = ['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)']

export default function GroupDetailsModal({ group, currentProfile, onClose, onUpdated }) {
  const navigate = useNavigate()
  const avatarRef = useRef()
  const isAdmin = group?.admin_id === currentProfile?.id

  const [members, setMembers] = useState([])
  const [admin, setAdmin] = useState(null)
  const [name, setName] = useState(group?.name||'')
  const [desc, setDesc] = useState(group?.description||'')
  const [avatarFile, setAvatarFile] = useState(null)
  const [preview, setPreview] = useState(group?.avatar_url||null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!group?.id) return
    supabase.from('group_members').select('user_id').eq('group_id', group.id)
      .then(async ({ data: rows }) => {
        const ids = (rows || []).map(r => r.user_id)
        if (!ids.length) return
        const { data: profs } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id', ids)
        setMembers(profs || [])
        const adm = (profs || []).find(p => p.id === group.admin_id)
        setAdmin(adm || null)
      })
  }, [group?.id])

  const handleAvatarPick = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setAvatarFile(f); setPreview(URL.createObjectURL(f))
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Name required.'); return }
    setSaving(true); setError(null)
    try {
      let avatarUrl = group.avatar_url
      if (avatarFile) {
        const processedFile = await processMediaFile(avatarFile, setError)
        if (!processedFile) { setSaving(false); return }

        const ext = processedFile.name.split('.').pop()
        const path = `${group.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('group_avatars').upload(path, processedFile, { contentType: processedFile.type })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('group_avatars').getPublicUrl(path)
        avatarUrl = publicUrl
      }
      const { data: updated, error: updErr } = await supabase.from('groups').update({ name: name.trim(), description: desc.trim(), avatar_url: avatarUrl }).eq('id', group.id).select('*').single()
      if (updErr) throw updErr
      if (onUpdated) onUpdated(updated)
      onClose()
    } catch (e) { console.error('[GroupDetails] save:', e); setError(e.message) }
    finally { setSaving(false) }
  }

  const handleLeaveGroup = async () => {
    if (confirm('Are you sure you want to leave this group?')) {
      setLeaving(true)
      try {
        await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', currentProfile.id)
        onClose()
        navigate('/chat')
      } catch (err) {
        console.error('Leave group error:', err)
      }
      setLeaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto bg-[#0a1428] border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col gap-4 shadow-2xl">

        <div className="flex justify-between items-center">
          <h2 className="text-[17px] font-bold text-[#f0f4ff]">Group Info</h2>
          <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative group cursor-pointer" onClick={() => isAdmin && avatarRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="" className="w-[88px] h-[88px] rounded-[26px] object-cover border-2 border-blue-500/50 shadow-lg" />
            ) : (
              <div className="w-[88px] h-[88px] rounded-[26px] flex items-center justify-center text-[28px] font-bold text-white shadow-lg" style={{ background: GRADS[0] }}>
                {(group?.name || 'G')[0].toUpperCase()}
              </div>
            )}
            {isAdmin && (
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-blue-600 border-2 border-[#0a1428] flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          {isAdmin && <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />}
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.07em]">Group Name</label>
          {isAdmin ? (
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-[#f0f4ff] text-[13px] outline-none focus:border-blue-500/50 transition-colors" />
          ) : (
            <p className="text-[16px] font-bold text-[#f0f4ff]">{group?.name}</p>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.07em]">Description</label>
          {isAdmin ? (
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Group description…" className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-[#f0f4ff] text-[13px] outline-none focus:border-blue-500/50 transition-colors" />
          ) : (
            <p className="text-[13px] text-slate-400">{group?.description || 'No description.'}</p>
          )}
        </div>

        {/* Admin info */}
        {admin && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mt-2">
            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.06em]">Admin</p>
              <p className="text-[13px] font-semibold text-amber-200 truncate">{[admin.first_name, admin.last_name].filter(Boolean).join(' ') || '—'}</p>
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.07em]">Members ({members.length})</label>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
            {members.map((m, i) => {
              const nm = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unknown'
              const isAd = m.id === group?.admin_id
              return (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-[10px] object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: GRADS[i % GRADS.length] }}>
                      {nm[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#f0f4ff] truncate">{nm}</p>
                    <p className="text-[11px] text-slate-400 truncate">@{m.username || '—'}</p>
                  </div>
                  {isAd && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-md shrink-0">ADMIN</span>}
                </div>
              )
            })}
          </div>
        </div>

        {error && <p className="text-[12px] text-red-400 p-2 bg-red-500/10 rounded-xl">{error}</p>}

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-4">
          {isAdmin && (
            <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Changes'}
            </motion.button>
          )}

          <motion.button onClick={handleLeaveGroup} disabled={leaving} whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
            <LogOut className="w-4 h-4" /> LEAVE GROUP
          </motion.button>
        </div>

      </motion.div>
    </motion.div>
  )
}
