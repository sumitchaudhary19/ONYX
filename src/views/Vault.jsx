import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Search, SlidersHorizontal, Sparkles, TrendingUp, Clock, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import MaterialCard from '../components/MaterialCard'
import UploadMaterial from '../components/UploadMaterial'

const YEARS   = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year']
const BRANCHES = ['All', 'CSE', 'ECE', 'ME', 'CE', 'EE', 'Chemical', 'Metallurgy', 'Architecture', 'Planning']
const CATEGORIES = ['All', 'Notes', 'PYQs', 'Lab Manuals']
const SORT_OPTIONS = [
  { id: 'recent',  label: 'Recent',       Icon: Clock },
  { id: 'popular', label: 'Most Upvoted', Icon: TrendingUp },
]

/* ── Skeleton loader for cards ── */
function SkeletonCard({ i }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        padding: '20px',
        minHeight: '220px',
        animation: 'vaultPulse 1.6s ease-in-out infinite',
        animationDelay: `${i * 0.15}s`,
      }}
    >
      <div style={{ width: '70px', height: '22px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />
      <div style={{ width: '85%', height: '18px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', marginBottom: '10px' }} />
      <div style={{ width: '60%', height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', marginBottom: '20px' }} />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ width: '60px', height: '24px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ width: '50px', height: '24px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div style={{ width: '100%', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

/* ── Main Vault Component ── */
export default function Vault({ profile }) {
  const [items,      setItems     ] = useState([])
  const [loading,    setLoading   ] = useState(true)
  const [yearFilter, setYearFilter] = useState('All')
  const [branchFilter, setBranchFilter] = useState('All')
  const [catFilter,  setCatFilter ] = useState('All')
  const [sortBy,     setSortBy    ] = useState('recent')
  const [searchQ,    setSearchQ   ] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [toast,      setToast     ] = useState(null)

  /* ── Fetch vault items ── */
  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('vault_links')
        .select('*')
        .lt('reports_count', 3)

      if (yearFilter   !== 'All') q = q.eq('btech_year', yearFilter)
      if (branchFilter !== 'All') q = q.eq('branch', branchFilter)
      if (catFilter    !== 'All') q = q.eq('category', catFilter)
      if (searchQ.trim())         q = q.ilike('title', `%${searchQ.trim()}%`)

      if (sortBy === 'popular') {
        q = q.order('upvotes', { ascending: false })
      } else {
        q = q.order('created_at', { ascending: false })
      }

      const { data, error } = await q.limit(60)
      if (error) throw error

      let enriched = data || []

      // Fetch uploader profiles
      if (enriched.length > 0) {
        const uploaderIds = [...new Set(enriched.map(i => i.uploader_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .in('id', uploaderIds)

        const profileMap = {}
        ;(profiles || []).forEach(p => { profileMap[p.id] = p })
        enriched = enriched.map(item => ({
          ...item,
          uploader_profile: profileMap[item.uploader_id] || null
        }))
      }

      // Fetch user's votes on these items
      if (profile?.id && enriched.length > 0) {
        const itemIds = enriched.map(i => i.id)
        const { data: votes } = await supabase
          .from('vault_votes')
          .select('link_id, vote_type')
          .eq('user_id', profile.id)
          .in('link_id', itemIds)

        const voteMap = {}
        ;(votes || []).forEach(v => { voteMap[v.link_id] = v.vote_type })
        enriched = enriched.map(item => ({ ...item, user_vote: voteMap[item.id] || null }))
      }

      setItems(enriched)
    } catch (err) {
      console.error('[Vault] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [yearFilter, branchFilter, catFilter, sortBy, searchQ, profile?.id])

  useEffect(() => { fetchItems() }, [fetchItems])

  /* ── Vote handler ── */
  const handleVote = async (itemId, voteType) => {
    if (!profile?.id) return
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const currentVote = item.user_vote

    // Optimistic update
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i
      let newUpvotes = i.upvotes
      let newVote = voteType

      if (currentVote === voteType) {
        // Toggle off
        newVote = null
        newUpvotes += voteType === 'up' ? -1 : 1
      } else if (currentVote) {
        // Switching vote direction
        newUpvotes += voteType === 'up' ? 2 : -2
      } else {
        // New vote
        newUpvotes += voteType === 'up' ? 1 : -1
      }

      return { ...i, upvotes: newUpvotes, user_vote: newVote }
    }))

    try {
      if (currentVote === voteType) {
        // Remove vote
        await supabase.from('vault_votes').delete().eq('user_id', profile.id).eq('link_id', itemId)
        await supabase.from('vault_links').update({ upvotes: (item.upvotes + (voteType === 'up' ? -1 : 1)) }).eq('id', itemId)
      } else if (currentVote) {
        // Update existing vote
        await supabase.from('vault_votes').update({ vote_type: voteType }).eq('user_id', profile.id).eq('link_id', itemId)
        await supabase.from('vault_links').update({ upvotes: (item.upvotes + (voteType === 'up' ? 2 : -2)) }).eq('id', itemId)
      } else {
        // Insert new vote
        await supabase.from('vault_votes').insert({ user_id: profile.id, link_id: itemId, vote_type: voteType })
        await supabase.from('vault_links').update({ upvotes: (item.upvotes + (voteType === 'up' ? 1 : -1)) }).eq('id', itemId)
      }
    } catch (err) {
      console.error('[Vault] vote error:', err)
      fetchItems() // Revert on error
    }
  }

  /* ── Report handler ── */
  const handleReport = async (itemId) => {
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return
      const newCount = (item.reports_count || 0) + 1
      await supabase.from('vault_links').update({ reports_count: newCount }).eq('id', itemId)

      if (newCount >= 3) {
        setItems(prev => prev.filter(i => i.id !== itemId))
      } else {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, reports_count: newCount } : i))
      }

      showToast('Link reported. Thank you for keeping the Vault clean!')
    } catch (err) {
      console.error('[Vault] report error:', err)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleUploadSuccess = () => {
    showToast('Material added to the Vault!')
    fetchItems()
  }

  const filteredItems = items
  const activeFilterCount = [yearFilter, branchFilter, catFilter].filter(f => f !== 'All').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Glowing Header ── */}
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.div
              animate={{ boxShadow: ['0 0 12px rgba(124,58,237,0.3)', '0 0 28px rgba(124,58,237,0.7)', '0 0 12px rgba(124,58,237,0.3)'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              style={{
                width: 40, height: 40, borderRadius: '13px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <BookOpen style={{ width: 19, height: 19, color: '#fff' }} />
            </motion.div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f0f4ff', margin: 0, letterSpacing: '-0.02em' }}>
                <span style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ONYX Vault
                </span>
              </h2>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>
                Zero-storage academic hub · {items.length} resources
              </p>
            </div>
          </div>

          {/* Upload FAB */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowUpload(true)}
            style={{
              width: '42px', height: '42px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
            }}
          >
            <Plus style={{ width: 20, height: 20, color: '#fff' }} />
          </motion.button>
        </div>

        {/* ── Search Bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '10px 14px', marginTop: '14px', marginBottom: '12px',
        }}>
          <Search style={{ width: 16, height: 16, color: '#475569', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search notes, PYQs, lab manuals..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#f0f4ff', fontSize: '14px', fontWeight: 500,
            }}
          />
          {searchQ && (
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSearchQ('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X style={{ width: 14, height: 14, color: '#64748b' }} />
            </motion.button>
          )}
        </div>

        {/* ── Sort Pills ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {SORT_OPTIONS.map(({ id, label, Icon }) => {
            const active = sortBy === id
            return (
              <motion.button key={id} whileTap={{ scale: 0.93 }} onClick={() => setSortBy(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 14px', borderRadius: '20px',
                  background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#c084fc' : '#64748b',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: active ? '0 0 12px rgba(124,58,237,0.25)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {label}
              </motion.button>
            )
          })}
        </div>

        {/* ── Year Filter Pills ── */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
          {YEARS.map(year => {
            const active = yearFilter === year
            return (
              <motion.button key={year} whileTap={{ scale: 0.93 }} onClick={() => setYearFilter(year)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0,
                  background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#60a5fa' : '#64748b',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: active ? '0 0 10px rgba(59,130,246,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {year}
              </motion.button>
            )
          })}
        </div>

        {/* ── Branch Filter Pills ── */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
          {BRANCHES.map(branch => {
            const active = branchFilter === branch
            return (
              <motion.button key={branch} whileTap={{ scale: 0.93 }} onClick={() => setBranchFilter(branch)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0,
                  background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? '#34d399' : '#64748b',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: active ? '0 0 10px rgba(16,185,129,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {branch}
              </motion.button>
            )
          })}
        </div>

        {/* ── Category Filter Pills ── */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => {
            const active = catFilter === cat
            const catColors = {
              All: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', text: '#64748b', glow: 'none' },
              Notes: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.5)', text: '#34d399', glow: '0 0 10px rgba(16,185,129,0.2)' },
              PYQs: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.5)', text: '#60a5fa', glow: '0 0 10px rgba(59,130,246,0.2)' },
              'Lab Manuals': { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', text: '#fbbf24', glow: '0 0 10px rgba(245,158,11,0.2)' },
            }
            const c = active ? (catColors[cat] || catColors.All) : catColors.All
            return (
              <motion.button key={cat} whileTap={{ scale: 0.93 }} onClick={() => setCatFilter(cat)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0,
                  background: c.bg, border: `1px solid ${c.border}`,
                  color: c.text, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: c.glow, transition: 'all 0.2s ease',
                }}
              >
                {cat}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Feed ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 100px', scrollbarWidth: 'none' }}>
        {loading && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px',
          }}>
            {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} i={i} />)}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: '60px', gap: '14px', textAlign: 'center',
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '22px',
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen style={{ width: 30, height: 30, color: '#7c3aed' }} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8' }}>No materials yet</p>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, maxWidth: '280px' }}>
              Be the first to contribute! Share your notes, PYQs, or lab manuals with fellow students.
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUpload(true)}
              style={{
                marginTop: '8px', padding: '12px 28px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              }}
            >
              Contribute Now
            </motion.button>
          </motion.div>
        )}

        {!loading && filteredItems.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px',
          }}>
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => (
                <MaterialCard
                  key={item.id}
                  item={item}
                  profile={profile}
                  index={i}
                  onVote={handleVote}
                  onReport={handleReport}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUpload && (
          <UploadMaterial
            profile={profile}
            onClose={() => setShowUpload(false)}
            onSuccess={handleUploadSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(16, 185, 129, 0.9)', color: '#fff',
              padding: '12px 24px', borderRadius: '30px', fontSize: '14px', fontWeight: 600,
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(10px)',
              zIndex: 9999, textAlign: 'center', maxWidth: '90vw',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes vaultPulse { 0%,100%{opacity:0.6} 50%{opacity:0.3} }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
