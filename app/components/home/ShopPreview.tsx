'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface Game {
  id: string
  name: string
  description: string
  stock: number
  image: string
}

export default function ShopPreview() {
  const [games, setGames]     = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const q = query(collection(db, 'games'), limit(3))
      const snap = await getDocs(q)
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() } as Game)))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <section style={{ padding: '6rem 3rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <p style={{
          fontSize: '0.7rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--purple)',
          marginBottom: '1rem',
          fontFamily: 'var(--font-inter)',
        }}>
          Board Game Shop
        </p>

        <h2 style={{
          fontFamily: 'var(--font-cinzel)',
          fontSize: '2.8rem',
          color: 'var(--offwhite)',
          lineHeight: 1.2,
          marginBottom: '1.5rem',
        }}>
          Take the Game<br />Home With You
        </h2>

        <div style={{
          width: '60px', height: '2px',
          backgroundColor: 'var(--purple)',
          marginBottom: '3rem',
        }} />

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
          }}>

            {/* Game Cards */}
            {games.map(({ id, name, description, stock, image }) => (
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
                  height: '200px',
                  backgroundImage: `url(${image || 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400&q=80'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  flexShrink: 0,
                }} />

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
                    color: 'rgba(245,242,236,0.45)',
                    lineHeight: 1.6,
                  }}>{description}</p>

                  <p style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.72rem',
                    color: stock > 0 ? 'var(--teal)' : 'var(--red)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                  </p>

                  <a
                    href="https://wa.me/96100000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: 'auto',
                      display: 'block',
                      textAlign: 'center',
                      backgroundColor: 'var(--purple)',
                      color: '#fff',
                      padding: '0.65rem 1rem',
                      borderRadius: '2px',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    Contact Us to Buy
                  </a>
                </div>
              </div>
            ))}

            {/* Last card — go to shop */}
            <Link href="/shop" style={{
              background: 'rgba(106,106,183,0.08)',
              border: '1px solid rgba(106,106,183,0.25)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              gap: '1rem',
              padding: '2rem',
              minHeight: '360px',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '1px solid rgba(106,106,183,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: 'var(--purple)',
              }}>
                {'→'}
              </div>
              <p style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1rem',
                color: 'var(--offwhite)',
                textAlign: 'center',
              }}>
                Browse Full Library
              </p>
              <p style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '0.75rem',
                color: 'rgba(245,242,236,0.35)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                500+ games available to play in store and buy to take home
              </p>
            </Link>

          </div>
        )}
      </div>
    </section>
  )
}