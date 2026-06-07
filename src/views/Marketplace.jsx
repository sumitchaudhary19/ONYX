import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Upload, ShoppingBag, MessageCircle, MoreVertical,
  CheckCircle, Tag, Loader, ChevronDown, Image as ImageIcon, Trash2, Pen
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

const CATEGORIES = ['Books', 'Electronics', 'Clothing', 'Furniture', 'Sports', 'Stationery', 'Vehicles', 'Other']

const CATEGORY_COLORS = {
  Books:       '#f59e0b',
  Electronics: '#3b82f6',
  Clothing:    '#ec4899',
  Furniture:   '#10b981',
  Sports:      '#ef4444',
  Stationery:  '#8b5cf6',
  Vehicles:    '#06b6d4',
  Other:       '#64748b',
}

/* ── Compress image in-browser before uploading ── */
async function compressImage(file, maxSizeMB = 1) {
  try {
    const imageCompression = (await import('browser-image-compression')).default
    return await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    })
  } catch {
    return file // fallback: use original
  }
}

/* ── Upload image to Supabase Storage ── */
async function uploadImage(file, sellerId) {
  const compressed = await compressImage(file)
  const ext = (compressed.name || 'image.jpg').split('.').pop()
  const path = `${sellerId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('marketplace')
    .upload(path, compressed, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('marketplace').getPublicUrl(path)
  return data.publicUrl
}

/* ── Sell Item Modal ── */
function SellModal({ profile, editItem, onClose, onListed }) {
  const [form, setForm] = useState({ 
    title: editItem?.title || '', 
    description: editItem?.description || '', 
    price: editItem?.price || '', 
    category: editItem?.category || 'Books' 
  })
  const [images, setImages] = useState([])         // File[]
  const [previews, setPreviews] = useState(editItem?.image_urls || []) // string (object URLs or remote URLs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const handleFiles = (files) => {
    const arr = Array.from(files).slice(0, 4 - images.length)
    setImages(prev => [...prev, ...arr])
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.price) return
    setLoading(true)
    setError(null)
    try {
      let imageUrls = previews.filter(p => !p.startsWith('blob:')) // keep existing remote URLs if not removed
      if (images.length > 0) {
        const results = await Promise.allSettled(images.map(img => uploadImage(img, profile.id)))
        const newUrls = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)
        imageUrls = [...imageUrls, ...newUrls]
        
        const failed = results.filter(r => r.status === 'rejected')
        if (failed.length > 0 && imageUrls.length === 0) {
          setError('Photos could not be uploaded (storage not ready). Listing without photos.')
        }
      }

      if (editItem) {
        const { error: updateError } = await supabase.from('marketplace_items').update({
          title:       form.title.trim(),
          description: form.description.trim(),
          price:       parseFloat(form.price),
          category:    form.category,
          image_urls:  imageUrls,
        }).eq('id', editItem.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('marketplace_items').insert({
          seller_id:   profile.id,
          title:       form.title.trim(),
          description: form.description.trim(),
          price:       parseFloat(form.price),
          category:    form.category,
          image_urls:  imageUrls,
        })
        if (insertError) throw insertError
      }
      onListed(editItem ? 'updated' : 'inserted')
      onClose()
    } catch (err) {
      setError(err.message ?? 'Failed to list item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 8500,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 8px'
      }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '500px',
          background: 'linear-gradient(180deg, #0d1630 0%, #080e22 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 16px 16px',
          padding: '24px',
          maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>{editItem ? 'Edit Listing' : 'List an Item'}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X style={{ width: 16, height: 16 }} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Image upload */}
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed rgba(138,43,226,0.4)', borderRadius: '16px',
                padding: '20px', textAlign: 'center', cursor: 'pointer',
                background: 'rgba(138,43,226,0.05)',
                transition: 'border-color 0.2s'
              }}
            >
              <ImageIcon style={{ width: 28, height: 28, color: '#c084fc', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
                {previews.length === 0 ? 'Tap to add photos (up to 4)' : `${previews.length} photo${previews.length > 1 ? 's' : ''} selected`}
              </p>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            </div>
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: '70px', height: '70px' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button
                      type="button" onClick={() => removeImage(i)}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                    ><X style={{ width: 10, height: 10 }} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fields */}
          {[
            { key: 'title', placeholder: 'Item title *', type: 'text' },
            { key: 'description', placeholder: 'Description (optional)', type: 'text' },
            { key: 'price', placeholder: 'Price (₹) *', type: 'number' },
          ].map(({ key, placeholder, type }) => (
            <input
              key={key} required={key !== 'description'} type={type} placeholder={placeholder} value={form[key]}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: '#f1f5f9', fontSize: '14px', fontWeight: 500, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          ))}

          {/* Category */}
          <div style={{ position: 'relative' }}>
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              style={{
                appearance: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '12px 16px', color: '#f1f5f9', fontSize: '14px', fontWeight: 500,
                outline: 'none', width: '100%', cursor: 'pointer'
              }}
            >
              {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0d1630' }}>{c}</option>)}
            </select>
            <ChevronDown style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#f87171', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: '14px', padding: '14px',
              color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {loading ? <Loader style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : (editItem ? <Pen style={{ width: 18, height: 18 }} /> : <Upload style={{ width: 18, height: 18 }} />)}
            {loading ? 'Saving…' : (editItem ? 'Save Changes' : 'List for Sale')}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

/* ── Product Card ── */
function ProductCard({ item, currentProfile, onMessageSeller, onMarkSold, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isMine = item.seller_id === currentProfile?.id
  const catColor = CATEGORY_COLORS[item.category] ?? '#64748b'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        background: 'linear-gradient(160deg, rgba(17,25,55,0.9) 0%, rgba(8,14,34,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.2s ease',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '68%', background: 'rgba(255,255,255,0.03)' }}>
        {item.image_urls?.length > 0 ? (
          <img
            src={item.image_urls[0]} alt={item.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag style={{ width: 36, height: 36, color: 'rgba(255,255,255,0.1)' }} />
          </div>
        )}
        {/* Category badge */}
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          background: `${catColor}22`, border: `1px solid ${catColor}66`,
          borderRadius: '20px', padding: '3px 10px',
          fontSize: '11px', fontWeight: 700, color: catColor, backdropFilter: 'blur(8px)'
        }}>
          {item.category}
        </div>
        {/* 3-dot menu for owner */}
        {isMine && (
          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
            <button
              onClick={() => setMenuOpen(p => !p)}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', display: 'flex' }}
            >
              <MoreVertical style={{ width: 14, height: 14 }} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }}
                      style={{
                        position: 'absolute', top: '36px', right: 0, minWidth: '160px', zIndex: 10,
                        background: '#0d1630', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '14px', padding: '6px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMarkSold(item.id); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', color: '#34d399' }}
                      >
                        <CheckCircle style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Mark as Sold</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(item); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', color: '#e2e8f0' }}
                      >
                        <Pen style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Edit Listing</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(item); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', color: '#ef4444' }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Delete Listing</span>
                      </button>
                    </motion.div>
                  </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, margin: 0 }}>
          {item.title}
        </p>
        {item.description && (
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.description}
          </p>
        )}
        <p style={{ fontSize: '18px', fontWeight: 900, color: '#a78bfa', margin: 0 }}>
          ₹{parseFloat(item.price).toLocaleString('en-IN')}
        </p>

        {!isMine && (
          <button
            onClick={() => onMessageSeller(item)}
            style={{
              marginTop: '4px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: '12px', padding: '11px',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 16px rgba(124,58,237,0.35)'
            }}
          >
            <MessageCircle style={{ width: 14, height: 14 }} />
            Message Seller
          </button>
        )}

        {isMine && (
          <div style={{
            marginTop: '4px', padding: '8px 12px',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '10px', fontSize: '12px', color: '#818cf8', fontWeight: 600, textAlign: 'center'
          }}>
            Your listing
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Main Marketplace Component ── */
export default function Marketplace({ profile, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [showSell, setShowSell] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_sold', false)
        .order('created_at', { ascending: false })
      setItems(data ?? [])
    } catch (err) {
      console.error('Marketplace fetch error', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleMessageSeller = async (item) => {
    // 1. Check if they are already friends
    const { data: friendReq } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${item.seller_id}),and(sender_id.eq.${item.seller_id},receiver_id.eq.${profile.id})`)
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle()

    const autoMsg = `Hey! I'm interested in buying your ${item.title} for ₹${parseFloat(item.price).toLocaleString('en-IN')}. Is it still available?`

    if (friendReq) {
      // Already friends: go straight to ChatRoom
      sessionStorage.setItem('marketplace_intro_msg', autoMsg)
      onClose()
      navigate(`/chat/room/${item.seller_id}`)
    } else {
      // Not friends: insert into notifications table and show toast
      await supabase.from('notifications').insert({
        receiver_id: item.seller_id,
        sender_id: profile.id,
        type: 'marketplace_interest',
        message: `${profile.first_name || 'Someone'} is interested to buy your ${item.title}.`,
        metadata: { item_id: item.id, auto_msg: autoMsg }
      })

      setToast("Interest sent! The seller will be notified to connect with you.")
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleMarkSold = async (id) => {
    await supabase.from('marketplace_items').update({ is_sold: true }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleEditItem = (item) => {
    setEditItem(item)
    setShowSell(true)
  }

  const handleDeleteItem = async (item) => {
    if (window.confirm("Are you sure you want to delete this item permanently?")) {
      setItems(prev => prev.filter(i => i.id !== item.id))
      try {
        const { error } = await supabase.from('marketplace_items').delete().eq('id', item.id)
        if (error) throw error
        setToast("Listing deleted successfully")
        setTimeout(() => setToast(null), 3000)
      } catch (err) {
        console.error("Delete failed", err)
        fetchItems()
      }
    }
  }

  const filteredItems = filter === 'All' ? items : items.filter(i => i.category === filter)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        background: '#06091a',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'rgba(6,9,26,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124,58,237,0.5)'
          }}>
            <ShoppingBag style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>Campus Store</h1>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>{items.length} active listings</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setEditItem(null); setShowSell(true); }}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: '12px', padding: '10px 18px',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)'
            }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Sell Item
          </motion.button>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
          ><X style={{ width: 18, height: 18 }} /></button>
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '8px', padding: '14px 20px', overflowX: 'auto', flexShrink: 0 }}>
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: '20px', border: 'none',
              background: filter === cat ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.06)',
              color: filter === cat ? '#fff' : '#94a3b8',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              boxShadow: filter === cat ? '0 4px 14px rgba(124,58,237,0.35)' : 'none',
              transition: 'all 0.2s'
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, padding: '4px 16px 80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '14px',
        alignItems: 'start'
      }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.04)', height: '260px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))
        ) : filteredItems.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px' }}>
            <ShoppingBag style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.1)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#475569' }}>No listings yet</p>
            <p style={{ fontSize: '13px', color: '#334155' }}>Be the first to sell something!</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredItems.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                currentProfile={profile}
                onMessageSeller={handleMessageSeller}
                onMarkSold={handleMarkSold}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Sell Modal */}
      <AnimatePresence>
        {showSell && (
          <SellModal 
            profile={profile} 
            editItem={editItem}
            onClose={() => { setShowSell(false); setEditItem(null); }} 
            onListed={(action) => {
              fetchItems()
              setToast(action === 'updated' ? 'Listing updated successfully!' : 'Listing published successfully!')
              setTimeout(() => setToast(null), 3000)
            }} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(16, 185, 129, 0.9)', color: '#fff',
              padding: '12px 24px', borderRadius: '30px', fontSize: '14px', fontWeight: 600,
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(10px)',
              zIndex: 9999, textAlign: 'center', minWidth: '300px'
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:0.2} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </motion.div>
  )
}
