'use client'

import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useRequireRole } from '../../lib/adminAuth'
import { useIsMobile } from '../../lib/useIsMobile'
import { normalizeStock } from '../../lib/branches'

const IMPORT_LIST: { name: string; qty: number }[] = [
  { name: 'The Godfather', qty: 1 },
  { name: 'Guess Who?', qty: 0 },
  { name: 'Dixit', qty: 2 },
  { name: 'Wasta Arabic', qty: 30 },
  { name: 'Wasta English', qty: 4 },
  { name: 'HedBanz', qty: 2 },
  { name: 'Marvel Splendor', qty: 0 },
  { name: 'Splendor', qty: 4 },
  { name: 'Hzar Shou Season 1', qty: 1 },
  { name: 'Catan Base Game', qty: 2 },
  { name: 'Catan Seafarers', qty: 2 },
  { name: 'Catan Junior', qty: 1 },
  { name: 'Avalon', qty: 8 },
  { name: 'War of the Ring the Card Game', qty: 1 },
  { name: 'Sheriff of Nottingham', qty: 3 },
  { name: 'Dune Arrakis', qty: 2 },
  { name: 'Everdell Pearlbrook', qty: 1 },
  { name: 'Hellapagos', qty: 1 },
  { name: 'Lost Cities the Original Card Game', qty: 2 },
  { name: 'Dixit Odyssey', qty: 5 }, // 2 + 3 from two list entries
  { name: 'Artisans', qty: 2 },
  { name: 'Root the Clockwork Expansion 2', qty: 1 },
  { name: 'Root', qty: 2 },
  { name: 'Everdell Bellfaire', qty: 1 },
  { name: 'Epic Zombies', qty: 1 },
  { name: 'ROAM', qty: 1 },
  { name: '7 Wonders Duel', qty: 1 },
  { name: '7 Wonders', qty: 2 },
  { name: 'Harry Potter Wizard Chess Set', qty: 1 },
  { name: 'Epic Vikings', qty: 1 },
  { name: 'Medieval Encounters', qty: 1 },
  { name: 'Creature Caravan', qty: 1 },
  { name: 'Finspan', qty: 3 },
  { name: 'Cards Against Friends', qty: 6 },
  { name: 'Cards Against Humanity', qty: 5 },
  { name: 'Disturbed Friends', qty: 1 },
  { name: 'Do or Drink', qty: 3 },
  { name: 'Cards Against Muggles', qty: 2 },
  { name: 'Munchkin Rick and Morty', qty: 1 },
  { name: 'Cards Against Disney', qty: 2 },
  { name: 'Cards Against Star Wars', qty: 2 },
  { name: 'Cards Against Humanity for Her', qty: 2 },
  { name: 'What Do You Meme?', qty: 4 },
  { name: 'WTF Did You Say?!', qty: 2 },
  { name: 'Joking Hazard', qty: 1 },
  { name: 'Talk Flirt Dare', qty: 2 },
  { name: 'Codenames XXL', qty: 2 },
  { name: 'Codenames Pictures XXL', qty: 1 },
  { name: 'Twister', qty: 4 },
  { name: 'Codenames', qty: 2 },
  { name: 'Codenames Pictures', qty: 0 },
  { name: 'Codenames Deep Undercover 2.0', qty: 0 },
  { name: 'Azul Summer Pavilion', qty: 2 },
  { name: 'Pictures', qty: 1 },
  { name: 'Ticket to Ride Europe', qty: 0 },
  { name: 'Unmatched Cobble and Fog', qty: 1 },
  { name: 'Exploding Minions', qty: 8 }, // 5 + 3 from two list entries
  { name: 'Streaking Kittens', qty: 6 },
  { name: 'Expression Puzzle', qty: 0 },
  { name: 'Imploding Kittens', qty: 6 },
  { name: 'Zombie Kittens', qty: 10 },
  { name: 'Barking Kittens', qty: 3 },
  { name: 'Unstable Unicorns 18+', qty: 9 },
  { name: 'Splendor Mat', qty: 0 },
  { name: 'Tawle', qty: 3 },
  { name: "Rubik's Cube", qty: 5 },
  { name: 'Tarot of the Little Prince', qty: 1 },
  { name: 'The Enchanted Map', qty: 1 },
  { name: 'Taco Cat Goat Cheese Pizza', qty: 6 },
  { name: 'Shot In the Dark', qty: 1 },
  { name: 'These Cards Will Get You Drunk Too', qty: 1 },
  { name: 'Drunk in Love', qty: 1 },
  { name: 'Bedroom Commands', qty: 1 },
  { name: '50 Positions of Bondage', qty: 1 },
  { name: "That's What She Said", qty: 1 },
  { name: 'Forest of Enchantment Tarot', qty: 1 },
  { name: 'Yalla Nememe', qty: 2 },
  { name: 'Jungle Speed', qty: 1 },
  { name: 'Uno No Mercy', qty: 3 },
  { name: 'The Voting Game', qty: 2 },
  { name: 'Magnetic', qty: 1 },
  { name: 'Catan Seafarers 5-6 Player Extension', qty: 1 },
  { name: 'Scrabble Original', qty: 1 },
  { name: 'Pictionary', qty: 1 },
  { name: 'Eclipse 11 Dice Set', qty: 1 },
  { name: "Laeral Silverhand's Explorer's Kit", qty: 1 },
  { name: 'D&D Onslaught Faction Pack Many Arrows', qty: 2 },
  { name: 'D&D Onslaught Faction Pack Red Wizards', qty: 2 },
  { name: 'D&D Onslaught Expansion Zhentarim', qty: 1 },
  { name: 'D&D Onslaught Expansion Sellswords', qty: 1 },
  { name: 'D&D Icons Bugbear Warband', qty: 1 },
  { name: 'D&D Icons Undead Armies Skeletons', qty: 2 },
  { name: 'D&D Icons Githyanki Warband', qty: 1 },
  { name: 'D&D Icons Hobgoblin Warband', qty: 1 },
  { name: 'D&D Icons Goblin Warband', qty: 1 },
  { name: 'D&D Icons Premium Human Wizard', qty: 1 },
  { name: 'D&D Icons Premium Dragonborn Fighter', qty: 1 },
  { name: 'D&D Icons Premium Elf Ranger', qty: 1 },
  { name: 'D&D Icons Premium Dragonborn Male Fighter', qty: 1 },
  { name: 'D&D Icons Premium Human Barbarian', qty: 1 },
  { name: 'D&D Icons Premium Elf Druid', qty: 1 },
  { name: 'D&D Icons Premium Tiefling Female Sorcerer', qty: 1 },
  { name: 'D&D Icons Premium Elf Female Druid', qty: 2 },
  { name: "D&D Nolzur's Marvelous Miniatures Werewolves", qty: 1 },
  { name: 'D&D Yawning Portal Inn Bars & Tables', qty: 1 },
  { name: 'D&D Icewind Dale Lodge Papercraft Set', qty: 1 },
  { name: 'Warmachines Ballista', qty: 1 },
  { name: 'Dragonshield Board Games Oversize', qty: 9 },
  { name: 'Dragonshield Board Games Tarot', qty: 7 },
  { name: 'Dragonshield Board Games Extra Large', qty: 9 },
  { name: 'Dragonshield Board Games American Standard', qty: 9 },
  { name: 'Dragonshield Board Games European Mini', qty: 3 },
  { name: 'Dragonshield Board Games European Standard', qty: 3 },
  { name: 'Dragonshield Board Games Square', qty: 2 },
  { name: 'Ultra Pro 100+ 2-Piece Gaming Box', qty: 24 },
  { name: 'D&D Spelljammer Adventures in Space', qty: 1 },
  { name: 'Magic the Gathering Foundations Beginner Box', qty: 1 },
  { name: 'Wooden Puzzle Mystery Earth', qty: 1 },
  { name: 'Wooden Puzzle Mystery Chameleon', qty: 2 },
  { name: 'Wooden Puzzle Mystery Fish', qty: 1 },
  { name: 'Wooden Puzzle Mystery Wolf', qty: 1 },
  { name: 'Wooden Puzzle Mystery Fox', qty: 1 },
  { name: 'Wooden Puzzle Mystery Dragon', qty: 1 },
  { name: 'Wooden Puzzle Mystery Owl', qty: 1 },
  { name: 'Wooden Puzzle Mystery Lion', qty: 1 },
  { name: 'Wooden Puzzle Mystery Butterfly', qty: 1 },
  { name: 'Survivor', qty: 1 },
  { name: 'Iki', qty: 1 },
  { name: 'Marvel Champions', qty: 1 },
  { name: 'Forbidden Island', qty: 1 },
  { name: 'Blitzkrieg Including Nippon Expansion', qty: 1 },
  { name: 'The Last Kingdom Board Game', qty: 2 },
  { name: 'Dead of Winter A Crossroads Game', qty: 2 },
  { name: 'Spot It', qty: 4 },
  { name: 'Dobble', qty: 3 },
  { name: 'S#!% Happens', qty: 1 },
  { name: 'Classic Jenga', qty: 1 },
  { name: 'Skull', qty: 5 },
  { name: 'The Mind', qty: 4 },
  { name: 'Patchwork', qty: 2 },
  { name: 'Exploding Kittens', qty: 11 },
  { name: 'Exploding Kittens Party Pack', qty: 2 },
  { name: 'Rick and Morty Total Rickall', qty: 2 },
  { name: 'Here to Slay', qty: 3 },
  { name: 'Scooby Doo Chess', qty: 1 },
  { name: 'Mafioze', qty: 2 },
  { name: 'Exploding Kittens Two Player', qty: 1 },
  { name: 'Ultimate Werewolf Deluxe', qty: 2 },
  { name: 'Mashrou3 Raes', qty: 0 },
  { name: 'Wyrmspan', qty: 1 },
  { name: "One Piece Freeny's Dissectibles Series 2", qty: 6 },
  { name: 'Mighty Jaxx Spongebob Band Geeks', qty: 1 },
  { name: "One Piece Freeny's Dissectibles Wano Arc", qty: 2 },
  { name: "One Piece Freeny's Dissectibles Series 4", qty: 5 },
  { name: 'DnD Dice Sets', qty: 517 },
  { name: 'Crossbows & Catapults', qty: 1 },
  { name: 'Western Legends', qty: 0 },
  { name: 'Terra Nova', qty: 1 },
  { name: 'Small World of Warcraft', qty: 1 },
  { name: 'Whitechapel', qty: 1 },
  { name: 'Dungeons and Dragons Onslaught', qty: 1 },
  { name: 'Dreams and Shadows', qty: 1 },
  { name: 'Dune Imperium Uprising', qty: 1 },
  { name: 'La Familia', qty: 1 },
  { name: 'Wayfarers', qty: 1 },
  { name: 'Escape The Curse of the Temple', qty: 1 },
  { name: 'Five Tribes', qty: 1 },
  { name: 'Revive', qty: 1 },
  { name: 'Cooper Island', qty: 1 },
  { name: 'Terra Mystica', qty: 1 },
  { name: 'Aquatica', qty: 1 },
  { name: 'Lost Cities the Board Game', qty: 1 },
  { name: 'Mystic Vale Essential Edition', qty: 1 },
  { name: 'Teotihuacan', qty: 1 },
  { name: 'Flamecraft', qty: 0 },
  { name: 'Dice Forge', qty: 1 },
  { name: 'Tekhenu Obelisk of the Sun', qty: 1 },
  { name: 'Now or Never', qty: 1 },
  { name: 'Betrayal at the House on the Hill', qty: 1 },
  { name: 'Suburbia', qty: 1 },
  { name: 'Alchemists', qty: 1 },
  { name: 'Red Rising', qty: 1 },
  { name: 'The Grimm Forest', qty: 1 },
  { name: 'Aqua', qty: 1 },
  { name: 'Almanac', qty: 1 },
  { name: 'Monopoly Ultimate Banking', qty: 1 },
  { name: 'Dragonshield Perfect Fit Clear', qty: 5 },
  { name: 'Six Sided Dice Tray', qty: 6 },
  { name: 'Four Sided Dice Tray', qty: 1 },
  { name: 'Cluedo Suspect', qty: 4 },
  { name: 'Pokemon UNO', qty: 2 },
  { name: 'Throw Throw Burrito', qty: 2 },
  { name: 'Terraforming Mars Hellas & Elysium', qty: 1 },
  { name: 'Terraforming Mars Prelude 2', qty: 1 },
  { name: 'Time Bomb (French)', qty: 1 },
  { name: 'Jackaroo 4&6 Players', qty: 2 },
  { name: 'Jackaroo 2&4 Players', qty: 2 },
]

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function matchScore(a: string, b: string): number {
  const na = norm(a), nb = norm(b)
  if (na === nb) return 1.0
  if (nb.includes(na) || na.includes(nb)) return 0.85
  const wa = new Set(na.split(' '))
  const wb = new Set(nb.split(' '))
  const inter = [...wa].filter(x => wb.has(x)).length
  const union = new Set([...wa, ...wb]).size
  return union === 0 ? 0 : inter / union
}

interface FGame { id: string; name: string; stock: unknown }

interface Row {
  importName: string
  qty: number
  gameId: string
  rowSearch: string
}

const sel: React.CSSProperties = {
  background: '#1c1c1c',
  color: '#F5F2EC',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '4px',
  padding: '0.35rem 0.5rem',
  fontSize: '0.78rem',
  width: '100%',
  outline: 'none',
}

const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  color: '#F5F2EC',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '4px',
  padding: '0.35rem 0.5rem',
  fontSize: '0.78rem',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function ImportBeirutStockPage() {
  useRequireRole(['admin'])
  const isMobile = useIsMobile()

  const [games, setGames]         = useState<FGame[]>([])
  const [rows, setRows]           = useState<Row[]>([])
  const [loading, setLoading]     = useState(true)
  const [listSearch, setListSearch] = useState('')
  const [phase, setPhase]         = useState<'preview' | 'running' | 'done'>('preview')
  const [results, setResults]     = useState<{ importName: string; gameName: string; qty: number }[]>([])
  const [notImported, setNotImported] = useState<string[]>([])
  const [confirmStep, setConfirmStep] = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'games')).then(snap => {
      const gs: FGame[] = snap.docs.map(d => ({
        id: d.id,
        name: (d.data().name as string) ?? '',
        stock: d.data().stock,
      }))
      setGames(gs)
      setRows(IMPORT_LIST.map(item => {
        let bestId = '', best = 0
        for (const g of gs) {
          const s = matchScore(item.name, g.name)
          if (s > best) { best = s; bestId = g.id }
        }
        return { importName: item.name, qty: item.qty, gameId: best >= 0.4 ? bestId : '', rowSearch: '' }
      }))
      setLoading(false)
    })
  }, [])

  function setRow(idx: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  const visibleRows = useMemo(() => {
    if (!listSearch.trim()) return rows.map((r, i) => ({ r, i }))
    const q = listSearch.toLowerCase()
    return rows.map((r, i) => ({ r, i })).filter(({ r }) => r.importName.toLowerCase().includes(q))
  }, [rows, listSearch])

  function filteredGames(search: string): FGame[] {
    const sorted = [...games].sort((a, b) => a.name.localeCompare(b.name))
    if (!search.trim()) return sorted
    const q = search.toLowerCase()
    return sorted.filter(g => g.name.toLowerCase().includes(q))
  }

  const unmatchedRows = rows.filter(r => !r.gameId)

  // Detect rows that share the same gameId — they'll be merged (quantities summed)
  const duplicateGameIds = useMemo(() => {
    const count = new Map<string, number>()
    for (const r of rows) if (r.gameId) count.set(r.gameId, (count.get(r.gameId) ?? 0) + 1)
    return new Set([...count.entries()].filter(([, n]) => n > 1).map(([id]) => id))
  }, [rows])

  const matchedCount = useMemo(() => new Set(rows.filter(r => r.gameId).map(r => r.gameId)).size, [rows])

  async function runImport() {
    setPhase('running')
    setConfirmStep(false)

    // Group by gameId, summing quantities for duplicates
    const grouped = new Map<string, { names: string[]; qty: number }>()
    const fail: string[] = []
    for (const row of rows) {
      if (!row.gameId) { fail.push(row.importName); continue }
      const entry = grouped.get(row.gameId)
      if (entry) { entry.names.push(row.importName); entry.qty += row.qty }
      else grouped.set(row.gameId, { names: [row.importName], qty: row.qty })
    }

    const ok: typeof results = []
    for (const [gameId, { names, qty }] of grouped) {
      const game = games.find(g => g.id === gameId)!
      const stock = normalizeStock(game.stock)
      stock['Beirut'] = qty
      await updateDoc(doc(db, 'games', gameId), { stock })
      ok.push({ importName: names.join(' + '), gameName: game.name, qty })
    }
    setResults(ok)
    setNotImported(fail)
    setPhase('done')
  }

  const base: React.CSSProperties = { minHeight: '100vh', background: '#0a0a0a', color: '#F5F2EC', padding: isMobile ? '1.25rem 1rem' : '2rem', fontFamily: 'var(--font-inter)' }
  const rowGridCols = '2fr 50px 180px 1fr 36px'
  const rowGridMinWidth = '680px'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '1.25rem', marginBottom: '1rem' }

  if (loading) return (
    <div style={base}>
      <p style={{ opacity: 0.4 }}>Loading games…</p>
    </div>
  )

  if (phase === 'done') return (
    <div style={base}>
      <h1 style={{ fontFamily: 'var(--font-cinzel)', marginBottom: '1.5rem' }}>Beirut Stock — Done</h1>
      <div style={{ ...card, borderColor: 'rgba(0,160,152,0.3)', marginBottom: '1.5rem' }}>
        <p style={{ color: '#00A098', fontWeight: 600, marginBottom: '0.75rem' }}>✓ {results.length} games updated</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.35rem 1.5rem', fontSize: '0.8rem' }}>
          {results.map(r => (
            <>
              <span key={`n-${r.importName}`} style={{ opacity: 0.55 }}>{r.importName}</span>
              <span key={`g-${r.importName}`} style={{ color: '#C9962C' }}>{r.gameName}</span>
              <span key={`q-${r.importName}`} style={{ color: '#00A098', textAlign: 'right' }}>{r.qty}</span>
            </>
          ))}
        </div>
      </div>
      {notImported.length > 0 && (
        <div style={{ ...card, borderColor: 'rgba(228,51,41,0.3)' }}>
          <p style={{ color: '#E43329', fontWeight: 600, marginBottom: '0.75rem' }}>✗ {notImported.length} not imported (no match found)</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
            {notImported.map(n => <li key={n} style={{ padding: '0.15rem 0' }}>• {n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )

  if (phase === 'running') return (
    <div style={base}>
      <p style={{ opacity: 0.5 }}>Updating Beirut stock…</p>
    </div>
  )

  return (
    <div style={base}>
      <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.6rem', marginBottom: '0.4rem' }}>Import Beirut Stock</h1>
      <p style={{ opacity: 0.4, fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        Sets stock.Beirut for each matched game. {matchedCount} / {rows.length} matched.
        {unmatchedRows.length > 0 && <span style={{ color: '#E43329' }}> {unmatchedRows.length} unmatched.</span>}
      </p>

      {/* Global list search */}
      <input
        type="search"
        placeholder="Filter import list by name…"
        value={listSearch}
        onChange={e => setListSearch(e.target.value)}
        style={{ ...inp, maxWidth: '360px', marginBottom: '1rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
      />

      {/* Rows — horizontal scroll on narrow screens so columns stay usable */}
      <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        <div style={{ minWidth: rowGridMinWidth }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: rowGridCols, gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.7rem', opacity: 0.4, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            <span>Import Name</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            <span>Search Games</span>
            <span>Matched Game</span>
            <span />
          </div>

          <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {visibleRows.map(({ r, i }) => {
              const opts = filteredGames(r.rowSearch)
              const matched = !!r.gameId
              const matchedGame = matched ? games.find(g => g.id === r.gameId) : null
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: rowGridCols,
                    gap: '0.5rem',
                    padding: '0.45rem 0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                    background: !matched ? 'rgba(228,51,41,0.04)' : duplicateGameIds.has(r.gameId) ? 'rgba(106,106,183,0.06)' : 'transparent',
                  }}
                >
                  {/* Import name */}
                  <span style={{ fontSize: '0.8rem', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.importName}>
                    {r.importName}
                  </span>

                  {/* Qty */}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', color: r.qty === 0 ? 'rgba(245,242,236,0.3)' : '#C9962C' }}>
                    {r.qty}
                  </span>

                  {/* Per-row game search */}
                  <input
                    type="search"
                    placeholder="Search games…"
                    value={r.rowSearch}
                    onChange={e => setRow(i, { rowSearch: e.target.value })}
                    style={inp}
                  />

                  {/* Dropdown */}
                  <select
                    value={r.gameId}
                    onChange={e => setRow(i, { gameId: e.target.value })}
                    style={sel}
                  >
                    <option value="" style={{ background: '#1c1c1c', color: '#F5F2EC' }}>— no match —</option>
                    {/* Show currently selected game even if it's not in filtered list */}
                    {matchedGame && !opts.find(g => g.id === matchedGame.id) && (
                      <option key={matchedGame.id} value={matchedGame.id} style={{ background: '#1c1c1c', color: '#F5F2EC' }}>
                        {matchedGame.name}
                      </option>
                    )}
                    {opts.map(g => (
                      <option key={g.id} value={g.id} style={{ background: '#1c1c1c', color: '#F5F2EC' }}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  {/* Status */}
                  <span style={{ textAlign: 'center', fontSize: '0.9rem' }} title={duplicateGameIds.has(r.gameId) ? 'Merged with another row' : undefined}>
                    {!matched ? '?' : duplicateGameIds.has(r.gameId) ? '⊕' : '✓'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Unmatched summary */}
      {unmatchedRows.length > 0 && (
        <div style={{ ...card, borderColor: 'rgba(228,51,41,0.25)', marginBottom: '1.5rem' }}>
          <p style={{ color: '#E43329', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {unmatchedRows.length} items with no game match — assign manually above or they will be skipped:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {unmatchedRows.map(r => (
              <span key={r.importName} style={{ background: 'rgba(228,51,41,0.12)', border: '1px solid rgba(228,51,41,0.25)', borderRadius: '3px', padding: '0.15rem 0.45rem', fontSize: '0.72rem', opacity: 0.8 }}>
                {r.importName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confirm */}
      {!confirmStep ? (
        <button
          onClick={() => setConfirmStep(true)}
          style={{ background: '#00A098', color: '#000', border: 'none', borderRadius: '4px', padding: '0.75rem 2rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          Set Beirut Stock ({matchedCount} games)
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ color: '#E43329', fontSize: '0.85rem', fontWeight: 600 }}>
            This will overwrite stock.Beirut for {matchedCount} games. Confirm?
          </p>
          <button onClick={runImport} style={{ background: '#E43329', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            Yes, overwrite
          </button>
          <button onClick={() => setConfirmStep(false)} style={{ background: 'transparent', color: 'rgba(245,242,236,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '0.6rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
