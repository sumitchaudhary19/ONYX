import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ghost, Send, Flag, ChevronUp, MessageSquare, X,
  Shield, Sparkles, Award, PenLine
} from 'lucide-react'
import { supabase } from '../supabaseClient'

const GRADS = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
]

function SeniorAvatar({ p, size = 36, idx = 0 }) {
  const init = [p?.first_name, p?.last_name].filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?'
  if (p?.avatar_url) return <img src={p.avatar_url} alt="" style={{ width: size, height: size, borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
  return <div style={{ width: size, height: size, borderRadius: '12px', flexShrink: 0, background: GRADS[idx % GRADS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32, fontWeight: 700, color: '#fff' }}>{init}</div>
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/* ═══════════════════════════════════════════════════════════
   ANSWER CARD — Senior's answer with upvote + Top Mentor
   ═══════════════════════════════════════════════════════════ */
function AnswerCard({ answer, profile, index }) {
  const [upvotes, setUpvotes] = useState(answer.upvotes || 0)
  const [voted, setVoted] = useState(false)
  const senior = answer.senior_profile
  const seniorName = [senior?.first_name, senior?.last_name].filter(Boolean).join(' ') || 'Senior'
  const isTopMentor = upvotes > 10

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('ama_upvotes').select('id').eq('user_id', profile.id).eq('answer_id', answer.id).single()
      .then(({ data }) => { if (data) setVoted(true) })
  }, [profile?.id, answer.id])

  const handleUpvote = async () => {
    if (!profile?.id || voted) return
    setVoted(true)
    setUpvotes(v => v + 1)
    try {
      await supabase.from('ama_upvotes').insert({ user_id: profile.id, answer_id: answer.id })
      await supabase.from('ama_answers').update({ upvotes: upvotes + 1 }).eq('id', answer.id)
    } catch {
      setVoted(false)
      setUpvotes(v => v - 1)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      style={{
        display: 'flex', gap: '12px', padding: '14px 16px',
        background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)', marginTop: '8px',
      }}
    >
      {/* Upvote column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '32px' }}>
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleUpvote} disabled={voted}
          style={{
            background: 'none', border: 'none', cursor: voted ? 'default' : 'pointer', padding: '4px',
            color: voted ? '#f59e0b' : '#475569', transition: 'color 0.2s',
          }}>
          <ChevronUp style={{ width: 20, height: 20 }} />
        </motion.button>
        <span style={{ fontSize: '13px', fontWeight: 700, color: voted ? '#f59e0b' : '#64748b' }}>{upvotes}</span>
      </div>

      {/* Answer body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <SeniorAvatar p={senior} size={28} idx={index} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{seniorName}</span>
          {senior?.btech_year && (
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>• {senior.btech_year} {senior.branch || ''}</span>
          )}
          {isTopMentor && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: '20px', padding: '2px 8px',
              fontSize: '9px', fontWeight: 700, color: '#fbbf24',
              animation: 'mentorGlow 2s ease-in-out infinite',
            }}>
              <Award style={{ width: 9, height: 9 }} /> TOP MENTOR 🌟
            </span>
          )}
        </div>
        <p style={{ fontSize: '14px', color: '#b8c5d6', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{answer.answer_text}</p>
        <span style={{ fontSize: '11px', color: '#334155', marginTop: '6px', display: 'block' }}>{fmtTime(answer.created_at)}</span>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   QUESTION CARD — Ghost persona + answers + write answer
   ═══════════════════════════════════════════════════════════ */
function QuestionCard({ question, profile, isSenior, index, onReport, onAnswerSubmitted }) {
  const [showAnswers, setShowAnswers] = useState(false)
  const [answers, setAnswers] = useState([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [showWriteAnswer, setShowWriteAnswer] = useState(false)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reported, setReported] = useState(false)
  const answerCount = question._answer_count || 0

  const fetchAnswers = async () => {
    setLoadingAnswers(true)
    const { data } = await supabase
      .from('ama_answers')
      .select('*')
      .eq('question_id', question.id)
      .order('upvotes', { ascending: false })

    let enriched = data || []
    if (enriched.length > 0) {
      const seniorIds = [...new Set(enriched.map(a => a.senior_id))]
      const { data: profiles } = await supabase.from('profiles')
        .select('id, first_name, last_name, username, avatar_url, btech_year, branch')
        .in('id', seniorIds)
      const pMap = {}
      ;(profiles || []).forEach(p => { pMap[p.id] = p })
      enriched = enriched.map(a => ({ ...a, senior_profile: pMap[a.senior_id] || null }))
    }

    setAnswers(enriched)
    setLoadingAnswers(false)
  }

  const toggleAnswers = () => {
    if (!showAnswers && answers.length === 0) fetchAnswers()
    setShowAnswers(!showAnswers)
  }

  const submitAnswer = async () => {
    if (!answerText.trim() || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('ama_answers').insert({
        question_id: question.id,
        senior_id: profile.id,
        answer_text: answerText.trim(),
      })
      if (error) throw error
      setAnswerText('')
      setShowWriteAnswer(false)
      fetchAnswers()
      setShowAnswers(true)
      onAnswerSubmitted?.()
    } catch (e) {
      console.error('[AMA] answer error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '22px', padding: '20px', marginBottom: '12px',
      }}
    >
      {/* Ghost persona header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '13px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))',
          border: '1px solid rgba(139,92,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ghost style={{ width: 20, height: 20, color: '#a78bfa' }} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#c4b5fd' }}>Anonymous Fresher</span>
          <span style={{ fontSize: '11px', color: '#475569', display: 'block' }}>{fmtTime(question.created_at)}</span>
        </div>
        {!reported ? (
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => { setReported(true); onReport(question.id) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
            <Flag style={{ width: 13, height: 13 }} /> Report
          </motion.button>
        ) : (
          <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Reported ✓</span>
        )}
      </div>

      {/* Question text */}
      <p style={{
        fontSize: '15px', color: '#e2e8f0', lineHeight: 1.7, margin: '0 0 16px',
        whiteSpace: 'pre-wrap', fontWeight: 500,
      }}>{question.question_text}</p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={toggleAnswers}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
          <MessageSquare style={{ width: 14, height: 14 }} />
          {answerCount} {answerCount === 1 ? 'Answer' : 'Answers'}
        </motion.button>

        {isSenior && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowWriteAnswer(!showWriteAnswer)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '12px',
              background: showWriteAnswer ? 'rgba(79,70,229,0.2)' : 'rgba(99,102,241,0.1)',
              border: `1px solid ${showWriteAnswer ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)'}`,
              color: '#818cf8', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
            <PenLine style={{ width: 14, height: 14 }} />
            Write Answer
          </motion.button>
        )}
      </div>

      {/* Write answer area */}
      <AnimatePresence>
        {showWriteAnswer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', marginTop: '12px' }}
          >
            <textarea
              placeholder="Share your experience or answer this question..."
              value={answerText} onChange={e => setAnswerText(e.target.value)} rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                padding: '14px', color: '#f0f4ff', fontSize: '14px', lineHeight: 1.6,
                outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => setShowWriteAnswer(false)}
                style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={submitAnswer}
                disabled={!answerText.trim() || submitting}
                style={{
                  padding: '8px 20px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: answerText.trim() ? 'pointer' : 'not-allowed',
                  opacity: answerText.trim() ? 1 : 0.5,
                }}>
                {submitting ? '...' : 'Post Answer'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answers list */}
      <AnimatePresence>
        {showAnswers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            {loadingAnswers ? (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', borderRadius: '50%', margin: '0 auto' }} />
              </div>
            ) : answers.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#475569', textAlign: 'center', padding: '16px 0' }}>No answers yet. Be the first senior to respond!</p>
            ) : (
              answers.map((a, i) => <AnswerCard key={a.id} answer={a} profile={profile} index={i} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ASK QUESTION MODAL — for freshers
   ═══════════════════════════════════════════════════════════ */
function AskQuestionModal({ profile, onClose, onSuccess }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('ama_questions').insert({
        asker_id: profile.id,
        question_text: text.trim(),
      })
      if (error) throw error
      onSuccess()
      onClose()
    } catch (e) {
      console.error('[AMA] ask error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9100,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 30, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'linear-gradient(180deg, #0d1630, #080e22)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '28px', padding: '28px', position: 'relative',
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '10px',
          width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#64748b',
        }}><X style={{ width: 16, height: 16 }} /></button>

        {/* Ghost icon */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{
              width: 56, height: 56, borderRadius: '18px', margin: '0 auto 12px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Ghost style={{ width: 28, height: 28, color: '#a78bfa' }} />
          </motion.div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f4ff', margin: '0 0 4px' }}>Ask Anonymously</h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Your question will appear without your name</p>
        </div>

        {/* Textarea */}
        <textarea
          placeholder="What do you want to know from seniors? 🤔"
          value={text} onChange={e => setText(e.target.value)}
          rows={5}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
            padding: '16px', color: '#f0f4ff', fontSize: '15px', lineHeight: 1.7,
            outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            minHeight: '120px',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />

        {/* Anonymity badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          margin: '14px 0 20px', padding: '8px 14px', borderRadius: '12px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <Shield style={{ width: 14, height: 14, color: '#34d399' }} />
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#34d399',
            animation: 'anonPulse 2s ease-in-out infinite',
          }}>
            100% Anonymous. Your identity is hidden from everyone.
          </span>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          style={{
            width: '100%', padding: '15px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            opacity: text.trim() ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
          }}>
          {submitting ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
          ) : (
            <><Send style={{ width: 16, height: 16 }} /> Post Question</>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN ANONYMOUS AMA COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function AnonymousAMA({ profile }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAskModal, setShowAskModal] = useState(false)
  const [toast, setToast] = useState(null)

  const userYear = profile?.btech_year || profile?.btechYear || ''
  const isFresher = userYear === '1st Year' || userYear === '1st' || userYear === 'GUEST' || !userYear

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      // Use the anonymous view to hide asker_id
      const { data, error } = await supabase
        .from('ama_questions_anonymous')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // Fallback to direct table if view doesn't exist yet
        const { data: fallback } = await supabase
          .from('ama_questions')
          .select('id, question_text, reports_count, is_active, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50)
        
        let items = fallback || []
        // Fetch answer counts
        if (items.length > 0) {
          const qIds = items.map(q => q.id)
          const { data: answers } = await supabase.from('ama_answers').select('question_id').in('question_id', qIds)
          const countMap = {}
          ;(answers || []).forEach(a => { countMap[a.question_id] = (countMap[a.question_id] || 0) + 1 })
          items = items.map(q => ({ ...q, _answer_count: countMap[q.id] || 0 }))
        }
        setQuestions(items)
        setLoading(false)
        return
      }

      let items = data || []
      // Fetch answer counts
      if (items.length > 0) {
        const qIds = items.map(q => q.id)
        const { data: answers } = await supabase.from('ama_answers').select('question_id').in('question_id', qIds)
        const countMap = {}
        ;(answers || []).forEach(a => { countMap[a.question_id] = (countMap[a.question_id] || 0) + 1 })
        items = items.map(q => ({ ...q, _answer_count: countMap[q.id] || 0 }))
      }

      setQuestions(items)
    } catch (err) {
      console.error('[AMA] fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  const handleReport = async (questionId) => {
    try {
      // Check if already reported
      const { data: existing } = await supabase
        .from('ama_reports')
        .select('id')
        .eq('user_id', profile.id)
        .eq('question_id', questionId)
        .single()

      if (existing) return // already reported

      await supabase.from('ama_reports').insert({ user_id: profile.id, question_id: questionId })

      const q = questions.find(q => q.id === questionId)
      const newCount = (q?.reports_count || 0) + 1
      await supabase.from('ama_questions').update({ 
        reports_count: newCount,
        ...(newCount >= 3 ? { is_active: false } : {})
      }).eq('id', questionId)

      if (newCount >= 3) {
        setQuestions(prev => prev.filter(q => q.id !== questionId))
      } else {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, reports_count: newCount } : q))
      }
      showToast('Question reported. Thanks for keeping AMA clean!')
    } catch (e) {
      console.error('[AMA] report:', e)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Glowing Header ── */}
      <div style={{ padding: '20px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <motion.div
            animate={{ boxShadow: ['0 0 12px rgba(139,92,246,0.3)', '0 0 30px rgba(139,92,246,0.7)', '0 0 12px rgba(139,92,246,0.3)'] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{
              width: 42, height: 42, borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ghost style={{ width: 21, height: 21, color: '#fff' }} />
          </motion.div>
          <div>
            <h2 style={{ fontSize: '21px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              <span style={{
                background: 'linear-gradient(135deg, #c4b5fd, #818cf8, #a78bfa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Anonymous AMA 👻
              </span>
            </h2>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>
              {isFresher ? 'Ask anything anonymously · Seniors will answer' : 'Help freshers by answering their questions'}
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 14px', borderRadius: '20px', marginTop: '8px',
          background: isFresher ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${isFresher ? 'rgba(139,92,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
        }}>
          {isFresher ? <Ghost style={{ width: 12, height: 12, color: '#a78bfa' }} /> : <Sparkles style={{ width: 12, height: 12, color: '#34d399' }} />}
          <span style={{ fontSize: '11px', fontWeight: 700, color: isFresher ? '#a78bfa' : '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isFresher ? 'Fresher Mode · Anonymous' : `Senior · ${userYear}`}
          </span>
        </div>
      </div>

      {/* ── Feed ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px', scrollbarWidth: 'none' }}>
        {loading && [0, 1, 2].map(i => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '22px', padding: '20px', marginBottom: '12px',
            animation: 'amaPulse 1.6s ease-in-out infinite', animationDelay: `${i * 0.15}s`,
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '13px', background: 'rgba(255,255,255,0.06)' }} />
              <div><div style={{ width: 100, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }} /><div style={{ width: 60, height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} /></div>
            </div>
            <div style={{ width: '90%', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
            <div style={{ width: '70%', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}

        {!loading && questions.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '60px', gap: '14px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '22px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ghost style={{ width: 32, height: 32, color: '#7c3aed' }} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#94a3b8' }}>No questions yet</p>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, maxWidth: '280px' }}>
              {isFresher ? 'Be the first to ask something! Tap the button below.' : 'Waiting for freshers to ask questions...'}
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id} question={q} profile={profile}
              isSenior={!isFresher} index={i}
              onReport={handleReport}
              onAnswerSubmitted={() => showToast('Answer posted! 🎉')}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Fresher FAB: Ask Anonymously ── */}
      {isFresher && (
        <motion.button
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAskModal(true)}
          style={{
            position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
            padding: '16px 32px', borderRadius: '50px',
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 8px 32px rgba(124,58,237,0.5)',
            zIndex: 100,
            animation: 'askFabGlow 2.5s ease-in-out infinite',
          }}
        >
          <Ghost style={{ width: 18, height: 18 }} /> Ask Anonymously 🥷
        </motion.button>
      )}

      {/* ── Ask Modal ── */}
      <AnimatePresence>
        {showAskModal && (
          <AskQuestionModal
            profile={profile}
            onClose={() => setShowAskModal(false)}
            onSuccess={() => { showToast('Question posted anonymously! 🎉'); fetchQuestions() }}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: '150px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(16,185,129,0.92)', color: '#fff', padding: '12px 24px',
              borderRadius: '30px', fontSize: '14px', fontWeight: 600,
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
              zIndex: 9999, maxWidth: '90vw', whiteSpace: 'nowrap',
            }}>{toast}</motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes amaPulse { 0%,100%{opacity:0.6} 50%{opacity:0.3} }
        @keyframes askFabGlow {
          0%,100% { box-shadow: 0 8px 32px rgba(124,58,237,0.5), 0 0 20px rgba(139,92,246,0.15); }
          50%     { box-shadow: 0 8px 32px rgba(124,58,237,0.7), 0 0 50px rgba(139,92,246,0.35); }
        }
        @keyframes anonPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes mentorGlow { 0%,100%{box-shadow:0 0 8px rgba(251,191,36,0.2)} 50%{box-shadow:0 0 18px rgba(251,191,36,0.5)} }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
