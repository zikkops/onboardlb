'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useRequireRole } from '../../../lib/adminAuth'
import type { OrderTemplateItem } from '../../../lib/weeklyOrders'

export default function FixGallonsPage() {
  const { checking } = useRequireRole(['admin'])
  const [items,   setItems]   = useState<OrderTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState<Record<string, boolean>>({})
  const [done,    setDone]    = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'orderTemplateItems'), where('unit', '==', 'liter')))
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderTemplateItem)))
    setLoading(false)
  }

  useEffect(() => { if (!checking) load() }, [checking])

  async function fixOne(id: string) {
    setBusy(p => ({ ...p, [id]: true }))
    await updateDoc(doc(db, 'orderTemplateItems', id), { unit: 'gallon' })
    setDone(p => ({ ...p, [id]: true }))
    setBusy(p => ({ ...p, [id]: false }))
  }

  async function fixAll() {
    for (const item of items) {
      if (!done[item.id]) await fixOne(item.id)
    }
  }

  if (checking) return null

  const remaining = items.filter(i => !done[i.id])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem', fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <a href="/admin/weekly-orders/template" style={{
          fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
          marginBottom: '0.5rem', display: 'block',
        }}>← Order Template</a>

        <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
          Fix Gallons
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '2rem' }}>
          All template items currently set to <strong style={{ color: 'rgba(245,242,236,0.7)' }}>Liter</strong> are listed below.
          Click the button next to any that should actually be <strong style={{ color: 'var(--teal)' }}>Gallon</strong>.{' '}
          <strong style={{ color: 'var(--red)' }}>Delete this page after use.</strong>
        </p>

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)' }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'rgba(245,242,236,0.4)' }}>No items with unit "Liter" found.</p>
        ) : (
          <>
            {remaining.length > 0 && (
              <button
                onClick={fixAll}
                style={{
                  backgroundColor: 'var(--teal)', color: '#fff', border: 'none',
                  padding: '0.65rem 1.3rem', borderRadius: '2px', fontSize: '0.78rem',
                  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  marginBottom: '1.5rem',
                }}
              >
                → Set All to Gallon ({remaining.length})
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: done[item.id] ? 'rgba(0,160,152,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${done[item.id] ? 'rgba(0,160,152,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '4px', padding: '0.75rem 1rem',
                }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--offwhite)', fontWeight: 500 }}>{item.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(245,242,236,0.3)', marginLeft: '0.75rem' }}>
                      {item.department} · {item.packUnit ?? ''}
                    </span>
                  </div>
                  {done[item.id] ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--teal)' }}>✓ Gallon</span>
                  ) : (
                    <button
                      onClick={() => fixOne(item.id)}
                      disabled={busy[item.id]}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(0,160,152,0.4)',
                        color: 'var(--teal)', padding: '0.4rem 0.85rem', borderRadius: '2px',
                        fontSize: '0.72rem', cursor: 'pointer', letterSpacing: '0.06em',
                        opacity: busy[item.id] ? 0.5 : 1,
                      }}
                    >
                      {busy[item.id] ? '…' : '→ Gallon'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
