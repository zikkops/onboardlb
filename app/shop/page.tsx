import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faClock, faCakeCandles } from '@fortawesome/free-solid-svg-icons'

const games = [
  {
    name: 'Catan',
    category: 'Strategy',
    description: 'Trade, build and settle the island of Catan in this classic strategy game for the whole family.',
    players: '3–4',
    duration: '60–120 min',
    age: '10+',
    stock: 3,
    image: 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400&q=80',
  },
  {
    name: 'Ticket to Ride',
    category: 'Family',
    description: 'Collect cards and claim railway routes across the map before your opponents cut you off.',
    players: '2–5',
    duration: '30–60 min',
    age: '8+',
    stock: 2,
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&q=80',
  },
  {
    name: 'Codenames',
    category: 'Party',
    description: 'Two rival spymasters know the secret identities of 25 agents. Give one-word clues to win.',
    players: '2–8',
    duration: '15–30 min',
    age: '14+',
    stock: 5,
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&q=80',
  },
  {
    name: 'Pandemic',
    category: 'Cooperative',
    description: 'Work together to stop four deadly diseases from spreading across the globe.',
    players: '2–4',
    duration: '45–60 min',
    age: '8+',
    stock: 1,
    image: 'https://images.unsplash.com/photo-1585504198199-20277593b94f?w=400&q=80',
  },
  {
    name: 'Azul',
    category: 'Strategy',
    description: 'Draft beautiful tiles to decorate the walls of the Royal Palace of Evora.',
    players: '2–4',
    duration: '30–45 min',
    age: '8+',
    stock: 4,
    image: 'https://images.unsplash.com/photo-1612404730960-5c71577fca11?w=400&q=80',
  },
  {
    name: 'Dixit',
    category: 'Party',
    description: 'Use beautiful illustrated cards to tell stories and guess what others are thinking.',
    players: '3–6',
    duration: '30 min',
    age: '8+',
    stock: 3,
    image: 'https://images.unsplash.com/photo-1606503153255-59d5e417e6af?w=400&q=80',
  },
  {
    name: 'Wingspan',
    category: 'Strategy',
    description: 'Attract birds to your wildlife preserve in this engine-building game.',
    players: '1–5',
    duration: '40–70 min',
    age: '10+',
    stock: 2,
    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&q=80',
  },
  {
    name: 'Exploding Kittens',
    category: 'Party',
    description: 'A highly strategic kitty-powered version of Russian roulette.',
    players: '2–5',
    duration: '15 min',
    age: '7+',
    stock: 6,
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
  },
]

const categories = ['All', 'Strategy', 'Party', 'Family', 'Cooperative']

export default function ShopPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>
              Board Game Library
            </p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>
              Buy a Game,<br />Take it Home
            </h1>
          </div>
        </section>

        {/* Games Grid */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 3rem' }}>

          {/* Info bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '3rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '0.82rem',
              color: 'rgba(245,242,236,0.4)',
            }}>
              Showing {games.length} games — contact us via WhatsApp to purchase
            </p>
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
          }}>
            {games.map(({ name, category, description, players, duration, age, stock, image }) => (
              <div key={name} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>

                {/* Image */}
                <div style={{
                  position: 'relative',
                  height: '200px',
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  flexShrink: 0,
                }}>
                  {/* Category badge */}
                  <div style={{
                    position: 'absolute',
                    top: '0.8rem',
                    left: '0.8rem',
                    backgroundColor: 'var(--navy)',
                    color: 'rgba(245,242,236,0.8)',
                    padding: '0.25rem 0.7rem',
                    borderRadius: '2px',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-inter)',
                  }}>
                    {category}
                  </div>

                  {/* Stock badge */}
                  <div style={{
                    position: 'absolute',
                    top: '0.8rem',
                    right: '0.8rem',
                    backgroundColor: stock > 0 ? 'rgba(0,160,152,0.85)' : 'rgba(228,51,41,0.85)',
                    color: '#fff',
                    padding: '0.25rem 0.7rem',
                    borderRadius: '2px',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-inter)',
                  }}>
                    {stock > 0 ? `${stock} left` : 'Sold out'}
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: '0.6rem',
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '1rem',
                    color: 'var(--offwhite)',
                  }}>{name}</h3>

                  <p style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.78rem',
                    color: 'rgba(245,242,236,0.4)',
                    lineHeight: 1.6,
                  }}>{description}</p>

                  {/* Details */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.7rem',
                    color: 'rgba(245,242,236,0.35)',
                    fontFamily: 'var(--font-inter)',
                    flexWrap: 'wrap',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FontAwesomeIcon icon={faUsers} style={{ width: '12px', color: 'white' }} />
                        {players}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FontAwesomeIcon icon={faClock} style={{ width: '12px', color: 'white' }} />
                        {duration}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <FontAwesomeIcon icon={faCakeCandles} style={{ width: '12px', color: 'white' }} />
                        {age}
                    </span>
                    </div>

                  {/* Button */}
                  <a
                    href="https://wa.me/96100000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: 'auto',
                      display: 'block',
                      textAlign: 'center',
                      backgroundColor: stock > 0 ? 'var(--purple)' : 'rgba(255,255,255,0.05)',
                      color: stock > 0 ? '#fff' : 'rgba(245,242,236,0.3)',
                      padding: '0.65rem 1rem',
                      borderRadius: '2px',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-inter)',
                      pointerEvents: stock > 0 ? 'auto' : 'none',
                    }}
                  >
                    {stock > 0 ? 'Contact Us to Buy' : 'Out of Stock'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
      <Footer />
    </>
  )
}