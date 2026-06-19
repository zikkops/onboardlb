'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

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
  image?: string
}

export default function EventsPreview() {
  const [events, setEvents]     = useState<GameEvent[]>([])
  const [loading, setLoading]   = useState(true)

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
      padding: '6rem 3rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
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
              fontSize: '2.8rem',
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
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : events.length === 0 ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>
            No upcoming events right now. Check back soon!
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
          }}>
            {events.map(ev => {
              const d = new Date(ev.date)
              return (
                <div key={ev.id} style={{
                  border: '1px solid rgba(106,106,183,0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  {/* Image */}
                  {ev.image ? (
                    <div style={{
                      height: '160px',
                      backgroundImage: `url(${ev.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }} />
                  ) : (
                    <div style={{
                      height: '160px',
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

                  <div style={{ padding: '1.5rem' }}>
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

                    <Link href="/events" style={{
                      display: 'block',
                      textAlign: 'center',
                      border: '1px solid rgba(106,106,183,0.3)',
                      color: 'var(--offwhite)',
                      padding: '0.6rem',
                      borderRadius: '2px',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      Learn More
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}