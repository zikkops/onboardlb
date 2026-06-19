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
  price: number
  image: string
}

function truncate(text: string, words: number) {
  const arr = text.split(' ')
  return arr.length > words ? arr.slice(0, words).join(' ') + '…' : text
}

export default function ShopPreview() {
  const [games, setGames]         = useState<Game[]>([])
  const [loading, setLoading]     = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const q    = query(collection(db, 'games'), limit(3))
      const snap = await getDocs(q)
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() } as Game)))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <section style={{ padding: '6rem 3rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <p style={{
          fontSize: '0.7rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--purple)',
          marginBottom: '1rem',
          fontFamily: 'var(--font-inter)',
        }}>Board Game Shop</p>

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
            {games.map(({ id, name, description, stock, price, image }) => {
              const outOfStock = stock === 0
              const hovered    = hoveredId === id
              return (
                <Link key={id} href={`/shop/${id}`}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${hovered && !outOfStock ? 'rgba(106,106,183,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    opacity: outOfStock ? 0.6 : 1,
                    transition: 'border-color 0.2s, opacity 0.2s',
                    position: 'relative',
                  }}>

                  {/* Out of stock banner */}
                  {outOfStock && (
                    <div style={{
                      position: 'absolute',
                      top: '1rem', left: 0, right: 0,
                      textAlign: 'center',
                      zIndex: 2,
                    }}>
                      <span style={{
                        backgroundColor: 'rgba(228,51,41,0.9)',
                        color: '#fff',
                        padding: '0.3rem 1rem',
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-inter)',
                        borderRadius: '2px',
                      }}>Out of Stock</span>
                    </div>
                  )}

                  {/* Image with white bg and zoom */}
                  <div style={{
                    backgroundColor: '#fff',
                    padding: '1rem',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    <img
                      src={image || 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400&q=80'}
                      alt={name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: outOfStock ? 'grayscale(60%)' : 'none',
                        transform: hovered && !outOfStock ? 'scale(1.08)' : 'scale(1)',
                        transition: 'transform 0.35s ease, filter 0.3s ease',
                      }}
                    />
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
                      color: 'rgba(245,242,236,0.45)',
                      lineHeight: 1.6,
                    }}>{truncate(description, 10)}</p>

                    {/* Price + Stock + Learn More */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: '0.6rem',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {price > 0 && (
                          <span style={{
                            fontFamily: 'var(--font-cinzel)',
                            fontSize: '1.2rem',
                            color: 'var(--purple)',
                          }}>${price}</span>
                        )}
                        <span style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: '0.68rem',
                          color: outOfStock ? 'var(--red)' : 'var(--teal)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}>
                          {outOfStock ? 'Out of stock' : `${stock} in stock`}
                        </span>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: '0.72rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: hovered && !outOfStock ? 'var(--purple)' : 'rgba(245,242,236,0.35)',
                        transition: 'color 0.2s',
                      }}>
                        Learn More →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}

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
                width: '60px', height: '60px',
                borderRadius: '50%',
                border: '1px solid rgba(106,106,183,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: 'var(--purple)',
              }}>{'→'}</div>
              <p style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1rem',
                color: 'var(--offwhite)',
                textAlign: 'center',
              }}>Browse Full Library</p>
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