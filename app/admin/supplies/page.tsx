'use client'

import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../lib/adminAuth'
import { listTemplateItems, listProviders, UNIT_LABELS } from '../../lib/weeklyOrders'

type Category = 'Kitchen' | 'Bar' | 'Cleaning' | 'Other'

const SUPPLY_BRANCHES = ['Beirut', 'Zouk', 'Broummana'] as const
type SupplyBranch = typeof SUPPLY_BRANCHES[number]

type BranchQtys = Record<SupplyBranch, number>

interface Supply {
  id: string
  name: string
  quantity: BranchQtys
  unit: string
  threshold: number
  category: Category
  provider?: string
}

const CATEGORIES: Category[] = ['Kitchen', 'Bar', 'Cleaning', 'Other']
const UNITS = ['pieces', 'kg', 'g', 'L', 'mL', 'boxes', 'bottles', 'packs', 'bags', 'rolls', 'cans', 'units']

const CAT_COLOR: Record<Category, string> = {
  Kitchen:  '#00A098',
  Bar:      '#C9962C',
  Cleaning: '#8B7CF6',
  Other:    'rgba(245,242,236,0.45)',
}

const BRANCH_COLOR: Record<SupplyBranch, string> = {
  Beirut:    '#00A098',
  Zouk:      '#C9962C',
  Broummana: '#8B7CF6',
}

const EMPTY_QTY: BranchQtys = { Beirut: 0, Zouk: 0, Broummana: 0 }

function branchStatus(qty: number, threshold: number): 'ok' | 'low' | 'out' {
  if (qty <= 0) return 'out'
  if (qty < threshold) return 'low'
  return 'ok'
}


const S_COLOR  = { ok: '#00A098', low: '#C9962C', out: '#E43329' }
const S_BG     = { ok: 'rgba(0,160,152,0.06)',   low: 'rgba(201,150,44,0.08)',  out: 'rgba(228,51,41,0.09)'  }
const S_BORDER = { ok: 'rgba(0,160,152,0.18)',   low: 'rgba(201,150,44,0.26)',  out: 'rgba(228,51,41,0.32)'  }
const S_LABEL  = { ok: 'OK', low: 'Low', out: 'Out' }

const EMPTY_FORM = { name: '', category: 'Kitchen' as Category, unit: 'pieces', threshold: 5, provider: '' }

const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#F5F2EC', borderRadius: '4px', padding: '0.55rem 0.75rem',
  fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'var(--font-inter)',
}
const sel: React.CSSProperties = { ...inp, background: '#1c1c1c', cursor: 'pointer' }
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(245,242,236,0.35)', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)',
}

export default function SuppliesPage() {
  const { checking } = useRequireRole(SECTION_ACCESS.games)
  const [supplies, setSupplies]     = useState<Supply[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing]       = useState<Supply | null>(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formQty, setFormQty]       = useState<BranchQtys>(EMPTY_QTY)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [seeding, setSeeding]       = useState(false)

  const [branch, setBranch]   = useState<SupplyBranch>('Beirut')
  const [search, setSearch]   = useState('')
  const [groupBy, setGroupBy] = useState<'category' | 'provider'>('category')

  // Inline qty edit
  const [qtyEditId, setQtyEditId] = useState<string | null>(null)
  const [qtyVal, setQtyVal]       = useState('')

  // Inline threshold edit
  const [thrEditId, setThrEditId] = useState<string | null>(null)
  const [thrVal, setThrVal]       = useState('')

  async function load() {
    const snap = await getDocs(collection(db, 'supplies'))
    setSupplies(
      snap.docs.map(d => {
        const data = d.data() as Omit<Supply, 'id'>
        // Handle legacy single-number quantity
        const qty = typeof data.quantity === 'number'
          ? { Beirut: data.quantity, Zouk: 0, Broummana: 0 }
          : (data.quantity ?? EMPTY_QTY)
        return { ...data, id: d.id, quantity: qty }
      }).sort((a, b) => a.name.localeCompare(b.name))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(EMPTY_FORM); setFormQty(EMPTY_QTY); setEditing(null); setModal('add') }
  function openEdit(s: Supply) {
    setForm({ name: s.name, category: s.category, unit: s.unit, threshold: s.threshold, provider: s.provider ?? '' })
    setFormQty({ ...EMPTY_QTY, ...s.quantity })
    setEditing(s); setModal('edit')
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const data = {
      name: form.name, category: form.category, unit: form.unit, threshold: form.threshold,
      provider: form.provider.trim() || null, quantity: formQty, updatedAt: serverTimestamp(),
    }
    if (editing) {
      await updateDoc(doc(db, 'supplies', editing.id), data)
    } else {
      await addDoc(collection(db, 'supplies'), data)
    }
    setSaving(false); setModal(null); load()
  }

  async function deleteItem(id: string) {
    setDeletingId(id)
    await deleteDoc(doc(db, 'supplies', id))
    setDeletingId(null)
    setSupplies(prev => prev.filter(s => s.id !== id))
  }

  async function adjustQty(s: Supply, delta: number) {
    const next = Math.max(0, (s.quantity[branch] ?? 0) + delta)
    const newQty = { ...s.quantity, [branch]: next }
    setSupplies(prev => prev.map(x => x.id === s.id ? { ...x, quantity: newQty } : x))
    await updateDoc(doc(db, 'supplies', s.id), { quantity: newQty, updatedAt: serverTimestamp() })
  }

  async function commitQtyEdit(s: Supply) {
    const v = parseFloat(qtyVal)
    if (!isNaN(v) && v >= 0) {
      const newQty = { ...s.quantity, [branch]: v }
      setSupplies(prev => prev.map(x => x.id === s.id ? { ...x, quantity: newQty } : x))
      await updateDoc(doc(db, 'supplies', s.id), { quantity: newQty, updatedAt: serverTimestamp() })
    }
    setQtyEditId(null); setQtyVal('')
  }

  async function commitThrEdit(s: Supply) {
    const v = parseInt(thrVal)
    if (!isNaN(v) && v >= 1 && v !== s.threshold) {
      setSupplies(prev => prev.map(x => x.id === s.id ? { ...x, threshold: v } : x))
      await updateDoc(doc(db, 'supplies', s.id), { threshold: v, updatedAt: serverTimestamp() })
    }
    setThrEditId(null); setThrVal('')
  }

  async function seedFromTemplates() {
    setSeeding(true)
    const [templates, providers] = await Promise.all([listTemplateItems(), listProviders()])
    const providerMap = new Map(providers.map(p => [p.id, p.name]))
    const existingNames = new Set(supplies.map(s => s.name.toLowerCase()))
    const toAdd = templates.filter(t => !existingNames.has(t.name.toLowerCase()))
    for (const t of toAdd) {
      await addDoc(collection(db, 'supplies'), {
        name: t.name, category: t.department,
        quantity: { Beirut: 0, Zouk: 0, Broummana: 0 },
        unit: UNIT_LABELS[t.unit], threshold: 1,
        provider: t.providerId ? (providerMap.get(t.providerId) ?? null) : null,
        updatedAt: serverTimestamp(),
      })
    }
    setSeeding(false); load()
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q
      ? supplies.filter(s => s.name.toLowerCase().includes(q) || s.provider?.toLowerCase().includes(q))
      : supplies
  }, [supplies, search])

  const alertCount = supplies.filter(s => branchStatus(s.quantity[branch] ?? 0, s.threshold) !== 'ok').length

  const groups = useMemo(() => {
    if (groupBy === 'category') {
      return CATEGORIES
        .map(cat => ({ key: cat, color: CAT_COLOR[cat], items: visible.filter(s => s.category === cat) }))
        .filter(g => g.items.length > 0)
    }
    const map = new Map<string, Supply[]>()
    for (const s of visible) {
      const key = s.provider?.trim() || 'Unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === 'Unknown') return 1
      if (b === 'Unknown') return -1
      return a.localeCompare(b)
    })
    return keys.map(key => ({ key, color: 'rgba(245,242,236,0.45)', items: map.get(key)! }))
  }, [visible, groupBy])

  if (checking || loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#F5F2EC', fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>

        <a href="/admin" style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,242,236,0.3)', textDecoration: 'none', marginBottom: '0.5rem', display: 'block' }}>
          ← Dashboard
        </a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', marginBottom: '0.25rem' }}>Supplies</h1>
            <p style={{ fontSize: '0.82rem', color: 'rgba(245,242,236,0.35)' }}>
              {supplies.length} items tracked
              {alertCount > 0 && <span style={{ color: '#E43329', marginLeft: '0.5rem' }}>• {alertCount} need attention in {branch}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button onClick={seedFromTemplates} disabled={seeding} style={{ background: 'transparent', color: 'rgba(245,242,236,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '0.65rem 1.2rem', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: seeding ? 'not-allowed' : 'pointer', opacity: seeding ? 0.5 : 1 }}>
              {seeding ? 'Importing…' : 'Import from Weekly Orders'}
            </button>
            <button onClick={openAdd} style={{ background: '#00A098', color: '#000', border: 'none', borderRadius: '4px', padding: '0.65rem 1.4rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              + Add Item
            </button>
          </div>
        </div>

        {/* Branch tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {SUPPLY_BRANCHES.map(b => (
            <button key={b} onClick={() => setBranch(b)} style={{
              background: branch === b ? `${BRANCH_COLOR[b]}18` : 'transparent',
              border: `1px solid ${branch === b ? BRANCH_COLOR[b] : 'rgba(255,255,255,0.09)'}`,
              color: branch === b ? BRANCH_COLOR[b] : 'rgba(245,242,236,0.35)',
              borderRadius: '6px', padding: '0.5rem 1.25rem',
              fontSize: '0.78rem', fontWeight: branch === b ? 600 : 400,
              letterSpacing: '0.06em', cursor: 'pointer',
            }}>{b}</button>
          ))}
        </div>

        {/* Search + group toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items or provider…"
            style={{ ...inp, flex: 1, minWidth: '180px', padding: '0.6rem 0.9rem' }} />
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '6px', overflow: 'hidden' }}>
            {(['category', 'provider'] as const).map(g => (
              <button key={g} onClick={() => setGroupBy(g)} style={{
                background: groupBy === g ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: groupBy === g ? '#F5F2EC' : 'rgba(245,242,236,0.35)',
                border: 'none', padding: '0.6rem 1.1rem', fontSize: '0.72rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                {g === 'category' ? 'By Category' : 'By Provider'}
              </button>
            ))}
          </div>
        </div>

        {/* Groups */}
        {visible.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', padding: '4rem', textAlign: 'center', color: 'rgba(245,242,236,0.2)', fontSize: '0.88rem' }}>
            {search ? 'No items match your search.' : 'No items yet. Click "+ Add Item" or import from Weekly Orders.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {groups.map(group => (
              <div key={group.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: group.color, fontWeight: 600 }}>{group.key}</span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(245,242,236,0.25)' }}>({group.items.length})</span>
                  <span style={{ flex: 1, height: '1px', background: `${group.color}25` }} />
                  {(() => {
                    const n = group.items.filter(s => branchStatus(s.quantity[branch] ?? 0, s.threshold) !== 'ok').length
                    return n > 0 ? <span style={{ background: '#E43329', color: '#fff', borderRadius: '3px', padding: '0.05rem 0.4rem', fontSize: '0.6rem', fontWeight: 700 }}>{n} low</span> : null
                  })()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.6rem' }}>
                  {group.items.map(s => {
                    const qty = s.quantity[branch] ?? 0
                    const st  = branchStatus(qty, s.threshold)
                    const isEditingQty = qtyEditId === s.id
                    return (
                      <div key={s.id} style={{ background: S_BG[st], border: `1px solid ${S_BORDER[st]}`, borderRadius: '8px', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                        {/* Name + badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.85rem', lineHeight: 1.3 }}>{s.name}</p>
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              {groupBy !== 'category' && <span style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: CAT_COLOR[s.category] }}>{s.category}</span>}
                              {groupBy !== 'provider' && s.provider && <span style={{ fontSize: '0.6rem', color: 'rgba(245,242,236,0.28)' }}>{s.provider}</span>}
                            </div>
                          </div>
                          <span style={{ background: `${S_COLOR[st]}20`, color: S_COLOR[st], border: `1px solid ${S_COLOR[st]}40`, borderRadius: '3px', padding: '0.1rem 0.45rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {S_LABEL[st]}
                          </span>
                        </div>

                        {/* Quantity row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
                          <button onClick={() => adjustQty(s, -1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F2EC', borderRadius: '4px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                          {isEditingQty ? (
                            <input type="number" value={qtyVal} min={0} autoFocus
                              onChange={e => setQtyVal(e.target.value)}
                              onBlur={() => commitQtyEdit(s)}
                              onKeyDown={e => { if (e.key === 'Enter') commitQtyEdit(s); if (e.key === 'Escape') { setQtyEditId(null); setQtyVal('') } }}
                              style={{ ...inp, width: '60px', textAlign: 'center', color: S_COLOR[st], fontWeight: 700, fontSize: '1rem', padding: '0.2rem 0.3rem' }}
                            />
                          ) : (
                            <button onClick={() => { setQtyEditId(s.id); setQtyVal(String(qty)) }} title="Click to edit" style={{ background: 'none', border: 'none', cursor: 'text', padding: '0 0.2rem' }}>
                              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: S_COLOR[st], letterSpacing: '-0.02em' }}>{qty}</span>
                              <span style={{ fontSize: '0.7rem', color: 'rgba(245,242,236,0.4)', marginLeft: '0.2rem' }}>{s.unit}</span>
                            </button>
                          )}
                          <button onClick={() => adjustQty(s, 1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F2EC', borderRadius: '4px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>

                          {/* Threshold inline edit */}
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.6rem', color: 'rgba(245,242,236,0.25)' }}>min</span>
                            {thrEditId === s.id ? (
                              <input type="number" value={thrVal} min={1} autoFocus
                                onChange={e => setThrVal(e.target.value)}
                                onBlur={() => commitThrEdit(s)}
                                onKeyDown={e => { if (e.key === 'Enter') commitThrEdit(s); if (e.key === 'Escape') { setThrEditId(null); setThrVal('') } }}
                                style={{ ...inp, width: '48px', fontSize: '0.78rem', padding: '0.15rem 0.25rem', textAlign: 'center', color: S_COLOR[st] }}
                              />
                            ) : (
                              <button onClick={() => { setThrEditId(s.id); setThrVal(String(s.threshold)) }} title="Click to change minimum" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '3px' }}>
                                <span style={{ fontSize: '0.78rem', color: 'rgba(245,242,236,0.35)', fontWeight: 600 }}>{s.threshold}</span>
                                <span style={{ fontSize: '0.55rem', color: 'rgba(245,242,236,0.18)', marginLeft: '0.15rem' }}>✎</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
                          <button onClick={() => openEdit(s)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,242,236,0.5)', borderRadius: '4px', padding: '0.28rem', fontSize: '0.68rem', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => deleteItem(s.id)} disabled={deletingId === s.id} style={{ background: 'rgba(228,51,41,0.08)', border: '1px solid rgba(228,51,41,0.2)', color: '#E43329', borderRadius: '4px', padding: '0.28rem 0.5rem', fontSize: '0.68rem', cursor: 'pointer', opacity: deletingId === s.id ? 0.5 : 1 }}>
                            {deletingId === s.id ? '…' : '✕'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div onClick={e => { if (e.target === e.currentTarget) setModal(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
              {modal === 'add' ? 'Add Item' : 'Edit Item'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={lbl}>Item Name</label>
                <input style={inp} value={form.name} placeholder="e.g. Bread" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Provider / Supplier</label>
                <input style={inp} value={form.provider} placeholder="e.g. Metro, Spinneys" onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} />
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

              {/* Per-branch initial quantities */}
              <div>
                <label style={{ ...lbl, marginBottom: '0.5rem' }}>Starting Quantities</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {SUPPLY_BRANCHES.map(branch => (
                    <div key={branch} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '80px', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: BRANCH_COLOR[branch] }}>{branch}</span>
                      <input type="number" min={0} value={formQty[branch]} onChange={e => setFormQty(q => ({ ...q, [branch]: Number(e.target.value) }))}
                        style={{ ...inp, width: '90px' }} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Minimum (Alert Threshold)</label>
                <input style={inp} type="number" min={1} value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))} />
                <p style={{ fontSize: '0.62rem', color: 'rgba(245,242,236,0.3)', marginTop: '0.25rem' }}>Applies to each branch — turns orange/red below this</p>
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
