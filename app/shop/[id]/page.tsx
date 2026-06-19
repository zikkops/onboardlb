'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useParams } from 'next/navigation'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faClock, faCakeCandles, faArrowLeft } from '@fortawesome/free-solid-svg-icons'

interface Game {
  id: string
  name: string
  category: string
  description: string
  players: string
  duration: string
  age: string
  price: number
  stock: number
  image: string
}

export default function GamePage() {
  const { id }                  = useParams()
  const [game, setGame]         = useState<Game | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'games', id as string))
      if (!snap.exists()) {
        setNotFound(true)
      } else {
        setGame({ id: snap.id, ...snap.data() } as Game)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--black)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(245,242,236,0.3)',
      fontFamily: 'var(--font-inter)',
    }}>Loading…</div>
  )

  if (notFound || !game) return (
    <>
      <Navbar />
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--black)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}>
        <h1 style={{ fontFamily: 'var(--font-cinzel)', color: 'var(--offwhite)', fontSize: '2rem' }}>
          Game Not Found
        </h1>
        <Link href="/shop" style={{
          color: 'var(--teal)',
          fontFamily: 'var(--font-inter)',
          fontSize: '0.85rem',
          textDecoration: 'none',
        }}>← Back to Shop</Link>
      </div>
      <Footer />
    </>
  )

  const outOfStock = game.stock === 0

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: 'var(--black)', minHeight: '100vh' }}>

        {/* Back button */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '9rem 3rem 0' }}>
          <Link href="/shop" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(245,242,236,0.4)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
            fontSize: '0.78rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '3rem',
          }}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ width: '12px' }} />
            Back to Shop
          </Link>
        </div>

        {/* Game Detail */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 3rem 6rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5rem',
            alignItems: 'start',
          }}>

            {/* Left — Image */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {outOfStock && (
                <div style={{
                  position: 'absolute',
                  top: '1.2rem',
                  left: '1.2rem',
                  backgroundColor: 'rgba(228,51,41,0.9)',
                  color: '#fff',
                  padding: '0.4rem 1rem',
                  borderRadius: '2px',
                  fontSize: '0.72rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter)',
                  zIndex: 1,
                }}>Out of Stock</div>
              )}
              <img
                src={game.image || 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=600&q=80'}
                alt={game.name}
                style={{
                  width: '100%',
                  height: '400px',
                  objectFit: 'contain',
                  filter: outOfStock ? 'grayscale(60%)' : 'none',
                }}
              />
            </div>

            {/* Right — Info */}
            <div>

              {/* Category */}
              <p style={{
                fontSize: '0.68rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'var(--purple)',
                fontFamily: 'var(--font-inter)',
                marginBottom: '0.8rem',
              }}>{game.category}</p>

              {/* Name */}
              <h1 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '2.5rem',
                color: 'var(--offwhite)',
                lineHeight: 1.2,
                marginBottom: '1.5rem',
              }}>{game.name}</h1>

              {/* Divider */}
              <div style={{
                width: '60px', height: '2px',
                backgroundColor: 'var(--purple)',
                marginBottom: '2rem',
              }} />

              {/* Description */}
              <p style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '0.95rem',
                color: 'rgba(245,242,236,0.6)',
                lineHeight: 1.8,
                marginBottom: '2rem',
              }}>{game.description}</p>

              {/* Price */}
              {game.price > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  marginBottom: '2rem',
                  padding: '1.2rem 1.5rem',
                  background: 'rgba(106,106,183,0.08)',
                  border: '1px solid rgba(106,106,183,0.2)',
                  borderRadius: '4px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '2rem',
                    color: 'var(--purple)',
                  }}>${game.price}</span>
                  <span style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.75rem',
                    color: 'rgba(245,242,236,0.3)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>per unit</span>
                </div>
              )}

              {/* Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '2rem',
              }}>
                {[
                  { icon: faUsers,       label: 'Players',  value: game.players },
                  { icon: faClock,       label: 'Duration', value: game.duration },
                  { icon: faCakeCandles, label: 'Min Age',  value: game.age },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '4px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}>
                    <FontAwesomeIcon icon={icon} style={{ width: '18px', color: 'var(--purple)', marginBottom: '0.5rem' }} />
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.65rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'rgba(245,242,236,0.3)',
                      marginBottom: '0.3rem',
                    }}>{label}</p>
                    <p style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '0.9rem',
                      color: 'var(--offwhite)',
                    }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Stock */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                marginBottom: '2rem',
                padding: '1rem 1.2rem',
                background: outOfStock ? 'rgba(228,51,41,0.08)' : 'rgba(0,160,152,0.08)',
                border: `1px solid ${outOfStock ? 'rgba(228,51,41,0.2)' : 'rgba(0,160,152,0.2)'}`,
                borderRadius: '4px',
              }}>
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  backgroundColor: outOfStock ? 'var(--red)' : 'var(--teal)',
                  flexShrink: 0,
                }} />
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.82rem',
                  color: outOfStock ? 'var(--red)' : 'var(--teal)',
                }}>
                  {outOfStock
                    ? 'Currently out of stock'
                    : `${game.stock} available in store`}
                </p>
              </div>

              {/* CTA */}
              {outOfStock ? (
                <button disabled style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'rgba(245,242,236,0.25)',
                  padding: '1rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '2px',
                  fontSize: '0.82rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'not-allowed',
                  fontFamily: 'var(--font-inter)',
                }}>Out of Stock</button>
              ) : (
                <a
                  href="https://wa.me/96100000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    backgroundColor: 'var(--purple)',
                    color: '#fff',
                    padding: '1rem',
                    borderRadius: '2px',
                    fontSize: '0.82rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  Contact Us to Buy via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}