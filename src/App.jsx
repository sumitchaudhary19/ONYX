import { useState, useEffect, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Onboarding from './components/Onboarding'
import MainLayout from './components/MainLayout'
import UserProfile from './views/UserProfile'
import ChatRoom from './views/ChatRoom'
import GroupChatRoom from './views/GroupChatRoom'

/* ── Error Boundary (catches React render crashes) ───── */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#0d0d0d', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>Something went wrong</p>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '320px', lineHeight: 1.5 }}>The app ran into an error. Try refreshing the page.</p>
          <pre style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '12px', maxWidth: '90vw', maxHeight: '120px', overflow: 'auto', textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap', border: '1px solid rgba(239,68,68,0.2)' }}>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '8px', padding: '12px 28px', borderRadius: '12px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Refresh Page</button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ── Loading Screen ──────────────────────────────────── */
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#0d0d0d' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(37,99,235,0.5)' }}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', inset: '-4px', borderRadius: '18px', border: '2px solid rgba(59,130,246,0.4)', animation: 'ping 1.5s ease-in-out infinite' }}/>
      </div>
      <p style={{ fontSize: '14px', color: '#475569' }}>Loading ONYX…</p>
      <style>{`@keyframes ping { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.1;transform:scale(1.15)} }`}</style>
    </div>
  )
}

/* ── Root App ────────────────────────────────────────── */
export default function App() {
  const [session,        setSession       ] = useState(undefined) // undefined = loading
  const [profile,        setProfile       ] = useState(null)
  const [isNewUser,      setIsNewUser     ] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true) // true until first profile check completes

  /* ── Persistent auth state listener ── */
  useEffect(() => {
    // 1. Grab existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
    })

    // 2. React to future auth events (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
      if (!session) {
        setProfile(null)
        setIsNewUser(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  /* ── When session changes → check for profile ── */
  useEffect(() => {
    if (!session) {
      setProfileLoading(false)
      return
    }
    let alive = true
    setProfileLoading(true)

    async function checkProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!alive) return

        if (error || !data || !data.username) {
          // No profile or incomplete onboarding
          setIsNewUser(true)
          setProfile(null)
        } else {
          setProfile({
            id:         data.id,
            firstName:  data.first_name,
            lastName:   data.last_name,
            username:   data.username,
            bio:        data.bio,
            avatarUrl:  data.avatar_url,
          })
          setIsNewUser(false)
        }
      } catch (err) {
        console.error('[App] checkProfile error:', err)
        if (alive) setIsNewUser(true)
      } finally {
        if (alive) setProfileLoading(false)
      }
    }

    checkProfile()
    return () => { alive = false }
  }, [session])

  const handleOnboardingComplete = (formData) => {
    setProfile(formData)
    setIsNewUser(false)
  }

  // Block render until initial session check resolves
  if (session === undefined) return <LoadingScreen />

  // Block render while profile is loading (prevents null profile from reaching components)
  const needsProfile = session && !isNewUser
  if (needsProfile && profileLoading) return <LoadingScreen />

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>

        {/* ─ Login ─────────────────────────────────── */}
        <Route
          path="/login"
          element={
            session
              ? <Navigate to={isNewUser ? '/onboarding' : '/chat'} replace />
              : <Login />
          }
        />

        {/* ─ Onboarding ────────────────────────────── */}
        <Route
          path="/onboarding"
          element={
            !session       ? <Navigate to="/login" replace /> :
            !isNewUser     ? <Navigate to="/chat"  replace /> :
            <Onboarding onComplete={handleOnboardingComplete} />
          }
        />

        {/* ─ Main Chat Shell ───────────────────────── */}
        <Route
          path="/chat"
          element={
            !session   ? <Navigate to="/login"      replace /> :
            isNewUser  ? <Navigate to="/onboarding" replace /> :
            !profile   ? <LoadingScreen /> :
            <MainLayout profile={profile} session={session} />
          }
        />

        {/* ─ Individual User Profile ───────────────── */}
        <Route
          path="/user/:userId"
          element={
            !session   ? <Navigate to="/login"      replace /> :
            isNewUser  ? <Navigate to="/onboarding" replace /> :
            !profile   ? <LoadingScreen /> :
            <UserProfile currentProfile={profile} />
          }
        />

        {/* ─ Chat Room ─────────────────────────────── */}
        <Route
          path="/chat/room/:friendId"
          element={
            !session   ? <Navigate to="/login"      replace /> :
            isNewUser  ? <Navigate to="/onboarding" replace /> :
            !profile   ? <LoadingScreen /> :
            <ChatRoom currentProfile={profile} />
          }
        />

        {/* ─ Group Chat Room ──────────────────── */}
        <Route
          path="/group/room/:groupId"
          element={
            !session   ? <Navigate to="/login"      replace /> :
            isNewUser  ? <Navigate to="/onboarding" replace /> :
            !profile   ? <LoadingScreen /> :
            <GroupChatRoom currentProfile={profile} />
          }
        />

        {/* ─ Catch-all ─────────────────────────────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
