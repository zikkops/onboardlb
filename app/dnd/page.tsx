import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const campaigns = [
  {
    title: 'Curse of Strahd',
    type: 'Horror Campaign',
    description: 'Delve into the dark land of Barovia, ruled by the vampire lord Strahd von Zarovich. A gothic horror adventure for those who dare.',
    duration: '6–12 months',
    sessions: 'Weekly',
    players: '4–6',
    level: 'Intermediate',
    image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=800&q=80',
    color: 'var(--red)',
  },
  {
    title: 'Eve of Ruin — Vecna',
    type: 'Epic Campaign',
    description: 'Face the undying lich lord Vecna before he unmakes reality itself. A multiverse-spanning adventure for seasoned adventurers.',
    duration: '8–14 months',
    sessions: 'Weekly',
    players: '4–6',
    level: 'Advanced',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
    color: 'var(--purple)',
  },
  {
    title: 'The Rise of Tiamat',
    type: 'Dragon Campaign',
    description: 'Stop the Cult of the Dragon from summoning Tiamat, the five-headed Dragon Queen, from her prison in the Nine Hells.',
    duration: '4–8 months',
    sessions: 'Weekly',
    players: '4–6',
    level: 'Beginner Friendly',
    image: 'https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=800&q=80',
    color: 'var(--teal)',
  },
]

const faqs = [
  {
    q: 'Do I need experience to join?',
    a: 'Not at all! We welcome complete beginners. Our Dungeon Masters will walk you through everything you need to know before your first session.',
  },
  {
    q: 'What do I need to bring?',
    a: 'Just yourself and your imagination. We provide dice, character sheets, rulebooks, and all the materials you need.',
  },
  {
    q: 'How long is each session?',
    a: 'Sessions typically run 3–4 hours. We recommend arriving 15 minutes early for your first session.',
  },
  {
    q: 'How much does it cost?',
    a: 'Session fees vary by campaign. Contact us on WhatsApp for current pricing and availability.',
  },
  {
    q: 'Can I join an ongoing campaign?',
    a: 'It depends on the campaign and where the group is in the story. Contact us and we will find the best fit for you.',
  },
]

export default function DndPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: '60vh',
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
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>
              Dungeons & Dragons
            </p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '4rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}>
              Enter the Realm<br />of Adventure
            </h1>
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '1rem',
              color: 'rgba(245,242,236,0.55)',
              maxWidth: '480px',
              lineHeight: 1.8,
            }}>
              Lebanon's home for Dungeons & Dragons. Epic campaigns, expert Dungeon Masters, all materials provided.
            </p>
          </div>
        </section>

        {/* Campaigns */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 3rem' }}>

          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--purple)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-inter)',
          }}>
            Active Campaigns
          </p>

          <h2 style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: '2.5rem',
            color: 'var(--offwhite)',
            marginBottom: '1.5rem',
          }}>
            Choose Your Adventure
          </h2>

          <div style={{
            width: '60px', height: '2px',
            backgroundColor: 'var(--purple)',
            marginBottom: '3rem',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {campaigns.map(({ title, type, description, duration, sessions, players, level, image, color }) => (
              <div key={title} style={{
                display: 'grid',
                gridTemplateColumns: '350px 1fr',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>

                {/* Image */}
                <div style={{
                  position: 'relative',
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  minHeight: '280px',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to right, transparent, rgba(10,10,10,0.3))',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '1.2rem',
                    left: '1.2rem',
                    backgroundColor: color,
                    color: '#fff',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '2px',
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-inter)',
                  }}>
                    {type}
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  padding: '2rem',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '1.5rem',
                    color: 'var(--offwhite)',
                    marginBottom: '0.8rem',
                  }}>{title}</h3>

                  <p style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.85rem',
                    color: 'rgba(245,242,236,0.5)',
                    lineHeight: 1.8,
                    marginBottom: '1.5rem',
                  }}>{description}</p>

                  {/* Details */}
                  <div style={{
                    display: 'flex',
                    gap: '2rem',
                    flexWrap: 'wrap',
                    marginBottom: '1.5rem',
                  }}>
                    {[
                      { label: 'Duration',  value: duration },
                      { label: 'Sessions',  value: sessions },
                      { label: 'Players',   value: players },
                      { label: 'Level',     value: level },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p style={{
                          fontSize: '0.65rem',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          color: 'rgba(245,242,236,0.3)',
                          fontFamily: 'var(--font-inter)',
                          marginBottom: '0.2rem',
                        }}>{label}</p>
                        <p style={{
                          fontFamily: 'var(--font-cinzel)',
                          fontSize: '0.85rem',
                          color: 'var(--offwhite)',
                        }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <a
                    href="https://wa.me/96100000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      backgroundColor: color,
                      color: '#fff',
                      padding: '0.7rem 2rem',
                      borderRadius: '2px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    Join This Campaign
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{
          backgroundColor: 'rgba(50,50,124,0.08)',
          borderTop: '1px solid rgba(50,50,124,0.2)',
          padding: '5rem 3rem',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>
              Got Questions?
            </p>

            <h2 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '2.5rem',
              color: 'var(--offwhite)',
              marginBottom: '1.5rem',
            }}>
              Frequently Asked
            </h2>

            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--purple)',
              marginBottom: '3rem',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {faqs.map(({ q, a }) => (
                <div key={q} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  padding: '1.8rem 0',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '1rem',
                    color: 'var(--offwhite)',
                    marginBottom: '0.8rem',
                  }}>{q}</p>
                  <p style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.85rem',
                    color: 'rgba(245,242,236,0.5)',
                    lineHeight: 1.8,
                  }}>{a}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

      </main>
      <Footer />
    </>
  )
}