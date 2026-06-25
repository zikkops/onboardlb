'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCustomerUser, signOutCustomer } from '../../lib/customerAuth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

const LINKS = [
  { href: '/about',   label: 'About Us' },
  { href: '/shop',    label: 'Shop' },
  { href: '/menu',    label: 'Menu' },
  { href: '/events',  label: 'Events' },
  { href: '/dnd',     label: 'D&D' },
  { href: '/loyalty', label: 'Loyalty' },
]

export default function Navbar() {
  const [scrolled, setScrolled]       = useState(false)
  const [open, setOpen]               = useState(false)
  const [isMobile, setIsMobile]       = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [btnHovered, setBtnHovered]   = useState(false)
  const [authHovered, setAuthHovered] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [hoveredMenuItem, setHoveredMenuItem] = useState<'profile' | 'logout' | null>(null)
  const pathname                      = usePathname()
  const router                        = useRouter()
  const { user: customerUser, loading: customerLoading } = useCustomerUser()
  const [customerName, setCustomerName] = useState<string | null>(null)

  useEffect(() => {
    if (!customerUser) { setCustomerName(null); return }
    const unsub = onSnapshot(doc(db, 'users', customerUser.uid), snap => {
      const data = snap.data() as { displayName?: string; username?: string } | undefined
      setCustomerName(data?.username || data?.displayName || customerUser.displayName || 'Adventurer')
    })
    return unsub
  }, [customerUser])

  async function handleLogout() {
    await signOutCustomer()
    router.push('/')
  }

  function menuItemStyle(active: boolean, danger?: boolean) {
    return {
      display: 'block',
      width: '100%',
      textAlign: 'left' as const,
      padding: '0.75rem 1.1rem',
      fontSize: '0.74rem',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      fontFamily: 'var(--font-inter)',
      color: active ? (danger ? 'var(--red)' : 'var(--teal)') : 'rgba(245,242,236,0.7)',
      backgroundColor: active ? 'rgba(255,255,255,0.04)' : 'transparent',
      textDecoration: 'none',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }
  }

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
        display: isMobile ? 'flex' : 'grid',
        gridTemplateColumns: isMobile ? undefined : '1fr auto 1fr',
        alignItems: 'center',
        justifyContent: isMobile ? 'space-between' : undefined,
        padding: isMobile ? '0.8rem 1.2rem' : scrolled ? '0.6rem 2rem' : '1rem 2rem',
        backgroundColor: scrolled || open ? 'rgba(5,5,5,0.95)' : 'transparent',
        backdropFilter: scrolled || open ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled || open ? 'blur(20px)' : 'none',
        borderBottom: scrolled || open ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>

        {/* Logo */}
        <Link href="/" style={{ flexShrink: 0, zIndex: 51, justifySelf: isMobile ? undefined : 'start' }}>
          <Image
            src="/images/logo.png"
            alt="Onboard Games & Tales"
            width={logoWidth}
            height={logoHeight}
            priority
            style={{ transition: 'all 0.3s ease' }}
          />
        </Link>

        {/* Desktop Nav — middle/right sit in their own grid columns (see
            gridTemplateColumns above) so the links are dead-centered on the
            full nav width, regardless of how wide the logo or right-hand
            button group are. */}
        {!isMobile && (
          <>
            <ul style={{
              display: 'flex',
              gap: '2.5rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
              justifySelf: 'center',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifySelf: 'end' }}>
              {!customerLoading && (
                customerUser ? (
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setProfileMenuOpen(true)}
                    onMouseLeave={() => { setProfileMenuOpen(false); setHoveredMenuItem(null) }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: '1px solid rgba(245,242,236,0.25)',
                      color: 'rgba(245,242,236,0.8)',
                      padding: '0.58rem 1.2rem',
                      borderRadius: '2px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-inter)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      Welcome, {customerName ?? '…'}
                      <FontAwesomeIcon icon={faChevronDown} style={{
                        width: '9px',
                        transform: profileMenuOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }} />
                    </div>

                    {/* Dropdown — wrapper starts flush against the trigger's
                        bottom edge with paddingTop (not marginTop) so there's
                        no real gap in the hoverable area between them. */}
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      paddingTop: '0.5rem',
                      zIndex: 60,
                      opacity: profileMenuOpen ? 1 : 0,
                      visibility: profileMenuOpen ? 'visible' : 'hidden',
                      transition: 'opacity 0.18s ease',
                    }}>
                      <div style={{
                        minWidth: '170px',
                        backgroundColor: 'rgba(8,8,8,0.98)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                      }}>
                        <Link href="/customer/profile"
                          onMouseEnter={() => setHoveredMenuItem('profile')}
                          onMouseLeave={() => setHoveredMenuItem(null)}
                          style={{ ...menuItemStyle(hoveredMenuItem === 'profile'), borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          See Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          onMouseEnter={() => setHoveredMenuItem('logout')}
                          onMouseLeave={() => setHoveredMenuItem(null)}
                          style={menuItemStyle(hoveredMenuItem === 'logout', true)}>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link href="/customer/login"
                    onMouseEnter={() => setAuthHovered(true)}
                    onMouseLeave={() => setAuthHovered(false)}
                    style={{
                      backgroundColor: 'transparent',
                      border: `1px solid ${authHovered ? 'var(--teal)' : 'rgba(245,242,236,0.25)'}`,
                      color: authHovered ? 'var(--teal)' : 'rgba(245,242,236,0.7)',
                      padding: '0.58rem 1.3rem',
                      borderRadius: '2px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}>
                    Login
                  </Link>
                )
              )}

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
            </div>
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

          {!customerLoading && (
            customerUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <p style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: '1.1rem',
                  color: 'var(--teal)',
                  letterSpacing: '0.05em',
                  textAlign: 'center',
                }}>
                  Welcome, {customerName ?? '…'}
                </p>
                <Link href="/customer/profile"
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(245,242,236,0.3)',
                    color: 'var(--offwhite)',
                    padding: '0.8rem 2.5rem',
                    borderRadius: '2px',
                    fontSize: '0.85rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-inter)',
                  }}>
                  See Profile
                </Link>
                <button
                  onClick={() => { setOpen(false); handleLogout() }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(228,51,41,0.4)',
                    color: 'var(--red)',
                    padding: '0.8rem 2.5rem',
                    borderRadius: '2px',
                    fontSize: '0.85rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-inter)',
                    cursor: 'pointer',
                  }}>
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/customer/login"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(245,242,236,0.3)',
                  color: 'var(--offwhite)',
                  padding: '0.8rem 2.5rem',
                  borderRadius: '2px',
                  fontSize: '0.85rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-inter)',
                }}>
                Login
              </Link>
            )
          )}

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