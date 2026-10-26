'use client'

// Manage Accessories — the keychains on /accessories. They are games docs
// (category KEYCHAIN_CATEGORY), so stock, sales, transfers and wholesale orders
// all work on them as on any game; this page is the quick way to set the
// numbers that matter for them: retail price, wholesale price and stock per
// branch. Reads are a live listener; saves go through /api/admin/accessories.
//
// Wholesale only lists items with a wholesale price, so a keychain stays off
// the trade catalogue until one is set here.

import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, auth } from '../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../lib/adminAuth'
import { BRANCHES, normalizeStock } from '../../lib/branches'
import { KEYCHAINS, KEYCHAIN_SERIES, KEYCHAIN_CATEGORY } from '../../lib/accessories'

interface Item {
  id: string
  name: string
  series: string
  code: string
  sku: string
  image: string
  price: number
  wholesalePrice: number | null
  stock: Record<string, number>
}

// What the inputs hold — strings, so a half-typed "3." doesn't get coerced.
interface Draft {
  price: string
  wholesalePrice: string
  stock: Record<string, string>
}

const SEED_ORDER = new Map(KEYCHAINS.map((k, i) => [k.code, i]))

function toDraft(item: Item): Draft {
  return {
    price: String(item.price),
    wholesalePrice: item.wholesalePrice == null ? '' : String(item.wholesalePrice),
    stock: Object.fromEntries(BRANCHES.map(b => [b, String(item.stock[b] ?? 0)])),
  }
}

function isDirty(item: Item, draft: Draft | undefined): boolean {
  if (!draft) return false
  const base = toDraft(item)
  return draft.price !== base.price || draft.wholesalePrice !== base.wholesalePrice
    || BRANCHES.some(b => draft.stock[b] !== base.stock[b])
}

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

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#F5F2EC', borderRadius: '4px', padding: '0.45rem 0.55rem',
  fontSize: '0.82rem', outline: 'none', fontFamily: 'var(--font-inter)',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(245,242,236,0.35)', marginBottom: '0.25rem', fontFamily: 'var(--font-inter)',
}

function ItemRow({ item, draft, busy, isMobile, onChange, onSave }: {
  item: Item
  draft: Draft
  busy: boolean
  isMobile: boolean
  onChange: (d: Draft) => void
  onSave: () => void
}) {
  const dirty = isDirty(item, draft)
  const total = BRANCHES.reduce((sum, b) => sum + (Number(draft.stock[b]) || 0), 0)
  return (
    <div style={{
      background: dirty ? 'rgba(106,106,183,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${dirty ? 'rgba(106,106,183,0.4)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '6px', padding: '0.9rem 1rem',
      display: 'grid',
      gridTemplateColumns: isMobile ? '56px 1fr' : '56px minmax(180px, 1.4fr) 90px 100px repeat(4, 64px) 90px',
      gap: isMobile ? '0.75rem' : '0.8rem',
      alignItems: 'end',
    }}>
      <div style={{ width: '56px', height: '56px', background: '#fff', borderRadius: '4px', overflow: 'hidden', alignSelf: 'center' }}>
        {item.image && <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
      </div>
      <div style={{ alignSelf: 'center', minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.95rem' }}>{item.name}</p>
        <p style={{ fontSize: '0.68rem', color: 'rgba(245,242,236,0.35)', marginTop: '0.15rem' }}>
          {item.series} · {item.sku || 'no SKU'} · {item.code} · {total} total
        </p>
      </div>

      {/* On mobile the editable fields wrap onto their own full-width grid */}
      <div style={isMobile
        ? { gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }
        : { display: 'contents' }}>
        <div>
          <label style={lbl}>Retail $</label>
          <input style={inp} inputMode="decimal" value={draft.price}
            onChange={e => onChange({ ...draft, price: e.target.value })} />
        </div>
        <div>
          <label style={lbl}>Wholesale $</label>
          <input style={inp} inputMode="decimal" placeholder="not listed" value={draft.wholesalePrice}
            onChange={e => onChange({ ...draft, wholesalePrice: e.target.value })} />
        </div>
        {BRANCHES.map(b => (
          <div key={b}>
            <label style={lbl}>{b}</label>
            <input style={inp} inputMode="numeric" value={draft.stock[b]}
              onChange={e => onChange({ ...draft, stock: { ...draft.stock, [b]: e.target.value } })} />
          </div>
        ))}
        <button onClick={onSave} disabled={!dirty || busy} style={{
          background: dirty && !busy ? '#00A098' : 'rgba(255,255,255,0.06)',
          color: dirty && !busy ? '#000' : 'rgba(245,242,236,0.3)',
          border: 'none', borderRadius: '4px', padding: '0.5rem 0.6rem',
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          cursor: dirty && !busy ? 'pointer' : 'not-allowed', height: '33px',
          gridColumn: isMobile ? 'span 3' : undefined,
        }}>{busy ? '…' : 'Save'}</button>
      </div>
    </div>
  )
}

export default function ManageAccessoriesPage() {
  const { checking } = useRequireRole(SECTION_ACCESS.games)
  const isMobile = useIsMobile()

  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts]   = useState<Record<string, Draft>>({})
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')
  const [search, setSearch]   = useState('')
  const [series, setSeries]   = useState('All')
  const [bulkWholesale, setBulkWholesale] = useState('')
  const [bulkRetail, setBulkRetail]       = useState('')

  useEffect(() => {
    if (checking) return
    const q = query(collection(db, 'games'), where('category', '==', KEYCHAIN_CATEGORY))
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => {
        const x = d.data()
        return {
          id: d.id,
          name: (x.name as string) ?? '',
          series: (x.series as string) ?? '',
          code: (x.supplierCode as string) ?? '',
          sku: (x.sku as string) ?? '',
          image: (x.image as string) ?? '',
          price: Number(x.price) || 0,
          wholesalePrice: typeof x.wholesalePrice === 'number' && x.wholesalePrice > 0 ? x.wholesalePrice : null,
          stock: normalizeStock(x.stock),
        }
      })
      list.sort((a, b) =>
        (SEED_ORDER.get(a.code) ?? Infinity) - (SEED_ORDER.get(b.code) ?? Infinity) || a.name.localeCompare(b.name))
      setItems(list)
      setLoading(false)
    }, err => {
      console.error('[ManageAccessories] games listener failed:', err)
      setError('Could not load accessories.')
      setLoading(false)
    })
  }, [checking])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i =>
      (series === 'All' || i.series === series) &&
      (!q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)))
  }, [items, search, series])

  const draftOf = (item: Item) => drafts[item.id] ?? toDraft(item)
  const dirtyItems = items.filter(i => isDirty(i, drafts[i.id]))

  async function save(list: Item[]) {
    if (list.length === 0) return
    setError(''); setNotice('')
    setBusyIds(new Set(list.map(i => i.id)))
    try {
      const updates = list.map(item => {
        const d = draftOf(item)
        return {
          id: item.id,
          price: d.price.trim(),
          wholesalePrice: d.wholesalePrice.trim() === '' ? null : d.wholesalePrice.trim(),
          stock: Object.fromEntries(BRANCHES.map(b => [b, d.stock[b].trim()])),
        }
      })
      const idToken = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/admin/accessories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save.')
      // The listener brings the saved values back; drop the drafts so the rows
      // show what's actually stored.
      setDrafts(prev => {
        const next = { ...prev }
        for (const i of list) delete next[i.id]
        return next
      })
      setNotice(`Saved ${list.length} item${list.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusyIds(new Set())
    }
  }

  // Fills the field into every shown row's draft; nothing is saved until
  // "Save all changes", so a typo can still be fixed first.
  function applyToShown(field: 'price' | 'wholesalePrice', value: string) {
    setDrafts(prev => {
      const next = { ...prev }
      for (const item of visible) next[item.id] = { ...(prev[item.id] ?? toDraft(item)), [field]: value.trim() }
      return next
    })
  }

  if (checking) return null

  const btn = (enabled: boolean, primary = false): React.CSSProperties => ({
    background: !enabled ? 'rgba(255,255,255,0.06)' : primary ? '#00A098' : 'transparent',
    color: !enabled ? 'rgba(245,242,236,0.3)' : primary ? '#000' : '#9B9BD6',
    border: primary || !enabled ? 'none' : '1px solid rgba(106,106,183,0.4)',
    borderRadius: '4px', padding: '0.55rem 1rem', fontSize: '0.72rem', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', cursor: enabled ? 'pointer' : 'not-allowed',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#F5F2EC', fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '2rem 1rem' : '3rem 2rem' }}>

        <a href="/admin" style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,242,236,0.3)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
          ← Dashboard
        </a>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', marginBottom: '0.25rem' }}>Manage Accessories</h1>
            <p style={{ fontSize: '0.82rem', color: 'rgba(245,242,236,0.35)' }}>
              Keychains on the Accessories page. Leave wholesale price empty to keep an item off wholesale.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <a href="/accessories" target="_blank" rel="noopener noreferrer" style={{ ...btn(true), textDecoration: 'none' }}>View Page</a>
            <button onClick={() => save(dirtyItems)} disabled={dirtyItems.length === 0 || busyIds.size > 0}
              style={btn(dirtyItems.length > 0 && busyIds.size === 0, true)}>
              {busyIds.size > 1 ? 'Saving…' : `Save all changes${dirtyItems.length ? ` (${dirtyItems.length})` : ''}`}
            </button>
          </div>
        </div>

        {/* Filters + bulk fill */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr 1fr 1fr', gap: '0.8rem',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem', alignItems: 'end',
        }}>
          <div>
            <label style={lbl}>Search</label>
            <input style={inp} placeholder="Name, supplier code or SKU" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Theme</label>
            <select style={inp} value={series} onChange={e => setSeries(e.target.value)}>
              {['All', ...KEYCHAIN_SERIES].map(s => <option key={s} value={s} style={{ background: '#111' }}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Wholesale $ for all shown ({visible.length})</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input style={inp} inputMode="decimal" placeholder="e.g. 1.5" value={bulkWholesale} onChange={e => setBulkWholesale(e.target.value)} />
              <button onClick={() => applyToShown('wholesalePrice', bulkWholesale)} disabled={visible.length === 0} style={btn(visible.length > 0)}>Fill</button>
            </div>
          </div>
          <div>
            <label style={lbl}>Retail $ for all shown ({visible.length})</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input style={inp} inputMode="decimal" placeholder="e.g. 3.3" value={bulkRetail} onChange={e => setBulkRetail(e.target.value)} />
              <button onClick={() => applyToShown('price', bulkRetail)} disabled={visible.length === 0 || bulkRetail.trim() === ''} style={btn(visible.length > 0 && bulkRetail.trim() !== '')}>Fill</button>
            </div>
          </div>
        </div>

        {error && <p style={{ color: '#E43329', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
        {notice && !error && <p style={{ color: '#00A098', fontSize: '0.82rem', marginBottom: '1rem' }}>{notice}</p>}

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)' }}>Loading…</p>
        ) : items.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', padding: '4rem', textAlign: 'center', color: 'rgba(245,242,236,0.2)', fontSize: '0.88rem' }}>
            No accessories yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {visible.map(item => (
              <ItemRow key={item.id} item={item} draft={draftOf(item)} isMobile={isMobile}
                busy={busyIds.has(item.id)}
                onChange={d => setDrafts(prev => ({ ...prev, [item.id]: d }))}
                onSave={() => save([item])} />
            ))}
          </div>
        )}

        <p style={{ marginTop: '2rem', fontSize: '0.72rem', color: 'rgba(245,242,236,0.25)', lineHeight: 1.8 }}>
          &ldquo;Fill&rdquo; only fills the boxes — review, then Save all changes. Keychains are also
          regular items in Record a Sale and Transfer Stock, which update these counts.
        </p>
      </div>
    </div>
  )
}
