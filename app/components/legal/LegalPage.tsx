'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

export interface LegalSection {
  heading: string
  body: ReactNode
}

// Shared shell for /terms and /privacy — a long-form text page in the site's
// dark style. Section bodies are plain JSX so each page owns its own wording.
export default function LegalPage({ eyebrow, title, updated, intro, sections, otherLink }: {
  eyebrow: string
  title: string
  updated: string
  intro: ReactNode
  sections: LegalSection[]
  otherLink: { href: string; label: string }
}) {
  const isMobile = useIsMobile()
  const [otherHovered, setOtherHovered] = useState(false)

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: 'var(--black)', minHeight: '100vh' }}>
        <div style={{
          maxWidth: '820px',
          margin: '0 auto',
          padding: isMobile ? '7rem 1.25rem 3rem' : '9rem 3rem 6rem',
        }}>
          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--purple)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-inter)',
          }}>{eyebrow}</p>
          <h1 style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: isMobile ? '2rem' : '2.8rem',
            color: 'var(--offwhite)',
            lineHeight: 1.2,
            marginBottom: '1rem',
          }}>{title}</h1>
          <p style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '0.78rem',
            color: 'rgba(245,242,236,0.35)',
            marginBottom: '2rem',
          }}>Last updated: {updated}</p>
          <div style={{ width: '60px', height: '2px', backgroundColor: 'var(--purple)', marginBottom: '2rem' }} />

          <div style={bodyStyle}>{intro}</div>

          {sections.map((s, i) => (
            <section key={s.heading} style={{ marginTop: '2.5rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: isMobile ? '1.15rem' : '1.3rem',
                color: 'var(--offwhite)',
                marginBottom: '0.9rem',
              }}>{i + 1}. {s.heading}</h2>
              <div style={bodyStyle}>{s.body}</div>
            </section>
          ))}

          <div style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href={otherLink.href}
              onMouseEnter={() => setOtherHovered(true)}
              onMouseLeave={() => setOtherHovered(false)}
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: otherHovered ? 'var(--teal)' : 'rgba(245,242,236,0.45)',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}>
              {otherLink.label} →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

const bodyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)',
  fontSize: '0.92rem',
  color: 'rgba(245,242,236,0.6)',
  lineHeight: 1.8,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.9rem',
}

// Small helpers so the page files read like prose, not style objects.
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: 'var(--offwhite)', fontWeight: 500 }}>{children}</strong>
}

export function ContactLines() {
  return (
    <Bullets items={[
      <>Beirut (Hamra): <a href="https://wa.me/96181950042" target="_blank" rel="noopener noreferrer" style={linkStyle}>+961 81 950 042</a></>,
      <>Zouk Mikael: <a href="https://wa.me/96170973242" target="_blank" rel="noopener noreferrer" style={linkStyle}>+961 70 973 242</a></>,
      <>Broummana: <a href="https://wa.me/96176648054" target="_blank" rel="noopener noreferrer" style={linkStyle}>+961 76 648 054</a></>,
      <>Instagram: <a href="https://instagram.com/onboardlb" target="_blank" rel="noopener noreferrer" style={linkStyle}>@onboardlb</a></>,
    ]} />
  )
}

const linkStyle: React.CSSProperties = { color: 'var(--teal)', textDecoration: 'none' }
