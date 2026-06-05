import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Flag,
} from 'lucide-react';

const CATEGORY_STYLES = {
  Notes: {
    background: 'rgba(16,185,129,0.2)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.25)',
    shadow: '0 0 12px rgba(16,185,129,0.15)',
  },
  PYQs: {
    background: 'rgba(59,130,246,0.2)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.25)',
    shadow: '0 0 12px rgba(59,130,246,0.15)',
  },
  'Lab Manuals': {
    background: 'rgba(245,158,11,0.2)',
    color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.25)',
    shadow: '0 0 12px rgba(245,158,11,0.15)',
  },
};

const MaterialCard = ({ item, profile, onVote, onReport }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredVote, setHoveredVote] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Notes;

  const uploaderName =
    item.uploader_profile?.username ||
    [item.uploader_profile?.first_name, item.uploader_profile?.last_name]
      .filter(Boolean)
      .join(' ') ||
    'unknown';

  const netVotes = item.upvotes ?? 0;

  const handleVote = (type) => {
    if (!profile) return;
    onVote?.(item.id, type);
  };

  const upActive = item.user_vote === 'up';
  const downActive = item.user_vote === 'down';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 20,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        overflow: 'visible',
      }}
      whileHover={{
        borderColor: 'rgba(255,255,255,0.14)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* ---- Top row: category badge + 3-dot menu ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Category badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            background: catStyle.background,
            color: catStyle.color,
            border: catStyle.border,
            boxShadow: catStyle.shadow,
            lineHeight: 1,
          }}
        >
          {item.category}
        </span>

        {/* 3-dot menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen((p) => !p)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="More options"
          >
            <MoreHorizontal size={18} />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: 'rgba(15,20,35,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 4,
                  minWidth: 180,
                  zIndex: 50,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <button
                  onClick={() => {
                    onReport?.(item.id);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ef4444',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Flag size={14} />
                  Report Broken Link
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---- Title ---- */}
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: '#f0f4ff',
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}
      >
        {item.title}
      </h3>

      {/* ---- Uploader ---- */}
      <span
        style={{
          fontSize: 12,
          color: '#64748b',
          marginTop: -6,
        }}
      >
        Uploaded by{' '}
        <span style={{ color: '#94a3b8', fontWeight: 500 }}>
          @{uploaderName}
        </span>
      </span>

      {/* ---- Year & Branch pills ---- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {item.btech_year && (
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              color: '#94a3b8',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              letterSpacing: 0.3,
            }}
          >
            {item.btech_year}
          </span>
        )}
        {item.branch && (
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              color: '#94a3b8',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              letterSpacing: 0.3,
            }}
          >
            {item.branch}
          </span>
        )}
      </div>

      {/* ---- Open in Drive button ---- */}
      <motion.a
        href={item.drive_link}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 700,
          textDecoration: 'none',
          border: 'none',
          cursor: 'pointer',
          boxShadow:
            '0 4px 20px rgba(37,99,235,0.35), 0 0 40px rgba(124,58,237,0.15)',
          transition: 'box-shadow 0.3s ease, filter 0.3s ease',
          letterSpacing: 0.3,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            '0 6px 28px rgba(37,99,235,0.5), 0 0 60px rgba(124,58,237,0.25)';
          e.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            '0 4px 20px rgba(37,99,235,0.35), 0 0 40px rgba(124,58,237,0.15)';
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        <ExternalLink size={16} />
        Open in Drive
      </motion.a>

      {/* ---- Bottom row: Voting ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          marginTop: 2,
        }}
      >
        {/* Upvote */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => handleVote('up')}
          onMouseEnter={() => setHoveredVote('up')}
          onMouseLeave={() => setHoveredVote(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            border: 'none',
            cursor: profile ? 'pointer' : 'default',
            background: upActive
              ? 'rgba(16,185,129,0.15)'
              : hoveredVote === 'up'
              ? 'rgba(255,255,255,0.06)'
              : 'transparent',
            color: upActive ? '#10b981' : '#64748b',
            boxShadow: upActive ? '0 0 14px rgba(16,185,129,0.3)' : 'none',
            transition: 'all 0.2s ease',
            padding: 0,
          }}
          aria-label="Upvote"
        >
          <ChevronUp size={20} strokeWidth={upActive ? 3 : 2} />
        </motion.button>

        {/* Vote count */}
        <span
          style={{
            minWidth: 28,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: upActive
              ? '#10b981'
              : downActive
              ? '#ef4444'
              : '#94a3b8',
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.2s ease',
            userSelect: 'none',
          }}
        >
          {netVotes}
        </span>

        {/* Downvote */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => handleVote('down')}
          onMouseEnter={() => setHoveredVote('down')}
          onMouseLeave={() => setHoveredVote(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            border: 'none',
            cursor: profile ? 'pointer' : 'default',
            background: downActive
              ? 'rgba(239,68,68,0.15)'
              : hoveredVote === 'down'
              ? 'rgba(255,255,255,0.06)'
              : 'transparent',
            color: downActive ? '#ef4444' : '#64748b',
            boxShadow: downActive ? '0 0 14px rgba(239,68,68,0.3)' : 'none',
            transition: 'all 0.2s ease',
            padding: 0,
          }}
          aria-label="Downvote"
        >
          <ChevronDown size={20} strokeWidth={downActive ? 3 : 2} />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MaterialCard;
