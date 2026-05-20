import{useEffect,useState,useRef}from'react'
import{motion,AnimatePresence}from'framer-motion'
import{MessageCircle,Users,Eye,EyeOff,Trash2,X}from'lucide-react'
import{useNavigate}from'react-router-dom'
import{supabase}from'../supabaseClient'

const GRADIENTS=['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)','linear-gradient(135deg,#f59e0b,#f97316)','linear-gradient(135deg,#ef4444,#f43f5e)','linear-gradient(135deg,#a855f7,#7c3aed)']

function FriendAvatar({friend,index,size=48}){
  const initials=[friend.first_name,friend.last_name].filter(Boolean).map(s=>s[0]?.toUpperCase()).join('')||'?'
  if(friend.avatar_url)return <img src={friend.avatar_url} alt={friend.username} style={{width:size,height:size,borderRadius:'14px',objectFit:'cover',flexShrink:0}}/>
  return <div style={{width:size,height:size,borderRadius:'14px',flexShrink:0,background:GRADIENTS[index%GRADIENTS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:700,color:'#fff',boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>{initials}</div>
}

/* Chat capsule long-press menu */
function ChatMenu({label,options,onClose}){
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <motion.div initial={{scale:0.85,y:10}} animate={{scale:1,y:0}} exit={{scale:0.85,y:10}}
        onClick={e=>e.stopPropagation()}
        style={{background:'linear-gradient(180deg,#0d1630,#080e22)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'20px',padding:'8px',minWidth:'200px',boxShadow:'0 20px 60px rgba(0,0,0,0.7)'}}>
        <p style={{fontSize:'12px',color:'#475569',fontWeight:600,padding:'8px 16px 4px',letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</p>
        {options.map(({icon:Icon,label:lbl,color,action})=>(
          <motion.button key={lbl} onClick={()=>{action();onClose()}} whileHover={{background:'rgba(255,255,255,0.07)'}}
            style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',background:'transparent',border:'none',cursor:'pointer',borderRadius:'12px',color}}>
            <Icon style={{width:15,height:15,flexShrink:0}}/>
            <span style={{fontSize:'14px',fontWeight:500}}>{lbl}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  )
}

/* Hidden Chats List */
function HiddenChatsView({profile,onClose}){
  const[hidden,setHidden]=useState([])
  const[loading,setLoading]=useState(true)
  const[longPressed,setLongPressed]=useState(null)
  const navigate=useNavigate()
  const timerRef=useRef(null)

  useEffect(()=>{
    fetchHidden()
  },[profile.id])

  async function fetchHidden(){
    setLoading(true)
    const{data:rows}=await supabase.from('hidden_chats').select('id,friend_id,profiles:friend_id(id,first_name,last_name,username,avatar_url)').eq('user_id',profile.id).not('friend_id','is',null)
    setHidden(rows||[]);setLoading(false)
  }

  const unhide=async(row)=>{
    await supabase.from('hidden_chats').delete().eq('id',row.id)
    setHidden(prev=>prev.filter(r=>r.id!==row.id))
  }

  const deleteChat=async(row)=>{
    await supabase.from('messages').delete()
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${row.friend_id}),and(sender_id.eq.${row.friend_id},receiver_id.eq.${profile.id})`)
    await supabase.from('hidden_chats').delete().eq('id',row.id)
    setHidden(prev=>prev.filter(r=>r.id!==row.id))
  }

  const startPress=(row)=>{ timerRef.current=setTimeout(()=>setLongPressed(row),1000) }
  const endPress=()=>clearTimeout(timerRef.current)

  return(
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
      style={{position:'absolute',inset:0,zIndex:50,background:'#060b18',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'16px 20px 10px',display:'flex',alignItems:'center',gap:'12px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'7px 12px',color:'#94a3b8',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px'}}>
          <X style={{width:13,height:13}}/> Back
        </button>
        <h2 style={{fontSize:'17px',fontWeight:700,color:'#f0f4ff'}}>Hidden Chats</h2>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px 10px 16px'}}>
        {loading&&[1,2].map(i=><div key={i} style={{height:'70px',borderRadius:'18px',background:'rgba(255,255,255,0.04)',marginBottom:'6px',animation:'pulse 1.5s infinite'}}/>)}
        {!loading&&hidden.length===0&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px',gap:'12px'}}>
            <EyeOff style={{width:32,height:32,color:'#334155'}}/>
            <p style={{color:'#475569',fontSize:'14px'}}>No hidden chats</p>
          </div>
        )}
        {hidden.map((row,i)=>{
          const f=row.profiles
          if(!f)return null
          const name=[f.first_name,f.last_name].filter(Boolean).join(' ')||'Unknown'
          return(
            <motion.div key={row.id} layout
              initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
              whileHover={{y:-1,background:'rgba(255,255,255,0.05)'}}
              onClick={()=>navigate(`/chat/room/${f.id}`)}
              onTouchStart={()=>startPress(row)} onTouchEnd={endPress} onTouchMove={endPress}
              onMouseDown={()=>startPress(row)} onMouseUp={endPress} onMouseLeave={endPress}
              style={{display:'flex',alignItems:'center',gap:'14px',padding:'13px 14px',marginBottom:'5px',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.03)',cursor:'pointer'}}>
              <FriendAvatar friend={f} index={i}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:'15px',fontWeight:600,color:'#f1f5f9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</p>
                <p style={{fontSize:'12px',color:'#64748b',marginTop:'2px'}}>@{f.username||'—'}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',borderRadius:'10px',background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.25)'}}>
                <EyeOff style={{width:12,height:12,color:'#a78bfa'}}/>
                <span style={{fontSize:'11px',color:'#a78bfa',fontWeight:600}}>Hidden</span>
              </div>
            </motion.div>
          )
        })}
      </div>
      <AnimatePresence>
        {longPressed&&(
          <ChatMenu
            label={longPressed.profiles?.first_name}
            options={[
              {icon:Eye,label:'Unhide this chat',color:'#60a5fa',action:()=>unhide(longPressed)},
              {icon:Trash2,label:'Delete Chat',color:'#f87171',action:()=>deleteChat(longPressed)},
            ]}
            onClose={()=>setLongPressed(null)}
          />
        )}
      </AnimatePresence>
      <style>{`@keyframes pulse{0%,100%{opacity:.45}50%{opacity:.2}}`}</style>
    </motion.div>
  )
}

export default function Chats({profile}){
  const[friends,setFriends]=useState([])
  const[loading,setLoading]=useState(true)
  const[hiddenIds,setHiddenIds]=useState(new Set())
  const[longPressed,setLongPressed]=useState(null)
  const[showHidden,setShowHidden]=useState(false)
  const navigate=useNavigate()
  const timerRef=useRef(null)

  useEffect(()=>{
    if(!profile?.id)return
    fetchFriends()
    fetchHiddenIds()
    const ch=supabase.channel(`friends-list-${profile.id}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'friend_requests'},
        (payload)=>{ if(payload.new?.status==='accepted')fetchFriends() })
      .subscribe()
    return()=>supabase.removeChannel(ch)
  },[profile?.id])

  async function fetchHiddenIds(){
    const{data}=await supabase.from('hidden_chats').select('friend_id').eq('user_id',profile.id).not('friend_id','is',null)
    setHiddenIds(new Set((data||[]).map(r=>r.friend_id)))
  }

  async function fetchFriends(){
    setLoading(true)
    try{
      const{data:requests,error:reqErr}=await supabase.from('friend_requests').select('id,sender_id,receiver_id').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      if(reqErr)throw reqErr
      if(!requests?.length){setFriends([]);setLoading(false);return}
      const friendIds=[...new Set(requests.map(r=>r.sender_id===profile.id?r.receiver_id:r.sender_id))]
      const{data:profiles,error:profErr}=await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url,bio').in('id',friendIds)
      if(profErr)throw profErr
      setFriends(profiles||[])
    }catch(err){console.error('[Chats] fetchFriends:',err)}
    finally{setLoading(false)}
  }

  const hideChat=async(friend)=>{
    await supabase.from('hidden_chats').insert({user_id:profile.id,friend_id:friend.id})
    setHiddenIds(prev=>new Set([...prev,friend.id]))
    fetchHiddenIds()
  }

  const deleteChat=async(friend)=>{
    await supabase.from('messages').delete()
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${profile.id})`)
  }

  const startPress=(friend)=>{ timerRef.current=setTimeout(()=>setLongPressed(friend),1000) }
  const endPress=()=>clearTimeout(timerRef.current)

  const visibleFriends=friends.filter(f=>!hiddenIds.has(f.id))

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',position:'relative'}}>
      <div style={{padding:'20px 20px 12px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h2 style={{fontSize:'20px',fontWeight:700,color:'#fff',marginBottom:'2px'}}>Messages</h2>
          <p style={{fontSize:'12px',color:'#64748b'}}>{loading?'Loading…':`${visibleFriends.length} friend${visibleFriends.length!==1?'s':''} connected`}</p>
        </div>
        <motion.button whileTap={{scale:0.88}} onClick={()=>setShowHidden(true)}
          title="Hidden Chats"
          style={{width:36,height:36,borderRadius:'11px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b'}}>
          <EyeOff style={{width:16,height:16}}/>
        </motion.button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 10px 16px'}}>
        {loading&&(
          <div style={{display:'flex',flexDirection:'column',gap:'6px',padding:'4px'}}>
            {[1,2,3].map(i=><div key={i} style={{height:'74px',borderRadius:'18px',background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s ease-in-out infinite'}}/>)}
          </div>
        )}
        {!loading&&visibleFriends.length===0&&(
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
            style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'72px 28px',textAlign:'center',gap:'16px'}}>
            <div style={{width:72,height:72,borderRadius:'22px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Users style={{width:30,height:30,color:'#334155'}}/>
            </div>
            <div>
              <p style={{fontSize:'16px',fontWeight:600,color:'#475569',marginBottom:'6px'}}>No friends yet</p>
              <p style={{fontSize:'13px',color:'#334155',lineHeight:1.55}}>Go to <strong style={{color:'#60a5fa'}}>Search</strong> to find MNIT classmates!</p>
            </div>
          </motion.div>
        )}
        <AnimatePresence>
          {!loading&&visibleFriends.map((friend,i)=>{
            const fullName=[friend.first_name,friend.last_name].filter(Boolean).join(' ')||'Unknown'
            return(
              <motion.div key={friend.id} layout
                initial={{opacity:0,y:18,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
                exit={{opacity:0,x:-20,scale:0.94}}
                transition={{delay:Math.min(i*0.06,0.35),duration:0.35,ease:[0.16,1,0.3,1]}}
                whileHover={{y:-2,backgroundColor:'rgba(255,255,255,0.058)',boxShadow:'0 8px 24px rgba(0,0,0,0.25)'}}
                whileTap={{scale:0.98}}
                onClick={()=>navigate(`/chat/room/${friend.id}`)}
                onTouchStart={()=>startPress(friend)} onTouchEnd={endPress} onTouchMove={endPress}
                onMouseDown={()=>startPress(friend)} onMouseUp={endPress} onMouseLeave={endPress}
                style={{display:'flex',alignItems:'center',gap:'14px',padding:'13px 14px',marginBottom:'5px',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.03)',cursor:'pointer',transition:'background 0.2s,box-shadow 0.2s'}}>
                <FriendAvatar friend={friend} index={i} size={48}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'15px',fontWeight:600,color:'#f1f5f9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fullName}</p>
                  <p style={{fontSize:'12px',color:'#64748b',marginTop:'2px'}}>@{friend.username||'—'}</p>
                  {friend.bio&&<p style={{fontSize:'11px',color:'#475569',marginTop:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{friend.bio}</p>}
                </div>
                <motion.div whileHover={{scale:1.1}} style={{flexShrink:0,width:36,height:36,borderRadius:'11px',background:'rgba(37,99,235,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MessageCircle style={{width:16,height:16,color:'#60a5fa'}}/>
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {longPressed&&(
          <ChatMenu
            label={[longPressed.first_name,longPressed.last_name].filter(Boolean).join(' ')}
            options={[
              {icon:EyeOff,label:'Hide this chat',color:'#a78bfa',action:()=>hideChat(longPressed)},
              {icon:Trash2,label:'Delete Chat',color:'#f87171',action:()=>deleteChat(longPressed)},
            ]}
            onClose={()=>setLongPressed(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHidden&&<HiddenChatsView profile={profile} onClose={()=>setShowHidden(false)}/>}
      </AnimatePresence>

      <style>{`@keyframes pulse{0%,100%{opacity:.45}50%{opacity:.2}}`}</style>
    </div>
  )
}
