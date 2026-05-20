import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const GRADIENTS = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#ef4444,#f43f5e)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
]

function Avatar({ user, size = 44, index = 0 }) {
  const initials = [user.first_name, user.last_name]
    .filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?'
  const style = { width: size, height: size, borderRadius: '13px', flexShrink: 0 }

  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={user.username} style={{ ...style, objectFit: 'cover' }} />
  }
  return (
    <div style={{ ...style, background: GRADIENTS[index % GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
      {initials}
    </div>
  )
}

export default function SearchView({ profile }) {
  const navigate = useNavigate()
  const [query, setQuery]         = useState('')
  const [allUsers, setAllUsers]   = useState([])   // full list loaded on mount
  const [results, setResults]     = useState([])   // currently shown list
  const [loading, setLoading]     = useState(true)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  /* ── Load suggestions on mount (all users except self) ── */
  useEffect(() => {
    if (!profile?.id) return
    loadSuggestions()
  }, [profile?.id])

  async function loadSuggestions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url, bio')
        .neq('id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('[Search] loadSuggestions error:', error)
        throw error
      }
      console.log('[Search] loaded', data?.length, 'suggestions')
      setAllUsers(data || [])
      setResults(data || [])
    } catch (err) {
      console.error('[Search] failed to load suggestions:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Debounced search handler ── */
  const handleSearch = (e) => {
    const q = e.target.value
    setQuery(q)

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!q.trim()) {
      // Reset to full suggestions
      setResults(allUsers)
      return
    }

    debounceRef.current = setTimeout(() => runSearch(q.trim()), 300)
  }

  async function runSearch(q) {
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url, bio')
        .neq('id', profile.id)
        .or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(20)

      if (error) {
        console.error('[Search] runSearch error:', error)
        throw error
      }
      setResults(data || [])
    } catch (err) {
      console.error('[Search] search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults(allUsers)
  }

  const label = loading
    ? 'Loading…'
    : searching
      ? 'Searching…'
      : query
        ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
        : `${results.length} people to connect with`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>Find Friends</h2>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }}>
            {searching
              ? <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.3 }}/><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              : <SearchIcon style={{ width: 16, height: 16 }}/>
            }
          </div>
          <input
            id="search-users"
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search by name or @username…"
            style={{
              width: '100%', padding: '13px 40px 13px 42px', borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.background = 'rgba(59,130,246,0.06)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
          />
          {/* Clear button */}
          {query.length > 0 && (
            <button
              onClick={clearSearch}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
            >
              <X style={{ width: 13, height: 13 }}/>
            </button>
          )}
        </div>
      </div>

      {/* ── Section label ── */}
      <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {query ? 'Results' : '✨ Suggested for you'} · {label}
        </p>
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: '68px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', gap: '14px', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SearchIcon style={{ width: 24, height: 24, color: '#334155' }}/>
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>No users found</p>
              {query && <p style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>Try a different name or username.</p>}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {results.map((user, i) => {
              const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown'
              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.055)' }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate(`/user/${user.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '13px',
                    padding: '12px 12px', marginBottom: '4px',
                    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                  }}
                >
                  <Avatar user={user} size={46} index={i}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>@{user.username || 'no username'}</p>
                    {user.bio && (
                      <p style={{ fontSize: '11px', color: '#475569', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.bio}</p>
                    )}
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: '#334155', flexShrink: 0 }}/>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 0.25 } }
      `}</style>
    </div>
  )
}
