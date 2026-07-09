'use client'

import { useEffect, useState } from 'react'
import { useRequireRole } from '../../../lib/adminAuth'
import {
  listTemplateItems, addTemplateItem, updateTemplateItem, deleteTemplateItem,
  listCategoryMeta, setCategoryMeta,
  listProviders,
  translateToArabic, groupByCategory, packLabel,
  type OrderTemplateItem, type OrderCategoryMeta, type OrderProvider, type OrderUnit, UNIT_LABELS,
} from '../../../lib/weeklyOrders'

const UNITS: OrderUnit[] = ['box', 'kg', 'liter']

const inp: React.CSSProperties = {
  backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F2EC', padding: '0.55rem 0.75rem', borderRadius: '2px',
  fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-inter)',
}

const btnPrimary: React.CSSProperties = {
  backgroundColor: 'var(--teal)', color: '#fff', border: 'none',
  padding: '0.55rem 1.1rem', borderRadius: '2px', fontSize: '0.73rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
  fontFamily: 'var(--font-inter)',
}

const btnGhost: React.CSSProperties = {
  backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(245,242,236,0.5)', padding: '0.5rem 0.9rem', borderRadius: '2px',
  fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: 'var(--font-inter)',
}

const btnDanger: React.CSSProperties = {
  backgroundColor: 'transparent', border: '1px solid rgba(228,51,41,0.3)',
  color: 'var(--red)', padding: '0.35rem 0.65rem', borderRadius: '2px',
  fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'var(--font-inter)',
}

// ---- Add-item form ----
function AddItemForm({ categories, onSave }: {
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
    setSaving(true); setErr('')
    try {
      await onSave({ name: name.trim(), category: category.trim(), unit, sortOrder: 0, nameAr: '' })
      setName(''); setCategory(''); setUnit('box')
    } catch { setErr('Save failed — please try again.') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '4px', padding: '1.1rem 1.4rem', marginBottom: '2rem',
    }}>
      <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.5)', marginBottom: '0.9rem', letterSpacing: '0.12em' }}>ADD ITEM</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.65rem', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Category</label>
          <input list="cats" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Beverages" style={{ ...inp, width: '100%' }} />
          <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Item Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coffee Beans" style={{ ...inp, width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Unit</label>
          <select value={unit} onChange={e => setUnit(e.target.value as OrderUnit)} style={{ ...inp, cursor: 'pointer' }}>
            {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? '…' : '+ Add'}
        </button>
      </div>
      {err && <p style={{ color: 'var(--red)', fontSize: '0.78rem', marginTop: '0.45rem', fontFamily: 'var(--font-inter)' }}>{err}</p>}
    </form>
  )
}

// ---- Provider assignment per category ----
function ProviderRow({ category, meta, providers, onSave }: {
  category: string
  meta: OrderCategoryMeta | undefined
  providers: OrderProvider[]
  onSave: (category: string, meta: OrderCategoryMeta) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState(meta?.providerId ?? '')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  const dirty = selectedId !== (meta?.providerId ?? '')
  const chosen = providers.find(p => p.id === selectedId)

  async function save() {
    setSaving(true)
    try {
      await onSave(category, { providerId: selectedId || undefined })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
      padding: '0.65rem 1rem', background: 'rgba(0,160,152,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.68rem', color: 'rgba(245,242,236,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: '56px' }}>
        Supplier
      </span>

      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        style={{ ...inp, padding: '0.4rem 0.7rem', fontSize: '0.82rem', minWidth: '220px', cursor: 'pointer' }}
      >
        <option value="">— No provider assigned —</option>
        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* Phone preview for each branch */}
      {chosen && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.entries(chosen.phones ?? {}).map(([branch, phone]) =>
            phone ? (
              <span key={branch} style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.4)', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', padding: '0.2rem 0.5rem' }}>
                {branch}: <strong style={{ color: 'var(--teal)' }}>{phone}</strong>
              </span>
            ) : null
          )}
        </div>
      )}

      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          style={{
            ...btnGhost,
            opacity: saving ? 0.5 : 1,
            color: saved ? 'var(--teal)' : undefined,
            borderColor: saved ? 'rgba(0,160,152,0.4)' : undefined,
          }}
        >
          {saving ? '…' : saved ? '✓ Saved' : 'Assign'}
        </button>
      )}

      <a href="/admin/weekly-orders/providers" style={{
        fontFamily: 'var(--font-inter)', fontSize: '0.68rem',
        color: 'rgba(245,242,236,0.25)', textDecoration: 'none',
        marginLeft: 'auto',
      }}>
        Manage providers →
      </a>
    </div>
  )
}

// ---- Single item row ----
function ItemRow({ item, categories, onUpdated, onDeleted }: {
  item: OrderTemplateItem
  categories: string[]
  onUpdated: (id: string, before: Partial<OrderTemplateItem>, after: Partial<OrderTemplateItem>) => Promise<void>
  onDeleted: (id: string, name: string) => Promise<void>
}) {
  const [editing,     setEditing]     = useState(false)
  const [name,        setName]        = useState(item.name)
  const [nameAr,      setNameAr]      = useState(item.nameAr ?? '')
  const [unit,        setUnit]        = useState<OrderUnit>(item.unit)
  const [packSize,    setPackSize]    = useState(String(item.packSize ?? ''))
  const [packUnit,    setPackUnit]    = useState(item.packUnit ?? '')
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [translating, setTranslating] = useState(false)
  const [transErr,    setTransErr]    = useState('')

  async function save() {
    setSaving(true)
    const ps = parseInt(packSize, 10)
    try {
      await onUpdated(
        item.id,
        { name: item.name, nameAr: item.nameAr, unit: item.unit, packSize: item.packSize, packUnit: item.packUnit },
        { name, nameAr, unit, packSize: isNaN(ps) || ps < 1 ? undefined : ps, packUnit: packUnit.trim() || undefined },
      )
      setEditing(false)
    } finally { setSaving(false) }
  }

  async function autoTranslate() {
    setTranslating(true); setTransErr('')
    try { setNameAr(await translateToArabic(name)) }
    catch { setTransErr('Translation failed') }
    finally { setTranslating(false) }
  }

  async function remove() {
    if (!confirm(`Delete "${item.name}"?`)) return
    setDeleting(true)
    try { await onDeleted(item.id, item.name) } finally { setDeleting(false) }
  }

  const basePad: React.CSSProperties = { padding: '0.7rem 1rem', borderTop: '1px solid rgba(255,255,255,0.04)' }

  if (editing) {
    return (
      <div style={basePad}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr auto auto', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: '100%' }} />
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="عربي" dir="rtl" style={{ ...inp, flex: 1, textAlign: 'right' }} />
            <button onClick={autoTranslate} disabled={translating} title="Auto-translate" style={{
              background: 'rgba(201,150,44,0.12)', border: '1px solid rgba(201,150,44,0.3)',
              color: '#C9962C', padding: '0.35rem 0.5rem', borderRadius: '2px', fontSize: '0.72rem', cursor: 'pointer',
            }}>{translating ? '…' : '🌐'}</button>
          </div>
          <select value={unit} onChange={e => setUnit(e.target.value as OrderUnit)} style={{ ...inp, cursor: 'pointer' }}>
            {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
          <div />
        </div>
        {/* Pack size row */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: '60px' }}>Pack size</span>
          <input
            type="number" min="1" value={packSize} onChange={e => setPackSize(e.target.value)}
            placeholder="e.g. 4"
            style={{ ...inp, width: '90px', textAlign: 'center' }}
          />
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.3)' }}>{UNIT_LABELS[unit]} contains</span>
          <input
            value={packUnit} onChange={e => setPackUnit(e.target.value)}
            placeholder="e.g. bottles / pieces"
            style={{ ...inp, width: '180px' }}
          />
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.2)' }}>each (optional)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, padding: '0.4rem 0.8rem' }}>{saving ? '…' : 'Save'}</button>
          <button onClick={() => { setName(item.name); setNameAr(item.nameAr ?? ''); setUnit(item.unit); setPackSize(String(item.packSize ?? '')); setPackUnit(item.packUnit ?? ''); setEditing(false) }} style={{ ...btnGhost, padding: '0.4rem 0.7rem' }}>Cancel</button>
        </div>
        {transErr && <p style={{ color: 'var(--red)', fontSize: '0.72rem', marginTop: '0.3rem', fontFamily: 'var(--font-inter)' }}>{transErr}</p>}
      </div>
    )
  }

  return (
    <div style={{ ...basePad, display: 'grid', gridTemplateColumns: '2fr 1.4fr auto auto', alignItems: 'center', gap: '0.6rem' }}>
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.88rem', color: 'var(--offwhite)', fontWeight: 500 }}>{item.name}</span>
      <span dir="rtl" style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: item.nameAr ? 'rgba(201,150,44,0.9)' : 'rgba(245,242,236,0.2)', textAlign: 'right' }}>
        {item.nameAr || '—'}
      </span>
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.4)', whiteSpace: 'nowrap' }}>
        {packLabel(item.unit, item.packSize, item.packUnit)}
      </span>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button onClick={() => setEditing(true)} style={{ ...btnGhost, padding: '0.3rem 0.6rem' }}>Edit</button>
        <button onClick={remove} disabled={deleting} style={{ ...btnDanger, opacity: deleting ? 0.5 : 1 }}>{deleting ? '…' : 'Del'}</button>
      </div>
    </div>
  )
}

// ---- Main page ----
export default function OrderTemplatePage() {
  const { checking } = useRequireRole(['admin'])
  const [items,        setItems]             = useState<OrderTemplateItem[]>([])
  const [categoryMeta, setCategoryMetaState] = useState<Record<string, OrderCategoryMeta>>({})
  const [providers,    setProviders]         = useState<OrderProvider[]>([])
  const [loading,      setLoading]           = useState(true)
  const [transAll,     setTransAll]          = useState(false)
  const [transProgress, setTransProgress]   = useState('')

  async function load() {
    setLoading(true)
    const [data, meta, provs] = await Promise.all([
      listTemplateItems(), listCategoryMeta(), listProviders(),
    ])
    setItems(data)
    setCategoryMetaState(meta)
    setProviders(provs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const categories = Array.from(new Set(items.map(i => i.category))).sort()
  const grouped    = groupByCategory(items)

  async function handleAdd(item: Omit<OrderTemplateItem, 'id' | 'createdAt'>) { await addTemplateItem(item); await load() }
  async function handleUpdate(id: string, before: Partial<OrderTemplateItem>, after: Partial<OrderTemplateItem>) { await updateTemplateItem(id, before, after); await load() }
  async function handleDelete(id: string, name: string) { await deleteTemplateItem(id, name); await load() }
  async function handleSaveMeta(category: string, meta: OrderCategoryMeta) {
    await setCategoryMeta(category, meta)
    setCategoryMetaState(prev => ({ ...prev, [category]: meta }))
  }

  async function translateAll() {
    setTransAll(true)
    const noAr = items.filter(i => !i.nameAr)
    let done = 0
    for (const item of noAr) {
      setTransProgress(`${done}/${noAr.length}`)
      try {
        const ar = await translateToArabic(item.name)
        await updateTemplateItem(item.id, { nameAr: item.nameAr }, { nameAr: ar })
        done++
      } catch { /* skip on error */ }
    }
    setTransAll(false); setTransProgress('')
    await load()
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <a href="/admin/weekly-orders" style={{
            fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
            marginBottom: '0.5rem', display: 'block', fontFamily: 'var(--font-inter)',
          }}>← Weekly Orders</a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
                Order Item Template
              </h1>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)' }}>
                Set items, units, Arabic names, and assign a provider to each category.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              {items.filter(i => !i.nameAr).length > 0 && (
                <button onClick={translateAll} disabled={transAll} style={{
                  backgroundColor: 'rgba(201,150,44,0.12)', border: '1px solid rgba(201,150,44,0.3)',
                  color: '#C9962C', padding: '0.6rem 1.1rem', borderRadius: '2px',
                  fontSize: '0.73rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: transAll ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-inter)',
                }}>
                  {transAll ? `Translating ${transProgress}…` : `🌐 Translate All (${items.filter(i => !i.nameAr).length})`}
                </button>
              )}
              <a href="/admin/weekly-orders/providers" style={{
                backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(245,242,236,0.5)', textDecoration: 'none',
                padding: '0.6rem 1.1rem', borderRadius: '2px', fontSize: '0.73rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-inter)',
              }}>Manage Providers</a>
            </div>
          </div>
        </div>

        <AddItemForm categories={categories} onSave={handleAdd} />

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px', padding: '3rem', textAlign: 'center', color: 'rgba(245,242,236,0.25)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem' }}>
            No items yet — add your first one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {grouped.map(({ category, items: catItems }) => (
              <div key={category} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>

                {/* Category header */}
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.78rem', color: 'var(--teal)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    {category}
                    <span style={{ color: 'rgba(245,242,236,0.25)', marginLeft: '0.5rem', fontSize: '0.7rem', fontFamily: 'var(--font-inter)', fontWeight: 400, letterSpacing: 'normal', textTransform: 'none' }}>
                      {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>

                {/* Provider assignment */}
                <ProviderRow
                  category={category}
                  meta={categoryMeta[category]}
                  providers={providers}
                  onSave={handleSaveMeta}
                />

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr auto auto', gap: '0.6rem', padding: '0.4rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['English Name', 'Arabic / عربي', 'Unit / Pack', ''].map((h, i) => (
                    <span key={i} style={{ fontFamily: 'var(--font-inter)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,242,236,0.25)' }}>{h}</span>
                  ))}
                </div>

                {catItems.map(item => (
                  <ItemRow key={item.id} item={item} categories={categories} onUpdated={handleUpdate} onDeleted={handleDelete} />
                ))}
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: '1.5rem', fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.2)' }}>
          {items.length} item{items.length !== 1 ? 's' : ''} · {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>
    </div>
  )
}
