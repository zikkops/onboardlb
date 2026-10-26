'use client'

import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import WhatsAppReserveModal from '../components/WhatsAppReserveModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faXmark } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { normalizeStock, BRANCH_WHATSAPP } from '../lib/branches'
import { KEYCHAINS, KEYCHAIN_SERIES, KEYCHAIN_CATEGORY } from '../lib/accessories'

// A keychain as stored in `games` (seeded by scripts/seed-keychains.mjs,
// edited at /admin/accessories).
interface KeychainItem {
  id: string
  name: string
  series: string
  code: string
  price: number
  stock: Record<string, number>
  image: string
}

// Keep the curated seed order (grouped by theme) rather than alphabetical;
// anything added later goes at the end.
const SEED_ORDER = new Map(KEYCHAINS.map((k, i) => [k.code, i]))

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

function SeriesChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: active ? 'var(--purple)' : hovered ? 'rgba(106,106,183,0.12)' : 'transparent',
        border: `1px solid ${active ? 'var(--purple)' : hovered ? 'rgba(106,106,183,0.5)' : 'rgba(255,255,255,0.1)'}`,
        color: active ? '#fff' : 'rgba(245,242,236,0.65)',
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        fontSize: '0.74rem',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        fontFamily: 'var(--font-inter)',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
      }}>
      {label} <span style={{ opacity: 0.55 }}>({count})</span>
    </button>
  )
}

function KeychainCard({ item, isMobile, onReserve }: { item: KeychainItem; isMobile: boolean; onReserve: (k: KeychainItem) => void }) {
  const [hovered, setHovered] = useState(false)
  // Only branches customers can reserve at count toward "in stock".
  const available = Object.keys(BRANCH_WHATSAPP).reduce((sum, b) => sum + (item.stock[b] ?? 0), 0)
  const outOfStock = available === 0
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered && !outOfStock ? 'rgba(106,106,183,0.4)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: outOfStock ? 0.55 : 1,
        transform: hovered && !outOfStock ? 'translateY(-3px)' : 'none',
        transition: 'border-color 0.2s, transform 0.25s ease',
      }}>
      <div style={{
        backgroundColor: '#fff',
        padding: isMobile ? '0.6rem' : '1rem',
        height: isMobile ? '140px' : '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={item.image}
          alt={`${item.name} keychain`}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: outOfStock ? 'grayscale(60%)' : 'none',
            transform: hovered && !outOfStock ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.35s ease',
          }}
        />
      </div>
      <div style={{ padding: isMobile ? '0.75rem' : '1rem 1.1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
        <p style={{
          fontSize: '0.6rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--purple)',
          fontFamily: 'var(--font-inter)',
        }}>{item.series}</p>
        <p style={{
          fontFamily: 'var(--font-cinzel)',
          fontSize: isMobile ? '0.85rem' : '0.98rem',
          color: 'var(--offwhite)',
          lineHeight: 1.3,
          flex: 1,
        }}>{item.name}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.2rem' }}>
          <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: isMobile ? '0.95rem' : '1.05rem', color: 'var(--purple)' }}>
            ${item.price.toFixed(2)}
          </span>
          <span style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '0.66rem',
            color: outOfStock ? 'var(--red)' : 'var(--teal)',
          }}>{outOfStock ? 'Out of stock' : `${available} in stock`}</span>
        </div>
        <button onClick={() => onReserve(item)} disabled={outOfStock}
          style={{
            marginTop: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            width: '100%',
            backgroundColor: hovered && !outOfStock ? 'var(--purple)' : 'transparent',
            border: `1px solid ${outOfStock ? 'rgba(255,255,255,0.1)' : 'var(--purple)'}`,
            color: outOfStock ? 'rgba(245,242,236,0.3)' : hovered ? '#fff' : 'rgba(245,242,236,0.8)',
            padding: isMobile ? '0.55rem' : '0.65rem',
            borderRadius: '2px',
            fontSize: isMobile ? '0.64rem' : '0.7rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: outOfStock ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-inter)',
            transition: 'all 0.2s ease',
          }}>
          <FontAwesomeIcon icon={faWhatsapp} style={{ width: '13px' }} />
          {outOfStock ? 'Sold Out' : 'Reserve'}
        </button>
      </div>
    </div>
  )
}

export default function AccessoriesPage() {
  const isMobile = useIsMobile()
  const [series, setSeries]       = useState<string>('All')
  const [search, setSearch]       = useState('')
  const [reserving, setReserving] = useState<KeychainItem | null>(null)
  const [items, setItems]         = useState<KeychainItem[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'games'), where('category', '==', KEYCHAIN_CATEGORY))
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          name:   (data.name as string) ?? '',
          series: (data.series as string) ?? '',
          code:   (data.supplierCode as string) ?? '',
          price:  Number(data.price) || 0,
          stock:  normalizeStock(data.stock),
          image:  (data.image as string) ?? '',
        }
      })
      list.sort((a, b) =>
        (SEED_ORDER.get(a.code) ?? Infinity) - (SEED_ORDER.get(b.code) ?? Infinity) || a.name.localeCompare(b.name))
      setItems(list)
      setLoading(false)
    }, err => {
      console.error('[Accessories] games listener failed:', err)
      setLoading(false)
    })
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: items.length }
    for (const k of items) c[k.series] = (c[k.series] ?? 0) + 1
    return c
  }, [items])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(k =>
      (series === 'All' || k.series === series) &&
      (!q || k.name.toLowerCase().includes(q) || k.series.toLowerCase().includes(q))
    )
  }, [items, series, search])

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: 'var(--black)', minHeight: '100vh' }}>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: isMobile ? '42vh' : '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at center, rgba(106,106,183,0.22) 0%, rgba(5,5,5,1) 70%)',
        }}>
          <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '4rem 1.25rem 0' : '4rem 0 0' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Accessories</p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '2.3rem' : '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}>Keychains</h1>
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              color: 'rgba(245,242,236,0.55)',
              maxWidth: '480px',
              margin: '0 auto',
              lineHeight: 1.7,
            }}>
              Our best-selling keychains — pick a favourite and reserve it at your branch on WhatsApp.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: isMobile ? '1.5rem 1.25rem 3rem' : '3rem 3rem 6rem' }}>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: isMobile ? '100%' : '420px', marginBottom: '1.25rem' }}>
            <FontAwesomeIcon icon={faSearch} style={{
              position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
              width: '13px', color: 'rgba(245,242,236,0.35)', pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search keychains…"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: 'var(--offwhite)',
                padding: '0.75rem 2.4rem',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-inter)',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search" style={{
                position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', color: 'rgba(245,242,236,0.45)', cursor: 'pointer',
                padding: '0.3rem',
              }}>
                <FontAwesomeIcon icon={faXmark} style={{ width: '12px' }} />
              </button>
            )}
          </div>

          {/* Series filter — scrolls sideways on mobile instead of wrapping into a wall */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '0.4rem' : 0,
            marginBottom: '2rem',
          }}>
            {['All', ...KEYCHAIN_SERIES].map(s => (
              <SeriesChip key={s} label={s} count={counts[s] ?? 0} active={series === s} onClick={() => setSeries(s)} />
            ))}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(245,242,236,0.35)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(245,242,236,0.4)', fontFamily: 'var(--font-inter)' }}>
              <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.1rem', color: 'var(--offwhite)', marginBottom: '0.5rem' }}>
                {items.length === 0 ? 'Keychains are on their way' : 'No keychains found'}
              </p>
              <p style={{ fontSize: '0.82rem' }}>{items.length === 0 ? 'Check back soon.' : 'Try a different search or theme'}</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '0.75rem' : '1.5rem',
            }}>
              {visible.map(k => (
                <KeychainCard key={k.code} item={k} isMobile={isMobile} onReserve={setReserving} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {reserving && (
        <WhatsAppReserveModal
          title="Reserve a Keychain"
          subtitle={`${reserving.name} · ${reserving.price.toFixed(2)}`}
          details={reserving.series}
          stock={reserving.stock}
          message={b => `Hi! I'd like to reserve the "${reserving.name}" keychain (${reserving.code}, ${reserving.price.toFixed(2)}) at the ${b} branch.`}
          onClose={() => setReserving(null)}
        />
      )}
    </>
  )
}
