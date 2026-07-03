'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../../lib/adminAuth'
import { logUpdate } from '../../../lib/activityLog'
import {
  SESSION_DURATION_MINUTES, DEFAULT_OPENING_START, DEFAULT_OPENING_END,
  useUpcomingReservations, type Reservation,
} from '../../../lib/dndReservations'
import { resolveUserProfiles, type ResolvedProfile } from '../../../lib/loyalty'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDay } from '@fortawesome/free-solid-svg-icons'

const STATUS_COLORS: Record<Reservation['status'], string> = {
  pending:  '#E5A33D',
  approved: '#2ECC71',
  rejected: 'var(--red)',
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

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + minutes + 1440) % 1440
  const days = Math.floor((h * 60 + m + minutes) / 1440)
  const hh = Math.floor(total / 60), mm = total % 60
  const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  return days > 0 ? `${label} (next day)` : label
}

function formatDayOff(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(ts: Reservation['startAt']): string {
  return ts.toDate().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

const inputStyle = {
  width: '100%',
  backgroundColor: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F2EC',
  padding: '0.75rem 1rem',
  borderRadius: '4px',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'var(--font-inter)',
  colorScheme: 'dark' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: '0.68rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  color: 'rgba(245,242,236,0.35)',
  marginBottom: '0.5rem',
  fontFamily: 'var(--font-inter)',
}

const sectionLabelStyle = {
  fontSize: '0.7rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  color: 'var(--purple)',
  marginBottom: '0.75rem',
  fontFamily: 'var(--font-inter)',
}

export default function DmAvailabilityPage() {
  const { checking, user } = useRequireRole(SECTION_ACCESS.dmAvailability)
  const isMobile = useIsMobile()

  const [openingStart, setOpeningStart]   = useState(DEFAULT_OPENING_START)
  const [openingEnd, setOpeningEnd]       = useState(DEFAULT_OPENING_END)
  const [original, setOriginal] = useState({ openingStart: DEFAULT_OPENING_START, openingEnd: DEFAULT_OPENING_END })
  const [weeklyDayOff, setWeeklyDayOff]   = useState<number | null>(null)
  const [savingWeekly, setSavingWeekly]   = useState(false)
  const [daysOff, setDaysOff]             = useState<string[]>([])
  const [newDayOff, setNewDayOff]         = useState(todayStr())
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [busyDay, setBusyDay]             = useState<string | null>(null)
  const [error, setError]                 = useState('')
  const [saved, setSaved]                 = useState(false)

  const { reservations: upcoming, loading: loadingUpcoming } = useUpcomingReservations(user?.uid ?? null)
  const [profiles, setProfiles] = useState<Map<string, ResolvedProfile>>(new Map())

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const data = snap.data()
      const start = (data?.openingStart as string) || DEFAULT_OPENING_START
      const end = (data?.openingEnd as string) || DEFAULT_OPENING_END
      setOpeningStart(start)
      setOpeningEnd(end)
      setOriginal({ openingStart: start, openingEnd: end })
      setWeeklyDayOff(typeof data?.weeklyDayOff === 'number' ? data.weeklyDayOff : null)
      setDaysOff(Array.isArray(data?.daysOff) ? [...data.daysOff].sort() : [])
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    const uids = [...new Set(upcoming.map(r => r.userId))]
    if (uids.length > 0) resolveUserProfiles(uids).then(setProfiles)
  }, [upcoming])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    if (openingEnd <= openingStart) {
      setError('The latest start time must be after the earliest start time.')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { openingStart, openingEnd })
      await logUpdate('Dungeon Master Availability', user.email ?? user.uid, original, { openingStart, openingEnd })
      setOriginal({ openingStart, openingEnd })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function handleSetWeeklyDayOff(day: number | null) {
    if (!user) return
    setSavingWeekly(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { weeklyDayOff: day ?? null })
      setWeeklyDayOff(day)
    } finally {
      setSavingWeekly(false)
    }
  }

  async function handleAddDayOff() {
    if (!user || daysOff.includes(newDayOff)) return
    setBusyDay(newDayOff)
    try {
      await updateDoc(doc(db, 'users', user.uid), { daysOff: arrayUnion(newDayOff) })
      setDaysOff(prev => [...prev, newDayOff].sort())
      await logUpdate('Dungeon Master Availability', user.email ?? user.uid, { daysOff: [] }, { daysOff: [newDayOff] })
    } finally {
      setBusyDay(null)
    }
  }

  async function handleRemoveDayOff(dateStr: string) {
    if (!user) return
    setBusyDay(dateStr)
    try {
      await updateDoc(doc(db, 'users', user.uid), { daysOff: arrayRemove(dateStr) })
      setDaysOff(prev => prev.filter(d => d !== dateStr))
    } finally {
      setBusyDay(null)
    }
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        <div>
          <a href="/admin" style={{
            fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none', fontFamily: 'var(--font-inter)',
            marginBottom: '0.5rem', display: 'block',
          }}>← Back to Dashboard</a>

          <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: isMobile ? '1.6rem' : '2rem', color: 'var(--offwhite)' }}>
            Your Availability
          </h1>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : (
          <>
            {/* Opening hours */}
            <section>
              <p style={sectionLabelStyle}>Opening Hours</p>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                The earliest and latest time a customer can start booking a session with you. Every session is a
                fixed 3 hours, so your last session of the day will run until {addMinutes(openingEnd, SESSION_DURATION_MINUTES)}.
              </p>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={labelStyle}>Earliest Session Start</label>
                    <input type="time" value={openingStart}
                      onChange={e => setOpeningStart(e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Latest Session Start</label>
                    <input type="time" value={openingEnd}
                      onChange={e => setOpeningEnd(e.target.value)}
                      style={inputStyle} />
                  </div>
                </div>

                {error && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'var(--red)' }}>{error}</p>
                )}
                {saved && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'var(--teal)' }}>Saved.</p>
                )}

                <button type="submit" disabled={saving} style={{
                  backgroundColor: 'var(--purple)',
                  color: '#fff',
                  padding: '0.9rem',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '0.8rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? 'Saving…' : 'Save Hours'}
                </button>
              </form>
            </section>

            {/* Weekly day off */}
            <section>
              <p style={sectionLabelStyle}>Weekly Day Off</p>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                One recurring day each week when you're never available. Click the active day again to clear it.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', opacity: savingWeekly ? 0.5 : 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, idx) => {
                  const active = weeklyDayOff === idx
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={savingWeekly}
                      onClick={() => handleSetWeeklyDayOff(active ? null : idx)}
                      style={{
                        background: active ? 'rgba(149,102,210,0.2)' : 'transparent',
                        border: `1px solid ${active ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}`,
                        color: active ? 'var(--purple)' : 'rgba(245,242,236,0.45)',
                        padding: '0.45rem 1rem',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        letterSpacing: '0.06em',
                        fontFamily: 'var(--font-inter)',
                        cursor: savingWeekly ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Specific days off */}
            <section>
              <p style={sectionLabelStyle}>Unavailable Dates</p>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Block out specific dates you're not available — no sessions can be booked with you on these days,
                even within your normal opening hours.
              </p>

              <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <input type="date" value={newDayOff} min={todayStr()}
                  onChange={e => setNewDayOff(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={handleAddDayOff} disabled={busyDay === newDayOff} style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(0,160,152,0.4)',
                  color: 'var(--teal)',
                  padding: '0 1.5rem',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: busyDay === newDayOff ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-inter)',
                  whiteSpace: 'nowrap',
                }}>+ Add</button>
              </div>

              {daysOff.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.25)' }}>
                  No days off set.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {daysOff.map(d => (
                    <div key={d} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px',
                      padding: '0.7rem 1rem', backgroundColor: 'rgba(255,255,255,0.02)',
                    }}>
                      <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'var(--offwhite)' }}>{formatDayOff(d)}</span>
                      <button type="button" onClick={() => handleRemoveDayOff(d)} disabled={busyDay === d} style={{
                        background: 'transparent', border: 'none', color: 'rgba(228,51,41,0.7)',
                        cursor: busyDay === d ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-inter)',
                      }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.25)', lineHeight: 1.6, marginTop: '-1.5rem' }}>
              Changes here only take effect on campaigns the next time they're saved in D&amp;D Campaigns — ask an
              admin to re-open and re-save any campaign you're assigned to after changing your hours or days off.
            </p>

            {/* Upcoming reservations */}
            <section>
              <p style={sectionLabelStyle}>Your Upcoming Reservations</p>
              {loadingUpcoming ? (
                <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)', fontSize: '0.82rem' }}>Loading…</p>
              ) : upcoming.length === 0 ? (
                <div style={{
                  border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px',
                  padding: '2.5rem 1.5rem', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem',
                }}>
                  <FontAwesomeIcon icon={faCalendarDay} style={{ width: '26px', color: 'rgba(245,242,236,0.15)' }} />
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)' }}>
                    No upcoming sessions
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {upcoming.map(r => {
                    const p = profiles.get(r.userId)
                    const partySize = 1 + r.participants.length + r.participantPhones.length
                    return (
                      <div key={r.id} style={{
                        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px',
                        padding: '1rem 1.2rem', backgroundColor: 'rgba(255,255,255,0.02)',
                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.95rem', color: 'var(--offwhite)' }}>{r.campaignTitle}</p>
                          <span style={{
                            fontSize: '0.62rem', padding: '0.2rem 0.6rem', borderRadius: '2px',
                            backgroundColor: `${STATUS_COLORS[r.status]}25`, color: STATUS_COLORS[r.status],
                            fontFamily: 'var(--font-inter)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                          }}>{r.status}</span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.55)' }}>
                          {formatDateTime(r.startAt)} · 📍 {r.location}
                        </p>
                        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.76rem', color: 'rgba(245,242,236,0.4)' }}>
                          {p?.displayName ?? '…'} · {partySize} {partySize === 1 ? 'person' : 'people'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
