'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Skeleton from '../Skeleton'

interface GameEvent {
  id: string
  title: string
  type: string
  branch: string
  date: string
  timeStart: string
  timeEnd: string
  description: string
  price: number
  minPlayers: number
  maxPlayers: number
  registrationLink?: string
  image?: string
  contactNumber?: string
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

export default function EventsPreview() {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<GameEvent | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'events'))
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as GameEvent))
      const upcoming = all
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)
      setEvents(upcoming)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <section style={{
      backgroundColor: 'rgba(50,50,124,0.06)',
      borderTop: '1px solid rgba(50,50,124,0.15)',
      borderBottom: '1px solid rgba(50,50,124,0.15)',
      padding: isMobile ? '4rem 1.25rem' : '6rem 3rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: isMobile ? '1.25rem' : '1rem',
        }}>
          <div>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Upcoming Events</p>
            <h2 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '1.75rem' : '2.8rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>
              Always Something<br />On the Board
            </h2>
          </div>
          <Link href="/events" style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--offwhite)',
            padding: '0.8rem 2rem',
            borderRadius: '2px',
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
            alignSelf: isMobile ? 'flex-start' : 'auto',
          }}>
            View All Events
          </Link>
        </div>

        <div style={{
          width: '60px', height: '2px',
          backgroundColor: 'var(--purple)',
          marginBottom: '3rem',
        }} />

        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '1.25rem' : '1.5rem',
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ border: '1px solid rgba(106,106,183,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <Skeleton height="140px" borderRadius="0" />
                <div style={{ padding: isMobile ? '1.25rem' : '1.5rem' }}>
                  <Skeleton width="40%" height="1.8rem" style={{ marginBottom: '0.8rem' }} />
                  <Skeleton width="75%" height="1rem" style={{ marginBottom: '0.6rem' }} />
                  <Skeleton width="55%" height="0.8rem" style={{ marginBottom: '1.2rem' }} />
                  <Skeleton height="2.4rem" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>
            No upcoming events right now. Check back soon!
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '1.25rem' : '1.5rem',
          }}>
            {events.map(ev => {
              const d = new Date(ev.date)
              return (
                <div key={ev.id} onClick={() => setSelected(ev)} style={{
                  border: '1px solid rgba(106,106,183,0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(106,106,183,0.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(106,106,183,0.2)' }}
                >
                  {/* Image */}
                  {ev.image ? (
                    <div style={{
                      height: '140px',
                      backgroundImage: `url(${ev.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }} />
                  ) : (
                    <div style={{
                      height: '140px',
                      background: 'rgba(50,50,124,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-cinzel)',
                        fontSize: '2rem',
                        color: 'rgba(106,106,183,0.4)',
                      }}>
                        {d.getDate()}
                      </span>
                    </div>
                  )}

                  <div style={{ padding: isMobile ? '1.25rem' : '1.5rem' }}>
                    {/* Date + Type */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.8rem',
                    }}>
                      <div>
                        <p style={{
                          fontFamily: 'var(--font-cinzel)',
                          fontSize: '1.8rem',
                          color: 'var(--offwhite)',
                          lineHeight: 1,
                        }}>{d.getDate()}</p>
                        <p style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: '0.68rem',
                          color: 'rgba(245,242,236,0.35)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginTop: '0.2rem',
                        }}>
                          {d.toLocaleString('en', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.25rem 0.7rem',
                        borderRadius: '2px',
                        backgroundColor: 'rgba(106,106,183,0.15)',
                        color: 'var(--purple)',
                        fontFamily: 'var(--font-inter)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}>{ev.type}</span>
                    </div>

                    <h3 style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '1rem',
                      color: 'var(--offwhite)',
                      marginBottom: '0.5rem',
                    }}>{ev.title}</h3>

                    <div style={{
                      display: 'flex',
                      gap: '0.8rem',
                      fontSize: '0.72rem',
                      color: 'rgba(245,242,236,0.4)',
                      fontFamily: 'var(--font-inter)',
                      marginBottom: '0.4rem',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{ color: 'var(--teal)' }}>{ev.branch}</span>
                      <span>{ev.timeStart} – {ev.timeEnd}</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.2rem',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-inter)',
                      color: 'rgba(245,242,236,0.4)',
                    }}>
                      <span>👥 {ev.minPlayers}–{ev.maxPlayers} players</span>
                      <span style={{ color: 'var(--teal)' }}>
                        {ev.price === 0 ? 'Free' : `$${ev.price}/person`}
                      </span>
                    </div>

                    <button onClick={() => setSelected(ev)} style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      background: 'transparent',
                      border: '1px solid rgba(106,106,183,0.3)',
                      color: 'var(--offwhite)',
                      padding: '0.6rem',
                      borderRadius: '2px',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      Learn More
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Event Detail Popup */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '1rem' : '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#111',
              border: '1px solid rgba(106,106,183,0.3)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '1100px',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
            }}
          >
            {/* Left — Image */}
            <div style={{
              position: 'relative',
              minHeight: isMobile ? '220px' : '550px',
              borderRadius: isMobile ? '8px 8px 0 0' : '8px 0 0 8px',
              overflow: 'hidden',
            }}>
              {selected.image ? (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${selected.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(50,50,124,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '5rem',
                    color: 'rgba(106,106,183,0.3)',
                  }}>{new Date(selected.date).getDate()}</span>
                </div>
              )}

              {/* Date overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                padding: '2rem 1.5rem 1.5rem',
              }}>
                <p style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: '3rem',
                  color: '#fff',
                  lineHeight: 1,
                }}>{new Date(selected.date).getDate()}</p>
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  {new Date(selected.date).toLocaleString('en', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Right — Info */}
            <div style={{ padding: isMobile ? '1.5rem' : '2.5rem' }}>

              {/* Close */}
              <button onClick={() => setSelected(null)} style={{
                float: 'right',
                background: 'transparent',
                border: 'none',
                color: 'rgba(245,242,236,0.4)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                marginBottom: '1rem',
              }}>✕</button>

              {/* Type badge */}
              <span style={{
                display: 'block',
                width: 'fit-content',
                fontSize: '0.65rem',
                padding: '0.25rem 0.8rem',
                borderRadius: '2px',
                backgroundColor: 'rgba(106,106,183,0.15)',
                color: 'var(--purple)',
                fontFamily: 'var(--font-inter)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
                clear: 'both',
              }}>{selected.type}</span>

              <h2 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1.8rem',
                color: 'var(--offwhite)',
                marginBottom: '1rem',
                lineHeight: 1.3,
              }}>{selected.title}</h2>

              <p style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '0.88rem',
                color: 'rgba(245,242,236,0.55)',
                lineHeight: 1.8,
                marginBottom: '1.5rem',
              }}>{selected.description}</p>

              {/* Details grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                {[
                  { label: 'Branch',  value: selected.branch },
                  { label: 'Date',    value: new Date(selected.date).toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                  { label: 'Time',    value: `${selected.timeStart} – ${selected.timeEnd}` },
                  { label: 'Players', value: `${selected.minPlayers}–${selected.maxPlayers} players` },
                  { label: 'Price',   value: selected.price === 0 ? 'Free entry' : `$${selected.price} per person` },
                  { label: 'Contact', value: selected.contactNumber ?? '+96181950042' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '4px',
                    padding: '0.8rem 1rem',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'rgba(245,242,236,0.3)',
                      marginBottom: '0.3rem',
                    }}>{label}</p>
                    <p style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '0.85rem',
                      color: 'var(--offwhite)',
                    }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {selected.registrationLink && (
                  <a href={selected.registrationLink} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      backgroundColor: 'var(--purple)',
                      color: '#fff',
                      padding: '0.9rem',
                      borderRadius: '2px',
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-inter)',
                    }}>Register Now</a>
                )}
                <a
                  href={`https://wa.me/${(selected.contactNumber ?? '96181950042').replace(/\+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    backgroundColor: 'var(--teal)',
                    color: '#fff',
                    padding: '0.9rem',
                    borderRadius: '2px',
                    fontSize: '0.78rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  Contact Us on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}