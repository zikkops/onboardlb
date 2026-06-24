'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../../lib/adminAuth'
import { logCreate } from '../../../lib/activityLog'
import { BRANCHES, emptyStock } from '../../../lib/branches'
import { recordMediaUpload } from '../../../lib/media'
import { parseCSV } from '../../../lib/csv'

type FieldKey = 'name' | 'description' | 'category' | 'price' | 'stock' | 'image' | 'players' | 'duration' | 'age'

const FIELD_DEFS: { key: FieldKey; label: string; required?: boolean; guesses: string[] }[] = [
  { key: 'name',        label: 'Game Name',  required: true, guesses: ['name', 'product name', 'title'] },
  { key: 'description', label: 'Description',                guesses: ['description', 'short description'] },
  { key: 'category',    label: 'Category',                    guesses: ['categories', 'category'] },
  { key: 'price',       label: 'Price',                        guesses: ['regular price', 'price', 'sale price'] },
  { key: 'stock',       label: 'Stock Quantity',                guesses: ['stock', 'quantity', 'in stock?'] },
  { key: 'image',       label: 'Image URL',                     guesses: ['images', 'image', 'image url'] },
  { key: 'players',     label: 'Players',                       guesses: ['players', 'number of players'] },
  { key: 'duration',    label: 'Duration',                       guesses: ['duration', 'play time', 'playing time'] },
  { key: 'age',         label: 'Min Age',                        guesses: ['min age', 'minimum age', 'age'] },
]

const IMPORT_BRANCH = BRANCHES[0]
const FALLBACK_CATEGORY = 'Uncategorized'

function guessMapping(headers: string[]): Record<FieldKey, string> {
  const lower = headers.map(h => h.toLowerCase().trim())
  const mapping = {} as Record<FieldKey, string>
  for (const def of FIELD_DEFS) {
    let found = ''
    for (const g of def.guesses) {
      const idx = lower.findIndex(h => h === g)
      if (idx !== -1) { found = headers[idx]; break }
    }
    if (!found) {
      for (const g of def.guesses) {
        const idx = lower.findIndex(h => h.includes(g))
        if (idx !== -1) { found = headers[idx]; break }
      }
    }
    mapping[def.key] = found
  }
  return mapping
}

function parsePrice(raw: string): number {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function parseQty(raw: string): number {
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function normalizeCategory(raw: string): string {
  const first = raw.split(',')[0] ?? ''
  const segments = first.split('>')
  const last = segments[segments.length - 1]?.trim() ?? ''
  return last || FALLBACK_CATEGORY
}

interface Results {
  created: number
  skippedDuplicate: number
  skippedNoName: number
  imageFailures: number
  categoriesCreated: string[]
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

export default function ImportGamesPage() {
  const { checking } = useRequireRole(SECTION_ACCESS.games)
  const isMobile = useIsMobile()
  const fileRef = useRef<HTMLInputElement>(null)

  const [existingNames, setExistingNames]     = useState<Set<string>>(new Set())
  const [existingCategories, setExistingCategories] = useState<Set<string>>(new Set())
  const [loadingExisting, setLoadingExisting] = useState(true)

  const [fileName, setFileName] = useState('')
  const [headers, setHeaders]   = useState<string[]>([])
  const [rows, setRows]         = useState<Record<string, string>[]>([])
  const [mapping, setMapping]   = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>)
  const [parseError, setParseError] = useState('')

  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState({ done: 0, total: 0 })
  const [results, setResults]     = useState<Results | null>(null)

  useEffect(() => {
    async function load() {
      const [gamesSnap, catSnap] = await Promise.all([
        getDocs(collection(db, 'games')),
        getDocs(collection(db, 'gameCategories')),
      ])
      setExistingNames(new Set(gamesSnap.docs.map(d => String((d.data() as any).name ?? '').toLowerCase())))
      setExistingCategories(new Set(catSnap.docs.map(d => String((d.data() as any).name ?? ''))))
      setLoadingExisting(false)
    }
    load()
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError('')
    setResults(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const { headers: h, rows: r } = parseCSV(String(reader.result ?? ''))
        if (h.length === 0 || r.length === 0) {
          setParseError('No rows found in this file.')
          return
        }
        setHeaders(h)
        setRows(r)
        setMapping(guessMapping(h))
      } catch {
        setParseError('Could not parse this CSV file.')
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!mapping.name || rows.length === 0) return
    setImporting(true)
    setProgress({ done: 0, total: rows.length })

    const idToken = await auth.currentUser?.getIdToken()
    const names = new Set(existingNames)
    const categories = new Set(existingCategories)
    const categoriesCreated: string[] = []
    let created = 0, skippedDuplicate = 0, skippedNoName = 0, imageFailures = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const name = (mapping.name ? row[mapping.name] : '').trim()

      if (!name) {
        skippedNoName++
        setProgress({ done: i + 1, total: rows.length })
        continue
      }
      if (names.has(name.toLowerCase())) {
        skippedDuplicate++
        setProgress({ done: i + 1, total: rows.length })
        continue
      }

      const category = normalizeCategory(mapping.category ? row[mapping.category] : '')
      if (!categories.has(category)) {
        await addDoc(collection(db, 'gameCategories'), { name: category, createdAt: serverTimestamp() })
        categories.add(category)
        categoriesCreated.push(category)
      }

      const stock = emptyStock()
      stock[IMPORT_BRANCH] = parseQty(mapping.stock ? row[mapping.stock] : '')

      let image = ''
      const firstImageUrl = (mapping.image ? row[mapping.image] : '').split(',')[0]?.trim()
      if (firstImageUrl) {
        try {
          const res = await fetch('/api/import-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ url: firstImageUrl }),
          })
          const data = await res.json()
          if (res.ok && data.url) {
            image = data.url
            await recordMediaUpload({ url: data.url, deleteUrl: data.deleteUrl, fileName: data.fileName ?? name })
          } else {
            imageFailures++
          }
        } catch {
          imageFailures++
        }
      }

      const gameData = {
        name,
        category,
        description: mapping.description ? row[mapping.description] : '',
        players:     mapping.players ? row[mapping.players] : '',
        duration:    mapping.duration ? row[mapping.duration] : '',
        age:         mapping.age ? row[mapping.age] : '',
        price:       parsePrice(mapping.price ? row[mapping.price] : ''),
        stock,
        image,
      }

      await addDoc(collection(db, 'games'), {
        ...gameData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await logCreate('Game', name, gameData)

      names.add(name.toLowerCase())
      created++
      setProgress({ done: i + 1, total: rows.length })
    }

    setResults({ created, skippedDuplicate, skippedNoName, imageFailures, categoriesCreated })
    setExistingNames(names)
    setExistingCategories(categories)
    setImporting(false)
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#F5F2EC',
    padding: '0.6rem 0.8rem',
    borderRadius: '2px',
    fontSize: '0.82rem',
    outline: 'none',
    fontFamily: 'var(--font-inter)',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.68rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,242,236,0.35)',
    marginBottom: '0.5rem',
    fontFamily: 'var(--font-inter)',
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <a href="/admin/games" style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
            marginBottom: '0.5rem',
            display: 'block',
          }}>← Back to Game Library</a>
          <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)' }}>
            Bulk Import from WooCommerce
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '0.8rem',
            color: 'rgba(245,242,236,0.35)',
            marginTop: '0.5rem',
            lineHeight: 1.6,
          }}>
            Upload a WooCommerce Products CSV export. Games that already exist (matched by name) are skipped.
            Imported stock is assigned to the <strong style={{ color: 'var(--teal)' }}>{IMPORT_BRANCH}</strong> branch —
            redistribute across branches afterward in the Game Library. Images are downloaded and re-hosted automatically.
          </p>
        </div>

        {/* Upload */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '4px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <label style={labelStyle}>CSV File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            disabled={importing}
            style={{ ...inputStyle, cursor: 'pointer' }}
          />
          {fileName && (
            <p style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'rgba(245,242,236,0.4)', fontFamily: 'var(--font-inter)' }}>
              {fileName} — {rows.length} row{rows.length === 1 ? '' : 's'} found
            </p>
          )}
          {parseError && (
            <p style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--red)', fontFamily: 'var(--font-inter)' }}>
              {parseError}
            </p>
          )}
        </div>

        {/* Mapping */}
        {headers.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}>
            <p style={{
              fontSize: '0.68rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              fontFamily: 'var(--font-inter)',
              marginBottom: '1.2rem',
            }}>Map Columns</p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              {FIELD_DEFS.map(def => (
                <div key={def.key}>
                  <label style={labelStyle}>{def.label}{def.required ? ' *' : ''}</label>
                  <select
                    value={mapping[def.key] ?? ''}
                    onChange={e => setMapping(m => ({ ...m, [def.key]: e.target.value }))}
                    disabled={importing}
                    style={{ ...inputStyle, color: '#F5F2EC', backgroundColor: '#1a1a1a' }}
                  >
                    <option value="">— none —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {!mapping.name && (
              <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--red)', fontFamily: 'var(--font-inter)' }}>
                Map a column for Game Name to continue.
              </p>
            )}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && mapping.name && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            padding: '1.5rem',
            marginBottom: '2rem',
            overflowX: 'auto',
          }}>
            <p style={{
              fontSize: '0.68rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              fontFamily: 'var(--font-inter)',
              marginBottom: '1.2rem',
            }}>Preview (first 5 rows)</p>

            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontFamily: 'var(--font-inter)', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Name', 'Category', 'Price', 'Stock', 'Image'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.8rem', color: 'rgba(245,242,236,0.3)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.5rem 0.8rem', color: 'var(--offwhite)' }}>{row[mapping.name] || '—'}</td>
                    <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(245,242,236,0.5)' }}>
                      {mapping.category ? normalizeCategory(row[mapping.category]) : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(245,242,236,0.5)' }}>
                      {mapping.price ? `$${parsePrice(row[mapping.price])}` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(245,242,236,0.5)' }}>
                      {mapping.stock ? parseQty(row[mapping.stock]) : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(245,242,236,0.5)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mapping.image ? (row[mapping.image].split(',')[0]?.trim() || '—') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Import action */}
        {rows.length > 0 && mapping.name && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            padding: '1.5rem',
          }}>
            <button
              onClick={handleImport}
              disabled={importing || loadingExisting}
              style={{
                backgroundColor: 'var(--purple)',
                color: '#fff',
                padding: '0.8rem 1.5rem',
                border: 'none',
                borderRadius: '2px',
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: importing || loadingExisting ? 'not-allowed' : 'pointer',
                opacity: importing || loadingExisting ? 0.6 : 1,
                fontFamily: 'var(--font-inter)',
              }}
            >
              {importing ? `Importing… ${progress.done}/${progress.total}` : `Import ${rows.length} Rows`}
            </button>

            {results && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--teal)' }}>
                  ✓ {results.created} game{results.created === 1 ? '' : 's'} imported
                </p>
                {results.skippedDuplicate > 0 && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.5)' }}>
                    {results.skippedDuplicate} skipped (already exists)
                  </p>
                )}
                {results.skippedNoName > 0 && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.5)' }}>
                    {results.skippedNoName} skipped (no name)
                  </p>
                )}
                {results.imageFailures > 0 && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'var(--red)' }}>
                    {results.imageFailures} image{results.imageFailures === 1 ? '' : 's'} failed to download — left blank, edit those games to add one manually
                  </p>
                )}
                {results.categoriesCreated.length > 0 && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.5)' }}>
                    New categories created: {results.categoriesCreated.join(', ')}
                  </p>
                )}
                <a href="/admin/games" style={{
                  marginTop: '0.6rem',
                  fontSize: '0.78rem',
                  color: 'var(--purple)',
                  fontFamily: 'var(--font-inter)',
                  textDecoration: 'none',
                }}>→ View Game Library</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
