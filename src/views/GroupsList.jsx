import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, X, ChevronRight, UserPlus, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import CreateGroupModal from '../components/CreateGroupModal'

const GRADS = ['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)','linear-gradient(135deg,#f59e0b,#f97316)','linear-gradient(135deg,#a855f7,#7c3aed)']

function unreadLabel(n){
  if(n<=0)return null
  if(n===1)return'1 new message'
  if(n<=3)return`${n} new messages`
  return'4+ new messages'
}

function GAvatar({ g, i, size=50 }) {
  if (g.avatar_url) return <img src={g.avatar_url} alt={g.name} style={{ width:size,height:size,borderRadius:'14px',objectFit:'cover',flexShrink:0 }}/>
  return <div style={{ width:size,height:size,borderRadius:'14px',flexShrink:0,background:GRADS[i%GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:800,color:'#fff' }}>{(g.name||'G')[0].toUpperCase()}</div>
}

function JoinModal({ group, profile, onClose, onDone }) {
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState(null)
  const [done,setDone]=useState(false)
  const send = async () => {
    setLoading(true); setError(null)
    try {
      const { data:ex } = await supabase.from('group_requests').select('id').eq('group_id',group.id).eq('sender_id',profile.id).eq('request_type','join_request').maybeSingle()
      if (ex) { setError('Request already sent.'); return }
      const { error:e } = await supabase.from('group_requests').insert({ group_id:group.id, sender_id:profile.id, receiver_id:group.admin_id, request_type:'join_request', status:'pending' })
      if (e) throw e
      setDone(true)
      setTimeout(()=>{ onDone(); onClose() }, 1200)
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.78)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 16px 28px'}}>
      <motion.div initial={{y:60}} animate={{y:0}} exit={{y:60}} transition={{type:'spring',stiffness:320,damping:28}}
        onClick={e=>e.stopPropagation()}
        style={{width:'100%',maxWidth:'420px',background:'#0d1630',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px',padding:'24px',display:'flex',flexDirection:'column',gap:'14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{fontSize:'16px',fontWeight:700,color:'#f0f4ff'}}>Join Group</h3>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'none',borderRadius:'8px',padding:'6px',cursor:'pointer',color:'#64748b',display:'flex'}}><X style={{width:14,height:14}}/></button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px',borderRadius:'16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <GAvatar g={group} i={0} size={52}/>
          <div>
            <p style={{fontSize:'16px',fontWeight:700,color:'#f0f4ff'}}>{group.name}</p>
            <p style={{fontSize:'12px',color:'#64748b',marginTop:3}}>{group.description||'No description'}</p>
          </div>
        </div>
        {error && <p style={{fontSize:'12px',color:'#f87171',padding:'8px 12px',background:'rgba(239,68,68,0.1)',borderRadius:'10px'}}>{error}</p>}
        {done
          ? <div style={{textAlign:'center',padding:'12px',color:'#34d399',fontSize:'15px',fontWeight:600}}>✅ Request Sent!</div>
          : <motion.button onClick={send} disabled={loading} whileTap={{scale:0.97}}
              style={{padding:'13px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',fontSize:'14px',fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1}}>
              {loading?'Sending…':'✋ Request to Join'}
            </motion.button>
        }
      </motion.div>
    </motion.div>
  )
}

export default function GroupsList({ profile }) {
  const navigate = useNavigate()
  const [groups,setGroups]=useState([])
  const [myIds,setMyIds]=useState(new Set())
  const [unreadCounts,setUnreadCounts]=useState({})
  const [loading,setLoading]=useState(true)
  const [showCreate,setShowCreate]=useState(false)
  const [joinTarget,setJoinTarget]=useState(null)

  useEffect(()=>{ if(profile?.id) load() },[profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    const ch = supabase.channel(`group-unread-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, 
        (p) => {
          if (myIds.has(p.new.group_id) && p.new.sender_id !== profile.id) {
            setUnreadCounts(prev => ({...prev, [p.new.group_id]: (prev[p.new.group_id] || 0) + 1}))
          }
        }
      ).subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile?.id, myIds])

  async function load() {
    setLoading(true)
    try {
      const [{data:all,error:e1},{data:mine}] = await Promise.all([
        supabase.from('groups').select('id,name,description,admin_id,avatar_url,created_at').order('created_at',{ascending:false}),
        supabase.from('group_members').select('group_id').eq('user_id',profile.id)
      ])
      if(e1) throw e1
      
      const myGroupIds = (mine||[]).map(m=>m.group_id)
      setMyIds(new Set(myGroupIds))
      setGroups(all||[])

      if (myGroupIds.length > 0) {
        const { data: reads } = await supabase.from('group_message_reads').select('group_id, last_read_at').eq('user_id', profile.id)
        const readMap = {}
        ;(reads||[]).forEach(r => readMap[r.group_id] = r.last_read_at)

        const counts = {}
        const { data: msgs } = await supabase.from('group_messages').select('group_id, created_at, sender_id').in('group_id', myGroupIds)
        
        ;(msgs||[]).forEach(m => {
           if (m.sender_id === profile.id) return // skip our own messages
           const readAt = readMap[m.group_id]
           if (!readAt || new Date(m.created_at) > new Date(readAt)) {
              counts[m.group_id] = (counts[m.group_id] || 0) + 1
           }
        })
        setUnreadCounts(counts)
      }
    } catch(err) { console.error('[GroupsList]',err) }
    finally { setLoading(false) }
  }

  const handleGroupClick = (g, isMember) => {
    if (isMember) {
      setUnreadCounts(prev => ({ ...prev, [g.id]: 0 }))
      navigate(`/group/room/${g.id}`)
    } else {
      setJoinTarget(g)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>

      <div style={{flex:1,overflowY:'auto',padding:'0 10px 16px'}}>
        {loading && [1,2,3].map(i=><div key={i} className="skeleton" style={{height:'76px',marginBottom:'6px',borderRadius:'18px'}}/>)}
        {!loading && groups.length===0 && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:'72px',gap:'14px',textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:'22px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Users style={{width:30,height:30,color:'#334155'}}/>
            </div>
            <p style={{fontSize:'15px',fontWeight:600,color:'#475569'}}>No groups yet</p>
            <p style={{fontSize:'13px',color:'#334155'}}>Hit "Make Group" to create the first one!</p>
          </div>
        )}
        <AnimatePresence>
          {!loading && groups.map((g,i)=>{
            const isMember=myIds.has(g.id), isAdmin=g.admin_id===profile?.id
            const unread = unreadCounts[g.id] || 0
            const badge = unreadLabel(unread)
            
            return (
              <motion.div key={g.id} layout initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}}
                transition={{delay:Math.min(i*0.05,0.3)}} whileHover={{y:-2,backgroundColor:'rgba(255,255,255,0.05)'}} whileTap={{scale:0.985}}
                onClick={()=>handleGroupClick(g, isMember)}
                style={{display:'flex',alignItems:'center',gap:'13px',padding:'13px 14px',marginBottom:'5px',borderRadius:'18px',border:`1px solid ${unread>0?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.07)'}`,background:unread>0?'rgba(59,130,246,0.05)':'rgba(255,255,255,0.03)',cursor:'pointer'}}>
                <GAvatar g={g} i={i}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <p style={{fontSize:'15px',fontWeight:unread>0?700:600,color:'#f0f4ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</p>
                    {isAdmin && <span style={{fontSize:'9px',fontWeight:700,color:'#f59e0b',background:'rgba(245,158,11,0.15)',padding:'2px 6px',borderRadius:'6px',flexShrink:0}}>ADMIN</span>}
                    {isMember&&!isAdmin && <span style={{fontSize:'9px',fontWeight:700,color:'#34d399',background:'rgba(52,211,153,0.12)',padding:'2px 6px',borderRadius:'6px',flexShrink:0}}>MEMBER</span>}
                  </div>
                  <p style={{fontSize:'12px',color:unread>0?'#94a3b8':'#64748b',marginTop:2,fontWeight:unread>0?600:400}}>{g.description||'No description'}</p>
                </div>
                {isMember
                  ? badge 
                    ? <motion.div initial={{scale:0.5,opacity:0}} animate={{scale:1,opacity:1}}
                        style={{flexShrink:0,padding:'5px 10px',borderRadius:'999px',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',boxShadow:'0 0 14px rgba(37,99,235,0.55)',fontSize:'11px',fontWeight:700,color:'#fff',whiteSpace:'nowrap',textAlign:'center'}}>
                        {badge}
                      </motion.div>
                    : <ChevronRight style={{width:16,height:16,color:'#475569',flexShrink:0}}/>
                  : <div style={{display:'flex',alignItems:'center',gap:'4px',padding:'6px 10px',borderRadius:'10px',background:'rgba(37,99,235,0.12)',border:'1px solid rgba(37,99,235,0.25)',flexShrink:0}}>
                      <UserPlus style={{width:12,height:12,color:'#60a5fa'}}/>
                      <span style={{fontSize:'11px',fontWeight:600,color:'#60a5fa'}}>Join</span>
                    </div>
                }
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreate && <CreateGroupModal profile={profile} onClose={()=>setShowCreate(false)} onCreated={load}/>}
        {joinTarget  && <JoinModal group={joinTarget} profile={profile} onClose={()=>setJoinTarget(null)} onDone={load}/>}
      </AnimatePresence>
    </div>
  )
}
