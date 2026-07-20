'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useRequireRole } from '../../../lib/adminAuth'
import type { OrderUnit } from '../../../lib/weeklyOrders'

// ── Providers to create if not already present ──────────────────────────────
const PROVIDERS_TO_SEED = [
  'Horeca 1883',
  'Libanlait',
  'Pepsi',
  'EBA',
  'TEAL',
  'Hopla',
  'Rachel Cookies',
  'Stephanie',
  'Najjar',
  'Penasol',
]

// ── Bar items ────────────────────────────────────────────────────────────────
type ItemSeed = {
  name: string
  unit: OrderUnit
  providerName?: string
  packSize?: number
  packUnit?: string
}

const ITEMS: ItemSeed[] = [
  // ── SYRUP (Horeca 1883) ─────────────────────────────────────
  { name: 'Blue Curaçao Syrup',    unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Grenadine',             unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Grenade',               unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Vanilla Syrup',         unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Vanilla Sugar Free',    unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Caramel Syrup',         unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Hazelnut Syrup',        unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Hazelnut Sugar Free',   unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Caramel Sugar Free',    unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Ice Tea Lemon Syrup',   unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Ice Tea Peach Syrup',   unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Ice Tea Red Fruit Syrup', unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Lavender Syrup',        unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Citron Syrup',          unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Basil Syrup',           unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Cucumber Syrup',        unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Gingerbread Syrup',     unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Cookie Chocolate Syrup', unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Lime Syrup',            unit: 'bottle', providerName: 'Horeca 1883' },

  // ── PUREE (Horeca 1883) ─────────────────────────────────────
  { name: 'Blueberry Puree',       unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Fruits Rouge Puree',    unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Kiwi Puree',            unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Yuzu Puree',            unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Green Apple Puree',     unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Lychee Puree',          unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Mango Puree',           unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Watermelon Puree',      unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Strawberry Puree',      unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Passion Fruit Puree',   unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Banana Puree',          unit: 'bottle', providerName: 'Horeca 1883' },

  // ── SAUCE (Horeca 1883) ─────────────────────────────────────
  { name: 'Chocolate Sauce',       unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'White Chocolate Sauce', unit: 'bottle', providerName: 'Horeca 1883' },
  { name: 'Nestle Sauce',          unit: 'bottle', providerName: 'Horeca 1883' },

  // ── POWDER (Horeca 1883) ────────────────────────────────────
  { name: 'Matcha Powder',         unit: 'box',    providerName: 'Horeca 1883' },
  { name: 'Cookie & Crème Powder', unit: 'bag',    providerName: 'Horeca 1883' },
  { name: 'Coffee Base Powder',    unit: 'bag',    providerName: 'Horeca 1883' },
  { name: 'Vanilla Powder',        unit: 'bag',    providerName: 'Horeca 1883' },
  { name: 'Hot Chocolate',         unit: 'box',    providerName: 'Horeca 1883' },
  { name: 'Sugar',                 unit: 'bag',    providerName: 'Horeca 1883' },
  { name: 'Salt',                  unit: 'bag',    providerName: 'Horeca 1883' },
  { name: 'Chia Seeds',            unit: 'bag',    providerName: 'Horeca 1883' },
  { name: 'Brown Sugar',           unit: 'bag',    providerName: 'Horeca 1883' },
  { name: 'Cinnamon',              unit: 'bag',    providerName: 'Horeca 1883' },

  // ── DRY FRUITS (no supplier) ────────────────────────────────
  { name: 'Dried Strawberry',      unit: 'bag' },
  { name: 'Dried Banana',          unit: 'bag' },
  { name: 'Dried Mango',           unit: 'bag' },
  { name: 'Dried Apple',           unit: 'bag' },
  { name: 'Dried Pineapple',       unit: 'bag' },
  { name: 'Dried Peach',           unit: 'bag' },

  // ── MILK (Libanlait) ────────────────────────────────────────
  { name: 'Candia Full Fat',       unit: 'box', providerName: 'Libanlait' },
  { name: 'Candia Skimmed',        unit: 'box', providerName: 'Libanlait' },
  { name: 'Candia Lactose Free',   unit: 'box', providerName: 'Libanlait' },
  { name: 'Barista Almond Milk',   unit: 'box', providerName: 'Libanlait' },
  { name: 'Barista Oat Milk',      unit: 'box', providerName: 'Libanlait' },
  { name: 'Barista Coconut Milk',  unit: 'box', providerName: 'Libanlait' },

  // ── SOFT DRINKS (Pepsi) ─────────────────────────────────────
  { name: 'Pepsi',                 unit: 'box', providerName: 'Pepsi', packSize: 24, packUnit: 'cans' },
  { name: 'Pepsi Diet',            unit: 'box', providerName: 'Pepsi', packSize: 24, packUnit: 'cans' },
  { name: 'Pepsi Zero',            unit: 'box', providerName: 'Pepsi', packSize: 24, packUnit: 'cans' },
  { name: '7UP',                   unit: 'box', providerName: 'Pepsi', packSize: 24, packUnit: 'cans' },
  { name: '7UP Diet',              unit: 'box', providerName: 'Pepsi', packSize: 24, packUnit: 'cans' },
  { name: 'Miranda',               unit: 'box', providerName: 'Pepsi', packSize: 24, packUnit: 'cans' },

  // ── ENERGY DRINK (EBA) ──────────────────────────────────────
  { name: 'Red Bull',              unit: 'box', providerName: 'EBA', packSize: 24, packUnit: 'cans' },
  { name: 'Red Bull Light',        unit: 'box', providerName: 'EBA', packSize: 24, packUnit: 'cans' },

  // ── PERRIER (EBA) ───────────────────────────────────────────
  { name: 'Perrier Regular',       unit: 'box', providerName: 'EBA' },
  { name: 'Perrier Ginger Lime',   unit: 'box', providerName: 'EBA' },
  { name: 'Perrier Lime',          unit: 'box', providerName: 'EBA' },

  // ── WATER (EBA) ─────────────────────────────────────────────
  { name: 'Small Water',           unit: 'box', providerName: 'EBA', packSize: 24, packUnit: 'bottles' },

  // ── TEA (TEAL) ──────────────────────────────────────────────
  { name: 'Blue Flower Earl Grey Tea',  unit: 'bag', providerName: 'TEAL' },
  { name: 'Earl Grey Green Tea',        unit: 'bag', providerName: 'TEAL' },
  { name: 'English Breakfast Tea',      unit: 'bag', providerName: 'TEAL' },
  { name: 'Jasmine Tea',                unit: 'bag', providerName: 'TEAL' },
  { name: 'Lemon & Ginger Tea',         unit: 'bag', providerName: 'TEAL' },
  { name: 'Matcha & Berries Tea',       unit: 'bag', providerName: 'TEAL' },
  { name: 'Mixed Berries Tea',          unit: 'bag', providerName: 'TEAL' },
  { name: 'Orange Turmeric Tea',        unit: 'bag', providerName: 'TEAL' },
  { name: 'Camomile Tea',               unit: 'bag', providerName: 'TEAL' },
  { name: 'Scents & Secrets Tea',       unit: 'bag', providerName: 'TEAL' },
  { name: 'Teal Blue Tea',              unit: 'bag', providerName: 'TEAL' },

  // ── CRÈME (Hopla) ───────────────────────────────────────────
  { name: 'Hopla Crème',           unit: 'bottle', providerName: 'Hopla' },

  // ── COOKIES (Rachel Cookies) ────────────────────────────────
  { name: 'Red Velvet Kinder Cookie', unit: 'pcs', providerName: 'Rachel Cookies' },
  { name: 'Nutella Cookie',           unit: 'pcs', providerName: 'Rachel Cookies' },
  { name: 'Kinder Cookie',            unit: 'pcs', providerName: 'Rachel Cookies' },
  { name: 'Salted Cookie',            unit: 'pcs', providerName: 'Rachel Cookies' },
  { name: 'Lotus Cookie',             unit: 'pcs', providerName: 'Rachel Cookies' },
  { name: 'Dark Nutella Cookie',      unit: 'pcs', providerName: 'Rachel Cookies' },
  { name: 'Cinnamon Roll Cookie',     unit: 'pcs', providerName: 'Rachel Cookies' },

  // ── MUFFIN (Stephanie) ──────────────────────────────────────
  { name: 'Red Velvet Muffin',     unit: 'pcs', providerName: 'Stephanie' },
  { name: 'Nutella Muffin',        unit: 'pcs', providerName: 'Stephanie' },
  { name: 'Hazelnut Muffin',       unit: 'pcs', providerName: 'Stephanie' },

  // ── CAKE (Najjar) ───────────────────────────────────────────
  { name: 'Cheesecake',            unit: 'pcs', providerName: 'Najjar' },
  { name: 'Lazy Cake',             unit: 'pcs', providerName: 'Najjar' },
  { name: 'Lotus Cake',            unit: 'pcs', providerName: 'Najjar' },
  { name: 'Fudge Cake',            unit: 'pcs', providerName: 'Najjar' },

  // ── LAZIZA (EBA) ────────────────────────────────────────────
  { name: 'Laziza Apple',          unit: 'box', providerName: 'EBA' },
  { name: 'Laziza Peach',          unit: 'box', providerName: 'EBA' },
  { name: 'Laziza Pomegranate',    unit: 'box', providerName: 'EBA' },
  { name: 'Laziza Regular',        unit: 'box', providerName: 'EBA' },
  { name: 'Laziza Strawberry',     unit: 'box', providerName: 'EBA' },

  // ── WINE (Penasol) ──────────────────────────────────────────
  { name: 'Penasole White',            unit: 'bottle', providerName: 'Penasol' },
  { name: 'Penasole Red',              unit: 'bottle', providerName: 'Penasol' },
  { name: 'Penasole Rosé',             unit: 'bottle', providerName: 'Penasol' },
  { name: 'Penasole Brut Sparkling',   unit: 'bottle', providerName: 'Penasol' },
  { name: 'Penasole Rosé Sparkling',   unit: 'bottle', providerName: 'Penasol' },
  { name: 'Ixsir Red',                 unit: 'bottle', providerName: 'Penasol' },
  { name: 'Ixsir Rosé',                unit: 'bottle', providerName: 'Penasol' },
  { name: 'Ixsir White',               unit: 'bottle', providerName: 'Penasol' },

  // ── ALCOHOL (EBA) ───────────────────────────────────────────
  { name: 'Baileys',                       unit: 'bottle', providerName: 'EBA' },
  { name: 'Triple Sec Elderflower',        unit: 'bottle', providerName: 'EBA' },
  { name: 'Triple Sec Tangy',              unit: 'bottle', providerName: 'EBA' },
  { name: "Gilbey's Gin",                  unit: 'bottle', providerName: 'EBA' },
  { name: 'Chivas Scotch Whiskey',         unit: 'bottle', providerName: 'EBA' },
  { name: 'Jameson Irish Whiskey',         unit: 'bottle', providerName: 'EBA' },
  { name: 'Captain Morgan Spiced Gold Rum', unit: 'bottle', providerName: 'EBA' },
  { name: 'Martini Regular',               unit: 'bottle', providerName: 'EBA' },
  { name: 'Martini Extra Dry',             unit: 'bottle', providerName: 'EBA' },
  { name: 'Bulleit Bourbon Whiskey',       unit: 'bottle', providerName: 'EBA' },
  { name: 'Smirnoff Vodka',               unit: 'bottle', providerName: 'EBA' },
  { name: 'Passion Fruit Liqueur',         unit: 'bottle', providerName: 'EBA' },
  { name: 'Peach Schnapps',               unit: 'bottle', providerName: 'EBA' },
  { name: 'Black Label',                   unit: 'bottle', providerName: 'EBA' },
  { name: 'Glenfiddich',                   unit: 'bottle', providerName: 'EBA' },
  { name: 'Bacardi',                       unit: 'bottle', providerName: 'EBA' },
  { name: 'Tequila Blue Agave',            unit: 'bottle', providerName: 'EBA' },
  { name: 'Golden Tequila',                unit: 'bottle', providerName: 'EBA' },
  { name: 'White Rum',                     unit: 'bottle', providerName: 'EBA' },
  { name: 'Aperol',                        unit: 'bottle', providerName: 'EBA' },
  { name: 'Angostura Orange Bitters',      unit: 'bottle', providerName: 'EBA' },
  { name: 'Angostura Aromatic Bitters',    unit: 'bottle', providerName: 'EBA' },

  // ── COFFEE (Najjar) ─────────────────────────────────────────
  { name: 'Coffee Beans', unit: 'box', providerName: 'Najjar', packSize: 6, packUnit: 'kg' },

  // ── OTHERS (no supplier) ────────────────────────────────────
  { name: 'Nuts',              unit: 'bag' },
  { name: 'Straws',            unit: 'bag' },
  { name: 'Mate',              unit: 'bag' },
  { name: 'Take Away Cups',    unit: 'bag' },
  { name: 'Polishing Mop',     unit: 'pcs' },
  { name: 'Mint',              unit: 'pcs' },
  { name: 'Fresh Basil',       unit: 'bag' },
  { name: 'Lemon',             unit: 'kg' },
  { name: 'Lime',              unit: 'kg' },
  { name: 'Orange Juice',      unit: 'bottle' },
  { name: 'Pineapple Juice',   unit: 'bottle' },
  { name: 'Cranberry Juice',   unit: 'bottle' },
  { name: 'Marshmallow',       unit: 'bag' },
]

type LogLine = { status: 'ok' | 'skip' | 'err'; msg: string }

export default function SeedBarPage() {
  const { checking } = useRequireRole(['admin'])
  const [running,  setRunning]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [log,      setLog]      = useState<LogLine[]>([])

  function push(line: LogLine) {
    setLog(prev => [...prev, line])
  }

  if (checking) return null

  async function runImport() {
    setRunning(true)
    setLog([])

    try {
      // ── 1. Load existing providers ─────────────────────────
      push({ status: 'ok', msg: 'Loading existing providers…' })
      const provSnap = await getDocs(collection(db, 'orderProviders'))
      const existingProviders = new Map<string, string>() // lowercase name → id
      provSnap.docs.forEach(d => {
        existingProviders.set((d.data().name as string).toLowerCase(), d.id)
      })

      // ── 2. Add missing providers ───────────────────────────
      for (const name of PROVIDERS_TO_SEED) {
        if (existingProviders.has(name.toLowerCase())) {
          push({ status: 'skip', msg: `Provider already exists: ${name}` })
        } else {
          const ref = await addDoc(collection(db, 'orderProviders'), {
            name, phones: {}, createdAt: serverTimestamp(),
          })
          existingProviders.set(name.toLowerCase(), ref.id)
          push({ status: 'ok', msg: `Added provider: ${name}` })
        }
      }

      // ── 3. Load existing items ─────────────────────────────
      push({ status: 'ok', msg: 'Loading existing template items…' })
      const itemSnap = await getDocs(collection(db, 'orderTemplateItems'))
      const existingItems = new Set<string>() // lowercase name
      itemSnap.docs.forEach(d => {
        existingItems.add((d.data().name as string).toLowerCase())
      })

      // ── 4. Add bar items ───────────────────────────────────
      let added = 0
      let skipped = 0
      for (const item of ITEMS) {
        if (existingItems.has(item.name.toLowerCase())) {
          push({ status: 'skip', msg: `Skip (exists): ${item.name}` })
          skipped++
          continue
        }

        const providerId = item.providerName
          ? existingProviders.get(item.providerName.toLowerCase())
          : undefined

        const doc: Record<string, unknown> = {
          name:       item.name,
          department: 'Bar',
          unit:       item.unit,
          sortOrder:  0,
          createdAt:  serverTimestamp(),
        }
        if (providerId)    doc.providerId = providerId
        if (item.packSize) doc.packSize   = item.packSize
        if (item.packUnit) doc.packUnit   = item.packUnit

        await addDoc(collection(db, 'orderTemplateItems'), doc)
        existingItems.add(item.name.toLowerCase())
        push({ status: 'ok', msg: `Added: ${item.name} (${item.unit})${item.providerName ? ` → ${item.providerName}` : ''}` })
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
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <a href="/admin/weekly-orders/template" style={{
          fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
          display: 'block', marginBottom: '0.5rem',
        }}>← Order Template</a>

        <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
          Seed Bar Items
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '0.5rem' }}>
          142 items across 10 providers from the Hamra 5 July sheet.
          Skips anything that already exists by name.
        </p>
        <p style={{ fontSize: '0.78rem', color: '#C9962C', marginBottom: '2rem' }}>
          Note: Candia Full Fat, Candia Skimmed, and Candia Lactose Free have a minimum combined
          order of 4 boxes — remind the person filling in the order form.
          Delete this page after use.
        </p>

        {!running && !done && (
          <button
            onClick={runImport}
            style={{
              backgroundColor: '#C9962C', color: '#fff', border: 'none',
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
              backgroundColor: 'var(--teal)', color: '#fff', textDecoration: 'none',
              padding: '0.75rem 1.5rem', borderRadius: '2px', fontSize: '0.78rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>View Template →</a>
            <span style={{ fontSize: '0.78rem', color: 'rgba(245,242,236,0.3)', alignSelf: 'center' }}>
              Now delete this file: app/admin/weekly-orders/seed-bar/page.tsx
            </span>
          </div>
        )}

        {log.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px', padding: '1rem 1.25rem',
            maxHeight: '520px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '0.2rem',
          }}>
            {log.map((line, i) => (
              <p key={i} style={{
                fontFamily: 'var(--font-inter)', fontSize: '0.75rem', margin: 0,
                color: line.status === 'ok'
                  ? 'var(--teal)'
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
