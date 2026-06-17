import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChefHat, Clock, ArrowRight, Flame, Meh, SkipForward } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

/* ── Meal time ranges & theme config ── */
const MEALS = [
  { id: 'Breakfast', label: 'Breakfast', emoji: '🌅', hours: [6, 10.5],  glow: 'rgba(251,191,36,0.25)', accent: '#fbbf24', gradFrom: 'rgba(251,191,36,0.12)', gradTo: 'rgba(245,158,11,0.05)' },
  { id: 'Lunch',     label: 'Lunch',     emoji: '☀️', hours: [10.5, 15], glow: 'rgba(251,146,60,0.25)',  accent: '#fb923c', gradFrom: 'rgba(251,146,60,0.12)',  gradTo: 'rgba(234,88,12,0.05)' },
  { id: 'Snacks',    label: 'Snacks',    emoji: '🍵', hours: [15, 18.5], glow: 'rgba(52,211,153,0.25)',  accent: '#34d399', gradFrom: 'rgba(52,211,153,0.12)',  gradTo: 'rgba(16,185,129,0.05)' },
  { id: 'Dinner',    label: 'Dinner',    emoji: '🌙', hours: [18.5, 24], glow: 'rgba(139,92,246,0.25)',  accent: '#8b5cf6', gradFrom: 'rgba(139,92,246,0.12)',  gradTo: 'rgba(124,58,237,0.05)' },
]

const VOTE_OPTIONS = [
  { id: 'tasty',   label: 'Tasty',    emoji: '🔥', icon: Flame,       color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
  { id: 'average', label: 'Average',  emoji: '😐', icon: Meh,         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
  { id: 'skip',    label: 'Skip It',  emoji: '🤢', icon: SkipForward, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
]

function detectMeal() {
  const now = new Date()
  const h = now.getHours() + now.getMinutes() / 60
  for (const m of MEALS) {
    if (h >= m.hours[0] && h < m.hours[1]) return m.id
  }
  return 'Dinner' // After midnight, default to dinner
}

function getDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

/* ── Main Component ── */
export default function MessRadar({ profile, onClose }) {
  const navigate = useNavigate()
  const [currentMeal, setCurrentMeal] = useState(detectMeal)
  const [menuItems, setMenuItems] = useState('')
  const [menuLoading, setMenuLoading] = useState(true)
  const [votes, setVotes] = useState({ tasty: 0, average: 0, skip: 0 })
  const [userVote, setUserVote] = useState(null)
  const [voteLoading, setVoteLoading] = useState(false)
  const [totalVotes, setTotalVotes] = useState(0)

  const activeMeal = MEALS.find(m => m.id === currentMeal) || MEALS[0]

  /* ── Fetch today's menu ── */
  const fetchMenu = useCallback(async () => {
    setMenuLoading(true)
    try {
      const { data } = await supabase
        .from('mess_menus')
        .select('items')
        .eq('day_of_week', getDayName())
        .eq('meal_type', currentMeal)
        .limit(1)
        .maybeSingle()
      setMenuItems(data?.items || '')
    } catch (err) {
      console.error('[MessRadar] fetchMenu:', err)
    } finally {
      setMenuLoading(false)
    }
  }, [currentMeal])

  /* ── Fetch today's votes ── */
  const fetchVotes = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('mess_votes')
        .select('vote_option, user_id')
        .eq('meal_type', currentMeal)
        .eq('vote_date', today)

      const counts = { tasty: 0, average: 0, skip: 0 }
      let myVote = null
      ;(data || []).forEach(v => {
        counts[v.vote_option] = (counts[v.vote_option] || 0) + 1
        if (v.user_id === profile?.id) myVote = v.vote_option
      })
      setVotes(counts)
      setTotalVotes(counts.tasty + counts.average + counts.skip)
      setUserVote(myVote)
    } catch (err) {
      console.error('[MessRadar] fetchVotes:', err)
    }
  }, [currentMeal, profile?.id])

  useEffect(() => { fetchMenu() }, [fetchMenu])
  useEffect(() => { fetchVotes() }, [fetchVotes])

  /* ── Supabase Real-time for live vote updates ── */
  useEffect(() => {
    const ch = supabase
      .channel(`mess-votes-${currentMeal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mess_votes' }, (payload) => {
        if (payload.new?.meal_type === currentMeal) {
          fetchVotes()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentMeal, fetchVotes])

  /* ── Cast vote ── */
  const castVote = async (option) => {
    if (userVote || voteLoading || !profile?.id) return
    setVoteLoading(true)

    // Optimistic UI
    setUserVote(option)
    setVotes(prev => ({ ...prev, [option]: prev[option] + 1 }))
    setTotalVotes(prev => prev + 1)

    try {
      const { error } = await supabase.from('mess_votes').insert({
        user_id: profile.id,
        meal_type: currentMeal,
        vote_option: option
      })
      if (error) {
        // Rollback on error (likely duplicate vote)
        setUserVote(null)
        setVotes(prev => ({ ...prev, [option]: Math.max(0, prev[option] - 1) }))
        setTotalVotes(prev => Math.max(0, prev - 1))
        console.error('[MessRadar] vote error:', error)
      }
    } catch (err) {
      console.error('[MessRadar] castVote:', err)
    } finally {
      setVoteLoading(false)
    }
  }

  const pct = (key) => totalVotes > 0 ? Math.round((votes[key] / totalVotes) * 100) : 0
  const skipPct = pct('skip')
  const showCrossSell = totalVotes > 10 && skipPct > 50

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 8500,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto',
          background: 'linear-gradient(180deg, #0d1630 0%, #080e22 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '28px',
          padding: '0',
          boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 60px ${activeMeal.glow}`,
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '24px 24px 16px',
          background: `linear-gradient(135deg, ${activeMeal.gradFrom}, ${activeMeal.gradTo})`,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '28px 28px 0 0',
          position: 'relative'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '10px',
            padding: '8px', cursor: 'pointer', color: '#94a3b8', display: 'flex'
          }}><X style={{ width: 16, height: 16 }} /></button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '14px',
              background: `linear-gradient(135deg, ${activeMeal.accent}33, ${activeMeal.accent}11)`,
              border: `1px solid ${activeMeal.accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
              boxShadow: `0 0 20px ${activeMeal.glow}`
            }}>
              {activeMeal.emoji}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
                Mess Radar
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Clock style={{ width: 12, height: 12, color: activeMeal.accent }} />
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                  {getDayName()} • Auto-detected: {activeMeal.label}
                </span>
              </div>
            </div>
          </div>

          {/* ── Meal Tabs ── */}
          <div style={{
            display: 'flex', gap: '6px',
            background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '4px'
          }}>
            {MEALS.map(meal => (
              <motion.button
                key={meal.id}
                onClick={() => setCurrentMeal(meal.id)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '10px', border: 'none',
                  background: 'transparent',
                  color: currentMeal === meal.id ? '#fff' : '#64748b',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  position: 'relative', zIndex: 1,
                  transition: 'color 0.2s'
                }}
              >
                {currentMeal === meal.id && (
                  <motion.div
                    layoutId="mealTab"
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '10px',
                      background: `linear-gradient(135deg, ${meal.accent}55, ${meal.accent}22)`,
                      border: `1px solid ${meal.accent}44`,
                      boxShadow: `0 0 12px ${meal.glow}`,
                      zIndex: -1
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span style={{ position: 'relative' }}>{meal.emoji} {meal.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Menu Card ── */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: activeMeal.accent, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChefHat style={{ width: 16, height: 16 }} />
            What's cooking right now? 🍲
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '16px',
            minHeight: '60px'
          }}>
            {menuLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                <svg style={{ width: 20, height: 20, color: '#3b82f6', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : menuItems ? (
              <p style={{ fontSize: '15px', color: '#e2e8f0', lineHeight: 1.7, margin: 0, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                {menuItems}
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: '#475569', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
                Menu not available yet. Check back later!
              </p>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '0 24px' }} />

        {/* ── Voting Section ── */}
        <div style={{ padding: '20px 24px 24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>
            {userVote ? '📊 Live Results' : '🗳️ Rate Today\'s Meal'}
          </p>

          <AnimatePresence mode="wait">
            {!userVote ? (
              /* ── Vote Buttons ── */
              <motion.div
                key="buttons"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {VOTE_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.id}
                    onClick={() => castVote(opt.id)}
                    disabled={voteLoading}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '16px 18px',
                      background: opt.bg,
                      border: `1px solid ${opt.border}`,
                      borderRadius: '16px',
                      color: opt.color,
                      fontSize: '15px', fontWeight: 700,
                      cursor: voteLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: `0 4px 16px ${opt.border}`,
                      opacity: voteLoading ? 0.6 : 1
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{opt.emoji}</span>
                    {opt.label}
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              /* ── Results Bars ── */
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {VOTE_OPTIONS.map(opt => {
                  const p = pct(opt.id)
                  const isMyVote = userVote === opt.id
                  return (
                    <div key={opt.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: isMyVote ? opt.color : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {opt.emoji} {opt.label}
                          {isMyVote && <span style={{ fontSize: '10px', background: `${opt.color}22`, border: `1px solid ${opt.color}44`, borderRadius: '6px', padding: '1px 6px', color: opt.color }}>You</span>}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: opt.color }}>{p}%</span>
                      </div>
                      <div style={{
                        height: '10px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        overflow: 'hidden'
                      }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                          style={{
                            height: '100%', borderRadius: '8px',
                            background: `linear-gradient(90deg, ${opt.color}88, ${opt.color})`,
                            boxShadow: `0 0 10px ${opt.color}55`
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
                <p style={{ fontSize: '11px', color: '#475569', textAlign: 'center', margin: '4px 0 0', fontWeight: 500 }}>
                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''} so far today • Updates live
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Cross-Sell Easter Egg ── */}
          <AnimatePresence>
            {showCrossSell && (
              <motion.div
                initial={{ opacity: 0, y: 16, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 16, height: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={() => { onClose(); navigate('/shop') }}
                style={{
                  marginTop: '16px',
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(245,158,11,0.06))',
                  border: '1px solid rgba(251,146,60,0.25)',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  boxShadow: '0 0 24px rgba(251,146,60,0.15)',
                  transition: 'transform 0.2s'
                }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>🍕</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', margin: 0 }}>
                    Looks like a skip today!
                  </p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                    Head over to the MNIT Shop or hit Nescafe.
                  </p>
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: '#fb923c', flexShrink: 0 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </motion.div>
  )
}
