'use client'

import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../lib/adminAuth'

type Category = 'Kitchen' | 'Bar' | 'Cleaning' | 'Other'

interface Supply {
  id: string
  name: string
  quantity: number
  unit: string
  threshold: number
  category: Category
}

const CATEGORIES: Category[] = ['Kitchen', 'Bar', 'Cleaning', 'Other']
const UNITS = ['pieces', 'kg', 'g', 'L', 'mL', 'boxes', 'bottles', 'packs', 'bags', 'rolls', 'cans', 'units']

const CAT_COLOR: Record<Category, string> = {
  Kitchen:  '#00A098',
  Bar:      '#C9962C',
  Cleaning: '#8B7CF6',
  Other:    'rgba(245,242,236,0.45)',
}

function stockStatus(qty: number, threshold: number): 'ok' | 'low' | 'out' {
  if (qty <= 0) return 'out'
  if (qty < threshold) return 'low'
  return 'ok'
}

const S_COLOR  = { ok: '#00A098',              low: '#C9962C',              out: '#E43329' }
const S_BG     = { ok: 'rgba(0,160,152,0.07)', low: 'rgba(201,150,44,0.09)', out: 'rgba(228,51,41,0.1)' }
const S_BORDER = { ok: 'rgba(0,160,152,0.2)',  low: 'rgba(201,150,44,0.28)', out: 'rgba(228,51,41,0.35)' }
const S_LABEL  = { ok: 'OK', low: 'Low', out: 'Out' }

const EMPTY_FORM = { name: '', category: 'Kitchen' as Category, quantity: 0, unit: 'pieces', threshold: 5 }

const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#F5F2EC',
  borderRadius: '4px',
  padding: '0.55rem 0.75rem',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-inter)',
}
const sel: React.CSSProperties = { ...inp, background: '#1c1c1c', cursor: 'pointer' }
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'rgba(245,242,236,0.35)',
  marginBottom: '0.3rem', fontFamily: 'var(--font-inter)',
}

export default function SuppliesPage() {
  const { checking } = useRequireRole(SECTION_ACCESS.games) // admin/manager access
  const [supplies, setSupplies]   = useState<Supply[]>([])
  const [loading, setLoading]     = useState(true)
  const [catFilter, setCatFilter] = useState<Category | 'All'>('All')
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing]     = useState<Supply | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Per-row inline quantity edit
  const [qtyEditId, setQtyEditId] = useState<string | null>(null)
  const [qtyVal, setQtyVal]       = useState('')

  async function load() {
    const snap = await getDocs(collection(db, 'supplies'))
    setSupplies(
      snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Supply, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModal('add')
  }

  function openEdit(s: Supply) {
    setForm({ name: s.name, category: s.category, quantity: s.quantity, unit: s.unit, threshold: s.threshold })
    setEditing(s)
    setModal('edit')
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editing) {
      await updateDoc(doc(db, 'supplies', editing.id), { ...form, updatedAt: serverTimestamp() })
    } else {
      await addDoc(collection(db, 'supplies'), { ...form, updatedAt: serverTimestamp() })
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function deleteItem(id: string) {
    setDeletingId(id)
    await deleteDoc(doc(db, 'supplies', id))
    setDeletingId(null)
    setSupplies(prev => prev.filter(s => s.id !== id))
  }

  async function adjustQty(s: Supply, delta: number) {
    const next = Math.max(0, s.quantity + delta)
    setSupplies(prev => prev.map(x => x.id === s.id ? { ...x, quantity: next } : x))
    await updateDoc(doc(db, 'supplies', s.id), { quantity: next, updatedAt: serverTimestamp() })
  }

  async function commitQtyEdit(s: Supply) {
    const v = parseFloat(qtyVal)
    if (!isNaN(v) && v >= 0 && v !== s.quantity) {
      const next = v
      setSupplies(prev => prev.map(x => x.id === s.id ? { ...x, quantity: next } : x))
      await updateDoc(doc(db, 'supplies', s.id), { quantity: next, updatedAt: serverTimestamp() })
    }
    setQtyEditId(null)
    setQtyVal('')
  }

  const visible = useMemo(() =>
    catFilter === 'All' ? supplies : supplies.filter(s => s.category === catFilter),
    [supplies, catFilter]
  )

  const alertCount = supplies.filter(s => stockStatus(s.quantity, s.threshold) !== 'ok').length

  if (checking || loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#F5F2EC', fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Header */}
        <a href="/admin" style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,242,236,0.3)', textDecoration: 'none', marginBottom: '0.5rem', display: 'block' }}>
          ← Dashboard
        </a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', marginBottom: '0.25rem' }}>Supplies</h1>
            <p style={{ fontSize: '0.82rem', color: 'rgba(245,242,236,0.35)' }}>
              Track consumable stock levels — {supplies.length} items
              {alertCount > 0 && <span style={{ color: '#E43329', marginLeft: '0.5rem' }}>• {alertCount} need attention</span>}
            </p>
          </div>
          <button onClick={openAdd} style={{ background: '#00A098', color: '#000', border: 'none', borderRadius: '4px', padding: '0.65rem 1.4rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            + Add Item
          </button>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['All', ...CATEGORIES] as const).map(cat => {
            const count = cat === 'All' ? supplies.length : supplies.filter(s => s.category === cat).length
            const color = cat === 'All' ? 'rgba(245,242,236,0.5)' : CAT_COLOR[cat]
            const active = catFilter === cat
            const alerts = cat === 'All'
              ? alertCount
              : supplies.filter(s => s.category === cat && stockStatus(s.quantity, s.threshold) !== 'ok').length
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                background: active ? (cat === 'All' ? 'rgba(255,255,255,0.08)' : `${color}18`) : 'transparent',
                border: `1px solid ${active ? (cat === 'All' ? 'rgba(255,255,255,0.2)' : color) : 'rgba(255,255,255,0.08)'}`,
                color: active ? (cat === 'All' ? 'var(--offwhite)' : color) : 'rgba(245,242,236,0.35)',
                padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.72rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                {cat !== 'All' && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: active ? color : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
                {cat} ({count})
                {alerts > 0 && <span style={{ background: '#E43329', color: '#fff', borderRadius: '3px', padding: '0 0.3rem', fontSize: '0.6rem', fontWeight: 700 }}>{alerts}</span>}
              </button>
            )
          })}
        </div>

        {/* Items grid */}
        {visible.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', padding: '4rem', textAlign: 'center', color: 'rgba(245,242,236,0.2)', fontSize: '0.88rem' }}>
            No items yet. Click "+ Add Item" to start tracking supplies.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {visible.map(s => {
              const st = stockStatus(s.quantity, s.threshold)
              const isEditingQty = qtyEditId === s.id
              return (
                <div key={s.id} style={{
                  background: S_BG[st],
                  border: `1px solid ${S_BORDER[st]}`,
                  borderRadius: '6px',
                  padding: '1rem 1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}>
                  {/* Top row: name + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.88rem', lineHeight: 1.3, flex: 1 }}>{s.name}</p>
                    <span style={{ background: `${S_COLOR[st]}20`, color: S_COLOR[st], border: `1px solid ${S_COLOR[st]}40`, borderRadius: '3px', padding: '0.1rem 0.45rem', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {S_LABEL[st]}
                    </span>
                  </div>

                  {/* Category */}
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: CAT_COLOR[s.category] }}>
                    {s.category}
                  </span>

                  {/* Quantity row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button onClick={() => adjustQty(s, -1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F2EC', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>

                    {isEditingQty ? (
                      <input
                        type="number"
                        value={qtyVal}
                        min={0}
                        step={1}
                        autoFocus
                        onChange={e => setQtyVal(e.target.value)}
                        onBlur={() => commitQtyEdit(s)}
                        onKeyDown={e => { if (e.key === 'Enter') commitQtyEdit(s); if (e.key === 'Escape') { setQtyEditId(null); setQtyVal('') } }}
                        style={{ ...inp, width: '70px', textAlign: 'center', color: S_COLOR[st], fontWeight: 700, fontSize: '1.1rem', padding: '0.2rem 0.3rem' }}
                      />
                    ) : (
                      <button
                        onClick={() => { setQtyEditId(s.id); setQtyVal(String(s.quantity)) }}
                        title="Click to edit quantity"
                        style={{ background: 'none', border: 'none', cursor: 'text', padding: '0 0.25rem' }}
                      >
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: S_COLOR[st], letterSpacing: '-0.02em' }}>{s.quantity}</span>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(245,242,236,0.4)', marginLeft: '0.25rem' }}>{s.unit}</span>
                      </button>
                    )}

                    <button onClick={() => adjustQty(s, 1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F2EC', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>

                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)' }}>
                      alert &lt;{s.threshold}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button onClick={() => openEdit(s)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,242,236,0.55)', borderRadius: '4px', padding: '0.35rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(s.id)}
                      disabled={deletingId === s.id}
                      style={{ background: 'rgba(228,51,41,0.08)', border: '1px solid rgba(228,51,41,0.2)', color: '#E43329', borderRadius: '4px', padding: '0.35rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer', opacity: deletingId === s.id ? 0.5 : 1 }}
                    >
                      {deletingId === s.id ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
        >
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
              {modal === 'add' ? 'Add Item' : 'Edit Item'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={lbl}>Item Name</label>
                <input style={inp} value={form.name} placeholder="e.g. Bread" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select style={sel} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1c1c1c', color: '#F5F2EC' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Unit</label>
                  <select style={sel} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u} style={{ background: '#1c1c1c', color: '#F5F2EC' }}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>Current Quantity</label>
                  <input style={inp} type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={lbl}>Alert Threshold</label>
                  <input style={inp} type="number" min={1} value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))} />
                  <p style={{ fontSize: '0.62rem', color: 'rgba(245,242,236,0.3)', marginTop: '0.25rem' }}>Turns orange/red below this</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ flex: 1, background: '#00A098', color: '#000', border: 'none', borderRadius: '4px', padding: '0.7rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', color: 'rgba(245,242,236,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.7rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
