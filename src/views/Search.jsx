import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, ChevronRight, X, Clock, Filter, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { sanitizeSearchQuery } from '../utils/sanitize'

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
  const [recent, setRecent]       = useState([])
  const [showYear, setShowYear]   = useState(false)
  const [selectedYears, setSelectedYears] = useState([])
  const [allUsers, setAllUsers]   = useState([])   // full list loaded on mount
  const [results, setResults]     = useState([])   // currently shown list
  const [loading, setLoading]     = useState(true)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  /* ── Load suggestions on mount (all users except self) ── */
  useEffect(() => {
    if (!profile?.id) return
    loadSuggestions()
    loadRecentSearches()
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

  async function loadRecentSearches() {
    const { data } = await supabase.from('recent_searches').select('*').eq('user_id', profile.id).eq('search_type', 'profile').order('searched_at', { ascending: false }).limit(8)
    if(data) setRecent(data)
  }

  const removeRecent = async (e, id) => {
    e.stopPropagation()
    await supabase.from('recent_searches').delete().eq('id', id)
    setRecent(prev => prev.filter(r => r.id !== id))
  }

  const clearAllRecent = async () => {
    await supabase.from('recent_searches').delete().eq('user_id', profile.id).eq('search_type', 'profile')
    setRecent([])
  }

  const handleRecentClick = (q) => {
    setQuery(q)
    runSearch(q, selectedYears)
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

    debounceRef.current = setTimeout(() => {
      runSearch(q.trim(), selectedYears)
      saveRecentSearch(q.trim())
    }, 400)
  }

  async function saveRecentSearch(q) {
    if(!q) return
    const { data } = await supabase.from('recent_searches').select('*').eq('user_id', profile.id).eq('search_type', 'profile').eq('query', q).single()
    if(data) {
      await supabase.from('recent_searches').update({ searched_at: new Date().toISOString() }).eq('id', data.id)
    } else {
      await supabase.from('recent_searches').insert({ user_id: profile.id, search_type: 'profile', query: q })
    }
    loadRecentSearches()
  }

  async function runSearch(q, years) {
    setSearching(true)
    const safe = sanitizeSearchQuery(q)
    if (!safe) { setSearching(false); return }
    try {
      let req = supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url, bio')
        .neq('id', profile.id)
        .or(`username.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`)
      
      if (years && years.length > 0) {
        req = req.in('btech_year', years)
      }
      
      const { data, error } = await req.limit(20)

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

  const toggleYearFilter = (yr) => {
    const next = selectedYears.includes(yr) ? selectedYears.filter(y => y !== yr) : [...selectedYears, yr]
    setSelectedYears(next)
    if (query.trim()) runSearch(query.trim(), next)
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

        {/* Year Filter Toggle */}
        <div style={{ marginTop: '12px' }}>
          <button onClick={() => setShowYear(!showYear)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px 12px', color: showYear || selectedYears.length > 0 ? '#60a5fa' : '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Filter style={{ width: 14, height: 14 }} /> Filter by Year {selectedYears.length > 0 && `(${selectedYears.length})`}
          </button>
          
          <AnimatePresence>
            {showYear && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(yr => (
                    <button key={yr} onClick={() => toggleYearFilter(yr)}
                      style={{ padding: '6px 12px', borderRadius: '12px', border: selectedYears.includes(yr) ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.1)', background: selectedYears.includes(yr) ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)', color: selectedYears.includes(yr) ? '#60a5fa' : '#cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, boxShadow: selectedYears.includes(yr) ? '0 0 10px rgba(96,165,250,0.2)' : 'none' }}>
                      {yr}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Searches */}
        {!query && recent.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock style={{ width: 12, height: 12 }} /> Recent
              </span>
              <button onClick={clearAllRecent} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Trash2 style={{ width: 11, height: 11 }} /> Clear
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {recent.map(r => (
                <div key={r.id} onClick={() => handleRecentClick(r.query)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{r.query}</span>
                  <button onClick={(e) => removeRecent(e, r.id)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
