'use client'

import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useRequireRole } from '../../lib/adminAuth'

const GAMES = [
  {
    name: 'HedBanz',
    category: 'Family',
    description: 'Rapid-fire guessing game where each player clips a mystery card to their headband without peeking and asks yes/no questions to figure out what animal, food, or object they are. First player to correctly guess three cards wins.',
    players: '2-6',
    duration: '15-30 min',
    age: '7',
    stock: { Beirut: 2, Zouk: 0, Broummana: 0, Faten: 0 },
  },
  {
    name: 'Harry Potter Wizard Chess Set',
    category: 'Strategy',
    description: "Officially licensed chess set recreating the enchanted Wizard's Chess from Harry Potter and the Sorcerer's Stone. The 32 resin pieces replicate the iconic medieval stone chess pieces from the film, mounted on a marble-textured board. Standard chess rules apply.",
    players: '2',
    duration: '30-120 min',
    age: '7',
    stock: { Beirut: 1, Zouk: 0, Broummana: 0, Faten: 0 },
  },
  {
    name: 'Blitzkrieg! Including Nippon Expansion',
    category: 'Strategy',
    description: 'Compact two-player wargame that compresses all of World War Two into around 20 minutes. Players draw army tokens from a bag and fight across iconic WWII theaters — Western Europe, Eastern Front, North Africa, and the Pacific — racing for victory points with no dice. Includes a solo mode and the Nippon expansion.',
    players: '1-2',
    duration: '20-45 min',
    age: '14',
    stock: { Beirut: 1, Zouk: 0, Broummana: 0, Faten: 0 },
  },
  {
    name: 'S#!% Happens',
    category: 'Party',
    description: 'Adult party card game where players rank 200 outrageous real-world bad situations on a Misery Index numbered 1–100. On each turn you must correctly slot a new situation in order among your existing cards. Get it right and keep the card; get it wrong and lose it. First to correctly place 10 cards wins.',
    players: '2-8',
    duration: '20-30 min',
    age: '18',
    stock: { Beirut: 1, Zouk: 0, Broummana: 0, Faten: 0 },
  },
  {
    name: 'Scooby-Doo Chess Set',
    category: 'Strategy',
    description: "Fully playable chess set themed around Scooby-Doo, pitting the Mystery Gang — Scooby as King, Daphne as Queen, Fred as Bishop, Velma as Knight, Shaggy as Rook, Mystery Machine as Pawn — against classic cartoon villains. Includes 32 hand-painted pieces and a decorated board. Standard chess rules apply.",
    players: '2',
    duration: '30-120 min',
    age: '8',
    stock: { Beirut: 1, Zouk: 0, Broummana: 0, Faten: 0 },
  },
  {
    name: 'Throw Throw Burrito',
    category: 'Party',
    description: "The world's first dodgeball card game. Players race to collect matching sets of cards in a chaotic free-for-all, but when Battle, Brawl, or War cards appear everyone must grab a foam burrito and throw it at their opponents. Getting hit costs points; collecting sets earns them.",
    players: '2-6',
    duration: '15 min',
    age: '7',
    stock: { Beirut: 2, Zouk: 0, Broummana: 0, Faten: 0 },
  },
  {
    name: 'Time Bomb',
    category: 'Party',
    description: 'Hidden-role bluffing game in which players are secretly Sherlock\'s team (defusing a bomb) or Moriarty\'s team (detonating it). Each round players take turns cutting a wire from another player\'s face-down hand, trying to reveal all Defuse cards before the Bomb card appears. Tension builds as possibilities narrow.',
    players: '4-8',
    duration: '15 min',
    age: '8',
    stock: { Beirut: 1, Zouk: 0, Broummana: 0, Faten: 0 },
  },
]

export default function ImportNewGamesPage() {
  useRequireRole(['admin'])

  const [phase, setPhase]     = useState<'preview' | 'running' | 'done'>('preview')
  const [confirm, setConfirm] = useState(false)
  const [added, setAdded]     = useState<string[]>([])

  async function runImport() {
    setPhase('running')
    setConfirm(false)
    const names: string[] = []
    for (const game of GAMES) {
      await addDoc(collection(db, 'games'), {
        ...game,
        price: 0,
        wholesalePrice: null,
        image: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      names.push(game.name)
    }
    setAdded(names)
    setPhase('done')
  }

  const base: React.CSSProperties = {
    minHeight: '100vh', background: '#0a0a0a', color: '#F5F2EC',
    padding: '2rem', fontFamily: 'var(--font-inter)',
  }

  if (phase === 'running') return (
    <div style={base}><p style={{ opacity: 0.4 }}>Adding games to Firestore…</p></div>
  )

  if (phase === 'done') return (
    <div style={base}>
      <h1 style={{ fontFamily: 'var(--font-cinzel)', marginBottom: '1.5rem' }}>Done</h1>
      <p style={{ color: '#00A098', marginBottom: '1rem' }}>✓ {added.length} games added.</p>
      <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', opacity: 0.6 }}>
        {added.map(n => <li key={n} style={{ padding: '0.15rem 0' }}>• {n} — add image via Admin → Games</li>)}
      </ul>
    </div>
  )

  return (
    <div style={base}>
      <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.5rem', marginBottom: '0.4rem' }}>
        Import New Games
      </h1>
      <p style={{ opacity: 0.4, fontSize: '0.82rem', marginBottom: '2rem' }}>
        Adds {GAMES.length} games to Firestore with Beirut stock set. Images must be added afterwards via Admin → Games.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {GAMES.map(g => (
          <div key={g.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.9rem', lineHeight: 1.3, flex: 1 }}>{g.name}</p>
              <span style={{ background: 'rgba(0,160,152,0.15)', color: '#00A098', border: '1px solid rgba(0,160,152,0.3)', borderRadius: '3px', padding: '0.1rem 0.4rem', fontSize: '0.65rem', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                Beirut ×{g.stock.Beirut}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              <span style={{ background: 'rgba(106,106,183,0.15)', color: '#9999cc', border: '1px solid rgba(106,106,183,0.25)', borderRadius: '3px', padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>{g.category}</span>
              <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>👤 {g.players}</span>
              <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>⏱ {g.duration}</span>
              <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>🎂 {g.age}+</span>
            </div>
            <p style={{ fontSize: '0.75rem', opacity: 0.45, lineHeight: 1.6 }}>{g.description}</p>
          </div>
        ))}
      </div>

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          style={{ background: '#00A098', color: '#000', border: 'none', borderRadius: '4px', padding: '0.75rem 2rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
        >
          Add {GAMES.length} Games to Firestore
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p style={{ color: '#E43329', fontSize: '0.85rem', fontWeight: 600 }}>
            This will create {GAMES.length} new game documents. Confirm?
          </p>
          <button onClick={runImport} style={{ background: '#E43329', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            Yes, add them
          </button>
          <button onClick={() => setConfirm(false)} style={{ background: 'transparent', color: 'rgba(245,242,236,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '0.6rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
