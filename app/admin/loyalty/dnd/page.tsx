'use client'

import { useEffect, useState } from 'react'
import { useRequireRole, SECTION_ACCESS } from '../../../lib/adminAuth'
import { createDndSessionTransaction, DND_XP_PER_PERSON, DND_COINS_PER_PERSON } from '../../../lib/loyalty'
import { BRANCHES, resolveBranchName } from '../../../lib/branches'
import { type DirectoryUser } from '../../../lib/friends'
import AttendeeSearch from '../../../components/admin/AttendeeSearch'

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

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface SubmissionSummary {
  branchId: string
  sessionDate: string
  campaignName: string
  attendeeNames: string[]
}

const inputStyle = {
  width: '100%',
  backgroundColor: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F2EC',
  padding: '0.8rem 1rem',
  borderRadius: '4px',
  fontSize: '0.85rem',
  outline: 'none',
  fontFamily: 'var(--font-inter)',
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

const errorStyle = {
  fontSize: '0.75rem',
  color: 'var(--red)',
  fontFamily: 'var(--font-inter)',
  marginTop: '0.4rem',
}

export default function LoyaltyDndPage() {
  const { checking, user } = useRequireRole(SECTION_ACCESS.loyaltyDnd)
  const isMobile = useIsMobile()

  const [branchId, setBranchId]       = useState<string>(BRANCHES[0])
  const [sessionDate, setSessionDate] = useState<string>(today())
  const [campaignName, setCampaignName] = useState('')
  const [attendees, setAttendees]     = useState<DirectoryUser[]>([])
  const [submitting, setSubmitting]   = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [result, setResult]           = useState<SubmissionSummary | null>(null)

  if (checking) return null

  function addAttendee(u: DirectoryUser) {
    setAttendees(prev => [...prev, u])
  }
  function removeAttendee(uid: string) {
    setAttendees(prev => prev.filter(a => a.uid !== uid))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!sessionDate) next.sessionDate = 'Session date is required.'
    if (attendees.length === 0) next.attendees = 'Add at least one attendee.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !validate()) return
    setSubmitting(true)
    try {
      await createDndSessionTransaction({
        submittedBy: user.uid,
        branchId,
        sessionDate,
        campaignName,
        attendeeUids: attendees.map(a => a.uid),
      })
      setResult({
        branchId,
        sessionDate,
        campaignName: campaignName.trim(),
        attendeeNames: attendees.map(a => a.displayName),
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setBranchId(BRANCHES[0])
    setSessionDate(today())
    setCampaignName('')
    setAttendees([])
    setErrors({})
    setResult(null)
  }

  const canSubmit = !!sessionDate && attendees.length > 0 && !submitting

  if (result) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: isMobile ? '1.6rem' : '2rem', color: 'var(--offwhite)', marginBottom: '0.5rem' }}>
            Session submitted for manager approval
          </h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.5)', marginBottom: '2rem' }}>
            Attendees will receive their XP and OB Coins once a manager approves it.
          </p>

          <div style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
            textAlign: 'left',
            marginBottom: '2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.4)' }}>Branch</span>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)' }}>{resolveBranchName(result.branchId)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.4)' }}>Session Date</span>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)' }}>{result.sessionDate}</span>
            </div>
            {result.campaignName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.4)' }}>Campaign</span>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)' }}>{result.campaignName}</span>
              </div>
            )}
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.4)', marginBottom: '0.5rem' }}>
                Attendees ({result.attendeeNames.length})
              </p>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)' }}>
                {result.attendeeNames.join(', ')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <button onClick={handleReset} style={{
              width: '100%',
              backgroundColor: 'var(--purple)',
              color: '#fff',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-inter)',
              cursor: 'pointer',
            }}>Submit Another Session</button>
            <a href="/admin" style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>← Back to Dashboard</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <a href="/admin" style={{
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)',
          textDecoration: 'none',
          fontFamily: 'var(--font-inter)',
          marginBottom: '0.5rem',
          display: 'block',
        }}>← Back to Dashboard</a>

        <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: isMobile ? '1.6rem' : '2rem', color: 'var(--offwhite)', marginBottom: '0.5rem' }}>
          D&amp;D Session Attendance
        </h1>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.4)', marginBottom: '2rem' }}>
          Log who attended your session to send them for manager approval.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div>
            <label style={labelStyle}>Branch</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} style={{ ...inputStyle, color: '#F5F2EC', backgroundColor: '#1a1a1a' }}>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Session Date</label>
            <input
              type="date"
              value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
              style={inputStyle}
            />
            {errors.sessionDate && <p style={errorStyle}>{errors.sessionDate}</p>}
          </div>

          <div>
            <label style={labelStyle}>Campaign Name (optional)</label>
            <input
              type="text"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="e.g. The Lost Mines of Phandelver"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Attendees</label>
            <AttendeeSearch
              selected={attendees}
              onAdd={addAttendee}
              onRemove={removeAttendee}
              currentUid={user?.uid ?? ''}
              isMobile={isMobile}
            />
            {errors.attendees && <p style={errorStyle}>{errors.attendees}</p>}
          </div>

          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'var(--teal)' }}>
            Each attendee will receive {DND_XP_PER_PERSON} XP and {DND_COINS_PER_PERSON} OB Coins pending manager approval
          </p>

          <button type="submit" disabled={!canSubmit} style={{
            width: '100%',
            backgroundColor: 'var(--purple)',
            color: '#fff',
            border: 'none',
            padding: '1rem',
            borderRadius: '4px',
            fontSize: '0.82rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-inter)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.5,
          }}>
            {submitting ? 'Submitting…' : 'Submit Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
