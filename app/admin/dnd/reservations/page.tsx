'use client'

import { useEffect, useState } from 'react'
import { useRequireRole, SECTION_ACCESS } from '../../../lib/adminAuth'
import {
  usePendingReservations, approveReservation, rejectReservation, type Reservation,
} from '../../../lib/dndReservations'
import { resolveUserProfiles, resolveStaffEmails, type ResolvedProfile } from '../../../lib/loyalty'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiceD20, faInbox } from '@fortawesome/free-solid-svg-icons'

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

export default function DndReservationsPage() {
  const { checking, role, isDungeonMaster, user } = useRequireRole(SECTION_ACCESS.dndReservations)
  const isMobile = useIsMobile()

  // Admins/managers see every pending reservation across every DM; anyone
  // who's a DM (by role or by the separate isDungeonMaster flag — e.g. an
  // admin or gamer who also runs sessions) sees only their own.
  const isDm = role === 'dungeonmaster' || isDungeonMaster
  const scope = checking ? null : (role === 'admin' || role === 'manager') ? 'all' : isDm ? (user?.uid ?? null) : null
  const { reservations, loading } = usePendingReservations(scope)
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())

  const [profiles, setProfiles]       = useState<Map<string, ResolvedProfile>>(new Map())
  const [dmEmails, setDmEmails]       = useState<Map<string, string>>(new Map())
  const [busyId, setBusyId]           = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

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

  async function handleApprove(r: Reservation) {
    if (!user) return
    setBusyId(r.id)
    try {
      await approveReservation(r, user.uid)
      setProcessedIds(prev => new Set(prev).add(r.id))
    } finally {
      setBusyId(null)
    }
  }

  async function handleConfirmReject(r: Reservation) {
    if (!user) return
    setBusyId(r.id)
    try {
      await rejectReservation(r, user.uid, rejectReason.trim())
      setProcessedIds(prev => new Set(prev).add(r.id))
      setRejectingId(null)
      setRejectReason('')
    } finally {
      setBusyId(null)
    }
  }

  if (checking) return null

  const visible = reservations.filter(r => !processedIds.has(r.id))

  const cardStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '4px',
    padding: isMobile ? '1.1rem' : '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.9rem',
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
            D&amp;D Reservations
          </h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.3)', marginTop: '0.4rem' }}>
            {scope === 'all' ? 'All Dungeon Masters' : 'Your sessions'} · {visible.length} pending
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : visible.length === 0 ? (
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
            <FontAwesomeIcon icon={faInbox} style={{ width: '32px', color: 'rgba(245,242,236,0.15)' }} />
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.3)' }}>
              No pending reservation requests
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {visible.map(r => {
              const isBusy = busyId === r.id
              const p = profiles.get(r.userId)
              const partySize = 1 + r.participants.length + r.participantPhones.length

              return (
                <div key={r.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                      color: 'var(--purple)', fontFamily: 'var(--font-inter)',
                    }}>
                      <FontAwesomeIcon icon={faDiceD20} style={{ width: '13px' }} />
                      {r.campaignTitle}
                    </span>
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.3)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(r.startAt)}
                    </span>
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

                  {rejectingId === r.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)…"
                        autoFocus
                        style={{
                          width: '100%',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid rgba(228,51,41,0.3)',
                          color: '#F5F2EC',
                          padding: '0.7rem 0.9rem',
                          borderRadius: '2px',
                          fontSize: '0.82rem',
                          outline: 'none',
                          fontFamily: 'var(--font-inter)',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleConfirmReject(r)}
                          disabled={isBusy}
                          style={{
                            flex: 1,
                            backgroundColor: 'var(--red)',
                            color: '#fff',
                            border: 'none',
                            padding: '0.7rem',
                            borderRadius: '2px',
                            fontSize: '0.72rem',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-inter)',
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            opacity: isBusy ? 0.6 : 1,
                          }}
                        >Confirm Rejection</button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason('') }}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(245,242,236,0.5)',
                            padding: '0.7rem 1.2rem',
                            borderRadius: '2px',
                            fontSize: '0.72rem',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-inter)',
                            cursor: 'pointer',
                          }}
                        >Cancel</button>
                      </div>
                    </div>
                  )}

                  {rejectingId !== r.id && (
                    <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button
                        onClick={() => handleApprove(r)}
                        disabled={isBusy}
                        style={{
                          flex: isMobile ? 1 : 'initial',
                          backgroundColor: 'var(--teal)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.8rem 1.5rem',
                          borderRadius: '2px',
                          fontSize: '0.75rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-inter)',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.6 : 1,
                        }}
                      >{isBusy ? 'Working…' : 'Approve'}</button>
                      <button
                        onClick={() => { setRejectingId(r.id); setRejectReason('') }}
                        disabled={isBusy}
                        style={{
                          flex: isMobile ? 1 : 'initial',
                          background: 'transparent',
                          border: '1px solid rgba(228,51,41,0.3)',
                          color: 'var(--red)',
                          padding: '0.8rem 1.5rem',
                          borderRadius: '2px',
                          fontSize: '0.75rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-inter)',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.6 : 1,
                        }}
                      >Reject</button>
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
