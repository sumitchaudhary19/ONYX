import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Link2, Upload } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CLOUD_LINK_REGEX =
  /^https?:\/\/(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|mega\.nz|dropbox\.com|mediafire\.com|[\w-]+\.sharepoint\.com)/i;

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const BRANCH_OPTIONS = [
  'CSE', 'ECE', 'ME', 'CE', 'EE', 'Chemical', 'Metallurgy', 'Architecture', 'Planning',
];
const CATEGORY_OPTIONS = ['Notes', 'PYQs', 'Lab Manuals'];

export default function UploadMaterial({ profile, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [btechYear, setBtechYear] = useState('');
  const [branch, setBranch] = useState('');
  const [category, setCategory] = useState('Notes');
  const [driveLink, setDriveLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const linkTouched = driveLink.length > 0;
  const linkValid = CLOUD_LINK_REGEX.test(driveLink);
  const canSubmit = title.trim() && linkValid && btechYear && branch && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    const { error: dbError } = await supabase.from('vault_links').insert({
      uploader_id: profile.id,
      title: title.trim(),
      btech_year: btechYear,
      branch,
      category,
      drive_link: driveLink.trim(),
    });

    if (dbError) {
      setError(dbError.message || 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess?.();
    onClose?.();
  };

  /* ── shared field styles ── */
  const inputBase = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '14px',
    color: '#f0f4ff',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .2s',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
  };

  const selectStyle = {
    ...inputBase,
    cursor: 'pointer',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: 36,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: '#94a3b8',
    letterSpacing: 0.2,
  };

  return (
    <AnimatePresence>
      {/* ── overlay ── */}
      <motion.div
        key="upload-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* ── modal panel ── */}
        <motion.div
          key="upload-panel"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 460,
            background: 'linear-gradient(180deg, #0d1630, #080e22)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: 24,
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* ── header ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={17} color="#a78bfa" />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#f0f4ff',
                  letterSpacing: -0.2,
                }}
              >
                Contribute to Vault
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 10,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                transition: 'background .2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── form ── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* title */}
            <div>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                placeholder="e.g. Data Structures Mid-Sem Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputBase}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* year + branch row */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>B.Tech Year</label>
                <select
                  value={btechYear}
                  onChange={(e) => setBtechYear(e.target.value)}
                  style={{
                    ...selectStyle,
                    color: btechYear ? '#f0f4ff' : '#475569',
                  }}
                >
                  <option value="" disabled hidden>
                    Select year
                  </option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y} style={{ background: '#0d1630', color: '#f0f4ff' }}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{
                    ...selectStyle,
                    color: branch ? '#f0f4ff' : '#475569',
                  }}
                >
                  <option value="" disabled hidden>
                    Select branch
                  </option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b} style={{ background: '#0d1630', color: '#f0f4ff' }}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* category */}
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ ...selectStyle, color: '#f0f4ff' }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c} style={{ background: '#0d1630', color: '#f0f4ff' }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* cloud link */}
            <div>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={13} color="#64748b" />
                  Paste Cloud Link (G-Drive, OneDrive)
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  style={{
                    ...inputBase,
                    paddingRight: 42,
                    borderColor:
                      linkTouched && !linkValid
                        ? 'rgba(239,68,68,0.6)'
                        : linkValid
                        ? 'rgba(34,197,94,0.5)'
                        : 'rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => {
                    if (!linkTouched)
                      e.target.style.borderColor = 'rgba(124,58,237,0.5)';
                  }}
                  onBlur={(e) => {
                    if (!linkTouched)
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                />
                {linkValid && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#22c55e',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Check size={18} strokeWidth={3} />
                  </div>
                )}
              </div>
              {linkTouched && !linkValid && (
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 12,
                    color: '#ef4444',
                    lineHeight: 1.4,
                  }}
                >
                  Please paste a valid cloud link (Google Drive, OneDrive, etc.)
                </p>
              )}
            </div>

            {/* error banner */}
            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#f87171',
                }}
              >
                {error}
              </div>
            )}

            {/* submit */}
            <motion.button
              type="submit"
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.015 } : {}}
              whileTap={canSubmit ? { scale: 0.98 } : {}}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity .25s',
                marginTop: 4,
                letterSpacing: 0.2,
              }}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  style={{
                    width: 20,
                    height: 20,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                <>
                  <Upload size={17} />
                  Contribute
                </>
              )}
            </motion.button>
          </form>

          {/* ── placeholder-color hack ── */}
          <style>{`
            input::placeholder, select::placeholder {
              color: #475569 !important;
              opacity: 1;
            }
            select option:disabled {
              color: #475569;
            }
            /* hide default scrollbar but keep scrolling */
            ::-webkit-scrollbar { width: 4px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
          `}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
