import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Plus, Check, Upload } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { processMediaFile } from '../utils/mediaUtils'

const GRADS = ['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)','linear-gradient(135deg,#f59e0b,#f97316)','linear-gradient(135deg,#a855f7,#7c3aed)']

export default function CreateGroupModal({ profile, onClose, onCreated }) {
  const avatarRef = useRef()
  const [step,         setStep        ] = useState('form')   // 'form' | 'creating'
  const [groupName,    setGroupName   ] = useState('')
  const [description,  setDescription ] = useState('')
  const [avatarFile,   setAvatarFile  ] = useState(null)
  const [avatarPreview,setAvatarPreview]=useState(null)
  const [friends,      setFriends     ] = useState([])
  const [invited,      setInvited     ] = useState(new Set())
  const [error,        setError       ] = useState(null)
  const [loading,      setLoading     ] = useState(false)

  // Fetch accepted friends
  useEffect(()=>{
    if (!profile?.id) return
    async function load() {
      const { data:reqs } = await supabase.from('friend_requests').select('sender_id,receiver_id').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      if (!reqs?.length) return
      const ids=[...new Set(reqs.map(r=>r.sender_id===profile.id?r.receiver_id:r.sender_id))]
      const { data:profiles } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id',ids)
      setFriends(profiles||[])
    }
    load()
  },[profile?.id])

  const handleAvatarPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
    e.target.value=''
  }

  const toggleInvite = (friendId) => {
    setInvited(prev => {
      const n = new Set(prev)
      n.has(friendId) ? n.delete(friendId) : n.add(friendId)
      return n
    })
  }

  const handleCreate = async () => {
    if (!groupName.trim()) { setError('Group name is required.'); return }
    setLoading(true); setError(null)
    try {
      // 1. Upload avatar if selected
      let avatarUrl = null
      if (avatarFile) {
        const processedFile = await processMediaFile(avatarFile, setError)
        if (!processedFile) { setLoading(false); return }

        const ext  = processedFile.name.split('.').pop()
        const path = `${profile.id}/${Date.now()}-group.${ext}`
        const { error:upErr } = await supabase.storage.from('group_avatars').upload(path, processedFile, { contentType: processedFile.type })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('group_avatars').getPublicUrl(path)
        avatarUrl = publicUrl
      }

      // 2. Create the group
      const { data:group, error:gErr } = await supabase.from('groups').insert({
        name:        groupName.trim(),
        description: description.trim(),
        admin_id:    profile.id,
        avatar_url:  avatarUrl,
      }).select('id,admin_id').single()
      if (gErr) throw gErr

      // 3. Add admin as first member
      await supabase.from('group_members').insert({ group_id:group.id, user_id:profile.id })

      // 4. Send invites to selected friends
      if (invited.size > 0) {
        const inviteRows = [...invited].map(fid => ({
          group_id:     group.id,
          sender_id:    profile.id,
          receiver_id:  fid,
          request_type: 'invite',
          status:       'pending',
        }))
        await supabase.from('group_requests').insert(inviteRows)
      }

      onCreated()
      onClose()
    } catch(err) {
      console.error('[CreateGroup]', err)
      setError(err.message ?? 'Failed to create group.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.82)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
        transition={{type:'spring',stiffness:300,damping:26}}
        onClick={e=>e.stopPropagation()}
        style={{width:'100%',maxWidth:'440px',maxHeight:'88vh',overflowY:'auto',background:'#0a1428',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px',padding:'24px',display:'flex',flexDirection:'column',gap:'16px'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'#f0f4ff'}}>Create Group</h2>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:'8px',padding:'7px',cursor:'pointer',color:'#64748b',display:'flex'}}><X style={{width:15,height:15}}/></button>
        </div>

        {/* Avatar picker */}
        <div style={{display:'flex',justifyContent:'center'}}>
          <div style={{position:'relative',cursor:'pointer'}} onClick={()=>avatarRef.current?.click()}>
            {avatarPreview
              ? <img src={avatarPreview} alt="" style={{width:88,height:88,borderRadius:'26px',objectFit:'cover',border:'2px solid rgba(37,99,235,0.5)'}}/>
              : <div style={{width:88,height:88,borderRadius:'26px',background:GRADS[0],display:'flex',alignItems:'center',justifyContent:'center',border:'2px dashed rgba(59,130,246,0.4)'}}>
                  <Upload style={{width:26,height:26,color:'rgba(255,255,255,0.6)'}}/>
                </div>
            }
            <div style={{position:'absolute',bottom:-6,right:-6,width:28,height:28,borderRadius:'50%',background:'#2563eb',border:'2px solid #0a1428',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Camera style={{width:12,height:12,color:'#fff'}}/>
            </div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarPick}/>
        </div>

        {/* Group Name */}
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          <label style={{fontSize:'11px',fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em'}}>Group Name *</label>
          <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="e.g. MNIT CS Batch 2025"
            style={{padding:'11px 14px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'#f0f4ff',fontSize:'14px',outline:'none'}}/>
        </div>

        {/* Description */}
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          <label style={{fontSize:'11px',fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em'}}>Description</label>
          <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What's this group about?"
            style={{padding:'11px 14px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'#f0f4ff',fontSize:'14px',outline:'none'}}/>
        </div>

        {/* Invite friends */}
        {friends.length > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            <label style={{fontSize:'11px',fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.07em'}}>Add Friends ({invited.size} selected)</label>
            <div style={{display:'flex',flexDirection:'column',gap:'4px',maxHeight:'200px',overflowY:'auto'}}>
              {friends.map((f,i)=>{
                const name=[f.first_name,f.last_name].filter(Boolean).join(' ')||'Unknown'
                const isAdded=invited.has(f.id)
                return (
                  <div key={f.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',borderRadius:'14px',border:`1px solid ${isAdded?'rgba(37,99,235,0.4)':'rgba(255,255,255,0.07)'}`,background:isAdded?'rgba(37,99,235,0.1)':'rgba(255,255,255,0.03)'}}>
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt="" style={{width:38,height:38,borderRadius:'12px',objectFit:'cover',flexShrink:0}}/>
                      : <div style={{width:38,height:38,borderRadius:'12px',flexShrink:0,background:GRADS[i%GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,color:'#fff'}}>{name[0]?.toUpperCase()}</div>
                    }
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'13px',fontWeight:600,color:'#f0f4ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</p>
                      <p style={{fontSize:'11px',color:'#64748b'}}>@{f.username||'—'}</p>
                    </div>
                    <motion.button whileTap={{scale:0.9}} onClick={()=>toggleInvite(f.id)}
                      style={{padding:'6px 14px',borderRadius:'10px',border:'none',background:isAdded?'#2563eb':'rgba(255,255,255,0.09)',color:isAdded?'#fff':'#94a3b8',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
                      {isAdded?<><Check style={{width:11,height:11}}/> Added</>:<><Plus style={{width:11,height:11}}/> Add</>}
                    </motion.button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && <p style={{fontSize:'12px',color:'#f87171',padding:'8px 12px',background:'rgba(239,68,68,0.1)',borderRadius:'10px'}}>{error}</p>}

        <motion.button onClick={handleCreate} disabled={loading} whileTap={{scale:0.97}}
          style={{padding:'14px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',fontSize:'15px',fontWeight:700,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,boxShadow:'0 6px 20px rgba(37,99,235,0.4)'}}>
          {loading?'Creating…':'🚀 Create Group'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
