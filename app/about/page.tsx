'use client'

import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: '50vh',
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
              fontSize: '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>About Onboard</h1>
          </div>
        </section>

        {/* Story Section */}
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 3rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5rem',
            alignItems: 'center',
            marginBottom: '6rem',
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
                fontSize: '2.5rem',
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
              height: '500px',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Image
                src="/images/BG-img1.webp"
                alt="Onboard interior"
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '6rem',
          }}>
            {[
              { num: '500+', label: 'Games in Library' },
              { num: '3',    label: 'Branches in Lebanon' },
              { num: '5+',   label: 'Years of Play' },
              { num: '∞',    label: 'Good Times' },
            ].map(({ num, label }) => (
              <div key={label} style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--black)',
              }}>
                <p style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: '2.5rem',
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
          <div style={{ marginBottom: '6rem' }}>
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
              fontSize: '2.5rem',
              color: 'var(--offwhite)',
              marginBottom: '1.5rem',
            }}>Everything Under One Roof</h2>
            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--teal)',
              marginBottom: '3rem',
            }} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1.5rem',
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
                  padding: '2rem',
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
          padding: '6rem 3rem',
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
              fontSize: '2.5rem',
              color: 'var(--offwhite)',
              marginBottom: '1.5rem',
            }}>Three Branches,<br />One Community</h2>
            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--teal)',
              marginBottom: '3rem',
            }} />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}>
              {[
                {
                  city: 'Beirut',
                  label: 'Flagship Branch',
                  address: 'Hamra Street, Beirut',
                  hours: 'Mon–Thu 12pm–1am · Fri–Sun 12pm–2am',
                  phone: '+961 1 XXX XXX',
                  color: 'var(--teal)',
                },
                {
                  city: 'Zouk',
                  label: 'Zouk Mikael',
                  address: 'Zouk Mikael Main Road, Keserwan',
                  hours: 'Mon–Thu 12pm–1am · Fri–Sun 12pm–2am',
                  phone: '+961 9 XXX XXX',
                  color: 'var(--red)',
                },
                {
                  city: 'Broummana',
                  label: 'Mountain Branch',
                  address: 'Broummana Main Street, Metn',
                  hours: 'Mon–Thu 2pm–1am · Fri–Sun 12pm–2am',
                  phone: '+961 4 XXX XXX',
                  color: 'var(--purple)',
                },
              ].map(({ city, label, address, hours, phone, color }) => (
                <div key={city} style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{ height: '4px', backgroundColor: color }} />
                  <div style={{ padding: '2rem 1.8rem' }}>
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
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '2rem' }}>
                      <button style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(245,242,236,0.6)',
                        padding: '0.6rem',
                        borderRadius: '2px',
                        fontSize: '0.72rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                      }}>Directions</button>
                      <a href="#contact" style={{
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
                      }}>Reserve</a>
                    </div>
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
          padding: '6rem 3rem',
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
            fontSize: '2.5rem',
            color: 'var(--offwhite)',
            marginBottom: '1.5rem',
          }}>Contact Us</h2>
          <div style={{
            width: '60px', height: '2px',
            backgroundColor: 'var(--teal)',
            marginBottom: '3rem',
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5rem',
            alignItems: 'start',
          }}>

            {/* Left — Contact Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {[
                {
                  label: 'WhatsApp',
                  value: '+961 XX XXX XXX',
                  href: 'https://wa.me/96100000000',
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
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  textDecoration: 'none',
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
                      color: 'var(--offwhite)',
                    }}>{value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Right — Message Form */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px',
              padding: '2.5rem',
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

                <button style={{
                  backgroundColor: 'var(--teal)',
                  color: '#fff',
                  padding: '0.9rem',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '0.78rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                  marginTop: '0.5rem',
                }}>
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}