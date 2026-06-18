'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, updateDoc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import {
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Category {
  id: string
  name: string
  order: number
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  order: number
  badge?: string
  available: boolean
}

const EMPTY_ITEM = {
  name: '',
  description: '',
  price: 0,
  categoryId: '',
  order: 0,
  badge: '',
  available: true,
}

function SortableItem({ item, onEdit, onDelete }: {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={{
      ...style,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.9rem 1.2rem',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(255,255,255,0.01)',
    }}>
      {/* Drag handle */}
      <div {...attributes} {...listeners} style={{
        cursor: 'grab',
        color: 'rgba(255,255,255,0.2)',
        fontSize: '1rem',
        flexShrink: 0,
      }}>⠿</div>

      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: 'var(--font-cinzel)',
          fontSize: '0.9rem',
          color: 'var(--offwhite)',
          marginBottom: '0.2rem',
        }}>{item.name}</p>
        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '0.75rem',
          color: 'rgba(245,242,236,0.4)',
        }}>{item.description}</p>
      </div>

      {item.badge && (
        <span style={{
          fontSize: '0.65rem',
          padding: '0.2rem 0.6rem',
          borderRadius: '2px',
          backgroundColor: 'rgba(0,160,152,0.15)',
          color: 'var(--teal)',
          fontFamily: 'var(--font-inter)',
        }}>{item.badge}</span>
      )}

      <span style={{
        fontFamily: 'var(--font-inter)',
        fontSize: '0.9rem',
        color: 'var(--teal)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>${item.price}</span>

      <span style={{
        fontSize: '0.65rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '2px',
        backgroundColor: item.available ? 'rgba(0,160,152,0.15)' : 'rgba(228,51,41,0.15)',
        color: item.available ? 'var(--teal)' : 'var(--red)',
        fontFamily: 'var(--font-inter)',
      }}>{item.available ? 'Available' : 'Hidden'}</span>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => onEdit(item)} style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(245,242,236,0.5)',
          padding: '0.35rem 0.7rem',
          borderRadius: '2px',
          fontSize: '0.7rem',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter)',
        }}>Edit</button>
        <button onClick={() => onDelete(item.id)} style={{
          background: 'transparent',
          border: '1px solid rgba(228,51,41,0.3)',
          color: 'var(--red)',
          padding: '0.35rem 0.7rem',
          borderRadius: '2px',
          fontSize: '0.7rem',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter)',
        }}>Delete</button>
      </div>
    </div>
  )
}

export default function AdminMenuPage() {
  const router = useRouter()
  const [checking, setChecking]         = useState(true)
  const [categories, setCategories]     = useState<Category[]>([])
  const [items, setItems]               = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading]           = useState(true)
  const [newCatName, setNewCatName]     = useState('')
  const [addingCat, setAddingCat]       = useState(false)
  const [open, setOpen]                 = useState(false)
  const [editing, setEditing]           = useState<MenuItem | null>(null)
  const [form, setForm]                 = useState({ ...EMPTY_ITEM })
  const [saving, setSaving]             = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace('/admin/login')
      setChecking(false)
    })
    return unsub
  }, [router])

  async function loadData() {
    const [catSnap, itemSnap] = await Promise.all([
      getDocs(collection(db, 'menuCategories')),
      getDocs(collection(db, 'menuItems')),
    ])

    const cats = catSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Category))
      .sort((a, b) => a.order - b.order)

    const its = itemSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as MenuItem))
      .sort((a, b) => a.order - b.order)

    setCategories(cats)
    setItems(its)
    if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function addCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    await addDoc(collection(db, 'menuCategories'), {
      name: newCatName.trim(),
      order: categories.length,
      createdAt: serverTimestamp(),
    })
    setNewCatName('')
    setAddingCat(false)
    loadData()
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category and all its items?')) return
    const batch = writeBatch(db)
    batch.delete(doc(db, 'menuCategories', id))
    items.filter(i => i.categoryId === id).forEach(i => {
      batch.delete(doc(db, 'menuItems', i.id))
    })
    await batch.commit()
    if (activeCategory === id) setActiveCategory(categories[0]?.id ?? '')
    loadData()
  }

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY_ITEM, categoryId: activeCategory })
    setOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setForm({
      name:        item.name,
      description: item.description,
      price:       item.price,
      categoryId:  item.categoryId,
      order:       item.order,
      badge:       item.badge ?? '',
      available:   item.available,
    })
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editing) {
      await updateDoc(doc(db, 'menuItems', editing.id), { ...form, updatedAt: serverTimestamp() })
    } else {
      const catItems = items.filter(i => i.categoryId === activeCategory)
      await addDoc(collection(db, 'menuItems'), {
        ...form,
        categoryId: activeCategory,
        order: catItems.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    setSaving(false)
    setOpen(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    await deleteDoc(doc(db, 'menuItems', id))
    loadData()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const catItems = items.filter(i => i.categoryId === activeCategory)
    const oldIndex = catItems.findIndex(i => i.id === active.id)
    const newIndex = catItems.findIndex(i => i.id === over.id)
    const reordered = arrayMove(catItems, oldIndex, newIndex)

    const batch = writeBatch(db)
    reordered.forEach((item, index) => {
      batch.update(doc(db, 'menuItems', item.id), { order: index })
    })
    await batch.commit()
    loadData()
  }

  const activeCatItems = items.filter(i => i.categoryId === activeCategory)

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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem' }}>
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
            }}>← Back to Dashboard</a>
            <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)' }}>
              Menu Manager
            </h1>
          </div>
          <button onClick={openNew} style={{
            backgroundColor: 'var(--teal)',
            color: '#fff',
            padding: '0.7rem 1.5rem',
            border: 'none',
            borderRadius: '2px',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
          }}>+ Add Item</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>

          {/* Left — Categories */}
          <div>
            <p style={{ ...labelStyle, marginBottom: '1rem' }}>Categories</p>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '1rem',
            }}>
              {categories.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9rem 1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  backgroundColor: activeCategory === cat.id ? 'rgba(0,160,152,0.1)' : 'transparent',
                  cursor: 'pointer',
                  borderLeft: activeCategory === cat.id ? '2px solid var(--teal)' : '2px solid transparent',
                }} onClick={() => setActiveCategory(cat.id)}>
                  <span style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.85rem',
                    color: activeCategory === cat.id ? 'var(--teal)' : 'rgba(245,242,236,0.6)',
                  }}>{cat.name}</span>
                  <button onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(228,51,41,0.4)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.4rem',
                  }}>✕</button>
                </div>
              ))}
            </div>

            {/* Add Category */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="New category…"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
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
              <button onClick={addCategory} disabled={addingCat} style={{
                backgroundColor: 'var(--teal)',
                border: 'none',
                color: '#fff',
                padding: '0.6rem 0.8rem',
                borderRadius: '2px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
              }}>+</button>
            </div>
          </div>

          {/* Right — Items */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <p style={{ ...labelStyle, margin: 0 }}>
                {categories.find(c => c.id === activeCategory)?.name ?? 'Select a category'}
                <span style={{ color: 'rgba(245,242,236,0.2)', marginLeft: '0.5rem' }}>
                  ({activeCatItems.length} items) — drag to reorder
                </span>
              </p>
            </div>

            {loading ? (
              <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
            ) : activeCatItems.length === 0 ? (
              <div style={{
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: '4px',
                padding: '3rem',
                textAlign: 'center',
                color: 'rgba(245,242,236,0.2)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.85rem',
              }}>
                No items yet — click + Add Item to get started
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={activeCatItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {activeCatItems.map(item => (
                      <SortableItem key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
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
            maxWidth: '500px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem 2rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.2rem', color: 'var(--offwhite)' }}>
                {editing ? 'Edit Item' : 'Add Menu Item'}
              </h2>
              <button onClick={() => setOpen(false)} style={{
                background: 'transparent', border: 'none',
                color: 'rgba(245,242,236,0.4)', fontSize: '1.2rem', cursor: 'pointer',
              }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} rows={2} required
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Price ($)</label>
                  <input type="number" step="0.5" value={form.price} required
                    onChange={e => setForm(f => ({ ...f, price: +e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Badge (optional)</label>
                  <input type="text" placeholder="e.g. Popular"
                    value={form.badge}
                    onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: '0.8rem' }}>Available</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => setForm(f => ({ ...f, available: val }))}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '2px',
                        border: `1px solid ${form.available === val ? 'var(--teal)' : 'rgba(255,255,255,0.1)'}`,
                        backgroundColor: form.available === val ? 'rgba(0,160,152,0.15)' : 'transparent',
                        color: form.available === val ? 'var(--teal)' : 'rgba(245,242,236,0.4)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                        fontSize: '0.78rem',
                      }}>
                      {val ? 'Available' : 'Hidden'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  flex: 1, background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(245,242,236,0.5)', padding: '0.8rem',
                  borderRadius: '2px', fontSize: '0.75rem',
                  cursor: 'pointer', fontFamily: 'var(--font-inter)',
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 1, backgroundColor: 'var(--teal)',
                  border: 'none', color: '#fff', padding: '0.8rem',
                  borderRadius: '2px', fontSize: '0.75rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1, fontFamily: 'var(--font-inter)',
                }}>{saving ? 'Saving…' : 'Save Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}