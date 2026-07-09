'use client'

import { useEffect, useState } from 'react'
import { useRequireRole } from '../../../lib/adminAuth'
import {
  listTemplateItems, addTemplateItem, updateTemplateItem, deleteTemplateItem,
  type OrderTemplateItem, type OrderUnit, UNIT_LABELS,
} from '../../../lib/weeklyOrders'

const UNITS: OrderUnit[] = ['box', 'kg', 'liter']

const inp: React.CSSProperties = {
  backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F2EC', padding: '0.6rem 0.8rem', borderRadius: '2px',
  fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-inter)',
}

const btnPrimary: React.CSSProperties = {
  backgroundColor: 'var(--teal)', color: '#fff', border: 'none',
  padding: '0.6rem 1.2rem', borderRadius: '2px', fontSize: '0.75rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
  fontFamily: 'var(--font-inter)',
}

const btnGhost: React.CSSProperties = {
  backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(245,242,236,0.5)', padding: '0.6rem 1rem', borderRadius: '2px',
  fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: 'var(--font-inter)',
}

const btnDanger: React.CSSProperties = {
  backgroundColor: 'transparent', border: '1px solid rgba(228,51,41,0.3)',
  color: 'var(--red)', padding: '0.4rem 0.7rem', borderRadius: '2px',
  fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-inter)',
}

function BlankForm({ categories, onSave }: {
  categories: string[]
  onSave: (item: Omit<OrderTemplateItem, 'id' | 'createdAt'>) => Promise<void>
}) {
  const [name,     setName]     = useState('')
  const [category, setCategory] = useState('')
  const [unit,     setUnit]     = useState<OrderUnit>('box')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !category.trim()) { setErr('Name and category are required.'); return }
    setSaving(true)
    setErr('')
    try {
      await onSave({ name: name.trim(), category: category.trim(), unit, sortOrder: 0 })
      setName(''); setCategory(''); setUnit('box')
    } catch {
      setErr('Save failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '4px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
    }}>
      <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.6)', marginBottom: '1rem', letterSpacing: '0.1em' }}>
        ADD ITEM
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.75rem', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(245,242,236,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>
            Category
          </label>
          <input
            list="categories-list"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g. Beverages"
            style={{ ...inp, width: '100%' }}
          />
          <datalist id="categories-list">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(245,242,236,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>
            Item Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Coffee Beans"
            style={{ ...inp, width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(245,242,236,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>
            Unit
          </label>
          <select
            value={unit}
            onChange={e => setUnit(e.target.value as OrderUnit)}
            style={{ ...inp, cursor: 'pointer' }}
          >
            {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : '+ Add'}
        </button>
      </div>
      {err && <p style={{ color: 'var(--red)', fontSize: '0.78rem', marginTop: '0.5rem', fontFamily: 'var(--font-inter)' }}>{err}</p>}
    </form>
  )
}

function ItemRow({ item, categories, onUpdated, onDeleted }: {
  item: OrderTemplateItem
  categories: string[]
  onUpdated: (id: string, before: Partial<OrderTemplateItem>, after: Partial<OrderTemplateItem>) => Promise<void>
  onDeleted: (id: string, name: string) => Promise<void>
}) {
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState(item.name)
  const [category, setCategory] = useState(item.category)
  const [unit,     setUnit]     = useState<OrderUnit>(item.unit)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await onUpdated(item.id, { name: item.name, category: item.category, unit: item.unit }, { name, category, unit })
      setEditing(false)
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!confirm(`Delete "${item.name}"?`)) return
    setDeleting(true)
    try { await onDeleted(item.id, item.name) } finally { setDeleting(false) }
  }

  if (editing) {
    return (
      <tr>
        <td style={{ padding: '0.6rem 0.75rem' }}>
          <input list="categories-list-edit" value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, width: '100%' }} />
        </td>
        <td style={{ padding: '0.6rem 0.75rem' }}>
          <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: '100%' }} />
        </td>
        <td style={{ padding: '0.6rem 0.75rem' }}>
          <select value={unit} onChange={e => setUnit(e.target.value as OrderUnit)} style={{ ...inp, cursor: 'pointer' }}>
            {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </td>
        <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, padding: '0.4rem 0.8rem' }}>
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => { setName(item.name); setCategory(item.category); setUnit(item.unit); setEditing(false) }} style={{ ...btnGhost, padding: '0.4rem 0.8rem' }}>
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)' }}>{item.category}</td>
      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-inter)', fontSize: '0.88rem', color: 'var(--offwhite)', fontWeight: 500 }}>{item.name}</td>
      <td style={{ padding: '0.75rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)' }}>{UNIT_LABELS[item.unit]}</td>
      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setEditing(true)} style={{ ...btnGhost, padding: '0.35rem 0.7rem', fontSize: '0.7rem' }}>Edit</button>
          <button onClick={remove} disabled={deleting} style={{ ...btnDanger, opacity: deleting ? 0.6 : 1 }}>
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function OrderTemplatePage() {
  const { checking } = useRequireRole(['admin'])
  const [items,   setItems]   = useState<OrderTemplateItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setItems(await listTemplateItems())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const categories = Array.from(new Set(items.map(i => i.category))).sort()

  async function handleAdd(item: Omit<OrderTemplateItem, 'id' | 'createdAt'>) {
    await addTemplateItem(item)
    await load()
  }

  async function handleUpdate(id: string, before: Partial<OrderTemplateItem>, after: Partial<OrderTemplateItem>) {
    await updateTemplateItem(id, before, after)
    await load()
  }

  async function handleDelete(id: string, name: string) {
    await deleteTemplateItem(id, name)
    await load()
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <a href="/admin/weekly-orders" style={{
            fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
            marginBottom: '0.5rem', display: 'block', fontFamily: 'var(--font-inter)',
          }}>← Weekly Orders</a>
          <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.4rem' }}>
            Order Item Template
          </h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)' }}>
            Define the items that appear on the weekly order report. Staff will fill in quantities when submitting.
          </p>
        </div>

        <datalist id="categories-list-edit">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>

        <BlankForm categories={categories} onSave={handleAdd} />

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px',
            padding: '3rem', textAlign: 'center',
            color: 'rgba(245,242,236,0.25)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem',
          }}>
            No items yet — add your first one above.
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Category', 'Item Name', 'Unit', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '0.75rem', textAlign: 'left',
                      fontFamily: 'var(--font-inter)', fontSize: '0.68rem',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'rgba(245,242,236,0.3)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categories={categories}
                    onUpdated={handleUpdate}
                    onDeleted={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ marginTop: '1.5rem', fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.2)' }}>
          {items.length} item{items.length !== 1 ? 's' : ''} in template
        </p>
      </div>
    </div>
  )
}
