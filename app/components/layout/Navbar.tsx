'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const LINKS = [
  { href: '#about',    label: 'About' },
  { href: '#games',    label: 'Game Library' },
  { href: '#menu',     label: 'Menu' },
  { href: '#events',   label: 'Events' },
  { href: '#branches', label: 'Branches' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 3rem',
      backgroundColor: scrolled ? 'rgba(10,10,10,0.95)' : 'transparent',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'all 0.3s ease',
    }}>

      {/* Logo */}
      <Link href="/">
        <Image
          src="/images/logo.png"
          alt="Onboard Games & Tales"
          width={140}
          height={94}
          priority
        />
      </Link>

      {/* Nav Links */}
      <ul style={{
        display: 'flex',
        gap: '2.5rem',
        listStyle: 'none',
      }}>
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <a href={href} style={{
              color: 'rgba(245,242,236,0.55)',
              textDecoration: 'none',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-inter)',
            }}>
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a href="#reserve" style={{
        backgroundColor: 'var(--teal)',
        color: '#fff',
        padding: '0.6rem 1.5rem',
        borderRadius: '2px',
        fontSize: '0.75rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        fontFamily: 'var(--font-inter)',
      }}>
        Reserve a Table
      </a>

    </nav>
  )
}