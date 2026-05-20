import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Search, Bell, User,
  Users, Settings, Moon, Home
} from 'lucide-react'
import Chats from '../views/Chats'
import SearchView from '../views/Search'
import Profile from '../views/Profile'
import NotificationsView from '../views/Notifications'
import GroupsList from '../views/GroupsList'
import SettingsView from '../views/SettingsView'
import { supabase } from '../supabaseClient'

const TABS = [
  { id: 'chats',         label: 'Chats',   Icon: MessageCircle },
  { id: 'groups',        label: 'Groups',  Icon: Users         },
  { id: 'search',        label: 'Search',  Icon: Search        },
  { id: 'notifications', label: 'Alerts',  Icon: Bell          },
  { id: 'profile',       label: 'Profile', Icon: User          },
]

const PAGE_VARIANTS = {
  enter:  { opacity: 0, x: 16 },
  center: { opacity: 1, x: 0,  transition: { duration: 0.22, ease: 'easeOut' } },
  exit:   { opacity: 0, x: -8, transition: { duration: 0.14 } },
}

function ViewComponent({ id, profile, session }) {
  if (id === 'chats')         return <Chats             profile={profile} session={session}/>
  if (id === 'groups')        return <GroupsList        profile={profile} session={session}/>
  if (id === 'search')        return <SearchView        profile={profile} session={session}/>
  if (id === 'notifications') return <NotificationsView profile={profile} session={session}/>
  if (id === 'profile')       return <Profile           profile={profile} session={session}/>
  if (id === 'settings')      return <SettingsView      profile={profile} session={session}/>
  return null
}

export default function MainLayout({ profile, session }) {
  const [activeTab,    setActiveTab   ] = useState('chats')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!profile?.id) return
    fetchPendingCount()
    const ch1 = supabase.channel(`pending-badge-fr-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${profile.id}` }, fetchPendingCount)
      .subscribe()
    const ch2 = supabase.channel(`pending-badge-gr-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_requests', filter: `receiver_id=eq.${profile.id}` }, fetchPendingCount)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
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
    setActiveTab(id)
    if (id === 'notifications') setPendingCount(0)
  }

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || 'M'

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#060b18] overflow-hidden">
      
      {/* ═══════════════════════════════════════════
          NAVIGATION — Bottom bar on mobile, Sidebar on desktop
      ═══════════════════════════════════════════ */}
      <aside className="order-last md:order-first w-full h-[68px] md:w-[72px] md:h-full flex-shrink-0 flex md:flex-col items-center justify-around md:justify-start px-2 md:px-2 py-2 md:py-5 bg-[#060b18]/95 border-t md:border-t-0 md:border-r border-white/5 md:gap-4 backdrop-blur-xl z-50">
        
        {/* Brand icon - hidden on mobile */}
        <div className="hidden md:flex mb-5">
          <img src="/onyx_logo.jpg" alt="Onyx Logo" className="w-[42px] h-[42px] rounded-full object-cover drop-shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
        </div>

        {/* Nav items */}
        {TABS.map(({ id, label, Icon }) => {
          const isActive  = activeTab === id
          const showBadge = id === 'notifications' && pendingCount > 0 && !isActive

          return (
            <motion.button
              key={id}
              onClick={() => handleTabChange(id)}
              whileTap={{ scale: 0.88 }}
              className={`nav-btn flex-1 md:flex-none ${isActive ? 'active' : ''}`}
              title={label}
            >
              <div className="relative">
                <Icon className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={isActive ? 2.5 : 2}/>
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
              </div>
              <span className="text-[10px] md:text-[11px] font-semibold mt-1">{label}</span>
            </motion.button>
          )
        })}

        {/* Spacer for desktop */}
        <div className="hidden md:block flex-1" />

        {/* Settings button - hidden on mobile, placed in Profile instead or visible here? Let's keep it visible on desktop */}
        <motion.button 
          whileTap={{ scale: 0.88 }} 
          onClick={() => handleTabChange('settings')} 
          className={`nav-btn hidden md:flex ${activeTab === 'settings' ? 'active' : ''}`} 
          title="Settings"
        >
          <Settings className="w-[20px] h-[20px]" strokeWidth={activeTab === 'settings' ? 2.5 : 2}/>
          <span className="text-[11px] font-semibold mt-1">Settings</span>
        </motion.button>

        {/* Mini avatar - hidden on mobile */}
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

      {/* ═══════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top header strip */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-white/5 bg-[#060b18]/90 backdrop-blur-xl z-40">
          <div className="flex items-center gap-3">
            {/* Show logo on mobile header instead */}
            <div className="md:hidden flex">
              <img src="/onyx_logo.jpg" alt="Onyx" className="w-8 h-8 rounded-full object-cover drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
            </div>
            <div>
              <h1 className={`text-[17px] font-bold text-white leading-tight ${activeTab === 'chats' ? 'animate-onyx-glow' : ''}`}>
                {TABS.find(t => t.id === activeTab)?.label || (activeTab === 'settings' ? 'Settings' : 'ONYX')}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium tracking-widest uppercase">ONYX Platform</p>
            </div>
          </div>
          {/* Search shortcut pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => handleTabChange('search')}>
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 hidden sm:inline-block">Search…</span>
          </div>
        </header>

        {/* Animated page area */}
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
    </div>
  )
}
