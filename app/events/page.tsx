'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

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

function truncate(text: string, words: number) {
  const arr = text.split(' ')
  return arr.length > words ? arr.slice(0, words).join(' ') + '…' : text
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

export default function EventsPage() {
  const [upcoming, setUpcoming]   = useState<GameEvent[]>([])
  const [completed, setCompleted] = useState<GameEvent[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('All')
  const [branches, setBranches]   = useState<string[]>([])
  const [selected, setSelected]   = useState<GameEvent | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'events'))
      const all  = snap.docs.map(d => ({ id: d.id, ...d.data() } as GameEvent))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const now = new Date()
      now.setHours(0, 0, 0, 0)

      setUpcoming(all.filter(e => new Date(e.date) >= now))
      setCompleted(all.filter(e => new Date(e.date) < now).reverse())

      const uniqueBranches = [...new Set(all.map(e => e.branch))]
      setBranches(uniqueBranches)
      setLoading(false)
    }
    load()
  }, [])

  const filteredUpcoming  = filter === 'All' ? upcoming  : upcoming.filter(e => e.branch === filter)
  const filteredCompleted = filter === 'All' ? completed : completed.filter(e => e.branch === filter)

  function EventCard({ ev, dimmed = false }: { ev: GameEvent, dimmed?: boolean }) {
    const d = new Date(ev.date)
    return (
      <div
        onClick={() => setSelected(ev)}
        style={{
          border: `1px solid ${dimmed ? 'rgba(255,255,255,0.04)' : 'rgba(106,106,183,0.2)'}`,
          borderRadius: '4px',
          overflow: 'hidden',
          opacity: dimmed ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => {
          if (!dimmed)(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(106,106,183,0.5)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = dimmed ? 'rgba(255,255,255,0.04)' : 'rgba(106,106,183,0.2)'
        }}
      >
        {/* Image — 4:5 ratio */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingTop: '125%',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {ev.image ? (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${ev.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: dimmed ? 'grayscale(60%)' : 'none',
            }}>
              {dimmed && (
                <div style={{
                  position: 'absolute',
                  top: '0.8rem', right: '0.8rem',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'rgba(245,242,236,0.5)',
                  padding: '0.25rem 0.7rem',
                  borderRadius: '2px',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter)',
                }}>Completed</div>
              )}
            </div>
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: dimmed ? 'rgba(255,255,255,0.02)' : 'rgba(50,50,124,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '3rem',
                color: dimmed ? 'rgba(255,255,255,0.08)' : 'rgba(106,106,183,0.4)',
              }}>{d.getDate()}</span>
              {dimmed && (
                <div style={{
                  position: 'absolute',
                  top: '0.8rem', right: '0.8rem',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'rgba(245,242,236,0.5)',
                  padding: '0.25rem 0.7rem',
                  borderRadius: '2px',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter)',
                }}>Completed</div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              backgroundColor: dimmed ? 'rgba(255,255,255,0.05)' : 'rgba(106,106,183,0.15)',
              color: dimmed ? 'rgba(245,242,236,0.3)' : 'var(--purple)',
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

          <p style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '0.78rem',
            color: 'rgba(245,242,236,0.4)',
            lineHeight: 1.6,
            marginBottom: '0.8rem',
          }}>{truncate(ev.description, 10)}</p>

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
            fontSize: '0.72rem',
            fontFamily: 'var(--font-inter)',
            color: 'rgba(245,242,236,0.4)',
            marginTop: 'auto',
            paddingTop: '0.8rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span>👥 {ev.minPlayers}–{ev.maxPlayers} players</span>
            <span style={{ color: dimmed ? 'rgba(245,242,236,0.3)' : 'var(--teal)' }}>
              {ev.price === 0 ? 'Free' : `$${ev.price}/person`}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: isMobile ? '32vh' : '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1605870445919-838d190e8e1b?w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(50,50,124,0.3) 100%)',
          }} />
          <div style={{ position: 'relative', zIndex: 1, paddingTop: '4rem' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>What's On</p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '2.2rem' : '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>Events & Tournaments</h1>
          </div>
        </section>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '3rem 1.25rem' : '5rem 3rem' }}>

          {/* Branch Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '4rem' }}>
            {['All', ...branches].map(b => (
              <button key={b} onClick={() => setFilter(b)} style={{
                backgroundColor: filter === b ? 'var(--purple)' : 'transparent',
                border: `1px solid ${filter === b ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}`,
                color: filter === b ? '#fff' : 'rgba(245,242,236,0.5)',
                padding: '0.4rem 1.2rem',
                borderRadius: '50px',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
              }}>{b}</button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading events…</p>
          ) : (
            <>
              {/* Upcoming */}
              <div style={{ marginBottom: '6rem' }}>
                <p style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: 'var(--purple)',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-inter)',
                }}>Upcoming</p>
                <h2 style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: isMobile ? '1.5rem' : '2rem',
                  color: 'var(--offwhite)',
                  marginBottom: '1.5rem',
                }}>Don't Miss Out</h2>
                <div style={{
                  width: '60px', height: '2px',
                  backgroundColor: 'var(--purple)',
                  marginBottom: '2.5rem',
                }} />
                {filteredUpcoming.length === 0 ? (
                  <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>
                    No upcoming events. Check back soon!
                  </p>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: isMobile ? '1.25rem' : '1.5rem',
                  }}>
                    {filteredUpcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
                  </div>
                )}
              </div>

              {/* Completed */}
              {filteredCompleted.length > 0 && (
                <div>
                  <p style={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,242,236,0.3)',
                    marginBottom: '1rem',
                    fontFamily: 'var(--font-inter)',
                  }}>Past Events</p>
                  <h2 style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: isMobile ? '1.5rem' : '2rem',
                    color: 'rgba(245,242,236,0.4)',
                    marginBottom: '1.5rem',
                  }}>Completed</h2>
                  <div style={{
                    width: '60px', height: '2px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    marginBottom: '2.5rem',
                  }} />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: isMobile ? '1.25rem' : '1.5rem',
                  }}>
                    {filteredCompleted.map(ev => <EventCard key={ev.id} ev={ev} dimmed />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

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
    </>
  )
}