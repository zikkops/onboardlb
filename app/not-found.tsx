'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

function D20({ size = 220 }: { size?: number }) {
  // A top-down D20 — hexagonal outer shape with six triangular face sections
  // radiating from the centre, and the critical-fail "1" displayed on the
  // largest front-facing triangle.
  const cx = 100
  const cy = 100
  const r = 88
  // Hexagon vertices (flat-top orientation)
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })
  const pts = hex.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="D20 showing 1 — critical miss"
    >
      <defs>
        <filter id="d20glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="d20fill" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1e0f42" />
          <stop offset="100%" stopColor="#0b0619" />
        </radialGradient>
      </defs>

      {/* Outer hex body */}
      <polygon points={pts} fill="url(#d20fill)" stroke="#00a098" strokeWidth="2.5" />

      {/* Edge lines from each vertex to centre — the face division network */}
      {hex.map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={cx} y2={cy}
          stroke="rgba(0,160,152,0.28)" strokeWidth="1.2" />
      ))}

      {/* Outer hex edge midpoint to midpoint — second ring of lines */}
      {hex.map(([x, y], i) => {
        const [nx, ny] = hex[(i + 1) % 6]
        const [mx, my] = [(x + nx) / 2, (y + ny) / 2]
        return (
          <line key={`m${i}`} x1={mx} y1={my} x2={cx} y2={cy}
            stroke="rgba(0,160,152,0.14)" strokeWidth="1" />
        )
      })}

      {/* "1" — critical miss, glowing in teal */}
      <text
        x={cx} y={cy + 20}
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="58"
        fontWeight="bold"
        fill="#00a098"
        filter="url(#d20glow)"
      >1</text>

      {/* Small label at the bottom of the die */}
      <text
        x={cx} y={cy + 62}
        textAnchor="middle"
        fontFamily="'Arial', sans-serif"
        fontSize="9"
        letterSpacing="2"
        fill="rgba(0,160,152,0.5)"
      >D20</text>
    </svg>
  )
}

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null)
  const dieRef       = useRef<HTMLDivElement>(null)
  const fourRef      = useRef<HTMLDivElement>(null)
  const textRef      = useRef<HTMLDivElement>(null)
  const linksRef     = useRef<HTMLDivElement>(null)
  const [hoverHome, setHoverHome] = useState(false)
  const [hoverShop, setHoverShop] = useState(false)

  // Entrance sequence — staggered, matching the Hero page's GSAP style
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(dieRef.current,   { opacity: 0, scale: 0.5, rotation: -30 }, { opacity: 1, scale: 1, rotation: 0,  duration: 0.9 })
      .fromTo(fourRef.current,  { opacity: 0, y: 40 },                      { opacity: 1, y: 0,                  duration: 0.65 }, '-=0.5')
      .fromTo(textRef.current,  { opacity: 0, y: 20 },                      { opacity: 1, y: 0,                  duration: 0.55 }, '-=0.35')
      .fromTo(linksRef.current, { opacity: 0, y: 12 },                      { opacity: 1, y: 0,                  duration: 0.45 }, '-=0.25')

    // Continuous float — the die bobs up and down while the page is open
    gsap.to(dieRef.current, {
      y: -18,
      repeat: -1,
      yoyo: true,
      duration: 2.4,
      ease: 'sine.inOut',
      delay: 0.9,
    })

    // Slow, hypnotic rotation
    gsap.to(dieRef.current, {
      rotation: 8,
      repeat: -1,
      yoyo: true,
      duration: 5,
      ease: 'sine.inOut',
      delay: 0.9,
    })
  }, [])

  return (
    <>
      <Navbar />
      <main ref={containerRef} style={{
        minHeight: '100vh',
        backgroundColor: 'var(--black)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8rem 2rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Subtle radial glow behind the die */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(0,160,152,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* The D20 */}
        <div ref={dieRef} style={{ opacity: 0, marginBottom: '2.5rem', position: 'relative', zIndex: 1 }}>
          <D20 size={180} />
        </div>

        {/* 404 */}
        <div ref={fourRef} style={{ opacity: 0, position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: 'clamp(5rem, 18vw, 10rem)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, var(--teal) 0%, rgba(0,160,152,0.4) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.2rem',
            userSelect: 'none',
          }}>404</h1>
          <p style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: 'clamp(1rem, 3vw, 1.45rem)',
            color: 'rgba(245,242,236,0.55)',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            marginBottom: '0',
          }}>Critical Miss</p>
        </div>

        {/* Copy */}
        <div ref={textRef} style={{ opacity: 0, maxWidth: '480px', margin: '2rem auto', zIndex: 1, position: 'relative' }}>
          <p style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '1rem',
            color: 'rgba(245,242,236,0.5)',
            lineHeight: 1.75,
          }}>
            You rolled a <span style={{ color: 'var(--teal)', fontWeight: 600 }}>1</span> on your perception check.<br />
            This page doesn&apos;t exist, or has been moved to another dungeon floor.
          </p>
        </div>

        {/* Links */}
        <div ref={linksRef} style={{
          opacity: 0,
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          zIndex: 1,
          position: 'relative',
        }}>
          <Link
            href="/"
            onMouseEnter={() => setHoverHome(true)}
            onMouseLeave={() => setHoverHome(false)}
            style={{
              backgroundColor: hoverHome ? 'rgba(0,160,152,0.15)' : 'var(--teal)',
              color: '#fff',
              padding: '0.8rem 2rem',
              borderRadius: '2px',
              fontSize: '0.78rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter)',
              border: '1px solid var(--teal)',
              transition: 'all 0.25s ease',
              boxShadow: hoverHome ? '0 0 20px rgba(0,160,152,0.4)' : 'none',
            }}
          >Return to Base Camp</Link>

          <Link
            href="/shop"
            onMouseEnter={() => setHoverShop(true)}
            onMouseLeave={() => setHoverShop(false)}
            style={{
              backgroundColor: 'transparent',
              color: hoverShop ? 'var(--offwhite)' : 'rgba(245,242,236,0.55)',
              padding: '0.8rem 2rem',
              borderRadius: '2px',
              fontSize: '0.78rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter)',
              border: `1px solid ${hoverShop ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              transition: 'all 0.25s ease',
            }}
          >Browse the Shop</Link>
        </div>

        {/* Tiny flavour text */}
        <p style={{
          position: 'absolute',
          bottom: '2rem',
          fontFamily: 'var(--font-inter)',
          fontSize: '0.68rem',
          color: 'rgba(245,242,236,0.15)',
          letterSpacing: '0.1em',
          userSelect: 'none',
        }}>
          Error 404 · Page Not Found
        </p>
      </main>
      <Footer />
    </>
  )
}
