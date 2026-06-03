import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import Marketplace from '../views/Marketplace'

/* ── Cinematic white-flash transition screen ── */
function TransitionScreen({ onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      onAnimationComplete={onDone}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <motion.p
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          fontSize: 'clamp(2.5rem, 10vw, 5rem)',
          fontWeight: 900,
          color: '#000000',
          letterSpacing: '-0.03em',
          fontFamily: "'Inter', 'Outfit', sans-serif",
          userSelect: 'none'
        }}
      >
        mnit shop
      </motion.p>
    </motion.div>
  )
}

/* ── Shop Floating Action Button ── */
export default function ShopFAB({ profile }) {
  const [phase, setPhase] = useState('idle') // 'idle' | 'transition' | 'shop'

  const handleFabClick = () => {
    if (phase !== 'idle') return
    setPhase('transition')
    // After 2 seconds, swap to the actual shop
    setTimeout(() => setPhase('shop'), 2000)
  }

  return (
    <>
      {/* ── FAB Button ── */}
      <AnimatePresence>
        {phase === 'idle' && (
          <motion.button
            key="shop-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleFabClick}
            title="Campus Marketplace"
            style={{
              position: 'fixed',
              bottom: 'calc(68px + 18px)',  /* above bottom nav */
              right: '18px',
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              border: '1px solid rgba(138, 43, 226, 0.4)',
              background: 'rgba(10, 6, 20, 0.85)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 200,
              animation: 'shopFabBreathing 2.5s ease-in-out infinite',
            }}
          >
            <ShoppingBag
              style={{
                width: '22px', height: '22px',
                color: '#c084fc',
                filter: 'drop-shadow(0 0 6px rgba(192,132,252,0.8))'
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Cinematic Flash Overlay ── */}
      <AnimatePresence>
        {phase === 'transition' && (
          <motion.div
            key="shop-transition"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{
                fontSize: 'clamp(2.5rem, 10vw, 5rem)',
                fontWeight: 900,
                color: '#000000',
                letterSpacing: '-0.03em',
                fontFamily: "'Inter', 'Outfit', sans-serif",
                userSelect: 'none'
              }}
            >
              mnit shop
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Marketplace Modal ── */}
      <AnimatePresence>
        {phase === 'shop' && (
          <Marketplace
            profile={profile}
            onClose={() => setPhase('idle')}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shopFabBreathing {
          0%, 100% { box-shadow: 0 0 10px 3px rgba(138, 43, 226, 0.4); }
          50%       { box-shadow: 0 0 22px 8px rgba(138, 43, 226, 0.75); }
        }
      `}</style>
    </>
  )
}
