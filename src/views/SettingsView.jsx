import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Shield, Bell, Moon, Sun, Lock, UserX, X, AlertCircle, ChevronRight, CheckCircle2, Activity, MoreVertical, RefreshCw, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

function Toast({ message, icon: Icon, color = '#60a5fa', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
      style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.95)', border: `1px solid ${color}40`, borderRadius: '16px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(12px)' }}>
      {Icon && <Icon style={{ width: 18, height: 18, color }} />}
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{message}</p>
    </motion.div>
  )
}

function PrivacyModal({ profile, onClose }) {
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('blocks').select('*').eq('blocker_id', profile.id)
      if (data && data.length > 0) {
        const ids = data.map(d => d.blocked_id)
        const { data: profs } = await supabase.from('profiles').select('*').in('id', ids)
        setBlocked(profs || [])
      }
      setLoading(false)
    }
    load()
  }, [profile.id])

  const unblock = async (userId) => {
    await supabase.from('blocks').delete().eq('blocker_id', profile.id).eq('blocked_id', userId)
    setBlocked(prev => prev.filter(p => p.id !== userId))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '420px', background: 'linear-gradient(180deg,#0f172a,#020617)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Blocked Users</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading && <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading…</p>}
          {!loading && blocked.length === 0 && <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No blocked users.</p>}
          {blocked.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {b.avatar_url ? <img src={b.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover' }} /> : <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px' }}>{b.first_name?.[0] || '?'}</div>}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{b.first_name} {b.last_name}</p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>@{b.username}</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => unblock(b.id)}
                style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#f1f5f9', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                Unblock
              </motion.button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function NotificationsModal({ onClose, showToast }) {
  const [push, setPush] = useState(localStorage.getItem('onyx_push_enabled') !== 'false')
  const [email, setEmail] = useState(localStorage.getItem('onyx_email_enabled') === 'true')

  const togglePush = () => { const val = !push; setPush(val); localStorage.setItem('onyx_push_enabled', val.toString()); showToast('Preferences saved') }
  const toggleEmail = () => { const val = !email; setEmail(val); localStorage.setItem('onyx_email_enabled', val.toString()); showToast('Preferences saved') }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '380px', background: 'linear-gradient(180deg,#0f172a,#020617)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Notifications</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>Push Notifications</p>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Receive alerts on your device</p>
          </div>
          <motion.div onClick={togglePush} style={{ width: 44, height: 24, borderRadius: '12px', background: push ? '#3b82f6' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer', justifyContent: push ? 'flex-end' : 'flex-start' }}>
            <motion.div layout style={{ width: 20, height: 20, borderRadius: '10px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
          </motion.div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>Email Alerts</p>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Receive missed messages via email</p>
          </div>
          <motion.div onClick={toggleEmail} style={{ width: 44, height: 24, borderRadius: '12px', background: email ? '#3b82f6' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer', justifyContent: email ? 'flex-end' : 'flex-start' }}>
            <motion.div layout style={{ width: 20, height: 20, borderRadius: '10px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DangerModal({ profile, onClose }) {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    if (text !== 'DELETE') return
    setDeleting(true)
    try {
      // Call SECURITY DEFINER RPC that deletes from auth.users (cascades to profile + all data)
      const { error } = await supabase.rpc('delete_user_account')
      if (error) {
        alert(`⚠️ Action Failed: ${error.message}\nDetails: ${error.details || 'None'}\n\nIf it says function not found, please run bugfix_setup.sql in the SQL Editor.`)
        throw error
      }
      const savedStr = localStorage.getItem('onyx_saved_accounts')
      if (savedStr) {
        const accounts = JSON.parse(savedStr)
        const updated = accounts.filter(a => a.user_id !== profile?.id)
        localStorage.setItem('onyx_saved_accounts', JSON.stringify(updated))
      }
      await supabase.auth.signOut()
      navigate('/login')
    } catch (e) {
      console.error('Delete error', e)
    }
    setDeleting(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '400px', background: 'linear-gradient(180deg,#1e1b4b,#0f172a)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 60px rgba(239,68,68,0.15)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
          <AlertCircle style={{ width: 24, height: 24 }} />
        </div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Delete Account</h3>
          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>This action is irreversible. All your chats, groups, and data will be permanently deleted.</p>
        </div>
        <div style={{ marginTop: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>Type DELETE to confirm:</p>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="DELETE"
            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '12px', padding: '12px 16px', color: '#f87171', fontSize: '14px', outline: 'none', fontWeight: 600, letterSpacing: '0.05em' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }}>Cancel</motion.button>
          <motion.button whileTap={text === 'DELETE' ? { scale: 0.95 } : {}} onClick={confirmDelete} disabled={text !== 'DELETE' || deleting}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', background: text === 'DELETE' ? '#ef4444' : 'rgba(239,68,68,0.2)', color: text === 'DELETE' ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', fontWeight: 600, cursor: text === 'DELETE' ? 'pointer' : 'not-allowed' }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function YourActivityModal({ profile, onClose }) {
  const [tab, setTab] = useState('stories')
  const [stories, setStories] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuId, setMenuId] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      
      // Fetch soft-deleted or hidden posts
      const { data: pData } = await supabase.from('posts').select('*').eq('user_id', profile.id).or('is_hidden.eq.true,is_deleted.eq.true').order('created_at', { ascending: false })
      if(pData) setPosts(pData)

      // Fetch stories: is_deleted = true OR expired (> 24 hours)
      const { data: sData } = await supabase.from('stories').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
      if(sData) {
        const now = new Date()
        const twentyFourHours = 24 * 60 * 60 * 1000
        const filteredStories = sData.filter(s => {
          const isExpired = (now - new Date(s.created_at)) > twentyFourHours
          return s.is_deleted || isExpired
        })
        setStories(filteredStories)
      }
      setLoading(false)
    }
    load()
  }, [profile.id])

  const restorePost = async (id) => {
    await supabase.from('posts').update({ is_hidden: false, is_deleted: false }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setMenuId(null)
  }

  const restoreStory = async (id) => {
    await supabase.from('stories').update({ is_deleted: false }).eq('id', id)
    setStories(prev => prev.filter(s => s.id !== id))
    setMenuId(null)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '420px', background: 'linear-gradient(180deg,#0f172a,#020617)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>Your Activity</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8' }}><X style={{ width: 14, height: 14 }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
          {['stories', 'posts'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: tab === t ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab === t ? '#fff' : '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              {t === 'stories' ? 'Stories' : 'Posts'}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {loading && <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading…</p>}
          
          {/* Stories Tab */}
          {!loading && tab === 'stories' && stories.length === 0 && <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No deleted or expired stories.</p>}
          {!loading && tab === 'stories' && stories.map(s => {
            const isExpired = (new Date() - new Date(s.created_at)) > 24 * 60 * 60 * 1000
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px', position: 'relative' }}>
                <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                  {s.media_url ? (
                    s.media_type === 'video' ? <video src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b' }}>No Media</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{new Date(s.created_at).toLocaleDateString()}</p>
                  <p style={{ fontSize: '12px', color: isExpired ? '#ef4444' : '#64748b', marginTop: '2px', fontWeight: isExpired ? 600 : 400 }}>{isExpired ? 'Expired' : 'Deleted'}</p>
                </div>
                
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setMenuId(menuId === s.id ? null : s.id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                    <MoreVertical style={{ width: 16, height: 16 }} />
                  </button>
                  {menuId === s.id && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', zIndex: 10, minWidth: '120px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                      <button onClick={() => restoreStory(s.id)} disabled={isExpired} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: isExpired ? '#64748b' : '#38bdf8', fontSize: '13px', fontWeight: 500, cursor: isExpired ? 'not-allowed' : 'pointer', borderRadius: '8px' }}>
                        <RefreshCw style={{ width: 14, height: 14 }} /> {isExpired ? 'Cannot Restore' : 'Move Out'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Posts Tab */}
          {!loading && tab === 'posts' && posts.length === 0 && <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No hidden or deleted posts.</p>}
          {!loading && tab === 'posts' && posts.map(p => (
             <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px', position: 'relative' }}>
                <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                  {p.media_url ? (
                    p.media_type === 'video' ? <video src={p.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={p.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', padding: '2px', textAlign: 'center', overflow: 'hidden' }}>{p.content?.substring(0, 10)}...</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content || "No caption"}</p>
                  <p style={{ fontSize: '12px', color: p.is_deleted ? '#ef4444' : '#f59e0b', marginTop: '2px', fontWeight: 600 }}>{p.is_deleted ? 'Deleted' : 'Hidden'}</p>
                </div>
                
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setMenuId(menuId === p.id ? null : p.id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                    <MoreVertical style={{ width: 16, height: 16 }} />
                  </button>
                  {menuId === p.id && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', zIndex: 10, minWidth: '120px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                      <button onClick={() => restorePost(p.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '13px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px' }}>
                        <RefreshCw style={{ width: 14, height: 14 }} /> Move Out
                      </button>
                    </div>
                  )}
                </div>
             </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function SettingsView({ profile, session }) {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showDanger, setShowDanger] = useState(false)
  const [showActivity, setShowActivity] = useState(false)

  // Appearance State (from ThemeContext)
  const { theme, toggleTheme } = useTheme()

  const showMsg = (msg, icon = CheckCircle2, color = '#60a5fa') => setToast({ msg, icon, color })

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    navigate('/login')
  }

  const handleChangePassword = () => {
    const isGoogle = session?.user?.app_metadata?.provider === 'google'
    if (isGoogle) {
      showMsg('You are signed in using Google OAuth. Password changes are managed via your Google Account.', AlertCircle, '#f59e0b')
    } else {
      showMsg('Password management for email users is not yet configured.', AlertCircle, '#f59e0b')
    }
  }

  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h3 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 pl-1 transition-colors duration-300">{title}</h3>
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm dark:shadow-none">
        {children}
      </div>
    </div>
  )

  const SettingRow = ({ icon: Icon, title, subtitle, onClick, right, color = '#60a5fa', isDanger = false, border = true }) => (
    <motion.div whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} onClick={onClick}
      className={`flex items-center gap-3.5 p-3.5 ${onClick ? 'cursor-pointer' : 'cursor-default'} ${border ? 'border-b border-slate-100 dark:border-white/5' : ''} transition-colors duration-300`}>
      <div style={{ background: isDanger ? (theme === 'dark' ? 'rgba(239,68,68,0.1)' : '#fee2e2') : `${color}${theme === 'dark' ? '15' : '20'}` }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300">
        <Icon style={{ color: isDanger ? '#ef4444' : color }} className="w-[18px] h-[18px]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold ${isDanger ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'} transition-colors duration-300`}>{title}</p>
        {subtitle && <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-300">{subtitle}</p>}
      </div>
      {right || (onClick && <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />)}
    </motion.div>
  )

  return (
    <div className="w-full h-full p-5 max-w-[600px] mx-auto overflow-y-auto">
      <Section title="Account">
        <SettingRow icon={Activity} title="Your Activity" subtitle="Manage deleted and hidden content" color="#38bdf8" onClick={() => setShowActivity(true)} />
        <SettingRow icon={Shield} title="Privacy & Security" subtitle="Manage blocked users and visibility" color="#34d399" onClick={() => setShowPrivacy(true)} />
        <SettingRow icon={Lock} title="Change Password" subtitle="Update your authentication method" color="#a78bfa" border={false} onClick={handleChangePassword} />
      </Section>

      <Section title="Preferences">
        <SettingRow icon={Bell} title="Notifications" subtitle="Push and email alert settings" color="#f59e0b" onClick={() => setShowNotif(true)} />
        <SettingRow icon={theme === 'dark' ? Moon : Sun} title="Appearance" subtitle="Customize the interface" color="#60a5fa" border={false} onClick={toggleTheme} right={
          <motion.div
            style={{ width: 44, height: 24, borderRadius: '12px', background: theme === 'dark' ? '#3b82f6' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer', justifyContent: theme === 'dark' ? 'flex-end' : 'flex-start' }}
          >
            <motion.div layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} style={{ width: 20, height: 20, borderRadius: '10px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
          </motion.div>
        } />
      </Section>

      <Section title="Danger Zone">
        <SettingRow icon={LogOut} title="Log Out" subtitle="Sign out of MNIT Chat" isDanger={true} onClick={handleLogout} />
        <SettingRow icon={UserX} title="Delete Account" subtitle="Permanently remove your data" isDanger={true} border={false} onClick={() => setShowDanger(true)} />
      </Section>

      <div className="text-center mt-8 pb-8 transition-colors duration-300">
        <p className="text-[12px] text-slate-500 dark:text-slate-400">MNIT Chat v0.0.1 Beta</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Made for MNIT Students</p>
      </div>

      <AnimatePresence>
        {showActivity && <YourActivityModal profile={profile} onClose={() => setShowActivity(false)} />}
        {showPrivacy && <PrivacyModal profile={profile} onClose={() => setShowPrivacy(false)} />}
        {showNotif && <NotificationsModal onClose={() => setShowNotif(false)} showToast={showMsg} />}
        {showDanger && <DangerModal profile={profile} onClose={() => setShowDanger(false)} />}
        {toast && <Toast message={toast.msg} icon={toast.icon} color={toast.color} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
