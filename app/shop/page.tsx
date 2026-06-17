'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faClock, faCakeCandles } from '@fortawesome/free-solid-svg-icons'

interface Game {
  id: string
  name: string
  category: string
  description: string
  players: string
  duration: string
  age: string
  stock: number
  image: string
}

const CATEGORIES = ['All', 'Strategy', 'Party', 'Family', 'Cooperative', 'Card', 'Trivia', 'RPG', 'Puzzle']

export default function ShopPage() {
  const [games, setGames]       = useState<Game[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'games'))
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() } as Game)))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'All' ? games : games.filter(g => g.category === filter)

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>
              Board Game Library
            </p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>
              Buy a Game,<br />Take it Home
            </h1>
          </div>
        </section>

        {/* Games */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 3rem' }}>

          {/* Category filters */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '3rem',
          }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} style={{
                backgroundColor: filter === cat ? 'var(--purple)' : 'transparent',
                border: `1px solid ${filter === cat ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}`,
                color: filter === cat ? '#fff' : 'rgba(245,242,236,0.5)',
                padding: '0.4rem 1rem',
                borderRadius: '50px',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
              }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading games…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>No games found.</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
            }}>
              {filtered.map(({ id, name, category, description, players, duration, age, stock, image }) => (
                <div key={id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>

                  {/* Image */}
                  <div style={{
                    position: 'relative',
                    height: '200px',
                    backgroundImage: `url(${image || 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400&q=80'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '0.8rem', left: '0.8rem',
                      backgroundColor: 'var(--navy)',
                      color: 'rgba(245,242,236,0.8)',
                      padding: '0.25rem 0.7rem',
                      borderRadius: '2px',
                      fontSize: '0.65rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-inter)',
                    }}>{category}</div>

                    <div style={{
                      position: 'absolute',
                      top: '0.8rem', right: '0.8rem',
                      backgroundColor: stock > 0 ? 'rgba(0,160,152,0.85)' : 'rgba(228,51,41,0.85)',
                      color: '#fff',
                      padding: '0.25rem 0.7rem',
                      borderRadius: '2px',
                      fontSize: '0.65rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-inter)',
                    }}>{stock > 0 ? `${stock} left` : 'Sold out'}</div>
                  </div>

                  {/* Content */}
                  <div style={{
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: '0.6rem',
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '1rem',
                      color: 'var(--offwhite)',
                    }}>{name}</h3>

                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.78rem',
                      color: 'rgba(245,242,236,0.4)',
                      lineHeight: 1.6,
                    }}>{description}</p>

                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.7rem',
                      color: 'rgba(245,242,236,0.35)',
                      fontFamily: 'var(--font-inter)',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FontAwesomeIcon icon={faUsers} style={{ width: '12px', color: 'white' }} />
                        {players}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FontAwesomeIcon icon={faClock} style={{ width: '12px', color: 'white' }} />
                        {duration}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FontAwesomeIcon icon={faCakeCandles} style={{ width: '12px', color: 'white' }} />
                        {age}
                      </span>
                    </div>

                    <a
                      href="https://wa.me/96100000000"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginTop: 'auto',
                        display: 'block',
                        textAlign: 'center',
                        backgroundColor: stock > 0 ? 'var(--purple)' : 'rgba(255,255,255,0.05)',
                        color: stock > 0 ? '#fff' : 'rgba(245,242,236,0.3)',
                        padding: '0.65rem 1rem',
                        borderRadius: '2px',
                        fontSize: '0.72rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-inter)',
                        pointerEvents: stock > 0 ? 'auto' : 'none',
                      }}
                    >
                      {stock > 0 ? 'Contact Us to Buy' : 'Out of Stock'}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </>
  )
}