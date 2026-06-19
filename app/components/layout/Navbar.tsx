'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/about',  label: 'About Us' },
  { href: '/shop',   label: 'Shop' },
  { href: '/menu',   label: 'Menu' },
  { href: '/events', label: 'Events' },
  { href: '/dnd',    label: 'D&D' },
]

export default function Navbar() {
  const [scrolled, setScrolled]       = useState(false)
  const [open, setOpen]               = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [btnHovered, setBtnHovered]   = useState(false)
  const pathname                      = usePathname()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: scrolled ? '0.6rem 3rem' : '1rem 3rem',
      backgroundColor: scrolled ? 'rgba(5,5,5,0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'all 0.3s ease',
    }}>

      {/* Logo */}
      <Link href="/">
        <Image
          src="/images/logo.png"
          alt="Onboard Games & Tales"
          width={scrolled ? 100 : 140}
          height={scrolled ? 67 : 94}
          priority
          style={{ transition: 'all 0.3s ease' }}
        />
      </Link>

      {/* Nav Links */}
      <ul style={{
        display: 'flex',
        gap: '2.5rem',
        listStyle: 'none',
      }}>
        {LINKS.map(({ href, label }) => {
          const active = isActive(href)
          const lit    = hoveredLink === href || active
          return (
            <li key={href}>
              <Link href={href}
                onMouseEnter={() => setHoveredLink(href)}
                onMouseLeave={() => setHoveredLink(null)}
                style={{
                  color: lit ? '#fff' : 'rgba(245,242,236,0.55)',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter)',
                  position: 'relative',
                  paddingBottom: '4px',
                  transition: 'color 0.2s ease',
                }}>
                {label}
                <span style={{
                  position: 'absolute',
                  bottom: 0, left: 0,
                  width: lit ? '100%' : '0%',
                  height: '1px',
                  backgroundColor: active ? 'var(--teal)' : 'var(--teal)',
                  transition: 'width 0.25s ease',
                  display: 'block',
                }} />
              </Link>
            </li>
          )
        })}
      </ul>

      {/* CTA Button */}
      <Link href="/about#contact"
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: btnHovered ? 'rgba(0,160,152,0.15)' : 'var(--teal)',
          color: '#fff',
          padding: '0.6rem 1.5rem',
          borderRadius: '2px',
          fontSize: '0.75rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          fontFamily: 'var(--font-inter)',
          border: '1px solid var(--teal)',
          backdropFilter: btnHovered ? 'blur(10px)' : 'none',
          transition: 'all 0.3s ease',
          display: 'inline-block',
        }}>
        <span style={{
          position: 'absolute',
          top: 0,
          left: btnHovered ? '120%' : '-60%',
          width: '40%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          transform: 'skewX(-20deg)',
          transition: 'left 0.5s ease',
          pointerEvents: 'none',
        }} />
        Reserve a Table
      </Link>

    </nav>
  )
}