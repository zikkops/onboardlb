import Link from 'next/link'

const games = [
  {
    label: 'Catan',
    image: 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400&q=80',
    description: 'Trade, build and settle the island of Catan in this classic strategy game.',
    stock: 3,
  },
  {
    label: 'Ticket to Ride',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&q=80',
    description: 'Collect cards and claim railway routes across the map before your opponents.',
    stock: 2,
  },
  {
    label: 'Codenames',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&q=80',
    description: 'Two rival spymasters know the secret identities of 25 agents. Give one-word clues.',
    stock: 5,
  },
]

export default function ShopPreview() {
  return (
    <section style={{
      padding: '6rem 3rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <p style={{
          fontSize: '0.7rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--purple)',
          marginBottom: '1rem',
          fontFamily: 'var(--font-inter)',
        }}>
          Board Game Shop
        </p>

        <h2 style={{
          fontFamily: 'var(--font-cinzel)',
          fontSize: '2.8rem',
          color: 'var(--offwhite)',
          lineHeight: 1.2,
          marginBottom: '1.5rem',
        }}>
          Take the Game<br />Home With You
        </h2>

        <div style={{
          width: '60px', height: '2px',
          backgroundColor: 'var(--purple)',
          marginBottom: '3rem',
        }} />

        {/* Grid — 3 game cards + 1 CTA card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
        }}>

          {/* Game Cards */}
          {games.map(({ label, image, description, stock }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>

              {/* Image */}
              <div style={{
                height: '200px',
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                flexShrink: 0,
              }} />

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
                }}>
                  {label}
                </h3>

                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.78rem',
                  color: 'rgba(245,242,236,0.45)',
                  lineHeight: 1.6,
                }}>
                  {description}
                </p>

                {/* Stock */}
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.72rem',
                  color: stock > 0 ? 'var(--teal)' : 'var(--red)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                </p>

                {/* Contact Button */}
                <a
                  href="https://wa.me/96100000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 'auto',
                    display: 'block',
                    textAlign: 'center',
                    backgroundColor: 'var(--purple)',
                    color: '#fff',
                    padding: '0.65rem 1rem',
                    borderRadius: '2px',
                    fontSize: '0.72rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  Contact Us to Buy
                </a>

              </div>
            </div>
          ))}

          {/* Last card — go to shop */}
          <Link href="/shop" style={{
            background: 'rgba(106,106,183,0.08)',
            border: '1px solid rgba(106,106,183,0.25)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            gap: '1rem',
            padding: '2rem',
            minHeight: '360px',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '1px solid rgba(106,106,183,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
color: 'var(--purple)',
}}>
  {'>'}
</div>
            <p style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '1rem',
              color: 'var(--offwhite)',
              textAlign: 'center',
            }}>
              Browse Full Library
            </p>
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '0.75rem',
              color: 'rgba(245,242,236,0.35)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}>
              500+ games available to play in store and buy to take home
            </p>
          </Link>

        </div>
      </div>
    </section>
  )
}