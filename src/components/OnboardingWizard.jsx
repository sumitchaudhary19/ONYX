import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, ChevronRight, ChevronLeft, Calendar, Camera, X, Check, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

// ── Constants ──────────────────────────────────────────────────────────────
const TENANTS = { C1: 'college_1', C2: 'college_2' }
const BRANCHES = [
  'Architecture and Planning (B.Arch)',
  'Artificial Intelligence & Data Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Science and Engineering',
  'Electrical Engineering',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Metallurgical and Materials Engineering',
  'Engineering Physics',
  'Mathematics and Computing',
]

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate()
}

// ── Animation Variants ─────────────────────────────────────────────────────
const pageVariants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
}
const pageTransition = { type: 'spring', stiffness: 300, damping: 30 }

// ── Shared UI Primitives ───────────────────────────────────────────────────
function OnyxLogo({ size = 'lg' }) {
  const textSize = size === 'lg' ? 'text-6xl' : 'text-4xl'
  return (
    <div className="flex flex-col items-center gap-3">
      <h1 className={`${textSize} font-black tracking-[0.2em] animate-onyx-glow select-none`}>
        ONYX
      </h1>
      <div className="w-12 h-[3px] rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-60" />
    </div>
  )
}

function CapsuleInput({ icon: Icon, type = 'text', placeholder, value, onChange, maxLength, disabled, rightElement, className = '' }) {
  return (
    <div className={`capsule-field group ${className}`}>
      {Icon && <Icon size={18} className="text-slate-500 group-focus-within:text-blue-400 transition-colors flex-shrink-0" />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        disabled={disabled}
        className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-600 disabled:opacity-50"
      />
      {rightElement}
    </div>
  )
}

function CapsuleSelect({ icon: Icon, value, onChange, options, placeholder, disabled }) {
  return (
    <div className="capsule-field group">
      {Icon && <Icon size={18} className="text-slate-500 group-focus-within:text-blue-400 transition-colors flex-shrink-0" />}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="flex-1 bg-transparent text-white text-sm outline-none appearance-none cursor-pointer disabled:opacity-50"
        style={{ colorScheme: 'dark' }}
      >
        <option value="" disabled className="bg-[#0a0f1e]">{placeholder}</option>
        {options.map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value
          const label = typeof opt === 'string' ? opt : opt.label
          return <option key={val} value={val} className="bg-[#0a0f1e]">{label}</option>
        })}
      </select>
      <ChevronRight size={16} className="text-slate-600 rotate-90 flex-shrink-0" />
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled, className = '', glow = 'blue' }) {
  const glowMap = {
    blue: 'from-blue-500 to-purple-600 shadow-[0_0_30px_rgba(59,130,246,0.4)]',
    cyan: 'from-cyan-400 to-blue-500 shadow-[0_0_30px_rgba(6,182,212,0.5)]',
  }
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={onClick} disabled={disabled}
      className={`w-full py-4 rounded-full bg-gradient-to-r ${glowMap[glow] || glowMap.blue} text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ${className}`}
    >
      {children}
    </motion.button>
  )
}

function SecondaryButton({ children, onClick, disabled, className = '' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={onClick} disabled={disabled}
      className={`w-full py-4 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 font-semibold text-sm backdrop-blur-sm flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 ${className}`}
    >
      {children}
    </motion.button>
  )
}

function BackButton({ onClick }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick}
      className="absolute top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
      <ChevronLeft size={20} />
    </motion.button>
  )
}

function StepIndicator({ current, total }) {
  return (
    <div className="flex gap-1.5 justify-center mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i + 1 === current ? 'w-6 bg-gradient-to-r from-blue-500 to-purple-500' : i + 1 < current ? 'w-3 bg-blue-500/40' : 'w-3 bg-white/10'}`} />
      ))}
    </div>
  )
}

// ── Google Icon SVG ────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ── Custom Calendar Picker ─────────────────────────────────────────────────
function DOBCalendar({ onSelect, onClose }) {
  const [phase, setPhase] = useState('year') // year | month | day
  const [selYear, setSelYear] = useState(2006)
  const [selMonth, setSelMonth] = useState(null)
  const yearScrollRef = useRef(null)

  const years = []
  for (let y = 2010; y >= 1990; y--) years.push(y)

  useEffect(() => {
    if (yearScrollRef.current) {
      const idx = years.indexOf(2006)
      const el = yearScrollRef.current.children[idx]
      if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }, [])

  const handleYear = (y) => { setSelYear(y); setPhase('month') }
  const handleMonth = (m) => { setSelMonth(m); setPhase('day') }
  const handleDay = (d) => {
    const mm = String(selMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    onSelect(`${selYear}-${mm}-${dd}`)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0b0f1e]/95 border border-white/10 rounded-3xl p-5 w-full max-w-[340px] shadow-2xl backdrop-blur-xl">
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {phase !== 'year' && (
              <button onClick={() => setPhase(phase === 'day' ? 'month' : 'year')}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>
          <p className="text-sm font-semibold text-white">
            {phase === 'year' ? 'Select Year' : phase === 'month' ? `${selYear} - Select Month` : `${MONTH_NAMES[selMonth]} ${selYear}`}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X size={16} /></button>
        </div>

        {/* Year Grid */}
        {phase === 'year' && (
          <div ref={yearScrollRef} className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {years.map(y => (
              <button key={y} onClick={() => handleYear(y)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${y === 2006 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 ring-1 ring-blue-500/20' : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}>
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Month Grid */}
        {phase === 'month' && (
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => handleMonth(i)}
                className="py-3 rounded-xl text-sm font-medium bg-white/5 text-slate-400 border border-white/5 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/30 transition-all">
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Day Grid */}
        {phase === 'day' && (
          <div className="grid grid-cols-7 gap-1.5">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-600 py-1">{d}</div>
            ))}
            {(() => {
              const firstDay = new Date(selYear, selMonth, 1).getDay()
              const totalDays = getDaysInMonth(selMonth, selYear)
              const cells = []
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)
              for (let d = 1; d <= totalDays; d++) {
                cells.push(
                  <button key={d} onClick={() => handleDay(d)}
                    className="py-2 rounded-lg text-xs font-medium bg-white/5 text-slate-300 hover:bg-blue-500/20 hover:text-blue-400 transition-all">
                    {d}
                  </button>
                )
              }
              return cells
            })()}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Step 1: Welcome ────────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  const [accounts, setAccounts] = useState([])
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('onyx_saved_accounts')
      if (savedStr) setAccounts(JSON.parse(savedStr))
    } catch (e) { console.error(e) }
  }, [])

  const removeAccount = (userId, e) => {
    e.stopPropagation()
    const updated = accounts.filter(a => a.user_id !== userId)
    setAccounts(updated)
    localStorage.setItem('onyx_saved_accounts', JSON.stringify(updated))
  }

  const loginWithAccount = async (acc) => {
    setLoggingIn(true)
    try {
      const { error } = await supabase.auth.setSession({
        access_token: acc.access_token,
        refresh_token: acc.refresh_token
      })
      if (error) {
        alert(`Session expired. Please sign in again. Details: ${error.message}`)
        removeAccount(acc.user_id, { stopPropagation: () => {} })
        setLoggingIn(false)
      } else {
        window.location.href = '/chat'
      }
    } catch (err) {
      console.error(err)
      setLoggingIn(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-between h-full py-16 px-6">
      <div />
      <OnyxLogo size="lg" />
      <div className="w-full max-w-xs flex flex-col gap-4">
        
        {/* Saved Accounts */}
        <AnimatePresence>
          {accounts.map(acc => (
            <motion.div
              key={acc.user_id}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
              onClick={() => loginWithAccount(acc)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md cursor-pointer hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-3">
                {acc.avatar_url ? (
                  <img src={acc.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {acc.first_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-sm">
                    {acc.first_name} {acc.last_name}
                  </span>
                  <span className="text-slate-400 text-xs">@{acc.username}</span>
                </div>
              </div>
              <button
                onClick={(e) => removeAccount(acc.user_id, e)}
                className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.div animate={{ boxShadow: ['0 0 20px rgba(59,130,246,0.3)', '0 0 40px rgba(139,92,246,0.5)', '0 0 20px rgba(59,130,246,0.3)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-full mt-2">
          <PrimaryButton onClick={onNext} disabled={loggingIn}>
            {loggingIn ? <Loader2 size={18} className="animate-spin" /> : <><User size={18} /> Create my account <ChevronRight size={18} /></>}
          </PrimaryButton>
        </motion.div>
      </div>
    </div>
  )
}

// ── Step 2: Auth Selection ─────────────────────────────────────────────────
function StepAuthSelection({ onGoogle, onGuest, loading, tenant, setTenant, onComplete }) {
  const [showTenantPicker, setShowTenantPicker] = useState(false)
  const [tenantMode, setTenantMode] = useState('create') // 'create' | 'login'
  const [tenantUsername, setTenantUsername] = useState('')
  const [tenantPassword, setTenantPassword] = useState('')
  const [tenantLoading, setTenantLoading] = useState(false)
  const [tenantError, setTenantError] = useState('')

  const handleTenantAuth = async () => {
    const uname = tenantUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (uname.length < 3) { setTenantError('Username must be at least 3 characters'); return }
    if (tenantPassword.length < 6) { setTenantError('Password must be at least 6 characters'); return }
    setTenantLoading(true)
    setTenantError('')

    const syntheticEmail = `${uname}@${tenant}.onyx.local`

    try {
      if (tenantMode === 'create') {
        // Check if username is taken in this tenant
        const { data: existing } = await supabase.from('profiles')
          .select('id').eq('username', uname).eq('tenant_id', tenant).maybeSingle()
        if (existing) { setTenantError('Username already taken in this environment'); setTenantLoading(false); return }

        // Sign up with synthetic email
        window.__GUEST_TRANSITION__ = true
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: syntheticEmail,
          password: tenantPassword,
        })
        if (signUpError) throw signUpError

        const userId = signUpData.user.id

        // Create minimal profile
        const profileData = {
          id: userId,
          first_name: uname,
          last_name: '',
          username: uname,
          tenant_id: tenant,
          btech_year: 'Fresher',
        }
        const { error: profileError } = await supabase.from('profiles').upsert(profileData)
        if (profileError) throw profileError

        // Notify App.jsx
        if (onComplete) {
          onComplete({
            id: userId,
            firstName: uname,
            lastName: '',
            username: uname,
            avatarUrl: null,
            ...profileData,
          })
        }
        window.__GUEST_TRANSITION__ = false
        window.location.href = '/chat'

      } else {
        // Login with existing tenant account
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password: tenantPassword,
        })
        if (loginError) {
          if (loginError.message?.includes('Invalid login')) {
            setTenantError('Invalid username or password')
          } else {
            setTenantError(loginError.message)
          }
          setTenantLoading(false)
          return
        }
        window.location.href = '/chat'
      }
    } catch (err) {
      console.error('[Tenant Auth]', err)
      setTenantError(err.message || 'Something went wrong')
      window.__GUEST_TRANSITION__ = false
      setTenantLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-between h-full py-16 px-6 relative">
      {/* Decoy X button - looks like a broken UI artifact */}
      <button onClick={() => setShowTenantPicker(true)}
        style={{ position: 'absolute', top: 14, right: 14, width: 22, height: 22, opacity: 0.22,
          background: 'none', border: 'none', color: '#94a3b8', fontSize: 10, cursor: 'default',
          fontFamily: 'monospace', letterSpacing: '-1px', lineHeight: 1, zIndex: 10 }}
        aria-hidden="true">X</button>

      {/* Tenant badge (only visible when tenant selected) */}
      {tenant && (
        <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-white/[0.04] text-[8px] text-slate-700 font-mono">
          {tenant.toUpperCase()}
        </div>
      )}

      <div />
      <OnyxLogo size="lg" />

      {/* ── Tenant Direct Auth Form (shown when C1/C2 is active) ── */}
      {tenant ? (
        <div className="w-full max-w-xs flex flex-col gap-3">
          {/* Create / Login tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {['create', 'login'].map(m => (
              <button key={m} onClick={() => { setTenantMode(m); setTenantError('') }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                  ${tenantMode === m
                    ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-400'
                  }`}>
                {m === 'create' ? 'Create Account' : 'Login'}
              </button>
            ))}
          </div>

          {/* Username */}
          <div className="capsule-field">
            <User size={16} className="text-slate-500 flex-shrink-0" />
            <input type="text" placeholder="Username" value={tenantUsername}
              onChange={e => setTenantUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="bg-transparent flex-1 outline-none text-white text-sm placeholder:text-slate-600" />
          </div>

          {/* Password */}
          <div className="capsule-field">
            <Lock size={16} className="text-slate-500 flex-shrink-0" />
            <input type="password" placeholder="Password (min 6 chars)" value={tenantPassword}
              onChange={e => setTenantPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTenantAuth()}
              className="bg-transparent flex-1 outline-none text-white text-sm placeholder:text-slate-600" />
          </div>

          {/* Error */}
          {tenantError && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400 text-center px-2">{tenantError}</motion.p>
          )}

          {/* Submit */}
          <motion.div animate={{ boxShadow: ['0 0 12px rgba(139,92,246,0.2)', '0 0 24px rgba(139,92,246,0.4)', '0 0 12px rgba(139,92,246,0.2)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-full mt-1">
            <PrimaryButton onClick={handleTenantAuth} disabled={tenantLoading} glow="purple">
              {tenantLoading
                ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                : <><ChevronRight size={16} /> {tenantMode === 'create' ? 'Create & Enter' : 'Login'}</>
              }
            </PrimaryButton>
          </motion.div>
        </div>
      ) : (
        /* ── Standard Auth Buttons (MNIT production) ── */
        <div className="w-full max-w-xs flex flex-col gap-4">
          <motion.div animate={{ boxShadow: ['0 0 15px rgba(59,130,246,0.2)', '0 0 30px rgba(59,130,246,0.4)', '0 0 15px rgba(59,130,246,0.2)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-full">
            <SecondaryButton onClick={onGoogle} disabled={loading}
              className="!border-blue-500/30 !bg-blue-500/[0.07] hover:!bg-blue-500/[0.12]">
              <GoogleIcon /> Create account with Google
            </SecondaryButton>
          </motion.div>
          <SecondaryButton onClick={onGuest} disabled={loading}>
            <User size={18} /> Guest account
          </SecondaryButton>
        </div>
      )}

      {/* Hidden Tenant Picker Modal */}
      <AnimatePresence>
        {showTenantPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowTenantPicker(false)}>
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-64 rounded-2xl bg-[#0a0f1e]/95 border border-white/10 backdrop-blur-xl p-5">
              <p className="text-[10px] text-slate-600 font-mono text-center mb-4">env:select</p>
              <div className="flex gap-3">
                {['C1', 'C2'].map(t => (
                  <motion.button key={t} whileTap={{ scale: 0.95 }}
                    onClick={() => { setTenant(TENANTS[t]); localStorage.setItem('onyx_tenant', TENANTS[t]); setShowTenantPicker(false) }}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all
                      ${tenant === TENANTS[t]
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:bg-white/[0.06]'
                      }`}>
                    {t}
                  </motion.button>
                ))}
              </div>
              {tenant && (
                <button onClick={() => { setTenant(null); localStorage.removeItem('onyx_tenant'); setShowTenantPicker(false) }}
                  className="w-full mt-3 py-2 rounded-lg text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                  Reset to default
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Step 3: Name ───────────────────────────────────────────────────────────
function StepName({ formData, setFormData, onNext }) {
  const valid = formData.firstName.trim().length >= 1 && formData.lastName.trim().length >= 1
  return (
    <div className="flex flex-col items-center h-full py-12 px-6">
      <OnyxLogo size="sm" />
      <div className="w-full max-w-xs mt-auto flex flex-col gap-4 mb-8">
        <CapsuleInput icon={User} placeholder="First Name" value={formData.firstName}
          onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))} />
        <CapsuleInput icon={User} placeholder="Last Name" value={formData.lastName}
          onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))} />
      </div>
      <div className="w-full max-w-xs">
        <PrimaryButton onClick={onNext} disabled={!valid}>
          Next <ChevronRight size={18} />
        </PrimaryButton>
      </div>
    </div>
  )
}

// ── Step 4: Credentials ────────────────────────────────────────────────────
function StepCredentials({ formData, setFormData, authMode, usernameStatus, onNext }) {
  const validUsername = formData.username.length >= 3 && usernameStatus === 'available'
  const validPassword = authMode === 'google' || formData.password.length >= 6
  const valid = validUsername && validPassword

  const statusIcon = {
    checking: <Loader2 size={16} className="text-blue-400 animate-spin" />,
    available: <Check size={16} className="text-emerald-400" />,
    taken: <XCircle size={16} className="text-red-400" />,
  }

  return (
    <div className="flex flex-col items-center h-full py-12 px-6">
      <OnyxLogo size="sm" />
      <div className="w-full max-w-xs mt-auto flex flex-col gap-4 mb-2">
        <div>
          <CapsuleInput icon={User} placeholder="Choose Username" value={formData.username}
            onChange={e => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
            rightElement={statusIcon[usernameStatus]} />
          {usernameStatus === 'taken' && (
            <p className="text-xs text-red-400 mt-1.5 ml-4">Username is already taken</p>
          )}
          {usernameStatus === 'available' && (
            <p className="text-xs text-emerald-400 mt-1.5 ml-4">Username is available!</p>
          )}
        </div>
        {authMode === 'guest' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
            <CapsuleInput icon={Lock} type="password" placeholder="Create Password" value={formData.password}
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
              rightElement={formData.password.length > 0 && formData.password.length < 6
                ? <span className="text-[10px] text-red-400 whitespace-nowrap">Min 6 chars</span>
                : formData.password.length >= 6 ? <Check size={14} className="text-emerald-400" /> : null
              } />
          </motion.div>
        )}
      </div>
      <div className="w-full max-w-xs mt-6">
        <PrimaryButton onClick={onNext} disabled={!valid}>
          Next <ChevronRight size={18} />
        </PrimaryButton>
      </div>
    </div>
  )
}

// ── Step 5: Date of Birth ──────────────────────────────────────────────────
function StepDOB({ formData, setFormData, onNext }) {
  const [showCal, setShowCal] = useState(false)
  const filled = !!formData.dob

  const formatDOB = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-')
    return `${d} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`
  }

  return (
    <div className="flex flex-col items-center h-full py-12 px-6">
      <OnyxLogo size="sm" />
      <div className="w-full max-w-xs mt-auto flex flex-col gap-4 mb-8">
        <button onClick={() => setShowCal(true)}
          className="capsule-field group cursor-pointer text-left">
          <Calendar size={18} className="text-slate-500 flex-shrink-0" />
          <span className={`text-sm ${formData.dob ? 'text-white' : 'text-slate-600'}`}>
            {formData.dob ? formatDOB(formData.dob) : 'Date of Birth'}
          </span>
        </button>
      </div>
      <div className="w-full max-w-xs">
        {filled ? (
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(59,130,246,0.3)', '0 0 40px rgba(139,92,246,0.5)', '0 0 20px rgba(59,130,246,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-full">
            <PrimaryButton onClick={onNext}>
              Next <ChevronRight size={18} />
            </PrimaryButton>
          </motion.div>
        ) : (
          <PrimaryButton onClick={onNext} disabled>
            Next <ChevronRight size={18} />
          </PrimaryButton>
        )}
      </div>
      <AnimatePresence>
        {showCal && (
          <DOBCalendar
            onSelect={(d) => { setFormData(p => ({ ...p, dob: d })); setShowCal(false) }}
            onClose={() => setShowCal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Step 6: Academics ──────────────────────────────────────────────────────
function StepAcademics({ formData, setFormData, authMode, onNext }) {
  const showSection = formData.btechYear === '1st Year' || (authMode === 'guest' && formData.btechYear === 'Fresher')
  const valid = formData.btechYear && formData.branch

  useEffect(() => {
    if (authMode === 'guest') {
      setFormData(p => ({ ...p, btechYear: 'Fresher' }))
    }
  }, [authMode])

  return (
    <div className="flex flex-col items-center h-full py-12 px-6">
      <OnyxLogo size="sm" />
      <div className="w-full max-w-xs mt-auto flex flex-col gap-4 mb-8">
        {authMode === 'guest' ? (
          <CapsuleInput icon={Calendar} placeholder="Year" value="Fresher" disabled />
        ) : (
          <CapsuleSelect icon={Calendar} value={formData.btechYear} placeholder="Select Year"
            onChange={e => setFormData(p => ({ ...p, btechYear: e.target.value, section: '' }))}
            options={YEARS} />
        )}
        <CapsuleSelect icon={User} value={formData.branch} placeholder="Select Branch"
          onChange={e => setFormData(p => ({ ...p, branch: e.target.value }))}
          options={BRANCHES} />
        <AnimatePresence>
          {showSection && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}>
              <CapsuleSelect icon={User} value={formData.section} placeholder="Select Section"
                onChange={e => setFormData(p => ({ ...p, section: e.target.value }))}
                options={SECTIONS} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="w-full max-w-xs">
        <PrimaryButton onClick={onNext} disabled={!valid}>
          Next <ChevronRight size={18} />
        </PrimaryButton>
      </div>
    </div>
  )
}

// ── Step 7: Profile Identity ───────────────────────────────────────────────
function StepProfile({ formData, setFormData, submitting, onSubmit }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(p => ({ ...p, avatarFile: file }))
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex flex-col items-center h-full py-12 px-6">
      <OnyxLogo size="sm" />
      <div className="w-full max-w-xs mt-auto flex flex-col items-center gap-6 mb-8">
        {/* Avatar Upload */}
        <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
          <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center overflow-hidden">
            {preview
              ? <img src={preview} alt="avatar" className="w-full h-full object-cover rounded-full" />
              : <Camera size={28} className="text-slate-600" />
            }
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Camera size={14} className="text-white" />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        <p className="text-xs text-slate-500">Tap to add profile photo</p>

        {/* Bio */}
        <div className="w-full">
          <div className="capsule-field group !items-start !py-3">
            <User size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <textarea
              placeholder="Write a short bio... (optional)"
              value={formData.bio}
              onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
              maxLength={120}
              rows={2}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-600 resize-none"
            />
            <span className="text-[10px] text-slate-600 self-end flex-shrink-0">{formData.bio.length}/120</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="w-full max-w-xs">
        <motion.div
          animate={{ boxShadow: ['0 0 20px rgba(6,182,212,0.3)', '0 0 45px rgba(6,182,212,0.5)', '0 0 20px rgba(6,182,212,0.3)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-full">
          <PrimaryButton onClick={onSubmit} disabled={submitting} glow="cyan">
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Setting up...</>
            ) : (
              'Skip and complete profile'
            )}
          </PrimaryButton>
        </motion.div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Wizard Component ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export default function OnboardingWizard({ onComplete, session }) {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [authMode, setAuthMode] = useState(null) // 'google' | 'guest'
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [tenant, setTenant] = useState(() => localStorage.getItem('onyx_tenant') || null)
  const debounceRef = useRef(null)

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', username: '', password: '',
    dob: '', btechYear: '', branch: '', section: '', bio: '',
    avatarFile: null,
  })

  // If we already have a session (Google returning), skip to step 3
  useEffect(() => {
    if (session?.user) {
      // If this is a tenant user returning via page reload, skip onboarding entirely
      const isTenantUser = session.user.email?.endsWith('.onyx.local')
      if (isTenantUser) return // App.jsx checkProfile will handle routing

      setAuthMode('google')
      // Pre-fill name from Google metadata if available
      const meta = session.user.user_metadata
      if (meta) {
        setFormData(p => ({
          ...p,
          firstName: meta.full_name?.split(' ')[0] || meta.first_name || '',
          lastName: meta.full_name?.split(' ').slice(1).join(' ') || meta.last_name || '',
        }))
      }
      setStep(3)
    }
  }, [session])

  // Debounced username check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const uname = formData.username
    if (uname.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles').select('id').eq('username', uname).maybeSingle()
        if (error) { setUsernameStatus('error'); return }
        setUsernameStatus(data ? 'taken' : 'available')
      } catch { setUsernameStatus('error') }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [formData.username])

  const goNext = () => { setDirection(1); setStep(s => s + 1) }
  const goBack = () => { setDirection(-1); setStep(s => s - 1) }

  // ── Google OAuth ──
  const handleGoogle = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/onboarding' },
      })
    } catch (err) {
      console.error('[Onboarding] Google OAuth error:', err)
      setLoading(false)
    }
  }

  // ── Guest Selection ──
  const handleGuest = async () => {
    if (localStorage.getItem('onyx_guest_account_created') === 'true') {
      const guestId = localStorage.getItem('onyx_guest_user_id')
      if (guestId) {
        setLoading(true)
        try {
          const { data } = await supabase.from('profiles').select('id').eq('id', guestId).maybeSingle()
          if (!data) {
            // Self-healing: Account was deleted, clear flags
            localStorage.removeItem('onyx_guest_account_created')
            localStorage.removeItem('onyx_guest_user_id')
            setAuthMode('guest')
            goNext()
            setLoading(false)
            return
          }
        } catch (e) {
          console.error('Guest check error', e)
        }
        setLoading(false)
      }
      alert('Only one guest account can be created per device.')
      return
    }

    setAuthMode('guest')
    goNext()
  }

  // ── Final Submit ──
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      let userId

      if (authMode === 'guest') {
        // Sign up guest
        window.__GUEST_TRANSITION__ = true
        const safeUsername = formData.username.replace(/[^a-z0-9_]/g, '')
        const email = `${safeUsername}_${Date.now()}@guest.onyx.local`
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: formData.password,
        })
        if (signUpError) throw signUpError
        userId = signUpData.user.id
      } else {
        // Google user already authenticated
        userId = session.user.id
      }

      // Upload avatar if provided
      let avatarUrl = null
      if (formData.avatarFile) {
        const ext = formData.avatarFile.name.split('.').pop()
        const filePath = `${userId}/avatar.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars').upload(filePath, formData.avatarFile, { upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
          avatarUrl = urlData.publicUrl
        }
      }

      // Upsert profile
      const profileData = {
        id: userId,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim() || null,
        date_of_birth: formData.dob || null,
        btech_year: formData.btechYear || (authMode === 'guest' ? 'Fresher' : null),
        branch: formData.branch || null,
        section: formData.section || null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        ...(tenant ? { tenant_id: tenant } : {}),
      }

      const { error: profileError } = await supabase.from('profiles').upsert(profileData)
      if (profileError) throw profileError

      if (authMode === 'guest') {
        localStorage.setItem('onyx_guest_account_created', 'true')
        localStorage.setItem('onyx_guest_user_id', userId)
      }

      if (onComplete) {
        onComplete({
          id: userId,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          username: formData.username.trim(),
          bio: formData.bio.trim(),
          avatarUrl,
          ...profileData,
        })
      }

      // Redirect
      window.location.href = '/chat'

    } catch (err) {
      console.error('[Onboarding] Submit error:', err)
      alert('Something went wrong: ' + (err.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const totalSteps = 7

  return (
    <div className="onyx-wizard-bg h-full w-full relative overflow-hidden flex flex-col">
      {/* Ambient Glow Effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Back Button */}
      {step > 1 && step <= 7 && !loading && (
        <BackButton onClick={goBack} />
      )}

      {/* Step Indicator */}
      {step >= 3 && (
        <div className="relative z-10 pt-6 px-6">
          <StepIndicator current={step - 2} total={totalSteps - 2} />
        </div>
      )}

      {/* Step Content */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={step}
            custom={direction}
            variants={pageVariants}
            initial="enter" animate="center" exit="exit"
            transition={pageTransition}
            className="absolute inset-0">

            {step === 1 && <StepWelcome onNext={goNext} />}
            {step === 2 && <StepAuthSelection onGoogle={handleGoogle} onGuest={handleGuest} loading={loading} tenant={tenant} setTenant={setTenant} onComplete={onComplete} />}
            {step === 3 && <StepName formData={formData} setFormData={setFormData} onNext={goNext} />}
            {step === 4 && <StepCredentials formData={formData} setFormData={setFormData} authMode={authMode} usernameStatus={usernameStatus} onNext={goNext} />}
            {step === 5 && <StepDOB formData={formData} setFormData={setFormData} onNext={goNext} />}
            {step === 6 && <StepAcademics formData={formData} setFormData={setFormData} authMode={authMode} onNext={goNext} />}
            {step === 7 && <StepProfile formData={formData} setFormData={setFormData} submitting={submitting} onSubmit={handleSubmit} />}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
