import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  ChevronRight, X, PenSquare, ShoppingBag,
  BookOpen, GraduationCap, Ghost, Camera, Users, Aperture, UtensilsCrossed, School, Crosshair, Zap
} from 'lucide-react'

const SIDEBAR_ITEMS = [
  { id: 'post',     label: 'Create Post',   icon: PenSquare,    color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
  { id: 'snap',     label: 'Snap Camera',   icon: Camera,       color: '#fbbf24', glow: 'rgba(251,191,36,0.5)'  },
  { id: 'story',    label: 'Add Story',     icon: Aperture,     color: '#f472b6', glow: 'rgba(244,114,182,0.5)' },
  { id: 'group',    label: 'New Group',     icon: Users,        color: '#34d399', glow: 'rgba(52,211,153,0.5)'  },
  { id: 'myhub',    label: 'My Hub',        icon: School,       color: '#f472b6', glow: 'rgba(244,114,182,0.5)' },
  { id: 'radar',    label: 'Campus Radar',  icon: Crosshair,    color: '#f87171', glow: 'rgba(248,113,113,0.5)' },
  { id: 'forge',    label: 'Skill-Forge',   icon: Zap,          color: '#fbbf24', glow: 'rgba(251,191,36,0.5)'  },
  { id: 'shop',     label: 'MNIT Shop',     icon: ShoppingBag,      color: '#60a5fa', glow: 'rgba(96,165,250,0.5)'  },
  { id: 'mess',     label: 'Mess Radar',    icon: UtensilsCrossed,  color: '#fb923c', glow: 'rgba(251,146,60,0.5)'  },
  { id: 'vault',    label: 'Vault',         icon: BookOpen,         color: '#c084fc', glow: 'rgba(192,132,252,0.5)' },
  { id: 'guidance', label: 'Guidance Hub',  icon: GraduationCap,    color: '#2dd4bf', glow: 'rgba(45,212,191,0.5)'  },
  { id: 'ama',      label: 'Anonymous AMA', icon: Ghost,            color: '#818cf8', glow: 'rgba(129,140,248,0.5)' },
]

export default function DraggableSidebar({ onNavigate, onPost, onSnap, onStory, onGroup, onShop, onMess }) {
  const [isOpen, setIsOpen] = useState(false)
  const [btnY, setBtnY] = useState(() => {
    try { return parseFloat(localStorage.getItem('onyx_sidebar_y')) || 0 } catch { return 0 }
  })
  const constraintsRef = useRef(null)
  const dragY = useMotionValue(btnY)

  // Save Y position across sessions
  useEffect(() => {
    localStorage.setItem('onyx_sidebar_y', btnY.toString())
  }, [btnY])

  const handleDragEnd = (_, info) => {
    // Snap back to left edge on X, keep Y position
    const newY = Math.max(-200, Math.min(info.point.y - window.innerHeight / 2, 200))
    setBtnY(newY)
  }

  const handleItemClick = (item) => {
    setIsOpen(false)
    switch (item.id) {
      case 'post':     onPost?.(); break
      case 'snap':     onSnap?.(); break
      case 'story':    onStory?.(); break
      case 'group':    onGroup?.(); break
      case 'shop':     onShop?.(); break
      case 'mess':     onMess?.(); break
      case 'vault':
      case 'guidance':
      case 'ama':
      case 'myhub':
      case 'radar':
      case 'forge':
        onNavigate?.(item.id); break
      default: break
    }
  }

  return (
    <>
      {/* ═══ DRAGGABLE TOGGLE BUTTON ═══ */}
      <motion.div
        ref={constraintsRef}
        style={{
          position: 'fixed',
          left: 0,
          top: `calc(50% + ${btnY}px)`,
          zIndex: 600,
          transform: 'translateY(-50%)',
        }}
      >
        <motion.button
          drag
          dragMomentum={false}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          // Snap X back to 0 (left edge)
          dragConstraints={{ left: 0, right: 0, top: -250, bottom: 250 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '0 14px 14px 0',
            background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(6,11,24,0.95))',
            border: '1px solid rgba(139,92,246,0.45)',
            borderLeft: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 20px rgba(139,92,246,0.35), 0 0 40px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
            touchAction: 'none',
          }}
        >
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          >
            <ChevronRight style={{ width: 20, height: 20, color: '#a78bfa' }} />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* ═══ SIDEBAR OVERLAY + DRAWER ═══ */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 700,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Drawer */}
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                zIndex: 800,
                background: 'linear-gradient(180deg, rgba(13,22,48,0.97) 0%, rgba(6,11,24,0.98) 100%)',
                borderRight: '1px solid rgba(139,92,246,0.25)',
                boxShadow: '4px 0 40px rgba(139,92,246,0.12), 20px 0 60px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              {/* Drawer Header */}
              <div style={{
                padding: '20px 18px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(124,58,237,0.5)',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>O</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff', lineHeight: 1.2 }}>Quick Actions</p>
                    <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ONYX Hub</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#94a3b8',
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </motion.button>
              </div>

              {/* Separator label — Actions */}
              <div style={{ padding: '14px 18px 6px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Actions</p>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {SIDEBAR_ITEMS.slice(0, 4).map((item, i) => (
                  <SidebarRow key={item.id} item={item} index={i} onClick={() => handleItemClick(item)} />
                ))}
              </div>

              {/* Separator label — Explore */}
              <div style={{ padding: '16px 18px 6px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Explore</p>
              </div>

              <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {SIDEBAR_ITEMS.slice(4).map((item, i) => (
                  <SidebarRow key={item.id} item={item} index={i + 4} onClick={() => handleItemClick(item)} />
                ))}
              </div>

              {/* Bottom branding */}
              <div style={{ marginTop: 'auto', padding: '20px 18px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', fontWeight: 600, letterSpacing: '0.06em' }}>
                  ONYX v2 · MNIT Jaipur
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function SidebarRow({ item, index, onClick }) {
  const { icon: Icon, label, color, glow } = item
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        x: 4,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 14px',
        borderRadius: 14,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 12px ${glow}`,
        flexShrink: 0,
      }}>
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', letterSpacing: '0.01em' }}>{label}</span>
      {item.id === 'radar' && typeof window !== 'undefined' && localStorage.getItem('onyx_radar_new') === 'true' && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#ef4444',
          boxShadow: '0 0 8px rgba(239,68,68,0.8), 0 0 16px rgba(239,68,68,0.4)',
          marginLeft: 'auto',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}
    </motion.button>
  )
}
