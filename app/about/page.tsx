'use client'

import { useEffect, useState } from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Image from 'next/image'

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

function BranchActions({ color, mapsUrl }: { color: string; mapsUrl: string }) {
  const [dirHovered, setDirHovered] = useState(false)
  const [resHovered, setResHovered] = useState(false)
  return (
    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '2rem' }}>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setDirHovered(true)}
        onMouseLeave={() => setDirHovered(false)}
        style={{
          flex: 1,
          display: 'block',
          textAlign: 'center',
          textDecoration: 'none',
          background: dirHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: `1px solid ${dirHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
          color: dirHovered ? 'var(--offwhite)' : 'rgba(245,242,236,0.6)',
          padding: '0.6rem',
          borderRadius: '2px',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter)',
          transition: 'all 0.2s ease',
        }}>Directions</a>
      <a href="#contact"
        onMouseEnter={() => setResHovered(true)}
        onMouseLeave={() => setResHovered(false)}
        style={{
          flex: 1,
          backgroundColor: color,
          color: '#fff',
          padding: '0.6rem',
          borderRadius: '2px',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          textAlign: 'center',
          fontFamily: 'var(--font-inter)',
          opacity: resHovered ? 0.85 : 1,
          transform: resHovered ? 'translateY(-2px)' : 'none',
          boxShadow: resHovered ? `0 8px 16px ${color}50` : 'none',
          transition: 'all 0.2s ease',
        }}>Reserve</a>
    </div>
  )
}

function ContactLink({ label, value, href, color }: { label: string; value: string; href: string; color: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        textDecoration: 'none',
        transform: hovered ? 'translateX(4px)' : 'none',
        transition: 'transform 0.2s ease',
      }}>
      <div style={{
        width: '4px',
        height: '40px',
        backgroundColor: color,
        borderRadius: '2px',
        flexShrink: 0,
      }} />
      <div>
        <p style={{
          fontSize: '0.68rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)',
          fontFamily: 'var(--font-inter)',
          marginBottom: '0.3rem',
        }}>{label}</p>
        <p style={{
          fontFamily: 'var(--font-cinzel)',
          fontSize: '1rem',
          color: hovered ? color : 'var(--offwhite)',
          transition: 'color 0.2s ease',
        }}>{value}</p>
      </div>
    </a>
  )
}

function SendMessageButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: hovered ? 'rgba(0,160,152,0.15)' : 'var(--teal)',
        color: '#fff',
        padding: '0.9rem',
        border: '1px solid var(--teal)',
        borderRadius: '2px',
        fontSize: '0.78rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        fontFamily: 'var(--font-inter)',
        marginTop: '0.5rem',
        backdropFilter: hovered ? 'blur(10px)' : 'none',
        transition: 'all 0.3s ease',
      }}>
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
      Send Message
    </button>
  )
}

export default function AboutPage() {
  const isMobile = useIsMobile()
  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: isMobile ? '32vh' : '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/images/BG-img1.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(0,0,0,0.6) 100%)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Our Story</p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '2.2rem' : '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>About Onboard</h1>
          </div>
        </section>

        {/* Story Section */}
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '3rem 1.25rem' : '6rem 3rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '2rem' : '5rem',
            alignItems: 'center',
            marginBottom: isMobile ? '3rem' : '6rem',
          }}>
            <div>
              <p style={{
                fontSize: '0.7rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'var(--teal)',
                marginBottom: '1rem',
                fontFamily: 'var(--font-inter)',
              }}>Who We Are</p>
              <h2 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: isMobile ? '1.75rem' : '2.5rem',
                color: 'var(--offwhite)',
                lineHeight: 1.2,
                marginBottom: '1.5rem',
              }}>More than a café.<br />A place to play.</h2>
              <div style={{
                width: '60px', height: '2px',
                backgroundColor: 'var(--teal)',
                marginBottom: '2rem',
              }} />
              <p style={{
                color: 'rgba(245,242,236,0.55)',
                lineHeight: 1.9,
                marginBottom: '1.2rem',
                fontFamily: 'var(--font-inter)',
              }}>
                Onboard — Games & Tales was born from a simple belief: the best moments
                happen around a table. Whether you're plotting world domination in a
                strategy game, laughing through a party classic, or discovering a hidden
                gem for the first time — we're here to make it happen.
              </p>
              <p style={{
                color: 'rgba(245,242,236,0.55)',
                lineHeight: 1.9,
                marginBottom: '1.2rem',
                fontFamily: 'var(--font-inter)',
              }}>
                We started as a small gathering of board game enthusiasts in Beirut and
                grew into Lebanon's biggest board game café and restaurant. Today we have
                three branches — Beirut, Zouk, and Broummana — each with its own character
                but all sharing the same spirit of play, community, and great food.
              </p>
              <p style={{
                color: 'rgba(245,242,236,0.55)',
                lineHeight: 1.9,
                fontFamily: 'var(--font-inter)',
              }}>
                From casual family afternoons to competitive tournaments, from beginner
                D&D one-shots to full campaigns — Onboard is where Lebanon comes to play.
              </p>
            </div>

            <div style={{
              position: 'relative',
              height: isMobile ? '260px' : '500px',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Image
                src="/images/BG-img1.webp"
                alt="Onboard interior"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '1px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: isMobile ? '3rem' : '6rem',
          }}>
            {[
              { num: '500+', label: 'Games in Library' },
              { num: '3',    label: 'Branches in Lebanon' },
              { num: '5+',   label: 'Years of Play' },
              { num: '∞',    label: 'Good Times' },
            ].map(({ num, label }) => (
              <div key={label} style={{
                padding: isMobile ? '2rem 1rem' : '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--black)',
              }}>
                <p style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: isMobile ? '1.8rem' : '2.5rem',
                  color: 'var(--teal)',
                  marginBottom: '0.5rem',
                }}>{num}</p>
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,242,236,0.35)',
                }}>{label}</p>
              </div>
            ))}
          </div>

          {/* What We Offer */}
          <div style={{ marginBottom: isMobile ? '3rem' : '6rem' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>What We Offer</p>
            <h2 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              color: 'var(--offwhite)',
              marginBottom: '1.5rem',
            }}>Everything Under One Roof</h2>
            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--teal)',
              marginBottom: isMobile ? '2rem' : '3rem',
            }} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: isMobile ? '1rem' : '1.5rem',
            }}>
              {[
                {
                  icon: '/images/icon-2.png',
                  title: 'Board Game Library',
                  text: 'Lebanon\'s biggest board game library with 500+ titles. Our Game Masters will help you find the perfect game for your group.',
                  color: 'var(--teal)',
                },
                {
                  icon: '/images/icon-1.png',
                  title: 'Restaurant & Café',
                  text: 'Full food and drinks menu designed for long game sessions. From hearty burgers to light snacks and cocktails.',
                  color: 'var(--red)',
                },
                {
                  icon: '/images/icon-3.png',
                  title: 'Dungeons & Dragons',
                  text: 'Lebanon\'s home for D&D. Weekly sessions, expert Dungeon Masters, and all materials provided for beginners and veterans alike.',
                  color: 'var(--purple)',
                },
                {
                  icon: '/images/icon-4.png',
                  title: 'Events & Tournaments',
                  text: 'Regular tournaments, game nights, family days, and special events at all three branches throughout the year.',
                  color: 'var(--navy)',
                },
              ].map(({ icon, title, text, color }) => (
                <div key={title} style={{
                  display: 'flex',
                  gap: '1.5rem',
                  padding: isMobile ? '1.5rem' : '2rem',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.02)',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    flexShrink: 0,
                    backgroundImage: `url(${icon})`,
                    backgroundSize: 'cover',
                    mixBlendMode: 'screen',
                  }} />
                  <div>
                    <h3 style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '1rem',
                      color: 'var(--offwhite)',
                      marginBottom: '0.6rem',
                    }}>{title}</h3>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.82rem',
                      color: 'rgba(245,242,236,0.45)',
                      lineHeight: 1.7,
                    }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Branches Section */}
        <section id="branches" style={{
          backgroundColor: 'rgba(255,255,255,0.015)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: isMobile ? '3rem 1.25rem' : '6rem 3rem',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Find Us</p>
            <h2 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              color: 'var(--offwhite)',
              marginBottom: '1.5rem',
            }}>Three Branches,<br />One Community</h2>
            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--teal)',
              marginBottom: isMobile ? '2rem' : '3rem',
            }} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '1.25rem' : '1.5rem',
            }}>
              {[
                {
                  city: 'Beirut',
                  label: 'Flagship Branch',
                  address: 'Bliss Street, Hamra, Beirut',
                  hours: '10:00 AM – 1:30 AM',
                  phone: '+961 81 950 042',
                  color: 'var(--teal)',
                  mapsUrl: 'https://www.google.com/maps/place/On+Board+Games+and+Tales,+Blue+Building,+Rooftop,+Bliss,+Beirut/data=!4m2!3m1!1s0x151f17f4a23fd687:0x4f509441b5d61e73',
                },
                {
                  city: 'Zouk',
                  label: 'Zouk Mikael',
                  address: 'Zouk Mikael, Keserwan',
                  hours: '4:30 PM – 1:30 AM',
                  phone: '+961 70 973 242',
                  color: 'var(--red)',
                  mapsUrl: 'https://www.google.com/maps/place/33%C2%B058\'10.4%22N+35%C2%B036\'24.9%22E/@33.969564,35.60692,17z',
                },
                {
                  city: 'Broummana',
                  label: 'Mountain Branch',
                  address: 'Broummana, Metn',
                  hours: '4:30 PM – 1:30 AM',
                  phone: '+961 76 648 054',
                  color: 'var(--purple)',
                  mapsUrl: 'https://www.google.com/maps/place/On+Board+Games+and+Tales+-+Broumana/@33.8844684,35.6338904,17z',
                },
              ].map(({ city, label, address, hours, phone, color, mapsUrl }) => (
                <div key={city} style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{ height: '4px', backgroundColor: color }} />
                  <div style={{ padding: isMobile ? '1.5rem' : '2rem 1.8rem' }}>
                    <h3 style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '1.8rem',
                      color: 'var(--offwhite)',
                      marginBottom: '0.3rem',
                    }}>{city}</h3>
                    <p style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'rgba(245,242,236,0.3)',
                      marginBottom: '1.8rem',
                      fontFamily: 'var(--font-inter)',
                    }}>{label}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {[
                        { emoji: '📍', text: address },
                        { emoji: '🕐', text: hours },
                        { emoji: '📞', text: phone },
                      ].map(({ emoji, text }) => (
                        <div key={text} style={{
                          display: 'flex',
                          gap: '0.8rem',
                          fontSize: '0.82rem',
                          color: 'rgba(245,242,236,0.5)',
                          fontFamily: 'var(--font-inter)',
                          alignItems: 'flex-start',
                        }}>
                          <span>{emoji}</span>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                    <BranchActions color={color} mapsUrl={mapsUrl} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '3rem 1.25rem' : '6rem 3rem',
        }}>
          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-inter)',
          }}>Get in Touch</p>
          <h2 style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: isMobile ? '1.75rem' : '2.5rem',
            color: 'var(--offwhite)',
            marginBottom: '1.5rem',
          }}>Contact Us</h2>
          <div style={{
            width: '60px', height: '2px',
            backgroundColor: 'var(--teal)',
            marginBottom: isMobile ? '2rem' : '3rem',
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '2.5rem' : '5rem',
            alignItems: 'start',
          }}>

            {/* Left — Contact Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {[
                {
                  label: 'WhatsApp',
                  value: '+961 81 950 042',
                  href: 'https://wa.me/96181950042',
                  color: 'var(--teal)',
                },
                {
                  label: 'Instagram',
                  value: '@onboardlb',
                  href: 'https://instagram.com/onboardlb',
                  color: 'var(--purple)',
                },
                {
                  label: 'Facebook',
                  value: 'Onboard Games & Tales',
                  href: 'https://facebook.com',
                  color: 'var(--navy)',
                },
                {
                  label: 'Email',
                  value: 'hello@onboardlb.com',
                  href: 'mailto:hello@onboardlb.com',
                  color: 'var(--red)',
                },
              ].map(({ label, value, href, color }) => (
                <ContactLink key={label} label={label} value={value} href={href} color={color} />
              ))}
            </div>

            {/* Right — Message Form */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px',
              padding: isMobile ? '1.5rem' : '2.5rem',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1.2rem',
                color: 'var(--offwhite)',
                marginBottom: '2rem',
              }}>Send us a Message</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {[
                  { label: 'Your Name',    type: 'text',  placeholder: 'John Doe' },
                  { label: 'Your Email',   type: 'email', placeholder: 'john@example.com' },
                  { label: 'Your Phone',   type: 'tel',   placeholder: '+961 XX XXX XXX' },
                ].map(({ label, type, placeholder }) => (
                  <div key={label}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.68rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'rgba(245,242,236,0.35)',
                      marginBottom: '0.5rem',
                      fontFamily: 'var(--font-inter)',
                    }}>{label}</label>
                    <input type={type} placeholder={placeholder} style={{
                      width: '100%',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#F5F2EC',
                      padding: '0.75rem 1rem',
                      borderRadius: '2px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'var(--font-inter)',
                    }} />
                  </div>
                ))}

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.68rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,242,236,0.35)',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-inter)',
                  }}>Message</label>
                  <textarea rows={4} placeholder="How can we help you?" style={{
                    width: '100%',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F5F2EC',
                    padding: '0.75rem 1rem',
                    borderRadius: '2px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'var(--font-inter)',
                    resize: 'none',
                  }} />
                </div>

                <SendMessageButton />
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}