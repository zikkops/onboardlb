import Image from 'next/image'

export default function Hero() {
  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '6rem 2rem 4rem',
      overflow: 'hidden',
    }}>

      {/* Background Image */}
      <Image
        src="/images/BG-img1.webp"
        alt="Onboard interior"
        fill
        priority
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.7)',
      }} />

      {/* Color glows on top of overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse at 30% 60%, rgba(50,50,124,0.3) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 30%, rgba(0,160,152,0.15) 0%, transparent 50%)
        `,
      }} />

      {/* Eyebrow */}
      <p style={{
        position: 'relative', zIndex: 1,
        fontSize: '0.7rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: 'var(--teal)',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
      }}>
        <span style={{ display: 'block', width: '40px', height: '1px', background: 'var(--teal)', opacity: 0.5 }} />
        Lebanon's Favourite Game Café
        <span style={{ display: 'block', width: '40px', height: '1px', background: 'var(--teal)', opacity: 0.5 }} />
      </p>

      {/* Logo */}
      <Image
        src="/images/logo.png"
        alt="Onboard Games & Tales"
        width={340}
        height={227}
        priority
        style={{ position: 'relative', zIndex: 1, marginBottom: '2rem' }}
      />

      {/* Tagline */}
      <p style={{
        position: 'relative', zIndex: 1,
        fontFamily: 'var(--font-inter)',
        fontSize: '1rem',
        fontWeight: 300,
        letterSpacing: '0.05em',
        color: 'rgba(245,242,236,0.7)',
        maxWidth: '480px',
        lineHeight: 1.9,
        marginBottom: '3rem',
      }}>
        Where every meal comes with a story and every story begins with a game.
        Three branches across Lebanon.
      </p>

      {/* Buttons */}
        <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        maxWidth: '500px',
        width: '100%',
        }}>
        {[
            { href: '/menu',    label: 'Our Menu',         bg: 'var(--teal)' },
            { href: '/shop',    label: 'Buy Board Games',  bg: 'var(--purple)' },
            { href: '#reserve', label: 'Reserve a Spot',   bg: 'var(--red)' },
            { href: '/dnd',     label: 'Dungeons & Dragons', bg: 'var(--navy)' },
        ].map(({ href, label, bg }) => (
            <a key={href} href={href} style={{
            backgroundColor: bg,
            color: '#fff',
            padding: '0.9rem 1rem',
            borderRadius: '2px',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
            textAlign: 'center',
            }}>
            {label}
            </a>
        ))}
        </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute', zIndex: 1,
        bottom: '2.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'rgba(245,242,236,0.2)',
        fontSize: '0.65rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, rgba(0,160,152,0.6), transparent)' }} />
        Scroll
      </div>

    </section>
  )
}