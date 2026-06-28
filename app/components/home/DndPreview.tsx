'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Skeleton from '../Skeleton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

// Swipes shorter than this are treated as taps/scrolls, not navigation.
const SWIPE_THRESHOLD = 40

interface Campaign {
  id: string
  title: string
  type: string
  description: string
  image: string
  color: string
  order: number
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

export default function DndPreview() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [current, setCurrent]     = useState(0)
  const [loading, setLoading]     = useState(true)
  const [exploreHovered, setExploreHovered] = useState(false)
  const [hoveredDot, setHoveredDot] = useState<number | null>(null)
  const [hoveredArrow, setHoveredArrow] = useState<'prev' | 'next' | null>(null)
  const isMobile = useIsMobile()
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'dndCampaigns'))
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Campaign))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      setCampaigns(data)
      setLoading(false)
    }
    load()
  }, [])

  // Depends on `current` too, not just `campaigns.length` — so manually
  // jumping to a slide (arrow click, dot, or swipe) restarts the 4-second
  // countdown instead of potentially auto-advancing again a moment later.
  useEffect(() => {
    if (campaigns.length === 0) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % campaigns.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [campaigns, current])

  function goToPrev() {
    setCurrent(prev => (prev - 1 + campaigns.length) % campaigns.length)
  }

  function goToNext() {
    setCurrent(prev => (prev + 1) % campaigns.length)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (delta > SWIPE_THRESHOLD) goToPrev()
    else if (delta < -SWIPE_THRESHOLD) goToNext()
  }

  const campaign = campaigns[current]

  return (
    <section style={{
      padding: isMobile ? '4rem 1.25rem' : '6rem 3rem',
      backgroundColor: 'rgba(50,50,124,0.08)',
      borderTop: '1px solid rgba(50,50,124,0.2)',
      borderBottom: '1px solid rgba(50,50,124,0.2)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '2.5rem' : '5rem',
          alignItems: 'center',
        }}>

          {/* Left — Text */}
          <div>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Dungeons & Dragons</p>

            <h2 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '1.75rem' : '2.8rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
              marginBottom: '1.5rem',
            }}>
              Enter the<br />Realm of Adventure
            </h2>

            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--purple)',
              marginBottom: '2rem',
            }} />

            <p style={{
              color: 'rgba(245,242,236,0.55)',
              lineHeight: 1.9,
              marginBottom: '1.2rem',
              fontFamily: 'var(--font-inter)',
              fontSize: isMobile ? '0.88rem' : '1rem',
            }}>
              Onboard is Lebanon's home for Dungeons & Dragons. Whether you're a
              seasoned adventurer or picking up your first d20, our Dungeon Masters
              are ready to guide you through epic campaigns.
            </p>

            <p style={{
              color: 'rgba(245,242,236,0.55)',
              lineHeight: 1.9,
              marginBottom: isMobile ? '2rem' : '3rem',
              fontFamily: 'var(--font-inter)',
              fontSize: isMobile ? '0.88rem' : '1rem',
            }}>
              We host weekly sessions, beginner one-shots, and full campaigns.
              All materials provided — just bring your imagination.
            </p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: isMobile ? '2rem' : '3rem' }}>
              {[
                { title: 'Weekly Sessions',        text: 'Regular games every week at all 3 branches' },
                { title: 'All Levels Welcome',     text: 'Beginners to veterans — everyone has a seat at the table' },
                { title: 'Expert Dungeon Masters', text: 'Our DMs craft stories you will never forget' },
                { title: 'All Materials Provided', text: 'Dice, character sheets, rulebooks — all included' },
              ].map(({ title, text }) => (
                <div key={title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '6px', height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--purple)',
                    marginTop: '6px', flexShrink: 0,
                  }} />
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '0.85rem',
                      color: 'var(--offwhite)',
                      marginBottom: '0.2rem',
                    }}>{title}</p>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.78rem',
                      color: 'rgba(245,242,236,0.45)',
                    }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/dnd"
              onMouseEnter={() => setExploreHovered(true)}
              onMouseLeave={() => setExploreHovered(false)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'inline-block',
                backgroundColor: exploreHovered ? 'rgba(106,106,183,0.15)' : 'var(--navy)',
                color: '#fff',
                padding: '0.9rem 2.5rem',
                borderRadius: '2px',
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                fontFamily: 'var(--font-inter)',
                border: `1px solid ${exploreHovered ? 'var(--purple)' : 'rgba(106,106,183,0.4)'}`,
                backdropFilter: exploreHovered ? 'blur(10px)' : 'none',
                boxShadow: exploreHovered ? '0 0 20px rgba(106,106,183,0.4)' : 'none',
                transition: 'all 0.3s ease',
              }}>
              <span style={{
                position: 'absolute',
                top: 0,
                left: exploreHovered ? '120%' : '-60%',
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                transform: 'skewX(-20deg)',
                transition: 'left 0.5s ease',
                pointerEvents: 'none',
              }} />
              Explore D&D at Onboard
            </Link>
          </div>

          {/* Right — Carousel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {loading ? (
              <Skeleton height={isMobile ? '320px' : '480px'} borderRadius="4px" />
            ) : campaigns.length === 0 ? (
              <div style={{
                height: isMobile ? '320px' : '480px',
                borderRadius: '4px',
                border: '1px solid rgba(106,106,183,0.2)',
                background: 'rgba(50,50,124,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(245,242,236,0.2)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.85rem',
              }}>
                No campaigns yet
              </div>
            ) : (
              <>
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    position: 'relative',
                    height: isMobile ? '320px' : '480px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(106,106,183,0.2)',
                    touchAction: 'pan-y',
                  }}>
                  {/* Background image */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${campaign.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'all 0.6s ease',
                  }} />

                  {/* Color overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to top, rgba(10,10,10,0.95) 0%, ${campaign.color}40 100%)`,
                    transition: 'all 0.6s ease',
                  }} />

                  {/* Prev/Next arrows */}
                  {campaigns.length > 1 && (
                    <>
                      <button
                        onClick={goToPrev}
                        onMouseEnter={() => setHoveredArrow('prev')}
                        onMouseLeave={() => setHoveredArrow(null)}
                        aria-label="Previous campaign"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: isMobile ? '0.6rem' : '1rem',
                          transform: 'translateY(-50%)',
                          width: isMobile ? '34px' : '40px',
                          height: isMobile ? '34px' : '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: hoveredArrow === 'prev' ? 'rgba(106,106,183,0.7)' : 'rgba(10,10,10,0.6)',
                          border: `1px solid ${hoveredArrow === 'prev' ? 'var(--purple)' : 'rgba(255,255,255,0.2)'}`,
                          backdropFilter: 'blur(6px)',
                          color: '#fff',
                          cursor: 'pointer',
                          zIndex: 1,
                          transition: 'all 0.2s ease',
                        }}>
                        <FontAwesomeIcon icon={faChevronLeft} style={{ width: '13px' }} />
                      </button>
                      <button
                        onClick={goToNext}
                        onMouseEnter={() => setHoveredArrow('next')}
                        onMouseLeave={() => setHoveredArrow(null)}
                        aria-label="Next campaign"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: isMobile ? '0.6rem' : '1rem',
                          transform: 'translateY(-50%)',
                          width: isMobile ? '34px' : '40px',
                          height: isMobile ? '34px' : '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: hoveredArrow === 'next' ? 'rgba(106,106,183,0.7)' : 'rgba(10,10,10,0.6)',
                          border: `1px solid ${hoveredArrow === 'next' ? 'var(--purple)' : 'rgba(255,255,255,0.2)'}`,
                          backdropFilter: 'blur(6px)',
                          color: '#fff',
                          cursor: 'pointer',
                          zIndex: 1,
                          transition: 'all 0.2s ease',
                        }}>
                        <FontAwesomeIcon icon={faChevronRight} style={{ width: '13px' }} />
                      </button>
                    </>
                  )}

                  {/* Badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: isMobile ? '1rem' : '2rem',
                    left: isMobile ? '1rem' : '2rem',
                    right: isMobile ? '1rem' : '2rem',
                    background: 'rgba(10,10,10,0.85)',
                    border: `1px solid ${campaign.color}50`,
                    borderRadius: '4px',
                    padding: isMobile ? '1rem 1.1rem' : '1.2rem 1.5rem',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: isMobile ? '0.6rem' : '0.65rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: campaign.color,
                      marginBottom: '0.4rem',
                    }}>{campaign.type}</p>
                    <p style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: isMobile ? '0.95rem' : '1.1rem',
                      color: 'var(--offwhite)',
                      marginBottom: '0.3rem',
                    }}>{campaign.title}</p>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: isMobile ? '0.72rem' : '0.78rem',
                      color: 'rgba(245,242,236,0.5)',
                    }}>{campaign.description?.split(' ').slice(0, 12).join(' ')}…</p>
                  </div>
                </div>

                {/* Dots */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  {campaigns.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      onMouseEnter={() => setHoveredDot(i)}
                      onMouseLeave={() => setHoveredDot(null)}
                      style={{
                        width: i === current ? '24px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        backgroundColor: i === current
                          ? 'var(--purple)'
                          : hoveredDot === i ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}