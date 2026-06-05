import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Lightbulb, MessageCircle, UserPlus,
  Award, Share2, X, Check, BookOpen
} from 'lucide-react'
import { supabase } from '../supabaseClient'

const GRADS = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
]

function Avatar({ p, size = 48, idx = 0 }) {
  const init = [p?.first_name, p?.last_name].filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?'
  if (p?.avatar_url) return <img src={p.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '16px', objectFit: 'cover', flexShrink: 0 }} />
  return <div style={{ width: size, height: size, borderRadius: '16px', flexShrink: 0, background: GRADS[idx % GRADS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32 + 'px', fontWeight: 700, color: '#fff' }}>{init}</div>
}

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ── Follow Modal ── */
function FollowModal({ author, onFollow, onClose, loading }) {
  const name = [author?.first_name, author?.last_name].filter(Boolean).join(' ') || 'this senior'
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '380px',
          background: 'linear-gradient(180deg, #0d1630, #080e22)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '28px', padding: '32px 28px', textAlign: 'center',
        }}
      >
        <Avatar p={author} size={64} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f0f4ff', margin: '16px 0 6px' }}>{name}</h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 8px' }}>@{author?.username || '—'}</p>
        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 28px' }}>
          Follow {name.split(' ')[0]} to connect and ask questions about their experience.
        </p>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onFollow}
          disabled={loading}
          style={{
            width: '100%', padding: '16px', borderRadius: '50px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 6px 28px rgba(79,70,229,0.5)',
          }}
        >
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
          ) : (
            <><UserPlus style={{ width: 18, height: 18 }} /> Follow {name.split(' ')[0]}</>
          )}
        </motion.button>

        <button onClick={onClose} style={{
          marginTop: '14px', background: 'none', border: 'none', color: '#475569',
          fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        }}>Maybe later</button>
      </motion.div>
    </motion.div>
  )
}

/* ── Reading View ── */
export default function ReadExperience({ post, profile, onClose }) {
  const navigate = useNavigate()
  const [clapped, setClapped] = useState(false)
  const [clapCount, setClapCount] = useState(post?.helpful_claps || 0)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const author = post?.author
  const authorName = [author?.first_name, author?.last_name].filter(Boolean).join(' ') || 'Anonymous'
  const isTopContributor = clapCount >= 50
  const isOwnPost = profile?.id === post?.author_id

  // Check if user already clapped
  useEffect(() => {
    if (!profile?.id || !post?.id) return
    supabase.from('guidance_claps').select('id').eq('user_id', profile.id).eq('post_id', post.id).single()
      .then(({ data }) => { if (data) setClapped(true) })
  }, [profile?.id, post?.id])

  const handleClap = async () => {
    if (!profile?.id || clapped) return
    setClapped(true)
    setClapCount(c => c + 1)
    try {
      await supabase.from('guidance_claps').insert({ user_id: profile.id, post_id: post.id })
      await supabase.from('guidance_posts').update({ helpful_claps: clapCount + 1 }).eq('id', post.id)
    } catch (err) {
      setClapped(false)
      setClapCount(c => c - 1)
    }
  }

  const handleConnectClick = async () => {
    if (!profile?.id || isOwnPost) return

    // Check if already friends
    const { data: friendReq } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${post.author_id}),and(sender_id.eq.${post.author_id},receiver_id.eq.${profile.id})`)
      .eq('status', 'accepted')
      .single()

    if (friendReq) {
      onClose()
      navigate(`/chat/room/${post.author_id}`)
    } else {
      setShowFollowModal(true)
    }
  }

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      // Check if pending request already exists
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('id')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${post.author_id}),and(sender_id.eq.${post.author_id},receiver_id.eq.${profile.id})`)
        .single()

      if (!existing) {
        // Insert friend request
        await supabase.from('friend_requests').insert({
          sender_id: profile.id,
          receiver_id: post.author_id,
          status: 'pending',
        })
      }

      // Insert notification A — follow request context
      await supabase.from('notifications').insert({
        receiver_id: post.author_id,
        sender_id: profile.id,
        type: 'follow_request',
        message: `${profile.firstName || 'Someone'} requested to follow you.`,
        metadata: { post_id: post.id, post_title: post.title },
      })

      // Insert notification B — guidance doubt context
      await supabase.from('notifications').insert({
        receiver_id: post.author_id,
        sender_id: profile.id,
        type: 'guidance_doubt',
        message: `${profile.firstName || 'Someone'} wants to ask a doubt from your post "${post.title}", kindly accept their follow request.`,
        metadata: { post_id: post.id, post_title: post.title },
      })

      setShowFollowModal(false)
      setToast("Request sent! You'll be notified when they accept.")
      setTimeout(() => setToast(null), 4000)
    } catch (err) {
      console.error('[Guidance] follow error:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  // Render content with basic markdown-like formatting
  const renderContent = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0', margin: '28px 0 12px', letterSpacing: '-0.01em' }}>{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '17px', fontWeight: 600, color: '#cbd5e1', margin: '20px 0 8px' }}>{line.slice(4)}</h3>
      if (line.trim() === '') return <div key={i} style={{ height: '12px' }} />
      return <p key={i} style={{ fontSize: '15px', color: '#b8c5d6', lineHeight: 1.85, margin: '0 0 4px' }}>{line}</p>
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9100, background: '#060b18', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(6,11,24,0.95)', backdropFilter: 'blur(16px)',
        flexShrink: 0,
      }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '12px', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </motion.button>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {post?.tab_type === 'career' ? '💼 Career' : '📚 Academic'}
        </span>
        <div style={{ width: 38 }} /> {/* spacer */}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '28px 24px 120px' }}>

          {/* ── Author Card (Top) ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '18px 20px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '28px',
          }}>
            <Avatar p={author} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f0f4ff' }}>{authorName}</span>
                {isTopContributor && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))',
                    border: '1px solid rgba(251,191,36,0.4)',
                    borderRadius: '20px', padding: '2px 8px',
                    fontSize: '9px', fontWeight: 700, color: '#fbbf24',
                  }}>
                    <Award style={{ width: 9, height: 9 }} /> TOP CONTRIBUTOR
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>@{author?.username || '—'} · {fmtDate(post?.created_at)}</span>
            </div>
          </div>

          {/* ── Title ── */}
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, color: '#f1f5f9',
            lineHeight: 1.3, letterSpacing: '-0.02em', margin: '0 0 20px',
          }}>{post?.title}</h1>

          {/* ── Tags ── */}
          {(post?.tags || []).length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {post.tags.map(tag => (
                <span key={tag} style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc',
                }}>{tag}</span>
              ))}
            </div>
          )}

          {/* ── Divider ── */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '0 0 28px' }} />

          {/* ── Body ── */}
          <div style={{ fontFamily: "'Inter', 'Outfit', system-ui, sans-serif" }}>
            {renderContent(post?.content)}
          </div>

          {/* ── Divider ── */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '36px 0' }} />

          {/* ── Helpful Clap ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '36px' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleClap}
              disabled={clapped}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px', borderRadius: '50px',
                background: clapped ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${clapped ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: clapped ? '#fbbf24' : '#94a3b8',
                fontSize: '14px', fontWeight: 600, cursor: clapped ? 'default' : 'pointer',
                boxShadow: clapped ? '0 0 20px rgba(251,191,36,0.2)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <Lightbulb style={{ width: 18, height: 18 }} />
              {clapped ? 'Marked Helpful!' : 'Helpful'} · {clapCount}
            </motion.button>
          </div>

          {/* ── Author Card (Bottom) ── */}
          <div style={{
            padding: '24px', borderRadius: '22px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
          }}>
            <Avatar p={author} size={56} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f0f4ff', margin: '14px 0 4px' }}>
              Written by {authorName}
            </h3>
            {isTopContributor && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))',
                border: '1px solid rgba(251,191,36,0.4)',
                borderRadius: '20px', padding: '3px 10px', margin: '0 0 10px',
                fontSize: '10px', fontWeight: 700, color: '#fbbf24',
              }}>
                <Award style={{ width: 10, height: 10 }} /> TOP CONTRIBUTOR
              </span>
            )}
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px' }}>@{author?.username || '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Connect FAB ── */}
      {!isOwnPost && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleConnectClick}
          style={{
            position: 'fixed', bottom: '28px', right: '20px', left: '20px',
            maxWidth: '400px', margin: '0 auto',
            padding: '16px 24px', borderRadius: '50px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
            boxShadow: '0 8px 32px rgba(79,70,229,0.5), 0 0 60px rgba(124,58,237,0.2)',
            zIndex: 100,
            animation: 'connectFabGlow 2.5s ease-in-out infinite',
          }}
        >
          <MessageCircle style={{ width: 18, height: 18 }} />
          Connect with {(author?.first_name || 'Senior')}
        </motion.button>
      )}

      {/* ── Follow Modal ── */}
      <AnimatePresence>
        {showFollowModal && (
          <FollowModal
            author={author}
            onFollow={handleFollow}
            onClose={() => setShowFollowModal(false)}
            loading={followLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(16,185,129,0.92)', color: '#fff', padding: '12px 24px',
              borderRadius: '30px', fontSize: '14px', fontWeight: 600,
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
              zIndex: 9999, maxWidth: '90vw', textAlign: 'center',
            }}>{toast}</motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes connectFabGlow {
          0%, 100% { box-shadow: 0 8px 32px rgba(79,70,229,0.5), 0 0 30px rgba(124,58,237,0.15); }
          50%       { box-shadow: 0 8px 32px rgba(79,70,229,0.7), 0 0 60px rgba(124,58,237,0.35); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </motion.div>
  )
}
