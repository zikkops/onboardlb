'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

function HeroButton({
  label, color, onClick
}: {
  label: string
  color: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: hovered ? `${color}30` : `${color}15`,
        color: '#fff',
        padding: '0.75rem 1.5rem',
        borderRadius: '2px',
        fontSize: '0.78rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-inter)',
        border: `1px solid ${hovered ? color : `${color}60`}`,
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        boxShadow: hovered
          ? `0 0 20px ${color}50, inset 0 0 20px ${color}15`
          : 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}>
      <span style={{
        position: 'absolute',
        top: 0,
        left: hovered ? '120%' : '-60%',
        width: '40%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        transform: 'skewX(-20deg)',
        transition: 'left 0.5s ease',
        pointerEvents: 'none',
      }} />
      {label}
    </button>
  )
}

export default function Hero() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: isMobile ? '5rem 1.5rem 3rem' : '6rem 2rem 4rem',
      overflow: 'hidden',
    }}>

      {/* Background Image */}
      <Image
        src="/images/BG-img1.webp"
        alt="Onboard interior"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />

      {/* Color glows */}
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
        fontSize: isMobile ? '0.6rem' : '0.7rem',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: 'var(--teal)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
      }}>
        <span style={{ display: 'block', width: '30px', height: '1px', background: 'var(--teal)', opacity: 0.5 }} />
        Lebanon's Favourite Game Café
        <span style={{ display: 'block', width: '30px', height: '1px', background: 'var(--teal)', opacity: 0.5 }} />
      </p>

      {/* Logo */}
      <Image
        src="/images/logo.png"
        alt="Onboard Games & Tales"
        width={isMobile ? 200 : 340}
        height={isMobile ? 134 : 227}
        priority
        style={{ position: 'relative', zIndex: 1, marginBottom: '1.5rem' }}
      />

      {/* Tagline */}
      <p style={{
        position: 'relative', zIndex: 1,
        fontFamily: 'var(--font-inter)',
        fontSize: isMobile ? '0.85rem' : '1rem',
        fontWeight: 300,
        letterSpacing: '0.05em',
        color: 'rgba(245,242,236,0.6)',
        maxWidth: isMobile ? '300px' : '480px',
        lineHeight: 1.9,
        marginBottom: '2.5rem',
      }}>
        Where every meal comes with a story and every story begins with a game.
        Three branches across Lebanon.
      </p>

      {/* Buttons */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.8rem',
        width: '100%',
        maxWidth: isMobile ? '320px' : '600px',
      }}>

        {isMobile ? (
          // Mobile — 2 columns
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', width: '100%' }}>
              <HeroButton label="Our Menu"  color="#00A098" onClick={() => scrollTo('menu-section')} />
              <HeroButton label="Shop"      color="#6A6AB7" onClick={() => scrollTo('shop-section')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', width: '100%' }}>
              <HeroButton label="Events"    color="#E43329" onClick={() => scrollTo('events-section')} />
              <HeroButton label="Reserve"   color="#32327C" onClick={() => router.push('/about#contact')} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <HeroButton label="Dungeons & Dragons" color="#6A6AB7" onClick={() => scrollTo('dnd-section')} />
            </div>
          </>
        ) : (
          // Desktop — 3 x 2
          <>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <HeroButton label="Our Menu"          color="#00A098" onClick={() => scrollTo('menu-section')} />
              <HeroButton label="Shop"              color="#6A6AB7" onClick={() => scrollTo('shop-section')} />
              <HeroButton label="Events"            color="#E43329" onClick={() => scrollTo('events-section')} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <HeroButton label="Reserve a Spot"     color="#32327C" onClick={() => router.push('/about#contact')} />
              <HeroButton label="Dungeons & Dragons" color="#6A6AB7" onClick={() => scrollTo('dnd-section')} />
            </div>
          </>
        )}
      </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute', zIndex: 1,
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'rgba(245,242,236,0.2)',
        fontSize: '0.6rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        <div style={{ width: '1px', height: '35px', background: 'linear-gradient(to bottom, rgba(0,160,152,0.6), transparent)' }} />
        Scroll
      </div>
    </section>
  )
}