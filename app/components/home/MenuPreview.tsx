import Link from 'next/link'

const categories = [
  { label: 'Appetizers',       image: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80' },
  { label: 'Sandwiches',       image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80' },
  { label: 'Burgers',          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
  { label: 'Salads',           image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80' },
  { label: 'Milkshakes',       image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80' },
  { label: 'Tea',              image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80' },
  { label: 'Cookies',          image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&q=80' },
  { label: 'Soft Drinks',      image: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400&q=80' },
  { label: 'Beers',            image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80' },
  { label: 'Alcoholic Drinks', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&q=80' },
]

export default function MenuPreview() {
  return (
    <section style={{
      backgroundColor: 'rgba(255,255,255,0.015)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '6rem 3rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <p style={{
          fontSize: '0.7rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--teal)',
          marginBottom: '1rem',
          fontFamily: 'var(--font-inter)',
        }}>
          Food & Drinks
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: '2.8rem',
            color: 'var(--offwhite)',
            lineHeight: 1.2,
          }}>
            Fuel for<br />the Game
          </h2>

          
        </div>

        <div style={{
          width: '60px', height: '2px',
          backgroundColor: 'var(--teal)',
          marginBottom: '3rem',
        }} />

        {/* Category Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '1rem',
        }}>
          {categories.map(({ label, image }) => (
            <Link key={label} href="/menu" style={{
              position: 'relative',
              height: '180px',
              borderRadius: '4px',
              overflow: 'hidden',
              textDecoration: 'none',
              display: 'block',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* Background image */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'transform 0.4s ease',
              }} />

              {/* Dark overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 100%)',
              }} />

              {/* Label */}
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                right: '1rem',
              }}>
                <p style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: '0.85rem',
                  color: '#fff',
                  letterSpacing: '0.05em',
                }}>
                  {label}
                </p>
              </div>

            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/menu" style={{
            display: 'inline-block',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--offwhite)',
            padding: '0.9rem 3rem',
            borderRadius: '2px',
            fontSize: '0.78rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
          }}>
            View Full Menu
          </Link>
        </div>

      </div>
    </section>
  )
}