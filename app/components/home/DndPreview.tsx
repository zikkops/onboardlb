'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface Campaign {
  id: string
  title: string
  type: string
  description: string
  image: string
  color: string
  order: number
}

export default function DndPreview() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [current, setCurrent]     = useState(0)
  const [loading, setLoading]     = useState(true)

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

  useEffect(() => {
    if (campaigns.length === 0) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % campaigns.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [campaigns])

  const campaign = campaigns[current]

  return (
    <section style={{
      padding: '6rem 3rem',
      backgroundColor: 'rgba(50,50,124,0.08)',
      borderTop: '1px solid rgba(50,50,124,0.2)',
      borderBottom: '1px solid rgba(50,50,124,0.2)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '5rem',
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
              fontSize: '2.8rem',
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
            }}>
              Onboard is Lebanon's home for Dungeons & Dragons. Whether you're a
              seasoned adventurer or picking up your first d20, our Dungeon Masters
              are ready to guide you through epic campaigns.
            </p>

            <p style={{
              color: 'rgba(245,242,236,0.55)',
              lineHeight: 1.9,
              marginBottom: '3rem',
              fontFamily: 'var(--font-inter)',
            }}>
              We host weekly sessions, beginner one-shots, and full campaigns.
              All materials provided — just bring your imagination.
            </p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
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

            <Link href="/dnd" style={{
              display: 'inline-block',
              backgroundColor: 'var(--navy)',
              color: '#fff',
              padding: '0.9rem 2.5rem',
              borderRadius: '2px',
              fontSize: '0.78rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter)',
              border: '1px solid rgba(106,106,183,0.4)',
            }}>
              Explore D&D at Onboard
            </Link>
          </div>

          {/* Right — Carousel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {loading || campaigns.length === 0 ? (
              <div style={{
                height: '480px',
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
                {loading ? 'Loading campaigns…' : 'No campaigns yet'}
              </div>
            ) : (
              <>
                <div style={{
                  position: 'relative',
                  height: '480px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid rgba(106,106,183,0.2)',
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

                  {/* Badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '2rem', left: '2rem', right: '2rem',
                    background: 'rgba(10,10,10,0.85)',
                    border: `1px solid ${campaign.color}50`,
                    borderRadius: '4px',
                    padding: '1.2rem 1.5rem',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.65rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: campaign.color,
                      marginBottom: '0.4rem',
                    }}>{campaign.type}</p>
                    <p style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '1.1rem',
                      color: 'var(--offwhite)',
                      marginBottom: '0.3rem',
                    }}>{campaign.title}</p>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.78rem',
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
                      style={{
                        width: i === current ? '24px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        backgroundColor: i === current ? 'var(--purple)' : 'rgba(255,255,255,0.2)',
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