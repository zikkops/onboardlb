'use client'

import { useState } from 'react'
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useRequireRole } from '../../../lib/adminAuth'
import type { OrderProvider, OrderTemplateItem, OrderUnit, Department } from '../../../lib/weeklyOrders'

// ---------------------------------------------------------------------------
// Data from Kitchen Orders .xlsx — Sheet 2 ("week 2")
// ---------------------------------------------------------------------------

type SeedProvider = {
  name: string
  notes?: string
  phones?: Partial<Record<'Beirut' | 'Zouk' | 'Broummana', string>>
}

type SeedItem = {
  providerName: string
  name: string
  unit: OrderUnit
  packSize?: number
  packUnit?: string
}

const SEED_PROVIDERS: SeedProvider[] = [
  { name: 'Prunelle',           notes: 'Ordered via application/group' },
  { name: 'General Promotion',  notes: 'Elie — 70/251355' },
  { name: 'Dal Mare',           notes: 'Elie — 03/413105' },
  { name: 'La Piara',           phones: { Zouk: '70498928' }, notes: 'Zouk: mario' },
  { name: 'Smoked ChickenBeef', notes: 'Khalo Alphonse — 70753862' },
  { name: 'FBT',                notes: 'Oussama — 03/115537' },
  { name: 'Pomo Nachos',        notes: '71/828459' },
  { name: 'Hboubna',            notes: 'Dry goods / spices' },
  { name: 'Najjar',             notes: '3119756' },
  { name: 'Hawa Chicken',       notes: 'Via email: hawachickendistribution' },
  { name: 'Elie Sfeir Chicken', notes: '+961 81 870 183' },
  { name: 'Dekerco',            notes: '71973633' },
]

const SEED_ITEMS: SeedItem[] = [
  // Prunelle
  { providerName: 'Prunelle',           name: 'Snack sandwich brioche',            unit: 'box',  packSize: 6, packUnit: 'pcs' },
  { providerName: 'Prunelle',           name: 'Burger classic 10cm double glazed', unit: 'box',  packSize: 6, packUnit: 'pcs' },
  { providerName: 'Prunelle',           name: 'Sandwich soft brown tray',          unit: 'box',  packSize: 4, packUnit: 'pcs' },
  // General Promotion
  { providerName: 'General Promotion',  name: 'Cheddar block',                     unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Pickles whole',                     unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Togarashi',                         unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Padano',                            unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Emmental cheese',                   unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Pure olive oil',                    unit: 'gallon', packUnit: '16kg' },
  { providerName: 'General Promotion',  name: 'Sesame oil',                        unit: 'gallon', packUnit: '2.8kg' },
  { providerName: 'General Promotion',  name: 'Sweet chilli',                      unit: 'gallon', packUnit: '5L' },
  { providerName: 'General Promotion',  name: 'Black sesame',                      unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Dijon mustard',                     unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Ketchup',                           unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Cream cheese',                      unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Balsamic vinegar',                  unit: 'gallon', packUnit: '5L' },
  { providerName: 'General Promotion',  name: 'Tahini',                            unit: 'kg',   packUnit: '9kg bucket' },
  { providerName: 'General Promotion',  name: 'Truffle cream white',               unit: 'box',  packUnit: 'bottle' },
  { providerName: 'General Promotion',  name: 'Black truffle',                     unit: 'box',  packUnit: 'bottle' },
  { providerName: 'General Promotion',  name: 'Capers',                            unit: 'kg' },
  { providerName: 'General Promotion',  name: 'Sriracha sauce',                    unit: 'gallon' },
  // Dal Mare
  { providerName: 'Dal Mare',           name: 'Avena Olein Oil',                   unit: 'gallon', packUnit: '25L' },
  { providerName: 'Dal Mare',           name: 'Barbecue Sauce',                    unit: 'box',  packUnit: '4.2kg pc' },
  { providerName: 'Dal Mare',           name: 'Coated Wedges',                     unit: 'box',  packSize: 4, packUnit: 'bags of 2.5kg' },
  { providerName: 'Dal Mare',           name: 'Fries',                             unit: 'box',  packSize: 4, packUnit: 'bags of 2.5kg' },
  { providerName: 'Dal Mare',           name: 'Super Spirals Spicy FS',            unit: 'box',  packUnit: '2.5kg bag' },
  { providerName: 'Dal Mare',           name: 'Honey',                             unit: 'box',  packUnit: '850g jar' },
  { providerName: 'Dal Mare',           name: 'Mayo Extra Gal',                    unit: 'gallon', packUnit: '3.785L box' },
  { providerName: 'Dal Mare',           name: 'Mozzarella Shredded Filata',        unit: 'box',  packUnit: '2.5kg bag' },
  { providerName: 'Dal Mare',           name: 'Mozzarella Sticks',                 unit: 'box',  packUnit: '1kg bag' },
  { providerName: 'Dal Mare',           name: 'Fusilli tricolors',                 unit: 'box',  packUnit: '500g pc' },
  { providerName: 'Dal Mare',           name: 'Sunflower Oil',                     unit: 'liter', packUnit: '5L pc' },
  { providerName: 'Dal Mare',           name: 'Sweet Corn',                        unit: 'box',  packUnit: '400g can' },
  { providerName: 'Dal Mare',           name: 'White Meat Tuna',                   unit: 'box',  packUnit: '1.8kg pc' },
  { providerName: 'Dal Mare',           name: 'White Vinegar',                     unit: 'liter', packUnit: '1L bottle' },
  { providerName: 'Dal Mare',           name: 'Whole pickles',                     unit: 'kg',   packUnit: '10kg bucket' },
  { providerName: 'Dal Mare',           name: 'Jalapeños',                         unit: 'kg' },
  { providerName: 'Dal Mare',           name: 'Soy sauce',                         unit: 'liter', packUnit: '3.75L' },
  { providerName: 'Dal Mare',           name: 'Calamari rings',                    unit: 'kg' },
  // La Piara
  { providerName: 'La Piara',           name: 'Beef Pepperoni Halal',              unit: 'kg' },
  { providerName: 'La Piara',           name: 'Smoked Turkey Breast',              unit: 'kg' },
  // Smoked ChickenBeef
  { providerName: 'Smoked ChickenBeef', name: 'Beef',                              unit: 'kg' },
  // FBT
  { providerName: 'FBT',               name: 'Labneh',                            unit: 'kg',   packUnit: '500g tub' },
  { providerName: 'FBT',               name: 'Halloumi',                          unit: 'box',  packUnit: 'bag' },
  // Pomo Nachos
  { providerName: 'Pomo Nachos',        name: 'Nachos Papasito Salt',              unit: 'box',  packSize: 6,  packUnit: 'bags' },
  { providerName: 'Pomo Nachos',        name: 'Nachos Papasito Cheese',            unit: 'box',  packSize: 12, packUnit: 'bags' },
  // Hboubna
  { providerName: 'Hboubna',            name: 'White sugar',                       unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Brown sugar',                       unit: 'kg' },
  { providerName: 'Hboubna',            name: 'White pepper',                      unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Black pepper',                      unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Onion powder',                      unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Garlic powder',                     unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Paprika',                           unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Baking powder',                     unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Cocoa powder',                      unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Hummus',                            unit: 'kg' },
  { providerName: 'Hboubna',            name: 'White sesame seeds',                unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Cornstarch',                        unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Flour',                             unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Salt',                              unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Oregano',                           unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Cumin',                             unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Sumac',                             unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Curcuma yellow powder',             unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Coconut shreds',                    unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Almond flour',                      unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Red pepper flakes',                 unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Ginger powder',                     unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Coriander powder',                  unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Tarragon powder',                   unit: 'kg' },
  { providerName: 'Hboubna',            name: 'Popcorn',                           unit: 'kg' },
  // Najjar
  { providerName: 'Najjar',             name: 'Pepperoni pizza',                   unit: 'box',  packUnit: 'pc' },
  { providerName: 'Najjar',             name: 'Four cheese pizza',                 unit: 'box',  packUnit: 'pc' },
  { providerName: 'Najjar',             name: 'Lebanese pizza',                    unit: 'box',  packUnit: 'pc' },
  { providerName: 'Najjar',             name: 'Margarita pizza',                   unit: 'box',  packUnit: 'pc' },
  // Hawa Chicken
  { providerName: 'Hawa Chicken',       name: 'Nuggets',                           unit: 'kg' },
  { providerName: 'Hawa Chicken',       name: 'Crispy Chicken Filet',              unit: 'kg' },
  { providerName: 'Hawa Chicken',       name: 'Spicy Crispy Chicken Filet',        unit: 'kg' },
  // Elie Sfeir Chicken
  { providerName: 'Elie Sfeir Chicken', name: 'Fresh Chicken Breast',              unit: 'kg' },
  { providerName: 'Elie Sfeir Chicken', name: 'Fresh Chicken Wings',               unit: 'kg' },
  // Dekerco
  { providerName: 'Dekerco',            name: 'Black Angus beef',                  unit: 'kg' },
  { providerName: 'Dekerco',            name: 'Mozzarella Sticks (Dekerco)',       unit: 'kg' },
  { providerName: 'Dekerco',            name: 'Crab sticks Osaki',                 unit: 'kg' },
  { providerName: 'Dekerco',            name: 'Shrimps Breaded',                   unit: 'kg' },
  { providerName: 'Dekerco',            name: 'Shrimps Raw',                       unit: 'kg' },
  { providerName: 'Dekerco',            name: 'Chicken Fajita',                    unit: 'kg' },
  { providerName: 'Dekerco',            name: 'Salmon fillet',                     unit: 'kg' },
]

// ---------------------------------------------------------------------------

type Status = 'idle' | 'running' | 'done' | 'error'

export default function SeedPage() {
  const { checking } = useRequireRole(['admin'])
  const [status,   setStatus]   = useState<Status>('idle')
  const [log,      setLog]      = useState<string[]>([])
  const [errMsg,   setErrMsg]   = useState('')

  function addLog(msg: string) {
    setLog(prev => [...prev, msg])
  }

  async function runSeed() {
    setStatus('running')
    setLog([])
    setErrMsg('')

    try {
      // 1. Load existing providers (by name, lowercased for comparison)
      addLog('Loading existing providers…')
      const existingSnap = await getDocs(query(collection(db, 'orderProviders'), orderBy('name')))
      const existingProviderNames = new Set<string>(
        existingSnap.docs.map(d => (d.data().name as string).toLowerCase().trim())
      )
      const providerIdByName: Record<string, string> = {}
      existingSnap.docs.forEach(d => {
        providerIdByName[(d.data().name as string).toLowerCase().trim()] = d.id
      })
      addLog(`Found ${existingSnap.size} existing provider(s).`)

      // 2. Create missing providers
      let providersCreated = 0
      for (const p of SEED_PROVIDERS) {
        const key = p.name.toLowerCase().trim()
        if (existingProviderNames.has(key)) {
          addLog(`  SKIP provider "${p.name}" (already exists)`)
          continue
        }
        const ref = await addDoc(collection(db, 'orderProviders'), {
          name:      p.name,
          phones:    p.phones ?? {},
          notes:     p.notes ?? '',
          createdAt: serverTimestamp(),
        })
        providerIdByName[key] = ref.id
        addLog(`  + Created provider "${p.name}"`)
        providersCreated++
      }
      addLog(`Providers: ${providersCreated} created, ${SEED_PROVIDERS.length - providersCreated} skipped.`)

      // 3. Load existing template items (by name, lowercased)
      addLog('Loading existing template items…')
      const existingItemsSnap = await getDocs(query(collection(db, 'orderTemplateItems'), orderBy('name')))
      const existingItemNames = new Set<string>(
        existingItemsSnap.docs.map(d => (d.data().name as string).toLowerCase().trim())
      )
      addLog(`Found ${existingItemsSnap.size} existing item(s).`)

      // 4. Create missing template items
      let itemsCreated = 0
      for (const item of SEED_ITEMS) {
        const key = item.name.toLowerCase().trim()
        if (existingItemNames.has(key)) {
          addLog(`  SKIP item "${item.name}" (already exists)`)
          continue
        }
        const providerId = providerIdByName[item.providerName.toLowerCase().trim()]
        const doc: Record<string, unknown> = {
          name:       item.name,
          nameAr:     '',
          department: 'Kitchen' as Department,
          unit:       item.unit,
          sortOrder:  0,
          createdAt:  serverTimestamp(),
        }
        if (providerId)      doc.providerId = providerId
        if (item.packSize)   doc.packSize   = item.packSize
        if (item.packUnit)   doc.packUnit   = item.packUnit

        await addDoc(collection(db, 'orderTemplateItems'), doc)
        addLog(`  + Created item "${item.name}" (${item.providerName}, ${item.unit})`)
        itemsCreated++
      }
      addLog(`Items: ${itemsCreated} created, ${SEED_ITEMS.length - itemsCreated} skipped.`)
      addLog('--- Done! You can delete this page now. ---')
      setStatus('done')
    } catch (e: unknown) {
      setErrMsg(String(e))
      setStatus('error')
    }
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem', fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        <a href="/admin/weekly-orders" style={{
          fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
          marginBottom: '0.5rem', display: 'block',
        }}>← Weekly Orders</a>

        <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
          Seed Kitchen Data
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '2rem' }}>
          One-time import from Kitchen Orders sheet 2. Skips any provider or item that already exists by name.
          {' '}<strong style={{ color: 'var(--red)' }}>Delete this page after use.</strong>
        </p>

        {/* Summary */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '4px', padding: '1.2rem 1.5rem', marginBottom: '1.5rem',
        }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(245,242,236,0.5)', marginBottom: '0.5rem' }}>WILL ADD (if not already present):</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--offwhite)' }}>
            {SEED_PROVIDERS.length} providers &nbsp;·&nbsp; {SEED_ITEMS.length} Kitchen template items
          </p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(245,242,236,0.3)', marginTop: '0.3rem' }}>
            Providers: {SEED_PROVIDERS.map(p => p.name).join(', ')}
          </p>
        </div>

        {status === 'idle' && (
          <button
            onClick={runSeed}
            style={{
              backgroundColor: 'var(--teal)', color: '#fff', border: 'none',
              padding: '0.75rem 1.5rem', borderRadius: '2px', fontSize: '0.82rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Run Import
          </button>
        )}

        {status === 'running' && (
          <p style={{ color: 'var(--teal)', fontSize: '0.85rem' }}>Running…</p>
        )}

        {status === 'done' && (
          <p style={{ color: 'var(--teal)', fontSize: '0.85rem' }}>✓ Import complete.</p>
        )}

        {status === 'error' && (
          <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>Error: {errMsg}</p>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div style={{
            marginTop: '1.5rem', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px', padding: '1rem', maxHeight: '500px', overflowY: 'auto',
          }}>
            {log.map((line, i) => (
              <p key={i} style={{
                fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.7',
                color: line.startsWith('  + ') ? 'var(--teal)'
                     : line.startsWith('  SKIP') ? 'rgba(245,242,236,0.3)'
                     : line.startsWith('---') ? '#C9962C'
                     : 'rgba(245,242,236,0.6)',
              }}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
