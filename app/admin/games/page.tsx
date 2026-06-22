'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../lib/adminAuth'

interface Game {
  id: string
  name: string
  category: string
  description: string
  players: string
  duration: string
  age: string
  price: number
  stock: number
  image: string
}

const EMPTY = {
  name: '',
  category: '',
  description: '',
  players: '',
  duration: '',
  age: '',
  price: 0,
  stock: 0,
  image: '',
}

const FALLBACK_CATEGORIES = ['Strategy', 'Party', 'Family', 'Cooperative', 'Card', 'Trivia', 'RPG', 'Puzzle']

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

export default function AdminGamesPage() {
  const { checking } = useRequireRole(SECTION_ACCESS.games)
  const isMobile = useIsMobile()
  const [games, setGames]                   = useState<Game[]>([])
  const [loading, setLoading]               = useState(true)
  const [open, setOpen]                     = useState(false)
  const [editing, setEditing]               = useState<Game | null>(null)
  const [form, setForm]                     = useState({ ...EMPTY })
  const [saving, setSaving]                 = useState(false)
  const [uploading, setUploading]           = useState(false)
  const [categories, setCategories]         = useState<string[]>([])
  const [newCategory, setNewCategory]       = useState('')
  const [addingCat, setAddingCat]           = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const catFileRef                          = useRef<HTMLInputElement>(null)

  async function loadGames() {
    const snap = await getDocs(collection(db, 'games'))
    setGames(snap.docs.map(d => ({ id: d.id, ...d.data() } as Game)))
    setLoading(false)
  }

  async function loadCategories() {
    const snap = await getDocs(collection(db, 'gameCategories'))
    setCategories(snap.docs.map(d => (d.data() as any).name))
  }

  useEffect(() => {
    loadGames()
    loadCategories()
  }, [])

  async function addCategory() {
    if (!newCategory.trim()) return
    setAddingCat(true)
    await addDoc(collection(db, 'gameCategories'), {
      name: newCategory.trim(),
      createdAt: serverTimestamp(),
    })
    setNewCategory('')
    setAddingCat(false)
    loadCategories()
  }

  async function deleteCategory(name: string) {
    const snap = await getDocs(collection(db, 'gameCategories'))
    const docToDelete = snap.docs.find(d => (d.data() as any).name === name)
    if (docToDelete) await deleteDoc(doc(db, 'gameCategories', docToDelete.id))
    loadCategories()
  }

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY, category: categories[0] ?? FALLBACK_CATEGORIES[0] })
    setOpen(true)
  }

  function openEdit(game: Game) {
    setEditing(game)
    setForm({
      name:        game.name,
      category:    game.category,
      description: game.description,
      players:     game.players,
      duration:    game.duration,
      age:         game.age,
      price:       game.price,
      stock:       game.stock,
      image:       game.image,
    })
    setOpen(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    formData.append('key', process.env.NEXT_PUBLIC_IMGBB_API_KEY!)
    const res  = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setForm(f => ({ ...f, image: data.data.url }))
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      await updateDoc(doc(db, 'games', editing.id), {
        ...form,
        updatedAt: serverTimestamp(),
      })
    } else {
      await addDoc(collection(db, 'games'), {
        ...form,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    setSaving(false)
    setOpen(false)
    if (catFileRef.current) catFileRef.current.value = ''
    loadGames()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this game?')) return
    await deleteDoc(doc(db, 'games', id))
    loadGames()
  }

  const displayCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES

  const inputStyle = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#F5F2EC',
    padding: '0.75rem 1rem',
    borderRadius: '2px',
    fontSize: '0.85rem',
    outline: 'none',
    fontFamily: 'var(--font-inter)',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.68rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,242,236,0.35)',
    marginBottom: '0.5rem',
    fontFamily: 'var(--font-inter)',
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '1.25rem' : '0',
          marginBottom: '2rem',
        }}>
          <div>
            <a href="/admin" style={{
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(245,242,236,0.3)',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter)',
              marginBottom: '0.5rem',
              display: 'block',
            }}>← Back to Dashboard</a>
            <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)' }}>
              Game Library
            </h1>
          </div>
          <button onClick={openNew} style={{
            backgroundColor: 'var(--purple)',
            color: '#fff',
            padding: '0.7rem 1.5rem',
            border: 'none',
            borderRadius: '2px',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
          }}>+ Add Game</button>
        </div>

        {/* Category Manager */}
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => setShowCatManager(!showCatManager)} style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(245,242,236,0.5)',
            padding: '0.6rem 1.2rem',
            borderRadius: '2px',
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
            marginBottom: '1rem',
          }}>
            {showCatManager ? 'Hide' : 'Manage'} Categories
          </button>

          {showCatManager && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px',
              padding: '1.5rem',
            }}>
              <p style={{
                fontSize: '0.68rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(245,242,236,0.3)',
                fontFamily: 'var(--font-inter)',
                marginBottom: '1rem',
              }}>Game Categories</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {displayCategories.map(cat => (
                  <div key={cat} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'rgba(106,106,183,0.1)',
                    border: '1px solid rgba(106,106,183,0.2)',
                    borderRadius: '2px',
                    padding: '0.35rem 0.8rem',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.82rem',
                      color: 'var(--offwhite)',
                    }}>{cat}</span>
                    {categories.length > 0 && (
                      <button onClick={() => deleteCategory(cat)} style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(228,51,41,0.6)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '0',
                        lineHeight: 1,
                      }}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="New category name…"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  style={{
                    flex: 1,
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F5F2EC',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '2px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    fontFamily: 'var(--font-inter)',
                  }}
                />
                <button onClick={addCategory} disabled={addingCat || !newCategory.trim()} style={{
                  backgroundColor: 'var(--purple)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.6rem 1rem',
                  borderRadius: '2px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                  opacity: addingCat || !newCategory.trim() ? 0.5 : 1,
                }}>+ Add</button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            overflow: 'hidden',
            overflowX: 'auto',
          }}>
            <table style={{ width: '100%', minWidth: isMobile ? '640px' : undefined, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Image', 'Name', 'Category', 'Players', 'Price', 'Stock', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '1rem 1.2rem',
                      textAlign: 'left',
                      fontSize: '0.65rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'rgba(245,242,236,0.3)',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 400,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr key={game.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.8rem 1.2rem' }}>
                      {game.image && (
                        <img src={game.image} alt={game.name} style={{
                          width: '50px', height: '50px',
                          objectFit: 'cover', borderRadius: '2px',
                        }} />
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-cinzel)', fontSize: '0.9rem', color: 'var(--offwhite)' }}>{game.name}</td>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)' }}>{game.category}</td>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)' }}>{game.players}</td>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'var(--teal)' }}>
                      {game.price > 0 ? `$${game.price}` : '—'}
                    </td>
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.7rem',
                        borderRadius: '2px',
                        backgroundColor: game.stock > 0 ? 'rgba(0,160,152,0.15)' : 'rgba(228,51,41,0.15)',
                        color: game.stock > 0 ? 'var(--teal)' : 'var(--red)',
                        fontFamily: 'var(--font-inter)',
                      }}>
                        {game.stock > 0 ? `${game.stock} in stock` : 'Out of stock'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEdit(game)} style={{
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(245,242,236,0.5)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '2px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-inter)',
                        }}>Edit</button>
                        <button onClick={() => handleDelete(game.id)} style={{
                          background: 'transparent',
                          border: '1px solid rgba(228,51,41,0.3)',
                          color: 'var(--red)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '2px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-inter)',
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: '#0d0d0d',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* Modal Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '1.25rem 1.5rem' : '1.5rem 3rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: isMobile ? '1.1rem' : '1.5rem', color: 'var(--offwhite)' }}>
              {editing ? 'Edit Game' : 'Add New Game'}
            </h2>
            <button onClick={() => setOpen(false)} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,242,236,0.5)',
              padding: '0.5rem 1.2rem',
              borderRadius: '2px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>✕ Close</button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSave} style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '0',
            overflow: isMobile ? 'auto' : 'hidden',
          }}>

            {/* Left Column */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2.5rem 3rem',
              borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
              borderBottom: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              overflowY: isMobile ? 'visible' : 'auto',
            }}>
              <p style={{
                fontSize: '0.68rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--teal)',
                fontFamily: 'var(--font-inter)',
              }}>Game Details</p>

              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <select value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ ...inputStyle, color: '#F5F2EC', backgroundColor: '#1a1a1a' }}>
                  {displayCategories.map(c => (
                    <option key={c} value={c} style={{ backgroundColor: '#1a1a1a', color: '#F5F2EC' }}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} rows={4} required
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Players (e.g. 2–4)</label>
                  <input type="text" value={form.players} required
                    onChange={e => setForm(f => ({ ...f, players: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Duration</label>
                  <input type="text" value={form.duration} required
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Min Age (e.g. 8+)</label>
                  <input type="text" value={form.age} required
                    onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Price ($)</label>
                  <input type="number" value={form.price} required min={0}
                    onChange={e => setForm(f => ({ ...f, price: +e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Stock</label>
                  <input type="number" value={form.stock} required min={0}
                    onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2.5rem 3rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}>
              <p style={{
                fontSize: '0.68rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--teal)',
                fontFamily: 'var(--font-inter)',
              }}>Game Image</p>

              <div>
                <label style={labelStyle}>Upload Image</label>
                <input
                  ref={catFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                />
                {uploading && (
                  <p style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--teal)',
                    fontFamily: 'var(--font-inter)',
                  }}>Uploading…</p>
                )}
              </div>

              {form.image && !uploading ? (
                <div style={{
                  flex: 1,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  minHeight: isMobile ? '200px' : '300px',
                }}>
                  <img src={form.image} alt="Preview" style={{
                    maxWidth: '100%',
                    maxHeight: '280px',
                    objectFit: 'contain',
                  }} />
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  minHeight: isMobile ? '200px' : '300px',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(245,242,236,0.2)',
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.82rem',
                }}>
                  Image preview will appear here
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(245,242,236,0.5)',
                  padding: '0.9rem',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                }}>Cancel</button>
                <button type="submit" disabled={saving || uploading} style={{
                  flex: 1,
                  backgroundColor: 'var(--purple)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.9rem',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: saving || uploading ? 'not-allowed' : 'pointer',
                  opacity: saving || uploading ? 0.6 : 1,
                  fontFamily: 'var(--font-inter)',
                }}>
                  {saving ? 'Saving…' : 'Save Game'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}