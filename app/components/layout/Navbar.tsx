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
  const [isMobile, setIsMobile]       = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [btnHovered, setBtnHovered]   = useState(false)
  const pathname                      = usePathname()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const logoWidth  = isMobile ? 70  : scrolled ? 80  : 110
  const logoHeight = isMobile ? 47  : scrolled ? 54  : 74

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0.8rem 1.2rem' : scrolled ? '0.6rem 2rem' : '1rem 2rem',
        backgroundColor: scrolled || open ? 'rgba(5,5,5,0.95)' : 'transparent',
        backdropFilter: scrolled || open ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled || open ? 'blur(20px)' : 'none',
        borderBottom: scrolled || open ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>

        {/* Logo */}
        <Link href="/" style={{ flexShrink: 0, zIndex: 51 }}>
          <Image
            src="/images/logo.png"
            alt="Onboard Games & Tales"
            width={logoWidth}
            height={logoHeight}
            priority
            style={{ transition: 'all 0.3s ease' }}
          />
        </Link>

        {/* Desktop Nav */}
        {!isMobile && (
          <>
            <ul style={{
              display: 'flex',
              gap: '2.5rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
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
                        backgroundColor: 'var(--teal)',
                        transition: 'width 0.25s ease',
                        display: 'block',
                      }} />
                    </Link>
                  </li>
                )
              })}
            </ul>

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
                flexShrink: 0,
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
          </>
        )}

        {/* Mobile Hamburger */}
        {isMobile && (
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              padding: '4px',
              zIndex: 51,
            }}>
            <span style={{
              display: 'block', width: '24px', height: '2px',
              backgroundColor: 'var(--offwhite)',
              transition: 'all 0.3s ease',
              transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none',
            }} />
            <span style={{
              display: 'block', width: '24px', height: '2px',
              backgroundColor: 'var(--offwhite)',
              transition: 'all 0.3s ease',
              opacity: open ? 0 : 1,
            }} />
            <span style={{
              display: 'block', width: '24px', height: '2px',
              backgroundColor: 'var(--offwhite)',
              transition: 'all 0.3s ease',
              transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
            }} />
          </button>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5,5,5,0.98)',
          zIndex: 49,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2.5rem',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-10px)',
          pointerEvents: open ? 'auto' : 'none',
        }}>
          {LINKS.map(({ href, label }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: '1.5rem',
                  color: active ? 'var(--teal)' : 'var(--offwhite)',
                  textDecoration: 'none',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  transition: 'color 0.2s',
                }}>
                {label}
              </Link>
            )
          })}

          <Link href="/about#contact"
            onClick={() => setOpen(false)}
            style={{
              marginTop: '1rem',
              backgroundColor: 'var(--teal)',
              color: '#fff',
              padding: '0.9rem 3rem',
              borderRadius: '2px',
              fontSize: '0.85rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter)',
            }}>
            Reserve a Table
          </Link>
        </div>
      )}
    </>
  )
}