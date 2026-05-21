import{useState,useRef,useEffect}from'react'
import{motion,AnimatePresence}from'framer-motion'
import{useNavigate}from'react-router-dom'
import{Camera,Edit3,LogOut,Hash,FileText,Mail,GraduationCap,Save,X,Eye,Upload,AlertCircle,BadgeCheck,Activity,Clock,Zap,Shield,MoreVertical,Ban,Info,ChevronRight}from'lucide-react'
import{supabase}from'../supabaseClient'

function AvatarModal({profile,onClose,onAvatarChanged}){
  const fileRef=useRef()
  const[uploading,setUploading]=useState(false)
  const[preview,setPreview]=useState(false)
  const[err,setErr]=useState(null)
  const handleUpload=async(e)=>{
    const file=e.target.files?.[0]
    if(!file)return
    if(file.size>5*1024*1024){setErr('Max 5 MB allowed.');return}
    setUploading(true);setErr(null)
    try{
      const{data:{user}}=await supabase.auth.getUser()
      const ext=file.name.split('.').pop().toLowerCase()
      const path=`${user.id}/${Date.now()}-avatar.${ext}`
      const{error:upErr}=await supabase.storage.from('avatars').upload(path,file,{upsert:false,contentType:file.type})
      if(upErr)throw upErr
      const{data:{publicUrl}}=supabase.storage.from('avatars').getPublicUrl(path)
      const{error:dbErr}=await supabase.from('profiles').update({avatar_url:publicUrl}).eq('id',user.id)
      if(dbErr)throw dbErr
      onAvatarChanged(publicUrl);onClose()
    }catch(e){console.error('[Avatar] upload:',e);setErr(e.message??'Upload failed.')}
    finally{setUploading(false);if(fileRef.current)fileRef.current.value=''}
  }
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 16px 28px'}}>
      <motion.div initial={{y:80}} animate={{y:0}} exit={{y:80}}
        transition={{type:'spring',stiffness:320,damping:28}}
        onClick={e=>e.stopPropagation()}
        style={{width:'100%',maxWidth:'440px',background:'#0d1630',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px',padding:'24px',display:'flex',flexDirection:'column',gap:'10px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
          <h3 style={{fontSize:'16px',fontWeight:700,color:'#f0f4ff'}}>Profile Photo</h3>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:'8px',padding:'6px',cursor:'pointer',color:'#64748b',display:'flex'}}><X style={{width:14,height:14}}/></button>
        </div>
        <AnimatePresence>
          {err&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              style={{display:'flex',gap:'8px',padding:'10px 12px',borderRadius:'12px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)'}}>
              <AlertCircle style={{width:14,height:14,color:'#f87171',flexShrink:0,marginTop:1}}/>
              <p style={{fontSize:'12px',color:'#fca5a5'}}>{err}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {profile?.avatarUrl&&(
          <motion.button whileTap={{scale:0.97}} onClick={()=>setPreview(true)}
            style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.09)',background:'rgba(255,255,255,0.04)',cursor:'pointer'}}>
            <Eye style={{width:18,height:18,color:'#60a5fa'}}/>
            <div style={{textAlign:'left'}}><p style={{fontSize:'14px',fontWeight:600,color:'#fff'}}>View Photo</p><p style={{fontSize:'12px',color:'#64748b',marginTop:2}}>Full-screen preview</p></div>
          </motion.button>
        )}
        <motion.button whileTap={!uploading?{scale:0.97}:{}} onClick={()=>!uploading&&fileRef.current?.click()} disabled={uploading}
          style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',borderRadius:'16px',border:'1px solid rgba(37,99,235,0.35)',background:'rgba(37,99,235,0.1)',cursor:uploading?'not-allowed':'pointer',opacity:uploading?0.7:1}}>
          <Upload style={{width:18,height:18,color:'#60a5fa'}}/>
          <div style={{textAlign:'left'}}><p style={{fontSize:'14px',fontWeight:600,color:'#fff'}}>{uploading?'Uploading…':'Change Photo'}</p><p style={{fontSize:'12px',color:'#64748b',marginTop:2}}>JPG, PNG, WebP · max 5 MB</p></div>
        </motion.button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleUpload}/>
      </motion.div>
      <AnimatePresence>
        {preview&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={()=>setPreview(false)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <motion.img src={profile.avatarUrl} alt="Profile" initial={{scale:0.8}} animate={{scale:1}} exit={{scale:0.8}}
              style={{width:260,height:260,borderRadius:'50%',objectFit:'cover',boxShadow:'0 0 80px rgba(59,130,246,0.35)'}}/>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StatCard({value,label,color='#60a5fa',onClick}){
  return(
    <motion.div whileTap={onClick?{scale:0.95}:{}} onClick={onClick} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 8px',borderRadius:'16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',cursor:onClick?'pointer':'default'}}>
      <span style={{fontSize:'22px',fontWeight:800,color}}>{value}</span>
      <span style={{fontSize:'11px',color:'#64748b',marginTop:4,fontWeight:500}}>{label}</span>
    </motion.div>
  )
}

function InfoRow({icon:Icon,label,value,iconColor='#60a5fa'}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
      <div style={{width:34,height:34,borderRadius:'10px',background:`${iconColor}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <Icon style={{width:15,height:15,color:iconColor}}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:'10px',color:'#475569',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</p>
        <p style={{fontSize:'13px',color:'#cbd5e1',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value||'—'}</p>
      </div>
    </div>
  )
}

function SectionCard({title,icon:Icon,iconColor='#60a5fa',children}){
  return(
    <div className="premium-card" style={{padding:'18px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
        <Icon style={{width:15,height:15,color:iconColor}}/>
        <p style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em'}}>{title}</p>
      </div>
      {children}
    </div>
  )
}

/* Friends List Modal */
function FriendsListModal({profile,onClose}){
  const[friends,setFriends]=useState([])
  const[loading,setLoading]=useState(true)
  const navigate=useNavigate()
  useEffect(()=>{
    async function load(){
      const{data:reqs}=await supabase.from('friend_requests').select('sender_id,receiver_id').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      if(!reqs?.length){setFriends([]);setLoading(false);return}
      const ids=reqs.map(r=>r.sender_id===profile.id?r.receiver_id:r.sender_id)
      const{data:p}=await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id',ids)
      setFriends(p||[]);setLoading(false)
    }
    load()
  },[profile.id])
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 12px 24px'}}>
      <motion.div initial={{y:80}} animate={{y:0}} exit={{y:80}} transition={{type:'spring',stiffness:300,damping:28}}
        onClick={e=>e.stopPropagation()}
        style={{width:'100%',maxWidth:'460px',background:'linear-gradient(180deg,#0d1630,#080e22)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px 24px 20px 20px',padding:'20px',maxHeight:'75vh',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <h3 style={{fontSize:'16px',fontWeight:700,color:'#f0f4ff'}}>Your Friends</h3>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:'8px',padding:'6px',cursor:'pointer',color:'#64748b',display:'flex'}}><X style={{width:14,height:14}}/></button>
        </div>
        <div style={{overflowY:'auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          {loading&&<p style={{color:'#475569',fontSize:'13px',textAlign:'center',padding:'24px'}}>Loading…</p>}
          {!loading&&friends.length===0&&<p style={{color:'#475569',fontSize:'13px',textAlign:'center',padding:'24px'}}>No friends yet</p>}
          {friends.map((f,i)=>{
            const name=[f.first_name,f.last_name].filter(Boolean).join(' ')||'Unknown'
            const init=name.split(' ').map(s=>s[0]?.toUpperCase()).join('')||'?'
            return(
              <div key={f.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                {f.avatar_url?<img src={f.avatar_url} alt="" style={{width:44,height:44,borderRadius:'14px',objectFit:'cover',flexShrink:0}}/>:<div style={{width:44,height:44,borderRadius:'14px',flexShrink:0,background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:700,color:'#fff'}}>{init}</div>}
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'15px',fontWeight:600,color:'#f1f5f9',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</p>
                  <p style={{fontSize:'12px',color:'#64748b'}}>@{f.username}</p>
                </div>
                <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>{onClose();navigate(`/user/${f.id}`)}}
                  style={{padding:'8px 14px',borderRadius:'12px',border:'1px solid rgba(59,130,246,0.5)',background:'linear-gradient(135deg,rgba(37,99,235,0.1),rgba(29,78,216,0.3))',color:'#60a5fa',fontSize:'11px',fontWeight:700,cursor:'pointer',boxShadow:'0 0 12px rgba(37,99,235,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',flexShrink:0}}>
                  View Profile
                </motion.button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* Blocked Users Modal */
function BlockedUsersModal({profile,onClose}){
  const[blocked,setBlocked]=useState([])
  const[loading,setLoading]=useState(true)
  const[longPressed,setLongPressed]=useState(null)
  const timerRef=useRef(null)

  useEffect(()=>{
    async function load(){
      const{data}=await supabase.from('blocks').select('id,blocked_id,profiles:blocked_id(id,first_name,last_name,username,avatar_url)').eq('blocker_id',profile.id)
      setBlocked(data||[]);setLoading(false)
    }
    load()
  },[profile.id])

  const unblock=async(row)=>{
    await supabase.from('blocks').delete().eq('id',row.id)
    setBlocked(prev=>prev.filter(r=>r.id!==row.id))
  }

  const startPress=(row)=>{ timerRef.current=setTimeout(()=>setLongPressed(row),1000) }
  const endPress=()=>clearTimeout(timerRef.current)

  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 12px 24px'}}>
      <motion.div initial={{y:80}} animate={{y:0}} exit={{y:80}}
        transition={{type:'spring',stiffness:300,damping:28}}
        onClick={e=>e.stopPropagation()}
        style={{width:'100%',maxWidth:'460px',background:'linear-gradient(180deg,#0d1630,#080e22)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px 24px 20px 20px',padding:'20px',maxHeight:'75vh',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <Ban style={{width:17,height:17,color:'#f87171'}}/>
            <h3 style={{fontSize:'16px',fontWeight:700,color:'#f0f4ff'}}>Blocked Users</h3>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:'8px',padding:'6px',cursor:'pointer',color:'#64748b',display:'flex'}}><X style={{width:14,height:14}}/></button>
        </div>
        <div style={{overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px'}}>
          {loading&&<p style={{color:'#475569',fontSize:'13px',textAlign:'center',padding:'24px'}}>Loading…</p>}
          {!loading&&blocked.length===0&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'40px 20px',gap:'10px'}}>
              <Ban style={{width:28,height:28,color:'#334155'}}/>
              <p style={{color:'#475569',fontSize:'14px'}}>No blocked users</p>
            </div>
          )}
          {blocked.map((row)=>{
            const f=row.profiles
            if(!f)return null
            const name=[f.first_name,f.last_name].filter(Boolean).join(' ')||'Unknown'
            const init=name.split(' ').map(s=>s[0]?.toUpperCase()).join('')||'?'
            return(
              <motion.div key={row.id}
                onTouchStart={()=>startPress(row)} onTouchEnd={endPress} onTouchMove={endPress}
                onMouseDown={()=>startPress(row)} onMouseUp={endPress} onMouseLeave={endPress}
                style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderRadius:'14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',cursor:'default'}}>
                {f.avatar_url
                  ?<img src={f.avatar_url} alt="" style={{width:40,height:40,borderRadius:'12px',objectFit:'cover',flexShrink:0}}/>
                  :<div style={{width:40,height:40,borderRadius:'12px',flexShrink:0,background:'linear-gradient(135deg,#ef4444,#f43f5e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,color:'#fff'}}>{init}</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'14px',fontWeight:600,color:'#f1f5f9'}}>{name}</p>
                  <p style={{fontSize:'12px',color:'#64748b'}}>@{f.username}</p>
                </div>
                <div style={{fontSize:'10px',color:'#f87171',padding:'3px 8px',borderRadius:'6px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',fontWeight:600}}>BLOCKED</div>
              </motion.div>
            )
          })}
          {!loading&&blocked.length>0&&<p style={{fontSize:'11px',color:'#334155',textAlign:'center',padding:'8px'}}>Long-press a user to unblock</p>}
        </div>
      </motion.div>

      {/* Unblock confirmation */}
      <AnimatePresence>
        {longPressed&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={()=>setLongPressed(null)}
            style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
            <motion.div initial={{scale:0.88}} animate={{scale:1}} exit={{scale:0.88}}
              onClick={e=>e.stopPropagation()}
              style={{background:'linear-gradient(180deg,#0d1630,#080e22)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'20px',padding:'20px',maxWidth:'320px',width:'100%',textAlign:'center'}}>
              <p style={{fontSize:'15px',fontWeight:700,color:'#f0f4ff',marginBottom:'8px'}}>Unblock User?</p>
              <p style={{fontSize:'13px',color:'#64748b',marginBottom:'20px'}}>{[longPressed.profiles?.first_name,longPressed.profiles?.last_name].filter(Boolean).join(' ')} will be able to message you again.</p>
              <div style={{display:'flex',gap:'10px'}}>
                <motion.button onClick={()=>setLongPressed(null)} whileTap={{scale:0.97}}
                  style={{flex:1,padding:'11px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'#94a3b8',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                  Cancel
                </motion.button>
                <motion.button onClick={()=>{unblock(longPressed);setLongPressed(null)}} whileTap={{scale:0.97}}
                  style={{flex:1,padding:'11px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'#fff',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                  Unblock
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* About Modal */
function AboutModal({onClose}){
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <motion.div initial={{scale:0.85,y:30}} animate={{scale:1,y:0}} exit={{scale:0.85,y:30}}
        transition={{type:'spring',stiffness:300,damping:26}}
        onClick={e=>e.stopPropagation()}
        style={{width:'100%',maxWidth:'400px',background:'linear-gradient(160deg,#0d1a3a,#080e22)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'28px',overflow:'hidden',boxShadow:'0 40px 80px rgba(0,0,0,0.7)'}}>
        {/* Header */}
        <div style={{padding:'28px 24px 20px',background:'linear-gradient(135deg,rgba(37,99,235,0.2),rgba(124,58,237,0.15))',borderBottom:'1px solid rgba(255,255,255,0.07)',textAlign:'center',position:'relative'}}>
          <button onClick={onClose} style={{position:'absolute',top:'16px',right:'16px',background:'rgba(255,255,255,0.07)',border:'none',borderRadius:'8px',padding:'6px',cursor:'pointer',color:'#64748b',display:'flex'}}><X style={{width:14,height:14}}/></button>
          <div style={{width:56,height:56,borderRadius:'16px',background:'linear-gradient(135deg,#2563eb,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 8px 24px rgba(37,99,235,0.4)'}}>
            <Info style={{width:24,height:24,color:'#fff'}}/>
          </div>
          <h2 style={{fontSize:'22px',fontWeight:900,color:'#f0f4ff',letterSpacing:'-0.02em',marginBottom:'4px'}}>MNIT Chat</h2>
          <p style={{fontSize:'12px',color:'#64748b'}}>Student Hub v1.0</p>
        </div>
        {/* Designer credit */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',textAlign:'center'}}>
          <div style={{display:'inline-block',padding:'10px 20px',borderRadius:'16px',background:'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.15))',border:'1px solid rgba(59,130,246,0.3)'}}>
            <p style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'4px'}}>Designed By</p>
            <p style={{fontSize:'18px',fontWeight:900,color:'#f0f4ff',letterSpacing:'0.02em',background:'linear-gradient(135deg,#60a5fa,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>SUMIT CHAUDHARY</p>
          </div>
        </div>
        {/* Tech stack */}
        <div style={{padding:'20px 24px'}}>
          <p style={{fontSize:'11px',color:'#475569',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'12px'}}>Tech Stack</p>
          {[
            {name:'React.js',desc:'UI Framework',color:'#61dafb'},
            {name:'Tailwind CSS',desc:'Styling System',color:'#38bdf8'},
            {name:'Vite',desc:'Build Tool',color:'#fbbf24'},
            {name:'Framer Motion',desc:'Animations',color:'#a78bfa'},
            {name:'Supabase',desc:'Backend Engine',color:'#3ecf8e'},
          ].map(t=>(
            <div key={t.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:t.color,flexShrink:0,boxShadow:`0 0 8px ${t.color}`}}/>
                <span style={{fontSize:'14px',fontWeight:600,color:'#f1f5f9'}}>{t.name}</span>
              </div>
              <span style={{fontSize:'12px',color:'#475569'}}>{t.desc}</span>
            </div>
          ))}
        </div>
        <div style={{padding:'16px 24px',textAlign:'center'}}>
          <p style={{fontSize:'11px',color:'#334155'}}>© 2025 MNIT Jaipur · All rights reserved</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Profile({profile:initialProfile}){
  const[profile,setProfile]=useState(initialProfile)
  const[authMeta,setAuthMeta]=useState(null)
  const[friendCount,setFriendCount]=useState(null)
  const[signing,setSigning]=useState(false)
  const[isEditing,setIsEditing]=useState(false)
  const[saving,setSaving]=useState(false)
  const[showAvatarModal,setShowAvatarModal]=useState(false)
  const[saveError,setSaveError]=useState(null)
  const[menuOpen,setMenuOpen]=useState(false)
  const[showBlocked,setShowBlocked]=useState(false)
  const[showAbout,setShowAbout]=useState(false)
  const[showFriends,setShowFriends]=useState(false)
  const menuRef=useRef(null)

  const[form,setForm]=useState({
    firstName:initialProfile?.firstName||'',
    lastName:initialProfile?.lastName||'',
    username:initialProfile?.username||'',
    bio:initialProfile?.bio||'',
  })

  useEffect(()=>{
    function handler(e){ if(menuRef.current&&!menuRef.current.contains(e.target))setMenuOpen(false) }
    document.addEventListener('mousedown',handler)
    return()=>document.removeEventListener('mousedown',handler)
  },[])

  useEffect(()=>{
    async function fetchMeta(){
      try{
        const{data:{user}}=await supabase.auth.getUser()
        if(user)setAuthMeta(user)
        if(initialProfile?.id){
          const{count}=await supabase.from('friend_requests').select('id',{count:'exact',head:true}).eq('status','accepted').or(`sender_id.eq.${initialProfile.id},receiver_id.eq.${initialProfile.id}`)
          setFriendCount(count??0)
        }
      }catch(err){console.error('[Profile] fetchMeta:',err)}
    }
    fetchMeta()
  },[initialProfile?.id])

  const initials=[profile?.firstName,profile?.lastName].filter(Boolean).map(s=>s[0]?.toUpperCase()).join('')||'MN'
  const memberSince=authMeta?.created_at?new Date(authMeta.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'}):'—'
  const lastSeen=authMeta?.last_sign_in_at?new Date(authMeta.last_sign_in_at).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'}):'—'

  const handleSave=async()=>{
    if(!form.firstName.trim()){setSaveError('First name required.');return}
    if(form.username.trim().length<3){setSaveError('Username must be ≥ 3 chars.');return}
    setSaving(true);setSaveError(null)
    try{
      const{data:{user}}=await supabase.auth.getUser()
      const{error}=await supabase.from('profiles').upsert({id:user.id,first_name:form.firstName.trim(),last_name:form.lastName.trim(),username:form.username.trim().toLowerCase(),bio:form.bio.trim()})
      if(error)throw error
      setProfile(p=>({...p,...form,username:form.username.trim().toLowerCase()}))
      setIsEditing(false)
    }catch(err){setSaveError(err.message)}
    finally{setSaving(false)}
  }

  const startEdit=()=>{
    setForm({firstName:profile?.firstName||'',lastName:profile?.lastName||'',username:profile?.username||'',bio:profile?.bio||''})
    setSaveError(null);setIsEditing(true)
  }

  const IS={padding:'8px 12px',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'#f0f4ff',fontSize:'13px',outline:'none',width:'100%',boxSizing:'border-box'}

  const menuItems=[
    {icon:Ban,label:'Blocked Users',color:'#f87171',action:()=>{setMenuOpen(false);setShowBlocked(true)}},
    {icon:Info,label:'About This App',color:'#60a5fa',action:()=>{setMenuOpen(false);setShowAbout(true)}},
  ]

  return(
    <div style={{height:'100%',overflowY:'auto',background:'#060b18'}}>
      {/* Cover */}
      <div style={{position:'relative',height:'160px',background:'linear-gradient(135deg,#0d1a3a 0%,#162554 40%,#1e3a8a 100%)',overflow:'hidden'}}>
        <div style={{position:'absolute',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(37,99,235,0.25),transparent 70%)',top:'-80px',right:'-60px'}}/>
        <div style={{position:'absolute',width:'200px',height:'200px',borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.2),transparent 70%)',bottom:'-60px',left:'20px'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',backgroundSize:'32px 32px'}}/>
        {/* Hamburger menu top-right */}
        <div ref={menuRef} style={{position:'absolute',top:'14px',right:'14px',zIndex:10}}>
          <motion.button whileTap={{scale:0.88}} onClick={()=>setMenuOpen(v=>!v)}
            style={{width:36,height:36,borderRadius:'11px',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#f0f4ff',backdropFilter:'blur(8px)'}}>
            <MoreVertical style={{width:16,height:16}}/>
          </motion.button>
          <AnimatePresence>
            {menuOpen&&(
              <motion.div
                initial={{opacity:0,scale:0.88,y:-8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.88,y:-8}}
                transition={{duration:0.18,ease:[0.16,1,0.3,1]}}
                style={{position:'absolute',top:'44px',right:0,width:'210px',background:'linear-gradient(180deg,#0d1630,#080e22)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',overflow:'hidden',zIndex:200,boxShadow:'0 16px 48px rgba(0,0,0,0.7)'}}>
                {menuItems.map(({icon:Icon,label,color,action})=>(
                  <motion.button key={label} onClick={action} whileHover={{background:'rgba(255,255,255,0.06)'}}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',background:'transparent',border:'none',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <Icon style={{width:15,height:15,color,flexShrink:0}}/>
                      <span style={{fontSize:'14px',fontWeight:500,color:'#e2e8f0'}}>{label}</span>
                    </div>
                    <ChevronRight style={{width:13,height:13,color:'#475569'}}/>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Avatar */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginTop:'-52px',position:'relative',zIndex:2,paddingBottom:'8px'}}>
        <motion.div onClick={()=>setShowAvatarModal(true)} whileHover={{scale:1.03}} style={{position:'relative',cursor:'pointer'}}>
          {profile?.avatarUrl
            ?<img src={profile.avatarUrl} alt="" style={{width:100,height:100,borderRadius:'50%',objectFit:'cover',border:'3px solid #060b18',boxShadow:'0 0 0 3px rgba(37,99,235,0.5),0 12px 32px rgba(0,0,0,0.5)'}}/>
            :<div style={{width:100,height:100,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',fontWeight:800,color:'#fff',border:'3px solid #060b18',boxShadow:'0 0 0 3px rgba(37,99,235,0.5)'}}>{initials}</div>
          }
          <div style={{position:'absolute',bottom:2,right:2,width:28,height:28,borderRadius:'50%',background:'#2563eb',border:'2px solid #060b18',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Camera style={{width:12,height:12,color:'#fff'}}/>
          </div>
        </motion.div>
        <div style={{textAlign:'center',marginTop:'12px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
            {isEditing?(
              <div style={{display:'flex',gap:'6px'}}>
                <input value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} style={{...IS,width:'100px',textAlign:'center',fontSize:'14px'}} placeholder="First"/>
                <input value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} style={{...IS,width:'100px',textAlign:'center',fontSize:'14px'}} placeholder="Last"/>
              </div>
            ):(
              <><h2 style={{fontSize:'22px',fontWeight:800,color:'#f0f4ff'}}>{[profile?.firstName,profile?.lastName].filter(Boolean).join(' ')||'MNIT Student'}</h2>
              <BadgeCheck style={{width:20,height:20,color:'#3b82f6',flexShrink:0}}/></>
            )}
          </div>
          {isEditing?(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'4px',marginTop:'6px'}}>
              <span style={{color:'#475569',fontSize:'13px'}}>@</span>
              <input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} style={{...IS,width:'140px',textAlign:'center',fontSize:'13px',marginTop:0}} placeholder="username"/>
            </div>
          ):(
            <p style={{fontSize:'14px',color:'#64748b',marginTop:'4px'}}>@{profile?.username||'—'}</p>
          )}
        </div>
      </div>

      <div style={{padding:'8px 16px 32px',display:'flex',flexDirection:'column',gap:'12px',maxWidth:'600px',margin:'0 auto'}}>
        <div style={{display:'flex',gap:'10px'}}>
          <StatCard value={friendCount??'—'} label="Friends" color="#60a5fa" onClick={()=>setShowFriends(true)}/>
          <StatCard value="—" label="Chats" color="#a78bfa"/>
          <StatCard value="—" label="Groups" color="#34d399"/>
        </div>
        <AnimatePresence>
          {saveError&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{display:'flex',gap:'8px',padding:'10px 14px',borderRadius:'12px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)'}}>
              <AlertCircle style={{width:14,height:14,color:'#f87171',flexShrink:0,marginTop:1}}/>
              <p style={{fontSize:'12px',color:'#fca5a5'}}>{saveError}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {isEditing?(
          <div style={{display:'flex',gap:'10px'}}>
            <motion.button onClick={handleSave} disabled={saving} whileTap={{scale:0.97}}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'13px',borderRadius:'14px',border:'none',background:'#16a34a',color:'#fff',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
              <Save style={{width:15,height:15}}/> {saving?'Saving…':'Save Changes'}
            </motion.button>
            <motion.button onClick={()=>{setIsEditing(false);setSaveError(null)}} whileTap={{scale:0.97}}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'13px',borderRadius:'14px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'#94a3b8',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
              <X style={{width:15,height:15}}/> Cancel
            </motion.button>
          </div>
        ):(
          <motion.button id="btn-edit-profile" onClick={startEdit} whileHover={{y:-1}} whileTap={{scale:0.97}}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'13px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',fontSize:'14px',fontWeight:600,cursor:'pointer',boxShadow:'0 6px 20px rgba(37,99,235,0.4)'}}>
            <Edit3 style={{width:15,height:15}}/> Edit Profile
          </motion.button>
        )}
        <SectionCard title="About Me" icon={FileText} iconColor="#60a5fa">
          {isEditing?(
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <label style={{fontSize:'10px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.06em'}}>Bio</label>
              <textarea value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} rows={3} maxLength={200} placeholder="Write a short bio…" style={{...IS,resize:'none',fontFamily:'inherit',lineHeight:1.55}}/>
            </div>
          ):(
            <p style={{fontSize:'13px',color:profile?.bio?'#94a3b8':'#334155',lineHeight:1.65,marginBottom:'12px'}}>
              {profile?.bio||'No bio yet. Click Edit Profile to add one.'}
            </p>
          )}
          <div style={{marginTop:isEditing?'12px':0}}>
            <InfoRow icon={Hash} label="Username" value={`@${profile?.username||'—'}`} iconColor="#60a5fa"/>
            <InfoRow icon={GraduationCap} label="Institute" value="MNIT Jaipur" iconColor="#a78bfa"/>
            <InfoRow icon={Mail} label="Auth Method" value={authMeta?.app_metadata?.provider==='google'?'Google OAuth':authMeta?.email??'—'} iconColor="#34d399"/>
            <div style={{borderBottom:'none'}}>
              <InfoRow icon={Shield} label="Email" value={authMeta?.email??'—'} iconColor="#f59e0b"/>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Activity Overview" icon={Activity} iconColor="#a78bfa">
          <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{width:34,height:34,borderRadius:'10px',background:'rgba(52,211,153,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#34d399'}} className="pulse-ring"/>
            </div>
            <div>
              <p style={{fontSize:'10px',color:'#475569',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Active Status</p>
              <p style={{fontSize:'13px',color:'#34d399',marginTop:2,fontWeight:500}}>Online Now</p>
            </div>
          </div>
          <InfoRow icon={Clock} label="Member Since" value={memberSince} iconColor="#60a5fa"/>
          <InfoRow icon={Zap} label="Last Seen" value={lastSeen} iconColor="#f59e0b"/>
        </SectionCard>
        {!isEditing&&(
          <motion.button onClick={()=>{setSigning(true);supabase.auth.signOut()}} disabled={signing} whileTap={{scale:0.97}}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',padding:'13px',borderRadius:'14px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.07)',color:'#f87171',fontSize:'14px',fontWeight:600,cursor:'pointer',opacity:signing?0.6:1}}>
            <LogOut style={{width:15,height:15}}/> {signing?'Signing out…':'Sign Out'}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showAvatarModal&&<AvatarModal profile={profile} onClose={()=>setShowAvatarModal(false)} onAvatarChanged={url=>setProfile(p=>({...p,avatarUrl:url}))}/> }
      </AnimatePresence>
      <AnimatePresence>
        {showBlocked&&initialProfile&&<BlockedUsersModal profile={initialProfile} onClose={()=>setShowBlocked(false)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showAbout&&<AboutModal onClose={()=>setShowAbout(false)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showFriends&&initialProfile&&<FriendsListModal profile={initialProfile} onClose={()=>setShowFriends(false)}/>}
      </AnimatePresence>
    </div>
  )
}
