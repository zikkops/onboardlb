'use client'

import { useState } from 'react'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useRequireRole } from '../../../lib/adminAuth'
import type { OrderUnit } from '../../../lib/weeklyOrders'

const PROVIDER_NAME = 'Zizette'

type ItemSeed = {
  name:       string
  unit:       OrderUnit
  packSize?:  number
  packUnit?:  string
}

const ITEMS: ItemSeed[] = [
  { name: 'Aluminum Handle',                  unit: 'pcs' },
  { name: 'Arabic Cotton Mop',                unit: 'bag' },
  { name: 'Chamex',                           unit: 'pcs',    packSize: 2,  packUnit: 'pcs' },
  { name: 'Cling Film Roll',                  unit: 'box',    packSize: 6,  packUnit: 'rolls' },
  { name: 'Dupree Dishwashing Liquid',        unit: 'gallon' },
  { name: 'Jocker All Purpose Cleaner',       unit: 'gallon' },
  { name: 'Microfiber Floor Mop',             unit: 'pcs' },
  { name: 'Sponge Scrubber',                  unit: 'bag',    packSize: 4,  packUnit: 'pcs' },
  { name: 'Trash Bags L',                     unit: 'bag' },
  { name: 'Trash Bags XL',                    unit: 'bag' },
  { name: 'Wooden Handle 120cm',              unit: 'pcs' },
  { name: 'All Purpose Cloth Leather',        unit: 'pcs' },
  { name: 'Bleaching Javel',                  unit: 'gallon' },
  { name: 'Bucket',                           unit: 'pcs' },
  { name: 'Center Feed 600g',                 unit: 'box',    packSize: 6,  packUnit: 'rolls' },
  { name: 'Fine Broom',                       unit: 'pcs' },
  { name: 'Gardenia Air Freshener Spray',     unit: 'pcs' },
  { name: 'Glass Glaze',                      unit: 'gallon' },
  { name: 'Hand Washing Liquid',              unit: 'gallon' },
  { name: 'Nitrile Gloves Blue',              unit: 'box',    packSize: 10, packUnit: 'pkts' },
  { name: 'Scouring Ball Seif Hard',          unit: 'pcs' },
  { name: 'Spray Bottle',                     unit: 'pcs' },
  { name: 'Squeegee Floor Plastic',           unit: 'pcs' },
  { name: 'Straws Black',                     unit: 'bag' },
  { name: 'Superfold 2 Ply',                  unit: 'box',    packSize: 20, packUnit: 'pkts' },
  { name: 'Teal Napkins 6kg',                 unit: 'box',    packSize: 20, packUnit: 'pkts' },
  { name: 'Toilet Roll',                      unit: 'box',    packSize: 12, packUnit: 'rolls' },
  { name: 'Window & Stainless Steel Cleaner', unit: 'pcs' },
  { name: 'Window Washer',                    unit: 'pcs' },
]

type LogLine = { status: 'ok' | 'skip' | 'err'; msg: string }

export default function SeedCleaningPage() {
  const { checking } = useRequireRole(['admin'])
  const [running, setRunning] = useState(false)
  const [done,    setDone]    = useState(false)
  const [log,     setLog]     = useState<LogLine[]>([])

  function push(line: LogLine) { setLog(prev => [...prev, line]) }

  if (checking) return null

  async function runImport() {
    setRunning(true)
    setLog([])

    try {
      // ── 1. Load / create provider ──────────────────────────
      push({ status: 'ok', msg: 'Loading existing providers…' })
      const provSnap = await getDocs(collection(db, 'orderProviders'))
      const providerMap = new Map<string, string>()
      provSnap.docs.forEach(d => {
        providerMap.set((d.data().name as string).toLowerCase(), d.id)
      })

      let providerId = providerMap.get(PROVIDER_NAME.toLowerCase())
      if (providerId) {
        push({ status: 'skip', msg: `Provider already exists: ${PROVIDER_NAME}` })
      } else {
        const ref = await addDoc(collection(db, 'orderProviders'), {
          name: PROVIDER_NAME, phones: {}, createdAt: serverTimestamp(),
        })
        providerId = ref.id
        push({ status: 'ok', msg: `Added provider: ${PROVIDER_NAME}` })
      }

      // ── 2. Load existing items ─────────────────────────────
      push({ status: 'ok', msg: 'Loading existing template items…' })
      const itemSnap = await getDocs(collection(db, 'orderTemplateItems'))
      const existingItems = new Set<string>()
      itemSnap.docs.forEach(d => {
        existingItems.add((d.data().name as string).toLowerCase())
      })

      // ── 3. Add cleaning items ──────────────────────────────
      let added = 0; let skipped = 0
      for (const item of ITEMS) {
        if (existingItems.has(item.name.toLowerCase())) {
          push({ status: 'skip', msg: `Skip (exists): ${item.name}` })
          skipped++
          continue
        }

        const doc: Record<string, unknown> = {
          name:       item.name,
          department: 'Cleaning',
          unit:       item.unit,
          providerId,
          sortOrder:  0,
          createdAt:  serverTimestamp(),
        }
        if (item.packSize) doc.packSize = item.packSize
        if (item.packUnit) doc.packUnit = item.packUnit

        await addDoc(collection(db, 'orderTemplateItems'), doc)
        existingItems.add(item.name.toLowerCase())
        push({ status: 'ok', msg: `Added: ${item.name} (${item.unit})` })
        added++
      }

      push({ status: 'ok', msg: `Done — ${added} items added, ${skipped} already existed.` })
      setDone(true)
    } catch (e) {
      push({ status: 'err', msg: `Error: ${String(e)}` })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem', fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        <a href="/admin/weekly-orders/template" style={{
          fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
          display: 'block', marginBottom: '0.5rem',
        }}>← Order Template</a>

        <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
          Seed Cleaning Supplies
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '2rem' }}>
          29 items · provider: <strong style={{ color: '#8B7CF6' }}>Zizette</strong> ·
          department: <strong style={{ color: '#8B7CF6' }}>Cleaning</strong>.
          Skips anything already in Firestore by name.
          Delete this page after use.
        </p>

        {!running && !done && (
          <button
            onClick={runImport}
            style={{
              backgroundColor: '#8B7CF6', color: '#fff', border: 'none',
              padding: '0.85rem 2rem', borderRadius: '2px', fontSize: '0.82rem',
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
            }}
          >
            Run Import
          </button>
        )}

        {running && (
          <p style={{ color: 'rgba(245,242,236,0.4)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            Running…
          </p>
        )}

        {done && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <a href="/admin/weekly-orders/template" style={{
              backgroundColor: '#8B7CF6', color: '#fff', textDecoration: 'none',
              padding: '0.75rem 1.5rem', borderRadius: '2px', fontSize: '0.78rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>View Template →</a>
            <span style={{ fontSize: '0.78rem', color: 'rgba(245,242,236,0.3)', alignSelf: 'center' }}>
              Now delete: app/admin/weekly-orders/seed-cleaning/page.tsx
            </span>
          </div>
        )}

        {log.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px', padding: '1rem 1.25rem',
            maxHeight: '500px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '0.2rem',
          }}>
            {log.map((line, i) => (
              <p key={i} style={{
                fontFamily: 'var(--font-inter)', fontSize: '0.75rem', margin: 0,
                color: line.status === 'ok'
                  ? '#8B7CF6'
                  : line.status === 'skip'
                    ? 'rgba(245,242,236,0.3)'
                    : 'var(--red)',
              }}>
                {line.status === 'ok' ? '✓' : line.status === 'skip' ? '–' : '✗'} {line.msg}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
