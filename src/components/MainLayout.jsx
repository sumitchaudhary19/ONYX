import { useEffect, useState, Component } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Search, Bell, User,
  Users, Settings, ImagePlus, Aperture, Sparkles
} from 'lucide-react'
import Chats from '../views/Chats'
import SearchView from '../views/Search'
import Profile from '../views/Profile'
import NotificationsView from '../views/Notifications'
import SettingsView from '../views/SettingsView'
import HomeFeed from '../views/HomeFeed'
import SnapCamera from '../views/SnapCamera'
import ActionHubFAB from './ActionHubFAB'
import CreatePostModal from './CreatePostModal'
import CreateGroupModal from './CreateGroupModal'
import StoryEditor from '../views/StoryEditor'
import { supabase } from '../supabaseClient'

/* ── Per-view Error Boundary ── */
class ViewErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[ViewError]', error, info) }
  componentDidUpdate(prevProps) {
    // Reset error when view changes
    if (prevProps.viewId !== this.props.viewId && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px', gap: '12px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>This section crashed</p>
          <pre style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '10px', maxWidth: '90vw', maxHeight: '100px', overflow: 'auto', textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', border: '1px solid rgba(239,68,68,0.2)' }}>{this.state.error?.message || this.state.error?.toString()}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ marginTop: '4px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
        </div>
      )
    }
    return this.props.children
  }
}

function ViewContent({ id, profile, session }) {
  if (id === 'home')          return <HomeFeed          profile={profile} session={session}/>
  if (id === 'chats')         return <Chats             profile={profile} session={session}/>
  if (id === 'search')        return <SearchView        profile={profile} session={session}/>
  if (id === 'notifications') return <NotificationsView profile={profile} session={session}/>
  if (id === 'profile')       return <Profile           profile={profile} session={session}/>
  if (id === 'settings')      return <SettingsView      profile={profile} session={session}/>
  return null
}

function ViewComponent({ id, profile, session }) {
  return (
    <ViewErrorBoundary viewId={id}>
      <ViewContent id={id} profile={profile} session={session} />
    </ViewErrorBoundary>
  )
}

const TABS = [
  { id: 'home',          label: 'Home',    Icon: Sparkles,     glow: 'blue' },
  { id: 'chats',         label: 'Chats',   Icon: MessageCircle },
  { id: 'notifications', label: 'Alerts',  Icon: Bell          },
  { id: 'profile',       label: 'Profile', Icon: User          },
]

const PAGE_VARIANTS = {
  enter:  { opacity: 0, x: 16 },
  center: { opacity: 1, x: 0,  transition: { duration: 0.22, ease: 'easeOut' } },
  exit:   { opacity: 0, x: -8, transition: { duration: 0.14 } },
}

const GLOW_STYLES = {
  blue: {
    active:   'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.9)]',
    inactive: 'text-blue-400/60 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]',
    bg:       'bg-blue-500/20 shadow-[0_0_16px_rgba(96,165,250,0.4)]',
    badge:    'bg-blue-500',
  },
  violet: {
    active:   'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.9)]',
    inactive: 'text-violet-400/60 drop-shadow-[0_0_5px_rgba(167,139,250,0.5)]',
    bg:       'bg-violet-500/20 shadow-[0_0_16px_rgba(167,139,250,0.4)]',
    badge:    'bg-violet-500',
  },
  yellow: {
    active:   'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.9)]',
    inactive: 'text-yellow-300/60 drop-shadow-[0_0_5px_rgba(253,224,71,0.5)]',
    bg:       'bg-yellow-500/20 shadow-[0_0_16px_rgba(253,224,71,0.4)]',
    badge:    'bg-yellow-400',
  },
}

export default function MainLayout({ profile, session }) {
  const [activeTab,    setActiveTab   ] = useState('home')
  const [pendingCount, setPendingCount] = useState(0)
  const [showSnap,     setShowSnap    ] = useState(false)
  const [showPost,     setShowPost    ] = useState(false)
  const [showGroup,    setShowGroup   ] = useState(false)
  const [storyFile,    setStoryFile   ] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    fetchPendingCount()
    const ch1 = supabase.channel(`pending-badge-fr-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${profile.id}` }, fetchPendingCount)
      .subscribe()
    const ch2 = supabase.channel(`pending-badge-gr-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_requests', filter: `receiver_id=eq.${profile.id}` }, fetchPendingCount)
      .subscribe()

    // Global presence: broadcast that this user is online
    const presenceCh = supabase.channel('global-presence')
    presenceCh.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceCh.track({ user_id: profile.id, online_at: new Date().toISOString() })
      }
    })

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(presenceCh) }
  }, [profile?.id])

  async function fetchPendingCount() {
    try {
      const [ { count: frCount }, { count: grCount } ] = await Promise.all([
        supabase.from('friend_requests').select('id', { count: 'exact', head: true }).eq('receiver_id', profile.id).eq('status', 'pending'),
        supabase.from('group_requests').select('id', { count: 'exact', head: true }).eq('receiver_id', profile.id).eq('status', 'pending')
      ])
      setPendingCount((frCount ?? 0) + (grCount ?? 0))
    } catch (err) {
      console.error('[MainLayout] pendingCount:', err)
    }
  }

  const handleTabChange = (id) => {
    if (id === 'snap') { setShowSnap(true); return }
    setActiveTab(id)
    if (id === 'notifications') setPendingCount(0)
  }

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || 'M'

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#060b18] overflow-hidden">
      
      {/* ═══ NAVIGATION ═══ */}
      <aside className="order-last md:order-first w-full h-[68px] md:w-[72px] md:h-full flex-shrink-0 flex md:flex-col items-center justify-around md:justify-start px-1 md:px-2 py-2 md:py-5 bg-[#060b18]/95 border-t md:border-t-0 md:border-r border-white/5 md:gap-3 backdrop-blur-xl z-50">
        
        {/* Brand icon - desktop only */}
        <div className="hidden md:flex mb-4">
          <img src="/onyx_logo.jpg" alt="Onyx Logo" className="w-[42px] h-[42px] rounded-full object-cover drop-shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
        </div>

        {/* Nav items */}
        {TABS.map(({ id, label, Icon, glow }) => {
          const isActive  = activeTab === id
          const showBadge = id === 'notifications' && pendingCount > 0 && !isActive
          const glowStyle = glow ? GLOW_STYLES[glow] : null

          return (
            <motion.button
              key={id}
              onClick={() => handleTabChange(id)}
              whileTap={{ scale: 0.85 }}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all duration-200 min-w-[44px] md:w-[54px]
                ${glowStyle ? 'animate-pulse' : ''}
                ${isActive && !glowStyle ? 'bg-white/10 text-white' : ''}
                ${isActive && glowStyle ? glowStyle.bg : ''}
                ${!isActive && !glowStyle ? 'text-slate-500 hover:text-slate-300' : ''}
              `}
              title={label}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 md:w-[22px] md:h-[22px] transition-all duration-200
                    ${glowStyle
                      ? (isActive ? glowStyle.active : glowStyle.inactive)
                      : (isActive ? 'text-white' : 'text-slate-500')}
                  `}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <AnimatePresence>
                  {showBadge && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 border-2 border-[#060b18] flex items-center justify-center text-[9px] font-bold text-white px-1"
                    >
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Glow halo on active glowing tabs */}
                {glowStyle && (
                  <motion.div
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className={`absolute inset-[-6px] rounded-full blur-md -z-10 ${glow === 'violet' ? 'bg-violet-500/30' : glow === 'blue' ? 'bg-blue-500/30' : 'bg-yellow-400/30'}`}
                  />
                )}
              </div>
              <span className={`text-[9px] md:text-[10px] font-bold leading-tight transition-colors duration-200
                ${glowStyle
                  ? (glow === 'violet' ? 'text-violet-300' : glow === 'blue' ? 'text-blue-300' : 'text-yellow-300')
                  : (isActive ? 'text-white' : 'text-slate-500')}
              `}>
                {label}
              </span>
            </motion.button>
          )
        })}

        {/* Spacer */}
        <div className="hidden md:block flex-1" />

        {/* Settings - desktop */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => handleTabChange('settings')}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 min-w-[44px] md:w-[54px] transition-all hidden md:flex ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          title="Settings"
        >
          <Settings className="w-[20px] h-[20px]" strokeWidth={activeTab === 'settings' ? 2.5 : 2}/>
          <span className="text-[10px] font-bold">Settings</span>
        </motion.button>

        {/* Mini avatar - desktop */}
        <div className="hidden md:block mt-2 cursor-pointer" onClick={() => handleTabChange('profile')}>
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border-2 border-blue-500/50" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[13px] font-bold text-white border-2 border-blue-500/40">
              {initials}
            </div>
          )}
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top header */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-white/5 bg-[#060b18]/90 backdrop-blur-xl z-40">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex">
              <img src="/onyx_logo.jpg" alt="Onyx" className="w-8 h-8 rounded-full object-cover drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
            </div>
            <div>
              <h1 className={`text-[17px] font-bold text-white leading-tight ${activeTab === 'home' ? 'animate-onyx-glow' : ''}`}>
                {activeTab === 'feed' ? 'Global Posts' : activeTab === 'home' ? 'Home' : activeTab === 'search' ? 'Search' : activeTab === 'settings' ? 'Settings' : TABS.find(t => t.id === activeTab)?.label || 'ONYX'}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium tracking-widest uppercase">ONYX</p>
            </div>
          </div>
          <motion.button whileTap={{scale:0.9}} className="w-10 h-10 rounded-full border border-white/5 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleTabChange('search')}>
            <Search className="w-5 h-5 text-slate-300" />
          </motion.button>
        </header>

        {/* Animated page */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              variants={PAGE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="h-full overflow-hidden flex flex-col"
            >
              <ViewComponent id={activeTab} profile={profile} session={session}/>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Action Hub & Modals */}
      <ActionHubFAB profile={profile} onSnap={() => setShowSnap(true)} onPost={() => setShowPost(true)} onNewGroup={() => setShowGroup(true)} onStorySelect={setStoryFile} />

      <AnimatePresence>
        {showSnap && <SnapCamera currentProfile={profile} onClose={() => setShowSnap(false)} />}
        {showPost && <CreatePostModal currentProfile={profile} onClose={() => setShowPost(false)} />}
        {showGroup && <CreateGroupModal profile={profile} onClose={() => setShowGroup(false)} />}
        {storyFile && <StoryEditor profile={profile} file={storyFile} onClose={() => setStoryFile(null)} onComplete={() => setStoryFile(null)} />}
      </AnimatePresence>
    </div>
  )
}
