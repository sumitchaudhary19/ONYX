import{useEffect,useState,useRef,useCallback}from'react'
import{motion,AnimatePresence}from'framer-motion'
import{MessageCircle,Users,Eye,EyeOff,Trash2,X,Search,Clock}from'lucide-react'
import{sanitizeSearchQuery}from'../utils/sanitize'
import NotesTray from'../components/NotesTray'

/* ── Chat Search Modal ── */
function ChatSearchModal({ profile, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState([])
  const [results, setResults] = useState({ messages: [], groups: [], users: [] })
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    loadRecent()
  }, [])

  async function loadRecent() {
    const { data } = await supabase.from('recent_searches').select('*').eq('user_id', profile.id).eq('search_type', 'chat').order('searched_at', { ascending: false }).limit(6)
    if(data) setRecent(data)
  }

  const handleSearch = (e) => {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults({ messages: [], groups: [], users: [] }); return }
    debounceRef.current = setTimeout(() => {
      runSearch(q.trim())
      saveRecent(q.trim())
    }, 400)
  }

  async function saveRecent(q) {
    const { data } = await supabase.from('recent_searches').select('*').eq('user_id', profile.id).eq('search_type', 'chat').eq('query', q).single()
    if(data) await supabase.from('recent_searches').update({ searched_at: new Date().toISOString() }).eq('id', data.id)
    else await supabase.from('recent_searches').insert({ user_id: profile.id, search_type: 'chat', query: q })
    loadRecent()
  }

  async function runSearch(q) {
    setLoading(true)
    const safe = sanitizeSearchQuery(q)
    if (!safe) { setLoading(false); return }
    try {
      // Search Users
      const { data: users } = await supabase.from('profiles').select('id, first_name, last_name, username, avatar_url').neq('id', profile.id).or(`username.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`).limit(5)
      
      // Search Groups
      const { data: groups } = await supabase.from('groups').select('id, name, avatar_url').ilike('name', `%${safe}%`).limit(5)
      
      // Search Messages
      const { data: messages } = await supabase.from('messages').select('id, sender_id, receiver_id, content, created_at, group_id, profiles:sender_id(id, first_name, last_name)').ilike('content', `%${safe}%`).or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).limit(10)
      
      setResults({ users: users || [], groups: groups || [], messages: messages || [] })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const Highlight = ({ text, highlight }) => {
    if (!highlight.trim()) return <span>{text}</span>
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
    return <span>{parts.map((p, i) => p.toLowerCase() === highlight.toLowerCase() ? <strong key={i} style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.1)' }}>{p}</strong> : p)}</span>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: 'absolute', inset: 0, zIndex: 100, background: '#060b18', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '10px', padding: '8px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
            <Search style={{ width: 16, height: 16 }} />
          </div>
          <input autoFocus type="text" value={query} onChange={handleSearch} placeholder="Search messages, users, or groups..."
            style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '14px', color: '#fff', fontSize: '15px', outline: 'none', boxShadow: '0 0 16px rgba(56,189,248,0.15)' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {!query && recent.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Recent Searches</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {recent.map(r => (
                <button key={r.id} onClick={() => { setQuery(r.query); runSearch(r.query) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px 12px', color: '#cbd5e1', fontSize: '13px', cursor: 'pointer' }}>
                  <Clock style={{ width: 12, height: 12 }} /> {r.query}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <p style={{ color: '#64748b', textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>Searching...</p>}
        
        {!loading && query && results.users.length === 0 && results.groups.length === 0 && results.messages.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>No results found for "{query}"</p>
        )}

        {!loading && query && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {results.users.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '8px' }}>People</h3>
                {results.users.map(u => (
                  <div key={u.id} onClick={() => navigate(`/chat/room/${u.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', marginBottom: '4px' }}>
                    {u.avatar_url ? <img src={u.avatar_url} style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover' }} /> : <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>{u.first_name?.[0]}</div>}
                    <div>
                      <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}><Highlight text={[u.first_name, u.last_name].join(' ')} highlight={query} /></p>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.groups.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '8px' }}>Groups</h3>
                {results.groups.map(g => (
                  <div key={g.id} onClick={() => navigate(`/group/${g.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', marginBottom: '4px' }}>
                    {g.avatar_url ? <img src={g.avatar_url} style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover' }} /> : <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>{g.name?.[0]}</div>}
                    <p style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}><Highlight text={g.name} highlight={query} /></p>
                  </div>
                ))}
              </div>
            )}

            {results.messages.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '8px' }}>Messages</h3>
                {results.messages.map(m => {
                  const targetId = m.group_id ? `/group/${m.group_id}` : `/chat/room/${m.sender_id === profile.id ? m.receiver_id : m.sender_id}`;
                  return (
                    <div key={m.id} onClick={() => navigate(targetId)} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', marginBottom: '6px' }}>
                      <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                        {m.profiles?.first_name} • {new Date(m.created_at).toLocaleDateString()}
                      </p>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.4 }}>
                        <Highlight text={m.content} highlight={query} />
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
import{useNavigate}from'react-router-dom'
import{supabase}from'../supabaseClient'
import GroupsList from './GroupsList'

const GRADIENTS=['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#10b981,#14b8a6)','linear-gradient(135deg,#f59e0b,#f97316)','linear-gradient(135deg,#ef4444,#f43f5e)','linear-gradient(135deg,#a855f7,#7c3aed)']

/* ── Unread badge label logic ── */
function unreadLabel(n){
  if(n<=0)return null
  if(n===1)return'1 new message'
  if(n<=3)return`${n} new messages`
  return'4+ new messages'
}

/* ── Avatar with online dot ── */
function FriendAvatar({friend,index,size=48,isOnline=false}){
  const initials=[friend?.first_name,friend?.last_name].filter(Boolean).map(s=>s?.[0]?.toUpperCase()).join('')||'?'
  return(
    <div style={{position:'relative',flexShrink:0}}>
      {friend?.avatar_url
        ?<img src={friend.avatar_url} alt={friend.username} style={{width:size,height:size,borderRadius:'14px',objectFit:'cover'}}/>
        :<div style={{width:size,height:size,borderRadius:'14px',background:GRADIENTS[index%GRADIENTS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:700,color:'#fff',boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>{initials}</div>
      }
      {isOnline&&(
        <div style={{position:'absolute',bottom:2,right:2,width:11,height:11,borderRadius:'50%',background:'#22c55e',border:'2px solid #060b18',boxShadow:'0 0 8px rgba(34,197,94,0.7)'}}/>
      )}
    </div>
  )
}

/* ── Chat context menu ── */
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

/* ── Hidden Chats View ── */
function HiddenChatsView({profile,onClose}){
  const[hidden,setHidden]=useState([])
  const[loading,setLoading]=useState(true)
  const[longPressed,setLongPressed]=useState(null)
  const navigate=useNavigate()
  const timerRef=useRef(null)

  useEffect(()=>{fetchHidden()},[profile.id])

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
          const f=row?.profiles
          if(!f)return null
          const name=[f?.first_name,f?.last_name].filter(Boolean).join(' ')||'Unknown'
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
              <div style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 10px',borderRadius:'10px',background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.25)'}}>
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
  const[viewMode,setViewMode]=useState('dms')
  const[friends,setFriends]=useState([])
  const[loading,setLoading]=useState(true)
  const[hiddenIds,setHiddenIds]=useState(new Set())
  const[longPressed,setLongPressed]=useState(null)
  const[showHidden,setShowHidden]=useState(false)
  const[showSearch,setShowSearch]=useState(false)
  const[onlineUsers,setOnlineUsers]=useState(new Set())
  const[unreadCounts,setUnreadCounts]=useState({})
  const[lastMessages,setLastMessages]=useState({})
  const[typingFriends,setTypingFriends]=useState(new Set())
  const[hasMore,setHasMore]=useState(true)
  const[loadingMore,setLoadingMore]=useState(false)
  const navigate=useNavigate()
  const timerRef=useRef(null)
  const presenceChRef=useRef(null)
  const typingTimersRef=useRef({})

  useEffect(()=>{
    if(!profile?.id)return
    fetchFriends()
    fetchHiddenIds()

    // Remove any stale presence channel before creating a new one
    if(presenceChRef.current){
      supabase.removeChannel(presenceChRef.current)
      presenceChRef.current=null
    }

    // Setup presence with unique channel name
    const presenceName=`chats-presence-${profile.id}-${Date.now()}`
    const presenceCh=supabase.channel(presenceName)
    presenceCh.on('presence',{event:'sync'},()=>{
      const state=presenceCh.presenceState()
      const ids=new Set(Object.values(state).flatMap(arr=>arr.map(u=>u.user_id)))
      setOnlineUsers(ids)
    }).subscribe(async(status)=>{
      if(status==='SUBSCRIBED'){
        await presenceCh.track({user_id:profile.id,online_at:new Date().toISOString()})
      }
    })
    presenceChRef.current=presenceCh

    const ch=supabase.channel(`friends-list-${profile.id}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'friend_requests'},
        (payload)=>{ if(payload.new?.status==='accepted')fetchFriends() })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'friend_requests'},
        ()=>fetchFriends())
      .subscribe()
    // Live unread counter: listen for new messages TO me
    const unreadCh=supabase.channel(`unread-watcher-${profile.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`receiver_id=eq.${profile.id}`},
        (p)=>{ if(!p.new.read_at){ setUnreadCounts(prev=>({...prev,[p.new.sender_id]:(prev[p.new.sender_id]||0)+1})); setLastMessages(prev=>({...prev,[p.new.sender_id]:p.new})) } })
      .subscribe()
    return()=>{
      supabase.removeChannel(ch)
      supabase.removeChannel(unreadCh)
      if(presenceChRef.current){ supabase.removeChannel(presenceChRef.current); presenceChRef.current=null }
    }
  },[profile?.id])

  // Stable dependency: only re-run when the actual friend IDs change, not on every render
  const friendIdStr = friends.map(f => f.id).sort().join(',')

  // When friends load, fetch unread counts + last messages
  useEffect(()=>{
    if(!friendIdStr||!profile?.id)return
    fetchUnreadAndLastMessages()
    setupTypingListeners()
    return()=>cleanupTypingListeners()
  },[friendIdStr,profile?.id])

  async function fetchUnreadAndLastMessages(){
    try{
      const friendIds=friends.map(f=>f.id)
      // Unread: messages sent TO me, from each friend, with read_at null
      const{data:unread}=await supabase.from('messages')
        .select('sender_id,id')
        .eq('receiver_id',profile.id)
        .is('read_at',null)
        .in('sender_id',friendIds)
      const counts={}
      ;(unread||[]).forEach(m=>{ counts[m.sender_id]=(counts[m.sender_id]||0)+1 })
      setUnreadCounts(counts)

      // Last message per friend (most recent message in either direction)
      const{data:msgs}=await supabase.from('messages')
        .select('id,sender_id,receiver_id,content,image_url,audio_url,video_url,created_at')
        .or(friendIds.map(id=>`and(sender_id.eq.${profile.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${profile.id})`).join(','))
        .order('created_at',{ascending:false})
      // Take the most recent per friend
      const lastMap={}
      ;(msgs||[]).forEach(m=>{
        const fid=m.sender_id===profile.id?m.receiver_id:m.sender_id
        if(!lastMap[fid])lastMap[fid]=m
      })
      setLastMessages(lastMap)
    }catch(err){console.error('[Chats] fetchUnread:',err)}
  }

  function setupTypingListeners(){
    friends.forEach(f=>{
      const key=[profile.id,f.id].sort().join('-')
      const ch=supabase.channel(`presence-${key}`)
        .on('broadcast',{event:'typing'},(payload)=>{
          const{userId,typing}=payload.payload||{}
          if(userId===f.id){
            if(typing){
              setTypingFriends(prev=>new Set([...prev,f.id]))
              clearTimeout(typingTimersRef.current[f.id])
              typingTimersRef.current[f.id]=setTimeout(()=>setTypingFriends(prev=>{ const n=new Set(prev); n.delete(f.id); return n }),3500)
            }else{
              setTypingFriends(prev=>{ const n=new Set(prev); n.delete(f.id); return n })
            }
          }
        }).subscribe()
      typingTimersRef.current[`ch_${f.id}`]=ch
    })
  }

  function cleanupTypingListeners(){
    friends.forEach(f=>{
      const ch=typingTimersRef.current[`ch_${f.id}`]
      if(ch)supabase.removeChannel(ch)
    })
  }

  function getLastMsgPreview(msg,myId){
    if(!msg)return null
    const isMe=msg.sender_id===myId
    const prefix=isMe?'You: ':''
    if(msg.audio_url)return `${prefix}🎤 Voice message`
    if(msg.video_url)return `${prefix}🎥 Video`
    if(msg.image_url&&!msg.content)return `${prefix}📷 Photo`
    if(msg.content)return `${prefix}${msg.content}`
    return null
  }

  async function fetchHiddenIds(){
    const{data}=await supabase.from('hidden_chats').select('friend_id').eq('user_id',profile.id).not('friend_id','is',null)
    setHiddenIds(new Set((data||[]).map(r=>r.friend_id)))
  }

  async function fetchFriends(){
    setLoading(true)
    try{
      const{data:requests,error:reqErr}=await supabase.from('friend_requests').select('id,sender_id,receiver_id').eq('status','accepted').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`).order('created_at',{ascending:false}).limit(20)
      if(reqErr)throw reqErr
      if(!requests?.length){setFriends([]);setHasMore(false);setLoading(false);return}
      if(requests.length<20)setHasMore(false)
      const friendIds=[...new Set(requests.map(r=>r.sender_id===profile.id?r.receiver_id:r.sender_id))]
      const{data:profilesList,error:profErr}=await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url,bio').in('id',friendIds)
      if(profErr)throw profErr
      
      // Preserve the order of friend_requests (most recently updated first)
      const profMap={}
      ;(profilesList||[]).forEach(p=>{profMap[p.id]=p})
      const sortedProfiles=friendIds.map(id=>profMap[id]).filter(Boolean)
      
      setFriends(sortedProfiles)
    }catch(err){console.error('[Chats] fetchFriends:',err)}
    finally{setLoading(false)}
  }

  const loadMoreFriends=async()=>{
    if(loadingMore||!hasMore)return
    setLoadingMore(true)
    try{
      const{data:requests,error:reqErr}=await supabase.from('friend_requests')
        .select('id,sender_id,receiver_id')
        .eq('status','accepted')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at',{ascending:false})
        .range(friends.length,friends.length+19)
      
      if(reqErr)throw reqErr
      if(!requests?.length){setHasMore(false);setLoadingMore(false);return}
      if(requests.length<20)setHasMore(false)
      
      const friendIds=[...new Set(requests.map(r=>r.sender_id===profile.id?r.receiver_id:r.sender_id))]
      // Filter out ids we already have
      const newIds=friendIds.filter(id=>!friends.find(f=>f.id===id))
      
      if(newIds.length>0){
        const{data:profilesList,error:profErr}=await supabase.from('profiles').select('id,first_name,last_name,username,avatar_url,bio').in('id',newIds)
        if(profErr)throw profErr
        
        const profMap={}
        ;(profilesList||[]).forEach(p=>{profMap[p.id]=p})
        const newProfiles=newIds.map(id=>profMap[id]).filter(Boolean)
        
        setFriends(prev=>[...prev,...newProfiles])
      }
    }catch(err){console.error('[Chats] loadMoreFriends:',err)}
    finally{setLoadingMore(false)}
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

  const visibleFriends = friends
    .filter(f => !hiddenIds.has(f.id))
    .sort((a, b) => {
      const aMsg = lastMessages[a.id]
      const bMsg = lastMessages[b.id]
      const aTime = aMsg?.created_at ? new Date(aMsg.created_at).getTime() : 0
      const bTime = bMsg?.created_at ? new Date(bMsg.created_at).getTime() : 0
      return bTime - aTime // Most recent first
    })

  // Safety guard — must come after ALL hooks to satisfy React's rules of hooks
  if (!profile) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',background:'#060b18',gap:'12px'}}>
      <svg style={{width:32,height:32,color:'#3b82f6',animation:'spin 1s linear infinite'}} fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity:0.25}} />
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p style={{color:'#475569',fontSize:'14px'}}>Loading chats…</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',position:'relative'}}>
      <div style={{padding:'20px 20px 12px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
          <h2 style={{fontSize:'20px',fontWeight:700,color:'#fff'}}>Messages</h2>
          <motion.button whileTap={{scale:0.88}} onClick={()=>setShowHidden(true)}
            title="Hidden Chats"
            style={{width:36,height:36,borderRadius:'11px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b'}}>
            <EyeOff style={{width:16,height:16}}/>
          </motion.button>
        </div>

        {/* ── Notes Tray ── */}
        <NotesTray profile={profile} friends={friends} />

        {/* ── Chat Search Bar ── */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
            <Search style={{ width: 15, height: 15 }} />
          </div>
          <input type="text" placeholder="Search chats, groups, messages..." onClick={() => setShowSearch(true)} readOnly
            style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
        </div>

        {/* Segmented Control */}
        <div style={{display:'flex',background:'rgba(255,255,255,0.05)',borderRadius:'12px',padding:'4px'}}>
          <button onClick={()=>setViewMode('dms')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',background:viewMode==='dms'?'rgba(255,255,255,0.12)':'transparent',color:viewMode==='dms'?'#fff':'#94a3b8',fontSize:'13px',fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>Direct Messages</button>
          <button onClick={()=>setViewMode('groups')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',background:viewMode==='groups'?'rgba(255,255,255,0.12)':'transparent',color:viewMode==='groups'?'#fff':'#94a3b8',fontSize:'13px',fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>Groups</button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 10px 16px',position:'relative'}}>
        {viewMode==='groups'?(
          <GroupsList profile={profile}/>
        ):(
          <>
            {loading&&(
              <div style={{display:'flex',flexDirection:'column',gap:'6px',padding:'4px'}}>
                {[1,2,3].map(i=><div key={i} style={{height:'80px',borderRadius:'18px',background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s ease-in-out infinite'}}/>)}
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
                const fullName=[friend?.first_name,friend?.last_name].filter(Boolean).join(' ')||'Unknown'
                const isOnline=onlineUsers.has(friend.id)
                const unread=unreadCounts[friend.id]||0
                const badge=unreadLabel(unread)
                const isTyping=typingFriends.has(friend.id)
                const lastMsg=lastMessages[friend.id]
                const preview=getLastMsgPreview(lastMsg,profile.id)

                return(
                  <motion.div key={friend?.id} layout
                    initial={{opacity:0,y:18,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
                    exit={{opacity:0,x:-20,scale:0.94}}
                    transition={{delay:Math.min(i*0.06,0.35),duration:0.35,ease:[0.16,1,0.3,1]}}
                    whileHover={{y:-2,backgroundColor:'rgba(255,255,255,0.058)',boxShadow:'0 8px 24px rgba(0,0,0,0.25)'}}
                    whileTap={{scale:0.98}}
                    onClick={async()=>{ setUnreadCounts(prev=>({...prev,[friend.id]:0})); navigate(`/chat/room/${friend.id}`); await supabase.from('messages').update({read_at:new Date().toISOString()}).eq('receiver_id',profile.id).eq('sender_id',friend.id).is('read_at',null) }}
                    onTouchStart={()=>startPress(friend)} onTouchEnd={endPress} onTouchMove={endPress}
                    onMouseDown={()=>startPress(friend)} onMouseUp={endPress} onMouseLeave={endPress}
                    style={{display:'flex',alignItems:'center',gap:'14px',padding:'13px 14px',marginBottom:'5px',borderRadius:'20px',border:`1px solid ${unread>0?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.07)'}`,background:unread>0?'rgba(59,130,246,0.08)':'rgba(255,255,255,0.03)',cursor:'pointer',transition:'background 0.2s,box-shadow 0.2s'}}>
                    <FriendAvatar friend={friend} index={i} size={48} isOnline={isOnline}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:'15px',fontWeight:unread>0?700:600,color:'#f1f5f9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fullName}</p>
                      <AnimatePresence mode="wait">
                        {isTyping?(
                          <motion.p key="typing" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                            style={{fontSize:'12px',color:'#3b82f6',marginTop:'2px',fontWeight:600}}>
                            ✦ Typing…
                          </motion.p>
                        ):preview?(
                          <motion.p key="preview" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                            style={{fontSize:'12px',color:'#64748b',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'180px'}}>
                            {preview}
                          </motion.p>
                        ):(
                          <motion.p key="handle" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                            style={{fontSize:'12px',color:'#64748b',marginTop:'2px'}}>
                            @{friend.username||'—'}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    {badge?(
                      <motion.div initial={{scale:0.5,opacity:0}} animate={{scale:1,opacity:1}}
                        style={{flexShrink:0,padding:'5px 10px',borderRadius:'999px',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',boxShadow:'0 0 14px rgba(37,99,235,0.55), 0 0 28px rgba(37,99,235,0.3)',fontSize:'11px',fontWeight:700,color:'#fff',whiteSpace:'nowrap',textAlign:'center',animation:'unreadGlow 2s ease-in-out infinite'}}>
                        {badge}
                      </motion.div>
                    ):(
                      <motion.div whileHover={{scale:1.1}} style={{flexShrink:0,width:36,height:36,borderRadius:'11px',background:'rgba(37,99,235,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <MessageCircle style={{width:16,height:16,color:'#60a5fa'}}/>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {!loading&&hasMore&&visibleFriends.length>0&&(
              <motion.button onClick={loadMoreFriends} disabled={loadingMore} whileTap={{scale:0.97}}
                style={{width:'100%',padding:'12px',marginTop:'8px',borderRadius:'20px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#94a3b8',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                {loadingMore?'Loading…':'Load More'}
              </motion.button>
            )}
          </>
        )}
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
        {showSearch&&<ChatSearchModal profile={profile} onClose={()=>setShowSearch(false)}/>}
      </AnimatePresence>

      <style>{`@keyframes pulse{0%,100%{opacity:.45}50%{opacity:.2}} @keyframes unreadGlow{0%,100%{box-shadow:0 0 14px rgba(37,99,235,0.55),0 0 28px rgba(37,99,235,0.3)}50%{box-shadow:0 0 20px rgba(37,99,235,0.8),0 0 40px rgba(37,99,235,0.5)}}`}</style>
    </div>
  )
}
