import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChefHat, Clock, ArrowRight, Lock, Flame, Meh, SkipForward, ShoppingBag } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

/* ══════════════════════════════════════════════════════════
   IST TIMEZONE ENGINE — All time logic is strictly IST
   ══════════════════════════════════════════════════════════ */

function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}

function getISTHourMin() {
  const ist = getIST()
  return ist.getHours() * 60 + ist.getMinutes()
}

function getISTDayName(dateObj) {
  return dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' })
}

function isSunday(dateObj) {
  return dateObj.getDay() === 0
}

function toHM(totalMins) {
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/* ── Meal slot definitions (in minutes from midnight) ── */
const WEEKDAY_SLOTS = [
  { id: 'Breakfast', label: 'Breakfast', emoji: '🌅', start: 7 * 60 + 30,  end: 9 * 60 + 30,  accent: '#fbbf24', glow: 'rgba(251,191,36,0.25)' },
  { id: 'Lunch',     label: 'Lunch',     emoji: '☀️', start: 12 * 60,      end: 14 * 60 + 30, accent: '#fb923c', glow: 'rgba(251,146,60,0.25)' },
  { id: 'Snacks',    label: 'Snacks',    emoji: '🍵', start: 17 * 60,      end: 18 * 60,      accent: '#34d399', glow: 'rgba(52,211,153,0.25)' },
  { id: 'Dinner',    label: 'Dinner',    emoji: '🌙', start: 19 * 60 + 30, end: 21 * 60 + 30, accent: '#8b5cf6', glow: 'rgba(139,92,246,0.25)' },
]

const SUNDAY_SLOTS = [
  { id: 'Breakfast', label: 'Breakfast', emoji: '🌅', start: 7 * 60 + 30,  end: 10 * 60,      accent: '#fbbf24', glow: 'rgba(251,191,36,0.25)' },
  { id: 'Lunch',     label: 'Lunch',     emoji: '☀️', start: 12 * 60,      end: 14 * 60 + 30, accent: '#fb923c', glow: 'rgba(251,146,60,0.25)' },
  { id: 'Snacks',    label: 'Snacks',    emoji: '🍵', start: 17 * 60,      end: 18 * 60,      accent: '#34d399', glow: 'rgba(52,211,153,0.25)' },
  { id: 'Dinner',    label: 'Dinner',    emoji: '🌙', start: 19 * 60 + 30, end: 21 * 60 + 30, accent: '#8b5cf6', glow: 'rgba(139,92,246,0.25)' },
]

function getSlots(dateObj) {
  return isSunday(dateObj) ? SUNDAY_SLOTS : WEEKDAY_SLOTS
}

/* ── Premium item detection (Star Items) ── */
const PREMIUM_ITEMS = /paneer|chicken|biryani|ice\s*cream|gulab\s*jamun|jalebi|rasmalai|halwa|sewai|chole\s*bhature|shahi|butter\s*masala|dal\s*makhani|kheer|egg\s*curry|pasta|maggi|paratha/gi

function highlightStarItems(text) {
  if (!text) return null
  const parts = text.split(',').map(s => s.trim()).filter(Boolean)
  return parts.map((item, i) => {
    const isPremium = PREMIUM_ITEMS.test(item)
    PREMIUM_ITEMS.lastIndex = 0 // reset regex
    return (
      <span key={i}>
        {i > 0 && <span style={{ color: '#334155' }}> • </span>}
        {isPremium ? (
          <span style={{ fontWeight: 700, color: '#fbbf24' }}>✨ {item}</span>
        ) : (
          <span>{item}</span>
        )}
      </span>
    )
  })
}

/* ── Determine meal state ── */
// Returns { activeMealId, mealState: 'active'|'dead_zone'|'past'|'late_night', displayDay, nextMealStart }
function computeMealContext(nowMins, istDate) {
  const slots = getSlots(istDate)
  const LATE_NIGHT_CUTOFF = 21 * 60 + 30

  // Late Night Craving Shift: after 21:30 → show tomorrow's Breakfast
  if (nowMins >= LATE_NIGHT_CUTOFF) {
    const tomorrow = new Date(istDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return { activeMealId: 'Breakfast', mealState: 'late_night', displayDay: tomorrow, nextMealStart: null, slots: getSlots(tomorrow) }
  }

  // Check if we're inside an active meal window
  for (const slot of slots) {
    if (nowMins >= slot.start && nowMins < slot.end) {
      return { activeMealId: slot.id, mealState: 'active', displayDay: istDate, nextMealStart: null, slots }
    }
  }

  // Dead zone — find the next upcoming meal
  for (const slot of slots) {
    if (nowMins < slot.start) {
      return { activeMealId: slot.id, mealState: 'dead_zone', displayDay: istDate, nextMealStart: slot.start, slots }
    }
  }

  // All meals passed but before 21:30 — show Dinner results
  return { activeMealId: 'Dinner', mealState: 'past', displayDay: istDate, nextMealStart: null, slots }
}

/* ── Get tab state for each meal ── */
function getTabState(mealId, activeMealId, nowMins, slots) {
  const activeSlot = slots.find(s => s.id === activeMealId)
  const thisSlot = slots.find(s => s.id === mealId)
  if (!thisSlot || !activeSlot) return 'future'

  const activeIdx = slots.indexOf(activeSlot)
  const thisIdx = slots.indexOf(thisSlot)

  if (thisIdx < activeIdx) return 'past'
  if (thisIdx === activeIdx) return 'present'
  return 'future'
}

/* ══════════════════════════════════════════════════════════
   VOTE OPTIONS
   ══════════════════════════════════════════════════════════ */
const VOTE_OPTIONS = [
  { id: 'tasty',   label: 'Tasty',    emoji: '🔥', icon: Flame,       color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  barColor: 'from-emerald-500 to-emerald-400', barShadow: 'rgba(16,185,129,0.5)' },
  { id: 'average', label: 'Average',  emoji: '😐', icon: Meh,         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  barColor: 'from-amber-500 to-amber-400',     barShadow: 'rgba(245,158,11,0.5)' },
  { id: 'skip',    label: 'Skip It',  emoji: '🤢', icon: SkipForward, color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.3)',   barColor: 'from-rose-500 to-rose-400',       barShadow: 'rgba(244,63,94,0.5)' },
]

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function MessRadar({ profile, onClose }) {
  const navigate = useNavigate()

  /* ── Live IST clock (ticks every 10s) ── */
  const [nowMins, setNowMins] = useState(getISTHourMin)
  const [istDate, setIstDate] = useState(getIST)

  useEffect(() => {
    const tick = () => { setNowMins(getISTHourMin()); setIstDate(getIST()) }
    const iv = setInterval(tick, 10000)
    return () => clearInterval(iv)
  }, [])

  /* ── Compute meal context ── */
  const ctx = useMemo(() => computeMealContext(nowMins, istDate), [nowMins, istDate])
  const { activeMealId, mealState, displayDay, nextMealStart, slots } = ctx

  const [selectedMeal, setSelectedMeal] = useState(activeMealId)
  const [menuItems, setMenuItems] = useState('')
  const [menuLoading, setMenuLoading] = useState(true)
  const [votes, setVotes] = useState({ tasty: 0, average: 0, skip: 0 })
  const [userVote, setUserVote] = useState(null)
  const [voteLoading, setVoteLoading] = useState(false)
  const [totalVotes, setTotalVotes] = useState(0)
  const [fomoMins, setFomoMins] = useState(0)

  // Sync selected meal when activeMealId changes
  useEffect(() => { setSelectedMeal(activeMealId) }, [activeMealId])

  const dayName = useMemo(() => getISTDayName(displayDay), [displayDay])
  const activeSlotData = useMemo(() => slots.find(s => s.id === selectedMeal) || slots[0], [slots, selectedMeal])

  /* ── Selected meal's tab state ── */
  const selectedTabState = useMemo(() => {
    if (selectedMeal === activeMealId) {
      if (mealState === 'active') return 'present'
      if (mealState === 'dead_zone') return 'dead_zone'
      if (mealState === 'late_night') return 'future'
      return 'past'
    }
    return getTabState(selectedMeal, activeMealId, nowMins, slots)
  }, [selectedMeal, activeMealId, mealState, nowMins, slots])

  const canVote = selectedTabState === 'present'

  /* ── FOMO timer (ticks every second when active meal is live) ── */
  useEffect(() => {
    if (mealState !== 'active') { setFomoMins(0); return }
    const slot = slots.find(s => s.id === activeMealId)
    if (!slot) return
    const calcRemaining = () => {
      const now = getISTHourMin()
      return Math.max(0, slot.end - now)
    }
    setFomoMins(calcRemaining())
    const iv = setInterval(() => setFomoMins(calcRemaining()), 30000)
    return () => clearInterval(iv)
  }, [mealState, activeMealId, slots])

  /* ── Fetch menu ── */
  const fetchMenu = useCallback(async () => {
    setMenuLoading(true)
    try {
      const { data } = await supabase
        .from('mess_menus').select('items')
        .eq('day_of_week', dayName).eq('meal_type', selectedMeal)
        .limit(1).maybeSingle()
      setMenuItems(data?.items || '')
    } catch (err) { console.error('[MessRadar] fetchMenu:', err) }
    finally { setMenuLoading(false) }
  }, [selectedMeal, dayName])

  /* ── Fetch votes ── */
  const fetchVotes = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('mess_votes').select('vote_option, user_id')
        .eq('meal_type', selectedMeal).eq('vote_date', today)
      const counts = { tasty: 0, average: 0, skip: 0 }
      let myVote = null
      ;(data || []).forEach(v => {
        counts[v.vote_option] = (counts[v.vote_option] || 0) + 1
        if (v.user_id === profile?.id) myVote = v.vote_option
      })
      setVotes(counts)
      setTotalVotes(counts.tasty + counts.average + counts.skip)
      setUserVote(myVote)
    } catch (err) { console.error('[MessRadar] fetchVotes:', err) }
  }, [selectedMeal, profile?.id])

  useEffect(() => { fetchMenu() }, [fetchMenu])
  useEffect(() => { fetchVotes() }, [fetchVotes])

  /* ── Supabase Real-time ── */
  useEffect(() => {
    const ch = supabase.channel(`mess-votes-${selectedMeal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mess_votes' }, (p) => {
        if (p.new?.meal_type === selectedMeal) fetchVotes()
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [selectedMeal, fetchVotes])

  /* ── Cast vote ── */
  const castVote = async (option) => {
    if (userVote || voteLoading || !profile?.id || !canVote) return
    setVoteLoading(true)
    setUserVote(option)
    setVotes(prev => ({ ...prev, [option]: prev[option] + 1 }))
    setTotalVotes(prev => prev + 1)
    try {
      const { error } = await supabase.from('mess_votes').insert({
        user_id: profile.id, meal_type: selectedMeal, vote_option: option
      })
      if (error) {
        setUserVote(null)
        setVotes(prev => ({ ...prev, [option]: Math.max(0, prev[option] - 1) }))
        setTotalVotes(prev => Math.max(0, prev - 1))
      }
    } catch (err) { console.error('[MessRadar] castVote:', err) }
    finally { setVoteLoading(false) }
  }

  const pct = (key) => totalVotes > 0 ? Math.round((votes[key] / totalVotes) * 100) : 0
  const skipPct = pct('skip')
  const showCrossSell = totalVotes > 10 && skipPct > 50

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 8500, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '440px', maxHeight: '92vh', overflowY: 'auto',
          background: 'linear-gradient(180deg, #0d1630 0%, #080e22 100%)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '28px',
          boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 60px ${activeSlotData.glow}`,
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          padding: '22px 22px 14px',
          background: `linear-gradient(135deg, ${activeSlotData.accent}18, ${activeSlotData.accent}08)`,
          borderBottom: '1px solid rgba(255,255,255,0.06)', borderRadius: '28px 28px 0 0', position: 'relative'
        }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '14px',
              background: `linear-gradient(135deg, ${activeSlotData.accent}33, ${activeSlotData.accent}11)`,
              border: `1px solid ${activeSlotData.accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              boxShadow: `0 0 20px ${activeSlotData.glow}`
            }}>{activeSlotData.emoji}</div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>Mess Radar</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Clock style={{ width: 11, height: 11, color: activeSlotData.accent }} />
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                  {dayName} • {mealState === 'late_night' ? 'Tomorrow\'s Preview' : 'IST Time'}
                </span>
              </div>
            </div>
          </div>

          {/* FOMO Timer */}
          <AnimatePresence>
            {mealState === 'active' && selectedMeal === activeMealId && fomoMins > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', marginBottom: '4px' }}>
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f87171' }}>
                  Ends in {fomoMins} min{fomoMins !== 1 ? 's' : ''} 🔴
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ MEAL TABS ═══ */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '4px', marginTop: '8px' }}>
            {slots.map(meal => {
              const tabState = meal.id === activeMealId
                ? (mealState === 'active' ? 'present' : mealState === 'dead_zone' ? 'present' : mealState === 'late_night' ? 'future' : 'past')
                : getTabState(meal.id, activeMealId, nowMins, slots)
              const isSelected = selectedMeal === meal.id
              const isPast = tabState === 'past'
              const isFuture = tabState === 'future'
              const isPresent = tabState === 'present'

              return (
                <motion.button
                  key={meal.id}
                  onClick={() => setSelectedMeal(meal.id)}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    flex: 1, padding: '7px 2px', borderRadius: '10px', border: 'none',
                    background: 'transparent',
                    color: isSelected ? '#fff' : isPast ? '#64748b' : isFuture ? '#475569' : '#94a3b8',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    position: 'relative', zIndex: 1, transition: 'color 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px'
                  }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="mealTabIndicator"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: '10px',
                        background: isPresent
                          ? `linear-gradient(135deg, ${meal.accent}55, ${meal.accent}22)`
                          : 'rgba(255,255,255,0.08)',
                        border: isPresent ? `1px solid ${meal.accent}66` : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isPresent ? `0 0 14px ${meal.glow}` : 'none',
                        zIndex: -1
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span style={{ position: 'relative', whiteSpace: 'nowrap' }}>
                    {meal.emoji} {meal.label}
                  </span>
                  {isFuture && !isSelected && <Lock style={{ width: 9, height: 9, opacity: 0.5 }} />}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* ═══ MENU CARD ═══ */}
        <div style={{ padding: '18px 22px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: activeSlotData.accent, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChefHat style={{ width: 15, height: 15 }} />
            What's cooking right now? 🍲
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '14px', minHeight: '50px'
          }}>
            {menuLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
                <svg style={{ width: 20, height: 20, color: '#3b82f6', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : menuItems ? (
              <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
                {highlightStarItems(menuItems)}
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: '#475569', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
                Menu not available yet. Check back later!
              </p>
            )}
          </div>

          {/* Status Badges */}
          <AnimatePresence>
            {selectedTabState === 'past' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '8px 14px' }}>
                <Clock style={{ width: 13, height: 13, color: '#f87171' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fca5a5' }}>Meal time is over</span>
              </motion.div>
            )}
            {selectedTabState === 'dead_zone' && nextMealStart && selectedMeal === activeMealId && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '8px 14px' }}>
                <Clock style={{ width: 13, height: 13, color: '#60a5fa' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#93c5fd' }}>Voting opens at {toHM(nextMealStart)} 🕛</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ DIVIDER ═══ */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '0 22px' }} />

        {/* ═══ VOTING SECTION ═══ */}
        <div style={{ padding: '18px 22px 22px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 12px' }}>
            {userVote || selectedTabState === 'past' ? '📊 Live Results' : '🗳️ Rate Today\'s Meal'}
          </p>

          <AnimatePresence mode="wait">
            {!userVote && canVote ? (
              /* ── Vote Buttons ── */
              <motion.div key="buttons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {VOTE_OPTIONS.map(opt => (
                  <motion.button key={opt.id} onClick={() => castVote(opt.id)} disabled={voteLoading}
                    whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                      background: opt.bg, border: `1px solid ${opt.border}`, borderRadius: '14px',
                      color: opt.color, fontSize: '15px', fontWeight: 700, cursor: voteLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s', boxShadow: `0 4px 16px ${opt.border}`, opacity: voteLoading ? 0.6 : 1
                    }}>
                    <span style={{ fontSize: '22px' }}>{opt.emoji}</span>
                    {opt.label}
                  </motion.button>
                ))}
              </motion.div>
            ) : (userVote || selectedTabState === 'past') ? (
              /* ── Results Bars ── */
              <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {totalVotes === 0 ? (
                  <p style={{ fontSize: '13px', color: '#475569', textAlign: 'center', padding: '12px 0', margin: 0 }}>No votes yet for this meal.</p>
                ) : VOTE_OPTIONS.map(opt => {
                  const p = pct(opt.id)
                  const isMyVote = userVote === opt.id
                  return (
                    <div key={opt.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: isMyVote ? opt.color : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {opt.emoji} {opt.label}
                          {isMyVote && <span style={{ fontSize: '9px', background: `${opt.color}22`, border: `1px solid ${opt.color}44`, borderRadius: '6px', padding: '1px 6px', color: opt.color }}>You</span>}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: opt.color }}>{p}%</span>
                      </div>
                      <div style={{ height: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                          style={{
                            height: '100%', borderRadius: '8px',
                            background: `linear-gradient(90deg, ${opt.color}88, ${opt.color})`,
                            boxShadow: `0 0 10px ${opt.barShadow}`
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
                {totalVotes > 0 && (
                  <p style={{ fontSize: '10px', color: '#475569', textAlign: 'center', margin: '4px 0 0', fontWeight: 500 }}>
                    {totalVotes} vote{totalVotes !== 1 ? 's' : ''} so far • Updates live
                  </p>
                )}
              </motion.div>
            ) : (
              /* ── Dead Zone / Future — can't vote ── */
              <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 0', textAlign: 'center' }}>
                <Lock style={{ width: 28, height: 28, color: '#334155' }} />
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: 600 }}>
                  {selectedTabState === 'dead_zone' ? 'Voting not open yet' : 'This meal hasn\'t started'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ CROSS-SELL EASTER EGG ═══ */}
          <AnimatePresence>
            {showCrossSell && (
              <motion.div
                initial={{ opacity: 0, y: 16, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 16, height: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={() => { onClose(); navigate('/shop') }}
                style={{ marginTop: '14px', cursor: 'pointer' }}
              >
                <motion.div
                  animate={{ boxShadow: ['0 0 16px rgba(251,146,60,0.15)', '0 0 28px rgba(251,146,60,0.3)', '0 0 16px rgba(251,146,60,0.15)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(245,158,11,0.06))',
                    border: '1px solid rgba(251,146,60,0.25)', borderRadius: '14px',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>🍕</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', margin: 0 }}>Looks like a skip!</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Order online or hit Nescafe 🍔</p>
                  </div>
                  <ArrowRight style={{ width: 15, height: 15, color: '#fb923c', flexShrink: 0 }} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  )
}
