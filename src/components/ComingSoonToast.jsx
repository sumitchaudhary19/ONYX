import { useEffect } from 'react'
import { motion } from 'framer-motion'

/**
 * ComingSoonToast — A premium animated "Coming Soon" capsule notification.
 * @param {string} message - The text to display (e.g., "Pulse is arriving soon.")
 * @param {function} onClose - Callback to dismiss the toast
 * @param {number} duration - Auto-dismiss duration in ms (default: 2500)
 */
export default function ComingSoonToast({ message, onClose, duration = 2500 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '92vw',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 24px',
          borderRadius: '100px',
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          boxShadow:
            '0 0 30px rgba(6, 182, 212, 0.12), 0 0 60px rgba(139, 92, 246, 0.08), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Animated glow dot */}
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            boxShadow: '0 0 12px rgba(6, 182, 212, 0.6)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
          }}
        >
          🚀 {message}
        </span>
      </div>
    </motion.div>
  )
}
