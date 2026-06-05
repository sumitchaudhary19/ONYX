import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lightbulb, Briefcase, BookOpen, Plus, Search, X, 
  TrendingUp, Clock, Star, ChevronRight, Pen, Sparkles,
  Award, Heart
} from 'lucide-react'
import { supabase } from '../supabaseClient'

const GRADS = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
]

const CAREER_TAGS = ['#SDE', '#Core Branch', '#MBA', '#Research', '#Internship', '#DSA', '#System Design', '#HighCGPA', '#Startup', '#GATE']
const ACADEMIC_TAGS = ['#Study Strategy', '#CGPA Tips', '#Lab Life', '#Sem Prep', '#Backlogs', '#Projects', '#Research', '#Exchange Program']

function Avatar({ p, i, size = 44 }) {
  const init = [p?.first_name, p?.last_name].filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?'
  if (p?.avatar_url) return <img src={p.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '13px', objectFit: 'cover', flexShrink: 0 }} />
  return <div style={{ width: size, height: size, borderRadius: '13px', flexShrink: 0, background: GRADS[i % GRADS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3 + 'px', fontWeight: 700, color: '#fff' }}>{init}</div>
}

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PostCard({ post, index, onClick }) {
  const isTopContributor = (post.helpful_claps || 0) >= 50
  const name = [post.author?.first_name, post.author?.last_name].filter(Boolean).join(' ') || 'Anonymous'
  const snippet = post.content?.replace(/#{1,3}\s/g, '').substring(0, 140) + (post.content?.length > 140 ? '…' : '')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(post)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      whileHover={{ borderColor: 'rgba(255,255,255,0.13)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <Avatar p={post.author} i={index} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f0f4ff' }}>{name}</span>
            {isTopContributor && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))',
                border: '1px solid rgba(251,191,36,0.4)',
                borderRadius: '20px', padding: '2px 8px',
                fontSize: '9px', fontWeight: 700, color: '#fbbf24',
                letterSpacing: '0.05em',
              }}>
                <Award style={{ width: 9, height: 9 }} /> TOP CONTRIBUTOR
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{fmtDate(post.created_at)}</span>
        </div>
        <ChevronRight style={{ width: 16, height: 16, color: '#334155', flexShrink: 0 }} />
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: '16px', fontWeight: 700, color: '#f1f5f9',
        margin: '0 0 8px', lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
      }}>{post.title}</h3>

      {/* Snippet */}
      <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 14px' }}>{snippet}</p>

      {/* Tags & Claps */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(post.tags || []).slice(0, 3).map(tag => (
            <span key={tag} style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc'
            }}>{tag}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
          <Lightbulb style={{ width: 13, height: 13, color: '#fbbf24' }} />
          {post.helpful_claps || 0} helpful
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '20px', padding: '20px', animation: 'ghPulse 1.6s ease-in-out infinite'
    }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '50%', height: 13, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }} />
          <div style={{ width: '30%', height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
      <div style={{ width: '90%', height: 16, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
      <div style={{ width: '75%', height: 16, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 14 }} />
      <div style={{ width: '100%', height: 13, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

/* ── Write Post Modal ── */
function WritePostModal({ profile, onClose, onPublished }) {
  const [tab, setTab] = useState('career')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const CAREER_PLACEHOLDER = `## Selection Process
Describe the stages (Aptitude → Technical → HR)...

## Interview Questions
What were the key questions asked?

## Tips for Juniors
What would you recommend?`

  const ACADEMIC_PLACEHOLDER = `## Study Strategy
How did you approach this semester/topic?

## Mistakes to Avoid
What would you do differently?

## Resources
Books, videos, or courses that helped you.`

  const addTag = (t) => {
    const clean = (t.startsWith('#') ? t : '#' + t).trim()
    if (clean.length > 1 && !tags.includes(clean) && tags.length < 5) {
      setTags(prev => [...prev, clean])
      setTagInput('')
    }
  }

  const removeTag = (t) => setTags(prev => prev.filter(x => x !== t))

  const handleSubmit = async (isDraft) => {
    if (!title.trim()) return
    setSaving(true); setError(null)
    try {
      const { error: err } = await supabase.from('guidance_posts').insert({
        author_id: profile.id,
        tab_type: tab,
        title: title.trim(),
        content: content.trim(),
        tags,
        is_draft: isDraft,
      })
      if (err) throw err
      onPublished(isDraft)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px', padding: '14px 16px', color: '#f0f4ff', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '680px', maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0d1630, #080e22)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px 28px 0 0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(124,58,237,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pen style={{ width: 16, height: 16, color: '#818cf8' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f0f4ff', margin: 0 }}>Share Your Experience</h2>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '10px', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '4px' }}>
            {[{ id: 'career', label: 'Career & Placements', Icon: Briefcase }, { id: 'academic', label: 'Academic & Campus', Icon: BookOpen }].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 8px', borderRadius: '11px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: tab === id ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'transparent',
                color: tab === id ? '#fff' : '#64748b',
                boxShadow: tab === id ? '0 4px 16px rgba(79,70,229,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                <Icon style={{ width: 14, height: 14 }} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Form body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text" placeholder="Write a compelling title..." value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ ...inputStyle, fontSize: '18px', fontWeight: 600 }}
          />
          <textarea
            placeholder={tab === 'career' ? CAREER_PLACEHOLDER : ACADEMIC_PLACEHOLDER}
            value={content} onChange={e => setContent(e.target.value)} rows={12}
            style={{ ...inputStyle, lineHeight: 1.7, minHeight: '240px' }}
          />
          {/* Tags */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tags (max 5)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '8px' }}>
              {tags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: '13px', fontWeight: 600 }}>
                  {t}
                  <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b', display: 'flex' }}><X style={{ width: 12, height: 12 }} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="Add a tag (e.g. #SDE)" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                style={{ ...inputStyle, padding: '10px 14px', flex: 1, fontSize: '13px' }}
              />
              <button onClick={() => addTag(tagInput)} style={{ padding: '10px 18px', borderRadius: '12px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Add</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              {(tab === 'career' ? CAREER_TAGS : ACADEMIC_TAGS).slice(0, 5).map(t => (
                <button key={t} onClick={() => addTag(t)} style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', fontSize: '11px', cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          {error && <p style={{ fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: '10px' }}>{error}</p>}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button onClick={() => handleSubmit(true)} disabled={saving || !title.trim()} style={{
            flex: 1, padding: '13px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600, fontSize: '14px',
            cursor: title.trim() ? 'pointer' : 'not-allowed', opacity: title.trim() ? 1 : 0.5,
          }}>
            {saving ? '…' : 'Save Draft'}
          </button>
          <button onClick={() => handleSubmit(false)} disabled={saving || !title.trim() || !content.trim()} style={{
            flex: 2, padding: '13px', borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff', fontWeight: 700, fontSize: '14px',
            cursor: (title.trim() && content.trim()) ? 'pointer' : 'not-allowed',
            opacity: (title.trim() && content.trim()) ? 1 : 0.5,
            boxShadow: '0 4px 20px rgba(79,70,229,0.5)',
          }}>
            {saving ? 'Publishing…' : '✦ Publish Post'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main Guidance Hub ── */
export default function GuidanceHub({ profile, onOpenPost }) {
  const [activeTab, setActiveTab] = useState('career')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [showWrite, setShowWrite] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('guidance_posts')
        .select('*')
        .eq('tab_type', activeTab)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (searchQ.trim()) q = q.ilike('title', `%${searchQ.trim()}%`)
      if (activeTag) q = q.contains('tags', [activeTag])

      const { data, error } = await q
      if (error) throw error

      // Enrich with author profiles
      let enriched = data || []
      if (enriched.length > 0) {
        const authorIds = [...new Set(enriched.map(p => p.author_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .in('id', authorIds)
        const pMap = {}
        ;(profiles || []).forEach(p => { pMap[p.id] = p })
        enriched = enriched.map(p => ({ ...p, author: pMap[p.author_id] || null }))
      }

      setPosts(enriched)
    } catch (err) {
      console.error('[Guidance] fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchQ, activeTag])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const tags = activeTab === 'career' ? CAREER_TAGS : ACADEMIC_TAGS

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Glowing Header ── */}
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.div
              animate={{ boxShadow: ['0 0 12px rgba(99,102,241,0.3)', '0 0 28px rgba(99,102,241,0.7)', '0 0 12px rgba(99,102,241,0.3)'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              style={{ width: 40, height: 40, borderRadius: '13px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Sparkles style={{ width: 19, height: 19, color: '#fff' }} />
            </motion.div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Guidance Hub
                </span>
              </h2>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>Learn from seniors who've been there</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowWrite(true)}
            style={{
              width: 42, height: 42, borderRadius: '14px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,0.5)',
            }}>
            <Pen style={{ width: 18, height: 18, color: '#fff' }} />
          </motion.button>
        </div>

        {/* ── Tab Toggle ── */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '5px', marginBottom: '14px' }}>
          {[
            { id: 'career', label: 'Career & Placements', Icon: Briefcase },
            { id: 'academic', label: 'Academic & Campus', Icon: BookOpen }
          ].map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <motion.button key={id} onClick={() => { setActiveTab(id); setActiveTag(null) }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '12px 8px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700,
                  background: active ? 'linear-gradient(135deg, #312e81, #4c1d95)' : 'transparent',
                  color: active ? '#c4b5fd' : '#475569',
                  boxShadow: active ? '0 4px 20px rgba(79,70,229,0.35)' : 'none',
                  transition: 'all 0.25s ease',
                }}>
                <Icon style={{ width: 15, height: 15 }} />{label}
              </motion.button>
            )
          })}
        </div>

        {/* ── Search ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '13px', padding: '9px 14px', marginBottom: '10px' }}>
          <Search style={{ width: 15, height: 15, color: '#475569', flexShrink: 0 }} />
          <input type="text" placeholder="Search experiences..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f4ff', fontSize: '14px' }} />
          {searchQ && <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#475569' }}><X style={{ width: 14, height: 14 }} /></button>}
        </div>

        {/* ── Smart Tag Filter Pills ── */}
        <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setActiveTag(null)}
            style={{
              padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0,
              background: !activeTag ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${!activeTag ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`,
              color: !activeTag ? '#a5b4fc' : '#64748b',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              boxShadow: !activeTag ? '0 0 12px rgba(99,102,241,0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}>All</motion.button>
          {tags.map(tag => {
            const active = activeTag === tag
            return (
              <motion.button key={tag} whileTap={{ scale: 0.93 }} onClick={() => setActiveTag(active ? null : tag)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0,
                  background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: active ? '#a5b4fc' : '#64748b',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: active ? '0 0 12px rgba(99,102,241,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}>{tag}</motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Feed ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 100px', scrollbarWidth: 'none' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}
        {!loading && posts.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '60px', gap: '14px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '22px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: 30, height: 30, color: '#6366f1' }} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8' }}>No posts yet</p>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, maxWidth: '280px' }}>
              Be the first to share your experience with juniors!
            </p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowWrite(true)}
              style={{ padding: '12px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
              Write First Post
            </motion.button>
          </motion.div>
        )}
        {!loading && posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AnimatePresence mode="popLayout">
              {posts.map((post, i) => (
                <PostCard key={post.id} post={post} index={i} onClick={onOpenPost} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Write Modal ── */}
      <AnimatePresence>
        {showWrite && (
          <WritePostModal
            profile={profile}
            onClose={() => setShowWrite(false)}
            onPublished={(isDraft) => {
              showToast(isDraft ? 'Draft saved!' : '✦ Post published!')
              fetchPosts()
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(16,185,129,0.92)', color: '#fff', padding: '12px 24px',
              borderRadius: '30px', fontSize: '14px', fontWeight: 600,
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)', backdropFilter: 'blur(10px)',
              zIndex: 9999, maxWidth: '90vw', whiteSpace: 'nowrap',
            }}>{toast.msg}</motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes ghPulse { 0%,100%{opacity:0.6} 50%{opacity:0.3} }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
