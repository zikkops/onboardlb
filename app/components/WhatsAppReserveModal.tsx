'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { BRANCH_WHATSAPP, whatsappReserveUrl } from '../lib/branches'

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

function BranchRow({ branch, accent, href }: { branch: string; accent: string; href: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.8rem',
        padding: '0.95rem 1.1rem',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? accent : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '4px',
        textDecoration: 'none',
        transform: hovered ? 'translateX(3px)' : 'none',
        transition: 'all 0.2s ease',
      }}>
      <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.95rem', color: 'var(--offwhite)' }}>📍 {branch}</span>
      <span style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        fontFamily: 'var(--font-inter)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        color: hovered ? '#25D366' : 'rgba(245,242,236,0.5)',
        transition: 'color 0.2s ease',
      }}>
        WhatsApp
        <FontAwesomeIcon icon={faWhatsapp} style={{ width: '16px' }} />
      </span>
    </a>
  )
}

// Reservation by WhatsApp: pick a branch, land in a chat with that branch
// with the request already typed. Used while CUSTOMER_ACCOUNTS_ENABLED is off.
// `branches` narrows the list (e.g. an event's own branch); any without a
// WhatsApp line are dropped, and if nothing is left every branch is offered.
export default function WhatsAppReserveModal({ title, subtitle, details, branches, message, accent = 'var(--purple)', onClose }: {
  title: string
  subtitle?: string
  details?: string
  branches?: string[]
  message: (branch: string) => string
  accent?: string
  onClose: () => void
}) {
  const isMobile = useIsMobile()
  const allLines = Object.keys(BRANCH_WHATSAPP)
  const narrowed = (branches ?? allLines).filter(b => BRANCH_WHATSAPP[b])
  const options  = narrowed.length > 0 ? narrowed : allLines

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '1rem' : '2rem',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: '#111',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: isMobile ? '1.25rem 1.5rem' : '1.5rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.2rem', color: 'var(--offwhite)' }}>{title}</h2>
            {subtitle && (
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: accent, marginTop: '0.3rem' }}>{subtitle}</p>
            )}
            {details && (
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.76rem', color: 'rgba(245,242,236,0.4)', marginTop: '0.2rem' }}>{details}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'transparent', border: 'none',
            color: 'rgba(245,242,236,0.4)', fontSize: '1.2rem', cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
          <p style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '0.82rem',
            color: 'rgba(245,242,236,0.55)',
            lineHeight: 1.7,
            marginBottom: '1.2rem',
          }}>
            {options.length > 1
              ? 'Pick a branch — WhatsApp opens with your request ready to send, and the team will confirm it with you there.'
              : 'WhatsApp opens with your request ready to send, and the team will confirm it with you there.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {options.map(b => (
              <BranchRow key={b} branch={b} accent={accent} href={whatsappReserveUrl(b, message(b))} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
