'use client'

import { useEffect, useState } from 'react'
import { useRequireRole, SECTION_ACCESS } from '../../../lib/adminAuth'
import { useUpcomingReservations, type Reservation } from '../../../lib/dndReservations'
import { resolveUserProfiles, resolveStaffEmails, type ResolvedProfile } from '../../../lib/loyalty'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiceD20, faCalendarDay } from '@fortawesome/free-solid-svg-icons'

const STATUS_COLORS: Record<Reservation['status'], string> = {
  pending:  '#E5A33D',
  approved: '#2ECC71',
  rejected: 'var(--red)',
}

function isToday(ts: Reservation['startAt']): boolean {
  const d = ts.toDate()
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function formatDateTime(ts: Reservation['startAt']): string {
  return ts.toDate().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

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

export default function DndSchedulePage() {
  const { checking, role, isDungeonMaster, user } = useRequireRole(SECTION_ACCESS.dndReservations)
  const isMobile = useIsMobile()

  const isDm = role === 'dungeonmaster' || isDungeonMaster
  const scope = checking ? null : (role === 'admin' || role === 'manager') ? 'all' : isDm ? (user?.uid ?? null) : null
  const { reservations, loading } = useUpcomingReservations(scope)

  const [profiles, setProfiles] = useState<Map<string, ResolvedProfile>>(new Map())
  const [dmEmails, setDmEmails] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const customerUids = new Set<string>()
    const dmUids = new Set<string>()
    reservations.forEach(r => {
      customerUids.add(r.userId)
      dmUids.add(r.dmUid)
    })
    if (customerUids.size > 0) resolveUserProfiles([...customerUids]).then(setProfiles)
    if (dmUids.size > 0) resolveStaffEmails([...dmUids]).then(setDmEmails)
  }, [reservations])

  if (checking) return null

  const cardStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '4px',
    padding: isMobile ? '1.1rem' : '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.8rem',
  }

  const fieldRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    fontFamily: 'var(--font-inter)',
    fontSize: '0.82rem',
  }

  const fieldLabelStyle = { color: 'rgba(245,242,236,0.4)' }
  const fieldValueStyle = { color: 'var(--offwhite)', textAlign: 'right' as const }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ marginBottom: '2rem' }}>
          <a href="/admin" style={{
            fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none', fontFamily: 'var(--font-inter)',
            marginBottom: '0.5rem', display: 'block',
          }}>← Back to Dashboard</a>
          <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)' }}>
            D&amp;D Schedule
          </h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.3)', marginTop: '0.4rem' }}>
            {scope === 'all' ? 'All Dungeon Masters' : 'Your upcoming sessions'} · {reservations.length} upcoming
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : reservations.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '4px',
            padding: isMobile ? '3rem 1.5rem' : '4rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <FontAwesomeIcon icon={faCalendarDay} style={{ width: '32px', color: 'rgba(245,242,236,0.15)' }} />
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.3)' }}>
              No upcoming sessions
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reservations.map(r => {
              const p = profiles.get(r.userId)
              const partySize = 1 + r.participants.length + r.participantPhones.length
              const today = isToday(r.startAt)

              return (
                <div key={r.id} style={today ? { ...cardStyle, borderLeft: '3px solid var(--teal)' } : cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                      color: 'var(--purple)', fontFamily: 'var(--font-inter)',
                    }}>
                      <FontAwesomeIcon icon={faDiceD20} style={{ width: '13px' }} />
                      {r.campaignTitle}
                    </span>
                    <span style={{
                      fontSize: '0.62rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '2px',
                      backgroundColor: `${STATUS_COLORS[r.status]}25`,
                      color: STATUS_COLORS[r.status],
                      fontFamily: 'var(--font-inter)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>{r.status}</span>
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.1rem', color: 'var(--offwhite)' }}>
                      {formatDateTime(r.startAt)} {today && <span style={{ color: 'var(--teal)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-inter)' }}> · Today</span>}
                    </p>
                  </div>

                  <div style={fieldRowStyle}>
                    <span style={fieldLabelStyle}>Location</span>
                    <span style={fieldValueStyle}>📍 {r.location}</span>
                  </div>

                  <div style={fieldRowStyle}>
                    <span style={fieldLabelStyle}>Booked by</span>
                    <span style={{ ...fieldValueStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden',
                        backgroundColor: '#1a1a1a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {p?.avatarUrl ? (
                          <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '0.6rem', color: 'rgba(245,242,236,0.5)' }}>{(p?.displayName ?? '?').charAt(0).toUpperCase()}</span>
                        )}
                      </span>
                      {p?.displayName ?? '…'}
                    </span>
                  </div>

                  {scope === 'all' && (
                    <div style={fieldRowStyle}>
                      <span style={fieldLabelStyle}>Dungeon Master</span>
                      <span style={fieldValueStyle}>{dmEmails.get(r.dmUid) ?? '…'}</span>
                    </div>
                  )}

                  <div style={fieldRowStyle}>
                    <span style={fieldLabelStyle}>Party size</span>
                    <span style={fieldValueStyle}>{partySize} {partySize === 1 ? 'person' : 'people'}</span>
                  </div>

                  {(r.participants.length > 0 || r.participantPhones.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {r.participants.map(part => (
                        <span key={part.uid} style={{
                          fontSize: '0.72rem', padding: '0.25rem 0.7rem', borderRadius: '2px',
                          backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--offwhite)', fontFamily: 'var(--font-inter)',
                        }}>{part.name}</span>
                      ))}
                      {r.participantPhones.map(phone => (
                        <span key={phone} style={{
                          fontSize: '0.72rem', padding: '0.25rem 0.7rem', borderRadius: '2px',
                          backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(245,242,236,0.6)', fontFamily: 'var(--font-inter)',
                        }}>📞 {phone}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
