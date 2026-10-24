'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useParams } from 'next/navigation'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import Skeleton from '../../components/Skeleton'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faClock, faCakeCandles, faArrowLeft, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { totalStock, normalizeStock, BRANCH_WHATSAPP } from '../../lib/branches'

interface Game {
  id: string
  name: string
  category: string
  description: string
  players: string
  duration: string
  age: string
  price: number
  stock: Record<string, number>
  image: string
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

function BackToShopLink({ withIcon }: { withIcon?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link href="/shop"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: hovered ? 'var(--teal)' : (withIcon ? 'rgba(245,242,236,0.4)' : 'var(--teal)'),
        textDecoration: 'none',
        fontFamily: 'var(--font-inter)',
        fontSize: withIcon ? '0.78rem' : '0.85rem',
        letterSpacing: withIcon ? '0.1em' : undefined,
        textTransform: withIcon ? 'uppercase' : undefined,
        marginBottom: withIcon ? '3rem' : undefined,
        transform: hovered ? 'translateX(-4px)' : 'none',
        transition: 'all 0.2s ease',
      }}>
      {withIcon && <FontAwesomeIcon icon={faArrowLeft} style={{ width: '12px' }} />}
      {withIcon ? 'Back to Shop' : '← Back to Shop'}
    </Link>
  )
}

// Public-facing branches only — Faten has no customer WhatsApp line.
const RESERVE_BRANCHES = [
  { city: 'Beirut',    whatsapp: BRANCH_WHATSAPP.Beirut, color: 'var(--teal)' },
  { city: 'Zouk',      whatsapp: BRANCH_WHATSAPP.Zouk, color: 'var(--red)' },
  { city: 'Broummana', whatsapp: BRANCH_WHATSAPP.Broummana, color: 'var(--purple)' },
]

function BranchOption({ city, whatsapp, color, inStock, game }: {
  city: string
  whatsapp: string
  color: string
  inStock: number
  game: Game
}) {
  const [hovered, setHovered] = useState(false)
  const text = `Hi! I'd like to reserve "${game.name}"${game.price > 0 ? ` ($${game.price})` : ''} at the ${city} branch.`
  return (
    <a
      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.8rem',
        padding: '0.9rem 1rem',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '4px',
        textDecoration: 'none',
        transform: hovered ? 'translateX(3px)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.95rem', color: 'var(--offwhite)' }}>{city}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <span style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '0.7rem',
          color: inStock > 0 ? 'var(--teal)' : 'rgba(245,242,236,0.35)',
        }}>{inStock > 0 ? `${inStock} in stock` : 'Ask availability'}</span>
        <FontAwesomeIcon icon={faWhatsapp} style={{ width: '16px', color: hovered ? '#25D366' : 'rgba(245,242,236,0.5)', transition: 'color 0.2s ease' }} />
      </span>
    </a>
  )
}

function ReserveCta({ game }: { game: Game }) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen]       = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          width: '100%',
          backgroundColor: hovered ? 'rgba(106,106,183,0.15)' : 'var(--purple)',
          color: '#fff',
          padding: '1rem',
          border: '1px solid var(--purple)',
          borderRadius: '2px',
          fontSize: '0.82rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter)',
          backdropFilter: hovered ? 'blur(10px)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 0,
          left: hovered ? '120%' : '-60%',
          width: '40%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          transform: 'skewX(-20deg)',
          transition: 'left 0.5s ease',
          pointerEvents: 'none',
        }} />
        Reserve Now
        <FontAwesomeIcon icon={faChevronDown} style={{
          width: '11px',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.3s ease',
        }} />
      </button>

      {/* Branch picker — each option opens WhatsApp to that branch */}
      <div style={{
        maxHeight: open ? '320px' : '0',
        opacity: open ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s ease, opacity 0.25s ease',
      }}>
        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '0.68rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.4)',
          margin: '1.2rem 0 0.7rem',
        }}>Pick a branch to reserve via WhatsApp</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {RESERVE_BRANCHES.map(b => (
            <BranchOption key={b.city} {...b} inStock={normalizeStock(game.stock)[b.city]} game={game} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  const { id }                  = useParams()
  const isMobile                = useIsMobile()
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
    <>
      <Navbar />
      <main style={{ backgroundColor: 'var(--black)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '7rem 1.25rem 3rem' : '9rem 3rem 6rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '2rem' : '5rem',
            alignItems: 'start',
          }}>
            <Skeleton height={isMobile ? '260px' : '400px'} borderRadius="8px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Skeleton width="30%" height="0.8rem" />
              <Skeleton width="60%" height={isMobile ? '1.75rem' : '2.5rem'} />
              <Skeleton width="90%" height="1rem" />
              <Skeleton width="80%" height="1rem" />
              <Skeleton height="3.5rem" style={{ marginTop: '1rem' }} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
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
        <BackToShopLink />
      </div>
      <Footer />
    </>
  )

  const stock      = totalStock(game.stock)
  const outOfStock = stock === 0

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: 'var(--black)', minHeight: '100vh' }}>

        {/* Back button */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '7rem 1.25rem 0' : '9rem 3rem 0' }}>
          <BackToShopLink withIcon />
        </div>

        {/* Game Detail */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 1.25rem 3rem' : '0 3rem 6rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '2rem' : '5rem',
            alignItems: 'start',
          }}>

            {/* Left — Image */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: isMobile ? '1.25rem' : '2rem',
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
                  height: isMobile ? '260px' : '400px',
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
                fontSize: isMobile ? '1.75rem' : '2.5rem',
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
                  padding: isMobile ? '1rem 1.2rem' : '1.2rem 1.5rem',
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
                gap: isMobile ? '0.6rem' : '1rem',
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
                    padding: isMobile ? '0.8rem 0.5rem' : '1.2rem',
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
                    : `${stock} available in store`}
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
                <ReserveCta game={game} />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}