import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, X, UserPlus, Users, Inbox } from 'lucide-react'
import { supabase } from '../supabaseClient'

const GRADS=['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)','linear-gradient(135deg,#f59e0b,#f97316)','linear-gradient(135deg,#a855f7,#7c3aed)']

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#f87171', background: '#450a0a', borderRadius: '12px', margin: '16px', fontFamily: 'monospace', fontSize: '13px', overflowWrap: 'anywhere' }}>
          <strong>Crash in Notifications:</strong><br/><br/>
          {this.state.error?.message || 'Unknown error'}<br/><br/>
          {this.state.error?.stack}
        </div>
      )
    }
    return this.props.children;
  }
}

function Avatar({ p, i, size=44 }) {
  const init=[p?.first_name,p?.last_name].filter(Boolean).map(s=>s[0]?.toUpperCase()).join('')||'?'
  if(p?.avatar_url) return <img src={p.avatar_url} alt="" style={{width:size,height:size,borderRadius:'13px',objectFit:'cover',flexShrink:0}}/>
  return <div style={{width:size,height:size,borderRadius:'13px',flexShrink:0,background:GRADS[i%GRADS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,color:'#fff'}}>{init}</div>
}

function GroupIcon({ g, size=44 }) {
  const letter=(g?.name||'G')[0].toUpperCase()
  if(g?.avatar_url) return <img src={g.avatar_url} alt="" style={{width:size,height:size,borderRadius:'13px',objectFit:'cover',flexShrink:0}}/>
  return <div style={{width:size,height:size,borderRadius:'13px',flexShrink:0,background:GRADS[2],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:800,color:'#fff'}}>{letter}</div>
}

function fmtTime(ts){
  if (!ts) return 'Just now';
  const d=new Date(ts),now=new Date(),diff=Math.floor((now-d)/60000)
  if(isNaN(diff)) return 'Just now'
  if(diff<1) return 'Just now'; if(diff<60) return `${diff}m ago`
  const h=Math.floor(diff/60); if(h<24) return `${h}h ago`
  return d.toLocaleDateString()
}

function ActionButtons({ id, onAccept, onDecline, acting }) {
  const busy=!!acting[id]
  return (
    <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
      <motion.button onClick={()=>onAccept(id)} disabled={busy} whileTap={!busy?{scale:0.97}:{}}
        style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'10px',borderRadius:'12px',border:'none',background:acting[id]==='accepting'?'rgba(16,185,129,0.2)':'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',fontSize:'13px',fontWeight:600,cursor:busy?'not-allowed':'pointer',boxShadow:busy?'none':'0 4px 12px rgba(37,99,235,0.35)'}}>
        {acting[id]==='accepting'
          ? <svg style={{width:13,height:13,animation:'spin 1s linear infinite'}} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity:.25}}/><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          : <Check style={{width:13,height:13}}/>
        }
        Accept
      </motion.button>
      <motion.button onClick={()=>onDecline(id)} disabled={busy} whileTap={!busy?{scale:0.97}:{}}
        style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'10px',borderRadius:'12px',border:'1px solid rgba(239,68,68,0.3)',background:acting[id]==='declining'?'rgba(239,68,68,0.15)':'rgba(239,68,68,0.08)',color:'#f87171',fontSize:'13px',fontWeight:600,cursor:busy?'not-allowed':'pointer'}}>
        {acting[id]==='declining'
          ? <svg style={{width:13,height:13,animation:'spin 1s linear infinite'}} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity:.25}}/><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          : <X style={{width:13,height:13}}/>
        }
        Decline
      </motion.button>
    </div>
  )
}

function NotificationsInner({ profile }) {
  const [friendReqs, setFriendReqs] = useState([])
  const [groupReqs,  setGroupReqs ] = useState([])
  const [loading,    setLoading   ] = useState(true)
  const [acting,     setActing    ] = useState({})
  const [pastNotifs, setPastNotifs] = useState([])

  useEffect(() => { 
    if(profile?.id) { 
      fetchAll()
      return subscribeRT() 
    } 
  }, [profile?.id])

  async function fetchAll() {
    setLoading(true)
    try {
      await Promise.all([fetchFriendReqs(), fetchGroupReqs(), fetchPastNotifs()])
    } finally { setLoading(false) }
  }

  async function fetchPastNotifs() {
    try {
      const [ {data: frData}, {data: grData} ] = await Promise.all([
        supabase.from('friend_requests').select('id,sender_id,receiver_id,status,created_at,updated_at').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).order('updated_at',{ascending:false}).limit(15),
        supabase.from('group_requests').select('id,group_id,sender_id,receiver_id,request_type,status,created_at,updated_at').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).order('updated_at',{ascending:false}).limit(15)
      ])

      const past = []
      
      // Enrich FR
      if(frData && frData.length > 0) {
        const otherIds = frData.map(r => r.sender_id === profile.id ? r.receiver_id : r.sender_id)
        const { data: profiles } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id', otherIds)
        const pMap = {}
        ;(profiles||[]).forEach(p => pMap[p.id]=p)
        
        frData.forEach(r => {
          const otherId = r.sender_id === profile.id ? r.receiver_id : r.sender_id
          const other = pMap[otherId]
          if(other) {
            past.push({
              id: 'pfr-'+r.id,
              type: 'friend',
              timestamp: r.updated_at || r.created_at,
              message: r.sender_id === profile.id ? `${other.first_name} accepted your friend request.` : `You became friends with ${other.first_name}.`,
              iconData: other
            })
          }
        })
      }

      // Enrich GR
      if(grData && grData.length > 0) {
        const groupIds = [...new Set(grData.map(r=>r.group_id))]
        const { data: groups } = await supabase.from('groups').select('id,name,avatar_url').in('id', groupIds)
        const gMap = {}
        ;(groups||[]).forEach(g => gMap[g.id]=g)

        grData.forEach(r => {
          const g = gMap[r.group_id]
          if(g) {
            past.push({
              id: 'pgr-'+r.id,
              type: 'group',
              timestamp: r.updated_at || r.created_at,
              message: r.request_type === 'join_request' && r.sender_id === profile.id ? `Your request to join ${g.name} was accepted.` : `You joined ${g.name}.`,
              iconData: g
            })
          }
        })
      }

      past.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
      setPastNotifs(past.slice(0, 20))
    } catch(e) {
      console.error('[Notif] fetchPast:', e)
    }
  }

  async function fetchFriendReqs() {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`id,sender_id,created_at`)
      .eq('receiver_id', profile.id)
      .eq('status','pending')
      .order('created_at',{ascending:false})
    
    if(error){ console.error('[Notif] friendReqs:',error); return }
    if(!data?.length){ setFriendReqs([]); return }

    const senderIds=[...new Set(data.map(r=>r.sender_id))]
    const { data:senders } = await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id',senderIds)
    
    const sMap={}
    ;(senders||[]).forEach(s=>{sMap[s.id]=s})
    
    const enriched=data.map(r=>({...r,sender:sMap[r.sender_id]||null}))
    setFriendReqs(enriched)
  }

  async function fetchGroupReqs() {
    // Fetch pending group_requests where receiver is current user
    const { data, error } = await supabase
      .from('group_requests')
      .select(`id,group_id,sender_id,request_type,created_at`)
      .eq('receiver_id', profile.id)
      .eq('status','pending')
      .order('created_at',{ascending:false})
    if(error){ console.error('[Notif] groupReqs:',error); return }
    if(!data?.length){ setGroupReqs([]); return }

    // Enrich: fetch group info + sender profile
    const groupIds=[...new Set(data.map(r=>r.group_id))]
    const senderIds=[...new Set(data.map(r=>r.sender_id))]
    const [{ data:groups }, { data:senders }] = await Promise.all([
      supabase.from('groups').select('id,name,avatar_url,admin_id').in('id',groupIds),
      supabase.from('profiles').select('id,first_name,last_name,username,avatar_url').in('id',senderIds),
    ])
    const gMap={},sMap={}
    ;(groups||[]).forEach(g=>{gMap[g.id]=g})
    ;(senders||[]).forEach(s=>{sMap[s.id]=s})

    const enriched=data.map(r=>({...r,group:gMap[r.group_id]||null,sender:sMap[r.sender_id]||null}))
    setGroupReqs(enriched)
  }

  function subscribeRT() {
    // Friend requests
    const ch1=supabase.channel(`notif-fr-${profile.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'friend_requests',filter:`receiver_id=eq.${profile.id}`},
        ()=>fetchFriendReqs())
      .subscribe()
    // Group requests
    const ch2=supabase.channel(`notif-gr-${profile.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_requests',filter:`receiver_id=eq.${profile.id}`},
        ()=>fetchGroupReqs())
      .subscribe()
    return ()=>{ supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }

  /* ── Accept/Decline friend request ── */
  const handleFriendAction = async (reqId, action) => {
    setActing(p=>({...p,[reqId]:action==='accepted'?'accepting':'declining'}))
    try {
      const {error}=await supabase.from('friend_requests').update({status:action}).eq('id',reqId)
      if(error) throw error
      setFriendReqs(p=>p.filter(r=>r.id!==reqId))
    } catch(e){ console.error('[Notif] friendAction:',e) }
    finally{ setActing(p=>{const n={...p};delete n[reqId];return n}) }
  }

  /* ── Accept/Decline group request ── */
  const handleGroupAction = async (req, action) => {
    setActing(p=>({...p,[req.id]:action==='accepted'?'accepting':'declining'}))
    try {
      const {error:updErr}=await supabase.from('group_requests').update({status:action}).eq('id',req.id)
      if(updErr) throw updErr
      if(action==='accepted') {
        // Add user to group_members (the joining user = sender for join_request, receiver for invite)
        const userId = req.request_type==='join_request' ? req.sender_id : profile.id
        await supabase.from('group_members').upsert({group_id:req.group_id, user_id:userId},{onConflict:'group_id,user_id'})
      }
      setGroupReqs(p=>p.filter(r=>r.id!==req.id))
    } catch(e){ console.error('[Notif] groupAction:',e) }
    finally{ setActing(p=>{const n={...p};delete n[req.id];return n}) }
  }

  const total=friendReqs.length+groupReqs.length

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'20px 20px 14px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'3px'}}>
          <div style={{width:36,height:36,borderRadius:'11px',background:'rgba(37,99,235,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Bell style={{width:17,height:17,color:'#60a5fa'}}/>
          </div>
          <h2 style={{fontSize:'20px',fontWeight:700,color:'#f0f4ff'}}>Notifications</h2>
        </div>
        <p style={{fontSize:'12px',color:'#64748b',paddingLeft:'46px'}}>{loading?'Loading…':`${total} pending notification${total!==1?'s':''}`}</p>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',padding:'0 12px 16px'}}>
        {loading && [1,2].map(i=><div key={i} className="skeleton" style={{height:'100px',marginBottom:'8px',borderRadius:'20px'}}/>)}

        {!loading && total===0 && pastNotifs.length===0 && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
            style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:'80px',gap:'14px',textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:'22px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Inbox style={{width:30,height:30,color:'#334155'}}/>
            </div>
            <p style={{fontSize:'16px',fontWeight:600,color:'#475569'}}>All caught up!</p>
            <p style={{fontSize:'13px',color:'#334155',lineHeight:1.5}}>No notifications yet.</p>
          </motion.div>
        )}

        {!loading && total > 0 && <h3 style={{fontSize:'13px',fontWeight:700,color:'#60a5fa',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.05em',paddingLeft:'4px'}}>New</h3>}

        <AnimatePresence mode="popLayout">
          {/* ── Friend Requests ── */}
          {friendReqs.map((req,i)=>(
            <motion.div key={`fr-${req.id}`} layout initial={{opacity:0,y:14,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,x:40,scale:0.95}}
              transition={{delay:i*0.04,duration:0.28}} style={{padding:'16px',marginBottom:'8px',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <Avatar p={req.sender} i={i}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
                    <UserPlus style={{width:11,height:11,color:'#60a5fa'}}/>
                    <span style={{fontSize:'9px',fontWeight:700,color:'#60a5fa',textTransform:'uppercase',letterSpacing:'0.07em'}}>Friend Request</span>
                  </div>
                  <p style={{fontSize:'14px',fontWeight:600,color:'#f0f4ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{req.sender?.first_name||'Someone'} wants to be your friend.</p>
                  <p style={{fontSize:'11px',color:'#64748b',marginTop:2}}>@{req.sender?.username||'—'} · {fmtTime(req.created_at)}</p>
                </div>
              </div>
              <ActionButtons id={req.id} onAccept={id=>handleFriendAction(id,'accepted')} onDecline={id=>handleFriendAction(id,'declined')} acting={acting}/>
            </motion.div>
          ))}

          {/* ── Group Requests ── */}
          {groupReqs.map((req,i)=>{
            const isJoinReq=req.request_type==='join_request'
            // join_request: admin receives → "[User] wants to join [Group]"
            // invite: user receives → "[Admin] invited you to join [Group]"
            const message = isJoinReq
              ? `${req.sender?.first_name||'Someone'} wants to join ${req.group?.name||'your group'}.`
              : `${req.sender?.first_name||'Someone'} invited you to join ${req.group?.name||'a group'}.`
            return (
              <motion.div key={`gr-${req.id}`} layout initial={{opacity:0,y:14,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,x:40,scale:0.95}}
                transition={{delay:(friendReqs.length+i)*0.04,duration:0.28}} style={{padding:'16px',marginBottom:'8px',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <GroupIcon g={req.group}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
                      <Users style={{width:11,height:11,color:'#a78bfa'}}/>
                      <span style={{fontSize:'9px',fontWeight:700,color:'#a78bfa',textTransform:'uppercase',letterSpacing:'0.07em'}}>{isJoinReq?'Join Request':'Group Invite'}</span>
                    </div>
                    <p style={{fontSize:'14px',fontWeight:600,color:'#f0f4ff',lineHeight:1.45,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{message}</p>
                    <p style={{fontSize:'11px',color:'#64748b',marginTop:2}}>{fmtTime(req.created_at)}</p>
                  </div>
                </div>
                <ActionButtons id={req.id} onAccept={id=>handleGroupAction(req,'accepted')} onDecline={id=>handleGroupAction(req,'declined')} acting={acting}/>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {!loading && pastNotifs.length > 0 && (
          <div style={{marginTop:'24px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:'#475569',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.05em',paddingLeft:'4px'}}>Earlier</h3>
            {pastNotifs.map((n, i) => (
              <div key={n.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',marginBottom:'8px',borderRadius:'16px',background:'rgba(255,255,255,0.01)',border:'1px solid rgba(255,255,255,0.03)',opacity:0.7}}>
                {n.type === 'friend' ? <Avatar p={n.iconData} i={i} size={36}/> : <GroupIcon g={n.iconData} size={36}/>}
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'13px',color:'#cbd5e1',lineHeight:1.4}}>{n.message}</p>
                  <p style={{fontSize:'11px',color:'#64748b',marginTop:2}}>{fmtTime(n.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function NotificationsView(props) {
  return (
    <ErrorBoundary>
      <NotificationsInner {...props} />
    </ErrorBoundary>
  )
}
