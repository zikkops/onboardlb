'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRequireRole } from '../../../lib/adminAuth'
import {
  listTemplateItems, addTemplateItem, updateTemplateItem, deleteTemplateItem,
  listProviders,
  translateToArabic, groupByProvider, packLabel,
  type OrderTemplateItem, type OrderProvider, type OrderUnit, type Department,
  UNIT_LABELS, DEPARTMENTS,
} from '../../../lib/weeklyOrders'

const UNITS: OrderUnit[] = ['box', 'kg', 'liter']

const DEPT_COLOR: Record<Department, string> = {
  Kitchen: 'var(--teal)',
  Bar:     '#C9962C',
}

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
function AddItemForm({ providers, onSave }: {
  providers: OrderProvider[]
  onSave: (item: Omit<OrderTemplateItem, 'id' | 'createdAt'>) => Promise<void>
}) {
  const [name,       setName]       = useState('')
  const [department, setDepartment] = useState<Department>('Kitchen')
  const [providerId, setProviderId] = useState('')
  const [unit,       setUnit]       = useState<OrderUnit>('box')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Item name is required.'); return }
    setSaving(true); setErr('')
    try {
      await onSave({
        name: name.trim(),
        department,
        providerId: providerId || undefined,
        unit,
        sortOrder: 0,
        nameAr: '',
      })
      setName('')
    } catch { setErr('Save failed — please try again.') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '4px', padding: '1.1rem 1.4rem', marginBottom: '2rem',
    }}>
      <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.5)', marginBottom: '0.9rem', letterSpacing: '0.12em' }}>ADD ITEM</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1.5fr 2fr auto auto', gap: '0.65rem', alignItems: 'end' }}>

        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Section</label>
          <select value={department} onChange={e => setDepartment(e.target.value as Department)} style={{ ...inp, cursor: 'pointer' }}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Item Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coffee Beans" style={{ ...inp, width: '100%' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Provider</label>
          <select value={providerId} onChange={e => setProviderId(e.target.value)} style={{ ...inp, width: '100%', cursor: 'pointer' }}>
            <option value="">— No provider —</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
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

// ---- Single item row ----
function ItemRow({ item, providers, onUpdated, onDeleted }: {
  item: OrderTemplateItem
  providers: OrderProvider[]
  onUpdated: (id: string, before: Partial<OrderTemplateItem>, after: Partial<OrderTemplateItem>) => Promise<void>
  onDeleted: (id: string, name: string) => Promise<void>
}) {
  const [editing,     setEditing]     = useState(false)
  const [name,        setName]        = useState(item.name)
  const [nameAr,      setNameAr]      = useState(item.nameAr ?? '')
  const [unit,        setUnit]        = useState<OrderUnit>(item.unit)
  const [department,  setDepartment]  = useState<Department>(item.department ?? 'Kitchen')
  const [providerId,  setProviderId]  = useState(item.providerId ?? '')
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
        { name: item.name, nameAr: item.nameAr, unit: item.unit, department: item.department, providerId: item.providerId, packSize: item.packSize, packUnit: item.packUnit },
        { name, nameAr, unit, department, providerId: providerId || undefined, packSize: isNaN(ps) || ps < 1 ? undefined : ps, packUnit: packUnit.trim() || undefined },
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
        {/* Row 1: Name | Arabic+🌐 | Unit | Section | Provider */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr auto auto 1.8fr', gap: '0.55rem', alignItems: 'center', marginBottom: '0.5rem' }}>
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

          <select value={department} onChange={e => setDepartment(e.target.value as Department)} style={{ ...inp, cursor: 'pointer' }}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={providerId} onChange={e => setProviderId(e.target.value)} style={{ ...inp, width: '100%', cursor: 'pointer' }}>
            <option value="">— No provider —</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Row 2: Pack size */}
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
          <button
            onClick={() => {
              setName(item.name); setNameAr(item.nameAr ?? ''); setUnit(item.unit)
              setDepartment(item.department ?? 'Kitchen'); setProviderId(item.providerId ?? '')
              setPackSize(String(item.packSize ?? '')); setPackUnit(item.packUnit ?? '')
              setEditing(false)
            }}
            style={{ ...btnGhost, padding: '0.4rem 0.7rem' }}
          >Cancel</button>
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
  const [items,         setItems]        = useState<OrderTemplateItem[]>([])
  const [providers,     setProviders]    = useState<OrderProvider[]>([])
  const [providerMap,   setProviderMap]  = useState<Record<string, OrderProvider>>({})
  const [loading,       setLoading]      = useState(true)
  const [transAll,      setTransAll]     = useState(false)
  const [transProgress, setTransProgress] = useState('')

  async function load() {
    setLoading(true)
    const [data, provs] = await Promise.all([listTemplateItems(), listProviders()])
    setItems(data)
    setProviders(provs)
    setProviderMap(Object.fromEntries(provs.map(p => [p.id, p])))
    setLoading(false)
  }

  useEffect(() => { if (!checking) load() }, [checking])

  // Group: dept → provider groups
  const grouped = useMemo(() =>
    DEPARTMENTS.map(dept => {
      const deptItems = items.filter(i => (i.department ?? 'Kitchen') === dept)
      return { dept, provGroups: groupByProvider(deptItems) }
    }),
  [items])

  async function handleAdd(item: Omit<OrderTemplateItem, 'id' | 'createdAt'>) {
    await addTemplateItem(item); await load()
  }
  async function handleUpdate(id: string, before: Partial<OrderTemplateItem>, after: Partial<OrderTemplateItem>) {
    await updateTemplateItem(id, before, after); await load()
  }
  async function handleDelete(id: string, name: string) {
    await deleteTemplateItem(id, name); await load()
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
                Set items, sections (Kitchen/Bar), providers, Arabic names, and pack sizes.
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

        <AddItemForm providers={providers} onSave={handleAdd} />

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px', padding: '3rem', textAlign: 'center', color: 'rgba(245,242,236,0.25)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem' }}>
            No items yet — add your first one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {grouped.map(({ dept, provGroups }) => (
              <div key={dept}>

                {/* Department header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.7rem',
                  marginBottom: '1rem',
                  borderBottom: `1px solid ${DEPT_COLOR[dept]}30`,
                  paddingBottom: '0.6rem',
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: DEPT_COLOR[dept], flexShrink: 0 }} />
                  <p style={{
                    fontFamily: 'var(--font-cinzel)', fontSize: '1rem',
                    color: DEPT_COLOR[dept], letterSpacing: '0.15em',
                  }}>{dept.toUpperCase()}</p>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.25)' }}>
                    {provGroups.reduce((n, g) => n + g.items.length, 0)} items
                  </span>
                </div>

                {provGroups.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.2)', padding: '0 0.25rem' }}>
                    No items in this section yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {provGroups.map(({ providerId, items: pItems }) => {
                      const provider = providerId ? providerMap[providerId] : undefined
                      return (
                        <div key={providerId ?? '__none__'} style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                          borderLeft: `3px solid ${DEPT_COLOR[dept]}40`,
                          borderRadius: '4px', overflow: 'hidden',
                        }}>
                          {/* Provider sub-header */}
                          <div style={{
                            padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.025)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                          }}>
                            <span style={{
                              fontFamily: 'var(--font-inter)', fontSize: '0.8rem',
                              color: provider ? 'var(--offwhite)' : 'rgba(245,242,236,0.3)',
                              fontWeight: provider ? 600 : 400,
                            }}>
                              {provider?.name ?? 'No Provider'}
                            </span>
                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.7rem', color: 'rgba(245,242,236,0.25)' }}>
                              {pItems.length} item{pItems.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Column headers */}
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr auto auto', gap: '0.6rem', padding: '0.4rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            {['English Name', 'Arabic / عربي', 'Unit / Pack', ''].map((h, i) => (
                              <span key={i} style={{ fontFamily: 'var(--font-inter)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,242,236,0.25)' }}>{h}</span>
                            ))}
                          </div>

                          {pItems.map(item => (
                            <ItemRow key={item.id} item={item} providers={providers} onUpdated={handleUpdate} onDeleted={handleDelete} />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: '1.5rem', fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.2)' }}>
          {items.length} item{items.length !== 1 ? 's' : ''} total
        </p>
      </div>
    </div>
  )
}
