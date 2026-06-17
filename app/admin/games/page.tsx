'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'

interface Game {
  id: string
  name: string
  category: string
  description: string
  players: string
  duration: string
  age: string
  stock: number
  image: string
}

const EMPTY = {
  name: '',
  category: 'Strategy',
  description: '',
  players: '',
  duration: '',
  age: '',
  stock: 0,
  image: '',
}

const CATEGORIES = ['Strategy', 'Party', 'Family', 'Cooperative', 'Card', 'Trivia', 'RPG', 'Puzzle']

export default function AdminGamesPage() {
  const router = useRouter()
  const [checking, setChecking]   = useState(true)
  const [games, setGames]         = useState<Game[]>([])
  const [loading, setLoading]     = useState(true)
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState<Game | null>(null)
  const [form, setForm]           = useState({ ...EMPTY })
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace('/admin/login')
      setChecking(false)
    })
    return unsub
  }, [router])

  async function loadGames() {
    const snap = await getDocs(collection(db, 'games'))
    setGames(snap.docs.map(d => ({ id: d.id, ...d.data() } as Game)))
    setLoading(false)
  }

  useEffect(() => { loadGames() }, [])

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY })
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
      stock:       game.stock,
      image:       game.image,
    })
    setOpen(true)
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
    loadGames()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this game?')) return
    await deleteDoc(doc(db, 'games', id))
    loadGames()
  }

  if (checking) return null

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--black)',
      padding: '3rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
            }}>
              ← Back to Dashboard
            </a>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '2rem',
              color: 'var(--offwhite)',
            }}>
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
          }}>
            + Add Game
          </button>
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
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Name', 'Category', 'Players', 'Stock', 'Actions'].map(h => (
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
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-cinzel)', fontSize: '0.9rem', color: 'var(--offwhite)' }}>{game.name}</td>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)' }}>{game.category}</td>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)' }}>{game.players}</td>
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

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem',
        }}>
          <div style={{
            backgroundColor: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem 2rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1.2rem',
                color: 'var(--offwhite)',
              }}>
                {editing ? 'Edit Game' : 'Add Game'}
              </h2>
              <button onClick={() => setOpen(false)} style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(245,242,236,0.4)',
                fontSize: '1.2rem',
                cursor: 'pointer',
              }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {[
                { label: 'Name',                    key: 'name',        type: 'text' },
                { label: 'Players (e.g. 2–4)',      key: 'players',     type: 'text' },
                { label: 'Duration (e.g. 30–60 min)', key: 'duration',  type: 'text' },
                { label: 'Min Age (e.g. 8+)',        key: 'age',        type: 'text' },
                { label: 'Image URL',               key: 'image',       type: 'url' },
                { label: 'Stock',                   key: 'stock',       type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.68rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,242,236,0.35)',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-inter)',
                  }}>{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                    required={key !== 'image'}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--offwhite)',
                      padding: '0.75rem 1rem',
                      borderRadius: '2px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'var(--font-inter)',
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,242,236,0.35)',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-inter)',
                }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--offwhite)',
                    padding: '0.75rem 1rem',
                    borderRadius: '2px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,242,236,0.35)',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-inter)',
                }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--offwhite)',
                    padding: '0.75rem 1rem',
                    borderRadius: '2px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'var(--font-inter)',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(245,242,236,0.5)',
                  padding: '0.8rem',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 1,
                  backgroundColor: 'var(--purple)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.8rem',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  fontFamily: 'var(--font-inter)',
                }}>
                  {saving ? 'Saving…' : 'Save Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}