import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Chrome, MessageCircle, Shield, Users, Zap } from 'lucide-react'

/* ── Feature pills shown below the card ───────────────── */
const FEATURES = [
  { icon: Shield,  label: 'Verified Students Only' },
  { icon: Zap,     label: 'Real-Time Messaging'    },
  { icon: Users,   label: 'Campus Communities'     },
]

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState(null)

  /**
   * Initiates Google OAuth flow via Supabase.
   * The OAuth provider will redirect back to the app after authentication.
   * Currently in Beta Testing mode - any Google account is allowed.
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)

      const redirectTo = `${window.location.origin}/chat`
      console.log('[Login] Redirecting to:', redirectTo)
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (oauthError) throw oauthError
    } catch (err) {
      console.error('[Login] OAuth error:', err)
      setError(err.message ?? 'Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg min-h-screen w-full flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* ── Decorative orbit rings ─────────────────────── */}
      <div
        className="orbit-ring absolute w-[500px] h-[500px] opacity-30 pointer-events-none"
        style={{ animationDuration: '28s' }}
      />
      <div
        className="orbit-ring absolute w-[750px] h-[750px] opacity-20 pointer-events-none"
        style={{ animationDuration: '45s', animationDirection: 'reverse' }}
      />
      <div
        className="orbit-ring absolute w-[1000px] h-[1000px] opacity-10 pointer-events-none"
        style={{ animationDuration: '70s' }}
      />

      {/* ── Glowing blob behind the card ──────────────── */}
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />

      {/* ── Logo / branding above card ────────────────── */}
      <div className="flex flex-col items-center gap-4 mb-8 animate-fade-in">
        <img src="/onyx_logo.jpg" alt="Onyx Logo" className="w-20 h-20 rounded-full object-cover drop-shadow-[0_0_24px_rgba(37,99,235,0.6)]" />
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight leading-none animate-onyx-glow">
            ONYX
          </h1>
          <p className="text-xs text-blue-300 font-medium mt-1 tracking-widest uppercase">
            Secure Platform
          </p>
        </div>
      </div>

      {/* ── Auth Card ─────────────────────────────────── */}
      <div className="glass-card w-full max-w-md rounded-3xl p-8 sm:p-10 animate-slide-up">

        {/* Card header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            Welcome back 👋
          </h2>
          <p className="mt-2 text-slate-400 text-sm leading-relaxed">
            Sign in to connect with your campus community.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">
            Continue with
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google Sign-In button */}
        <button
          id="btn-google-signin"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-google w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl text-white font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          aria-label="Sign in with Google"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin w-5 h-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Redirecting to Google…</span>
            </>
          ) : (
            <>
              {/* Google "G" colour logo as inline SVG */}
              <svg
                className="w-5 h-5 flex-shrink-0"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
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

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3"
          >
            <span className="mt-0.5 flex-shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3.5">
          <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300 leading-relaxed">
            <span className="font-semibold text-blue-200">Beta Testing Mode:</span>{' '}
            You can sign in with any Google account.
          </p>
        </div>
      </div>

      {/* ── Feature pills ─────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-3 mt-8 animate-fade-in">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-xs text-slate-300 font-medium"
          >
            <Icon className="w-3.5 h-3.5 text-blue-400" />
            {label}
          </div>
        ))}
      </div>

      {/* ── Footer ────────────────────────────────────── */}
      <p className="mt-8 text-xs text-slate-600 text-center">
        © {new Date().getFullYear()} ONYX Platform
      </p>
    </div>
  )
}
