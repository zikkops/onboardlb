'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

function HeroButton({ href, label, color }: { href: string, label: string, color: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={href}
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
        textDecoration: 'none',
        fontFamily: 'var(--font-inter)',
        border: `1px solid ${hovered ? color : `${color}60`}`,
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        boxShadow: hovered
          ? `0 0 20px ${color}50, inset 0 0 20px ${color}15`
          : 'none',
        display: 'block',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>

      {/* Shine sweep */}
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
    </Link>
  )
}

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
        color: 'rgba(245,242,236,0.6)',
        maxWidth: '480px',
        lineHeight: 1.9,
        marginBottom: '3rem',
      }}>
        Where every meal comes with a story and every story begins with a game.
        Three branches across Lebanon.
      </p>

      {/* Buttons — 3 x 2 layout */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}>

        {/* Row 1 — 3 buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <HeroButton href="/menu"   label="Our Menu" color="#00A098" />
          <HeroButton href="/shop"   label="Shop"      color="#6A6AB7" />
          <HeroButton href="/events" label="Events"    color="#E43329" />
        </div>

        {/* Row 2 — 2 buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <HeroButton href="#reserve" label="Reserve a Spot"     color="#32327C" />
          <HeroButton href="/dnd"     label="Dungeons & Dragons" color="#6A6AB7" />
        </div>
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