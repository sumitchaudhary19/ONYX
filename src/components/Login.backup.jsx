import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Chrome, Shield, Users, Zap, UserPlus, X, Play, CheckCircle, XCircle } from 'lucide-react'
import { BRANCHES } from './Onboarding'

/* ── Feature pills shown below the card ───────────────── */
const FEATURES = [
  { icon: Shield,  label: 'Verified Students Only' },
  { icon: Zap,     label: 'Real-Time Messaging'    },
  { icon: Users,   label: 'Campus Communities'     },
]

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState(null)
  const [showGuestForm, setShowGuestForm] = useState(false)
  
  const [guestForm, setGuestForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    branch: ''
  })
  
  const [usernameStatus, setUsernameStatus] = useState('idle') // 'idle' | 'checking' | 'available' | 'taken' | 'error'
  const debounceRef = useRef(null)

  useEffect(() => {
    const err = localStorage.getItem('login_error')
    if (err) {
      setError(err)
      localStorage.removeItem('login_error')
    }
  }, [])

  /**
   * Initiates Google OAuth flow via Supabase.
   * STRICT ENFORCEMENT: Only @mnit.ac.in emails are allowed.
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/chat` },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      console.error('[Login] OAuth error:', err)
      setError(err.message ?? 'Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  const handleVideoEnd = () => {
    window.__GUEST_TRANSITION__ = false
    window.location.href = '/chat' // Force reload to clear App.jsx state and pick up session
  }

  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setGuestForm(prev => ({ ...prev, username: val }))

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id').eq('username', val).single()
        if (error && error.code !== 'PGRST116') throw error
        setUsernameStatus(data ? 'taken' : 'available')
      } catch (err) {
        setUsernameStatus('error')
      }
    }, 500)
  }

  const handleGuestSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    window.__GUEST_TRANSITION__ = true

    try {
      // Auto-generate a unique guest email so Supabase auth is happy
      const safeUsername = guestForm.username.toLowerCase().replace(/[^a-z0-9]/g, '')
      const generatedEmail = `${safeUsername}_${Date.now()}@guest.onyx.local`

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: generatedEmail,
        password: guestForm.password
      })

      if (signUpError) throw signUpError
      
      if (data?.user) {
        // Insert profile immediately
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          first_name: guestForm.firstName,
          last_name: guestForm.lastName,
          username: guestForm.username,
          branch: guestForm.branch,
          btech_year: 'GUEST'
        })
        if (profileError) {
          console.error('Failed to create guest profile', profileError)
        }
      }

      // Directly move inside app
      window.location.href = '/chat'
    } catch (err) {
      window.__GUEST_TRANSITION__ = false
      setError(err.message ?? 'Guest registration failed.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg min-h-screen w-full flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* ── Decorative orbit rings ─────────────────────── */}
      <div className="orbit-ring absolute w-[500px] h-[500px] opacity-30 pointer-events-none" style={{ animationDuration: '28s' }} />
      <div className="orbit-ring absolute w-[750px] h-[750px] opacity-20 pointer-events-none" style={{ animationDuration: '45s', animationDirection: 'reverse' }} />
      <div className="orbit-ring absolute w-[1000px] h-[1000px] opacity-10 pointer-events-none" style={{ animationDuration: '70s' }} />

      {/* ── Glowing blob behind the card ──────────────── */}
      <div className="absolute w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)', filter: 'blur(48px)' }} />

      {/* ── Logo / branding above card ────────────────── */}
      <div className="flex flex-col items-center gap-4 mb-8 animate-fade-in">
        <img src="/onyx_logo.jpg" alt="Onyx Logo" className="w-20 h-20 rounded-full object-cover drop-shadow-[0_0_24px_rgba(37,99,235,0.6)]" />
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight leading-none animate-onyx-glow">ONYX</h1>
          <p className="text-xs text-blue-300 font-medium mt-1 tracking-widest uppercase">Secure Platform</p>
        </div>
      </div>

      {/* ── Auth Card ─────────────────────────────────── */}
      <div className="glass-card w-full max-w-md rounded-3xl p-8 sm:p-10 animate-slide-up relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Welcome back 👋</h2>
          <p className="mt-2 text-slate-400 text-sm leading-relaxed">Sign in to connect with your campus community.</p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">Continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-google w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl text-white font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading && !showGuestForm ? (
            <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.2C9.5 35.7 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C37 38.5 44 33 44 24c0-1.3-.1-2.7-.4-3.9z"/>
              </svg>
              <span>Sign in with Google</span>
              <Chrome className="w-4 h-4 opacity-60 ml-auto" />
            </>
          )}
        </button>

        <button
          onClick={() => setShowGuestForm(true)}
          disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-5 h-5 text-slate-300" />
          <span>Guest Mode</span>
        </button>

        {error && (
          <div role="alert" className="mt-4 flex items-center justify-center gap-2 bg-red-500/20 border-2 border-red-500 text-red-200 text-sm font-bold rounded-xl px-4 py-3 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-slide-up">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}
      </div>

      {showGuestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 relative animate-slide-up">
            <button onClick={() => setShowGuestForm(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Create guest account</h2>
            
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div className="flex gap-4">
                <input required type="text" placeholder="First name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors" value={guestForm.firstName} onChange={e => setGuestForm({...guestForm, firstName: e.target.value})} />
                <input required type="text" placeholder="Last name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors" value={guestForm.lastName} onChange={e => setGuestForm({...guestForm, lastName: e.target.value})} />
              </div>
              <div className="relative">
                <input required type="text" placeholder="Username" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors pr-10" value={guestForm.username} onChange={handleUsernameChange} />
                <div className="absolute right-3 top-3.5 flex items-center">
                  {usernameStatus === 'checking' && <svg className="animate-spin w-4 h-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                  {usernameStatus === 'available' && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {usernameStatus === 'taken' && <XCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              {usernameStatus === 'taken' && <p className="text-xs text-red-400 ml-1">This username is already taken.</p>}
              
              <input required type="password" placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors" value={guestForm.password} onChange={e => setGuestForm({...guestForm, password: e.target.value})} />
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">BTECH YEAR</label>
                <input type="text" disabled value="GUEST" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed opacity-70" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">BRANCH</label>
                <select 
                  required 
                  value={guestForm.branch} 
                  onChange={e => setGuestForm({...guestForm, branch: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled hidden>Select your branch</option>
                  {BRANCHES.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#0d0d0d', color: '#fff' }}>{opt.label}</option>)}
                </select>
              </div>

              <button disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'} type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-60 flex justify-center items-center gap-2">
                {loading ? <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : 'Create guest account'}
              </button>

              {error && (
                <div role="alert" className="mt-4 flex items-center justify-center gap-2 bg-red-500/20 border-2 border-red-500 text-red-200 text-sm font-bold rounded-xl px-4 py-3 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-slide-up">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Feature pills ─────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-3 mt-8 animate-fade-in relative z-10">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-xs text-slate-300 font-medium">
            <Icon className="w-3.5 h-3.5 text-blue-400" />{label}
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-600 text-center relative z-10">© {new Date().getFullYear()} ONYX Platform</p>
    </div>
  )
}
