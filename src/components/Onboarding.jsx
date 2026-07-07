import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

/* ─── Styled Input ─────────────────────────────────────── */
function Field({ label, id, type = 'text', value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor={id}
        style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
          color: '#fff',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(59,130,246,0.08)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
      />
    </div>
  )
}

/* ─── Styled Textarea ─────────────────────────────────────── */
function TextareaField({ label, id, value, onChange, maxLength }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor={id} style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </label>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{value.length}/{maxLength}</span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        rows={3}
        placeholder="A short intro about yourself…"
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
          color: '#fff',
          fontSize: '14px',
          outline: 'none',
          resize: 'none',
          transition: 'border-color 0.2s, background 0.2s',
          fontFamily: 'inherit',
        }}
        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(59,130,246,0.08)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
      />
    </div>
  )
}

/* ─── Styled Select ─────────────────────────────────────── */
function SelectField({ label, id, value, onChange, options, placeholder = 'Select an option' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={id} style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
          color: value ? '#fff' : '#64748b',
          fontSize: '14px',
          outline: 'none',
          appearance: 'none',
          transition: 'border-color 0.2s, background 0.2s',
          cursor: 'pointer'
        }}
        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(59,130,246,0.08)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#0d0d0d', color: '#fff' }}>{opt.label}</option>)}
      </select>
    </div>
  )
}

/* ─── Branch options ──────────────────────────────────── */
const BRANCHES = [
  { value: 'CSE', label: 'Computer Science (CSE)' },
  { value: 'ECE', label: 'Electronics & Communication (ECE)' },
  { value: 'EE',  label: 'Electrical (EE)' },
  { value: 'ME',  label: 'Mechanical (ME)' },
  { value: 'CE',  label: 'Civil (CE)' },
  { value: 'CHE', label: 'Chemical (CHE)' },
  { value: 'MME', label: 'Metallurgical & Materials (MME)' },
]

/* ─── Onboarding ─────────────────────────────────────── */
export default function Onboarding({ onComplete }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', bio: '', btechYear: '', branch: '', collegeId: '' })
  const [submitting, setSubmitting] = useState(false)

  // Username uniqueness state
  const [usernameStatus, setUsernameStatus] = useState('idle') // 'idle' | 'checking' | 'available' | 'taken' | 'error'
  const debounceRef = useRef(null)

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  // Debounced username check
  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') // enforce lowercase alphanumeric + underscore
    setForm(prev => ({ ...prev, username: val }))

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', val)
          .maybeSingle()
        if (error) throw error
        setUsernameStatus(data ? 'taken' : 'available')
      } catch {
        setUsernameStatus('error')
      }
    }, 500)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const isValid = form.firstName.trim() && form.lastName.trim() && form.username.trim().length >= 3 && form.btechYear && form.branch && usernameStatus === 'available'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        username: form.username,
        bio: form.bio,
        btech_year: form.btechYear,
        branch: form.branch,
        college_id: form.collegeId,
      })
      
      if (error) throw error
      onComplete({ ...form, id: user.id })
    } catch (err) {
      console.error('Error saving profile:', err)
      alert(`Error saving profile: ${err.message || JSON.stringify(err)}`)
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'radial-gradient(ellipse at 50% 0%, #1a1a3e 0%, #0d0d0d 65%)',
      }}
    >
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '999px',
          border: '1px solid rgba(59,130,246,0.3)',
          background: 'rgba(59,130,246,0.1)',
          color: '#93c5fd', fontSize: '11px', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: '28px',
        }}
      >
        <Sparkles style={{ width: 13, height: 13 }} />
        One-time setup · 30 seconds
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: '440px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(145deg, #161616, #111)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          padding: '36px 32px',
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            Set up your profile
          </h1>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#94a3b8' }}>
            Let your MNIT classmates know who you are.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field id="firstName" label="First Name" value={form.firstName} onChange={set('firstName')} placeholder="Arjun" />
            <Field id="lastName"  label="Last Name"  value={form.lastName}  onChange={set('lastName')}  placeholder="Sharma" />
          </div>

          {/* Username with live check */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="username" style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={handleUsernameChange}
                placeholder="arjun_s"
                maxLength={24}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${
                    usernameStatus === 'available' ? 'rgba(34,197,94,0.5)' :
                    usernameStatus === 'taken' ? 'rgba(239,68,68,0.5)' :
                    'rgba(255,255,255,0.12)'
                  }`,
                  background: usernameStatus === 'available' ? 'rgba(34,197,94,0.06)' :
                              usernameStatus === 'taken' ? 'rgba(239,68,68,0.06)' :
                              'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              />
              {/* Status icon inside the input */}
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                {usernameStatus === 'checking' && (
                  <Loader2 style={{ width: 16, height: 16, color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                )}
                {usernameStatus === 'available' && (
                  <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e' }} />
                )}
                {usernameStatus === 'taken' && (
                  <XCircle style={{ width: 16, height: 16, color: '#ef4444' }} />
                )}
              </div>
            </div>
            {/* Status text below input */}
            <AnimatePresence mode="wait">
              {form.username.length > 0 && form.username.length < 3 && (
                <motion.p key="short" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '4px' }}>
                  ⚠ At least 3 characters required
                </motion.p>
              )}
              {usernameStatus === 'available' && (
                <motion.p key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ fontSize: '12px', color: '#22c55e', marginLeft: '4px', fontWeight: 500 }}>
                  ✅ Username available
                </motion.p>
              )}
              {usernameStatus === 'taken' && (
                <motion.p key="no" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ fontSize: '12px', color: '#ef4444', marginLeft: '4px', fontWeight: 500 }}>
                  ❌ Username already taken
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* B.Tech Year */}
          <SelectField
            id="btechYear" label="B.Tech Year" value={form.btechYear} onChange={set('btechYear')}
            placeholder="Select your year"
            options={[
              { value: '1st Year', label: '1st Year' },
              { value: '2nd Year', label: '2nd Year' },
              { value: '3rd Year', label: '3rd Year' },
              { value: '4th Year', label: '4th Year' },
            ]}
          />

          {/* Branch */}
          <SelectField
            id="branch" label="Branch" value={form.branch} onChange={set('branch')}
            placeholder="Select your branch"
            options={BRANCHES}
          />

          {/* College ID */}
          <Field
            id="collegeId" label="College ID" value={form.collegeId}
            onChange={set('collegeId')} placeholder="2026UCP1234" maxLength={20}
          />

          {/* Bio */}
          <TextareaField id="bio" label="Short Bio (optional)" value={form.bio} onChange={set('bio')} maxLength={120} />

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={!isValid || submitting}
            whileHover={isValid && !submitting ? { scale: 1.02, y: -2 } : {}}
            whileTap={isValid && !submitting ? { scale: 0.98 } : {}}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '14px', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontSize: '14px', fontWeight: 600, cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
              background: isValid && !submitting
                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                : 'rgba(255,255,255,0.06)',
              color: isValid && !submitting ? '#fff' : '#475569',
              boxShadow: isValid && !submitting ? '0 8px 24px rgba(37,99,235,0.35)' : 'none',
              transition: 'all 0.25s ease',
            }}
          >
            {submitting ? (
              <>
                <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.75 }}/>
                </svg>
                Setting up…
              </>
            ) : (
              <>
                Complete Profile
                <ArrowRight style={{ width: 16, height: 16 }} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
