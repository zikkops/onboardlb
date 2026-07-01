'use client'

import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, onSnapshot, doc, getDocs, updateDoc,
  writeBatch, runTransaction, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { logUpdate } from './activityLog'
import { createParticipantInvites } from './participantInvites'
import { createStatusNotification } from './notifications'

// Every session is a fixed length — no per-campaign duration field. The
// buffer is a pure backend conflict-blocking detail (extends how long a
// booked DM stays unavailable); it's never shown as a slot of its own.
export const SESSION_DURATION_MINUTES = 180
export const DM_RESET_BUFFER_MINUTES = 30
const BUCKET_MINUTES = 30

// A DM's own "openings" — the earliest and latest a session can *start* —
// settable per DM in /admin/dnd/availability. These are the defaults used
// until a DM sets their own (and the fallback for older campaigns whose
// dmOpeningStart/dmOpeningEnd snapshot predates this feature).
export const DEFAULT_OPENING_START = '16:30'
export const DEFAULT_OPENING_END = '21:30'

export interface Reservation {
  id: string
  campaignId: string
  campaignTitle: string
  location: string
  dmUid: string
  userId: string
  userName: string
  participants: { uid: string; name: string }[]
  participantPhones: string[]
  startAt: Timestamp
  endAt: Timestamp
  blockedUntil: Timestamp
  status: 'pending' | 'approved' | 'rejected'
  requestedBy: string
  createdAt: Timestamp | null
  approvedBy?: string | null
  approvedAt?: Timestamp | null
  rejectedBy?: string | null
  rejectedAt?: Timestamp | null
  rejectionReason?: string | null
}

// Deterministic — same (dmUid, 30-minute bucket) always produces the same
// doc id, so "is this bucket free" is a plain document read. This is what
// makes the booking transaction below race-safe: Firestore transactions can
// only re-read specific document references, not run a query, so a lock
// document per bucket is the only race-safe option available client-side.
function dateKey(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
function bucketIndex(d: Date): number {
  return Math.floor((d.getHours() * 60 + d.getMinutes()) / BUCKET_MINUTES)
}
function lockDocId(dmUid: string, d: Date): string {
  return `${dmUid}__${dateKey(d)}_${bucketIndex(d)}`
}
function bucketStartTimesInRange(start: Date, end: Date): Date[] {
  const starts: Date[] = []
  let cur = new Date(start)
  while (cur < end) {
    starts.push(new Date(cur))
    cur = new Date(cur.getTime() + BUCKET_MINUTES * 60000)
  }
  return starts
}

// All possible session start times for one day, regardless of availability —
// just the DM's opening window itself, independent of their bookings.
// `openingEnd` is the latest a session can *start*, not a closing time —
// the session can run past it (e.g. opening until 21:30 plus a 3-hour
// session ends at 00:30).
function allStartTimesForDate(dateStr: string, openingStart: string, openingEnd: string): Date[] {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [startH, startM] = openingStart.split(':').map(Number)
  const [endH, endM] = openingEnd.split(':').map(Number)
  const latestStart = new Date(y, m - 1, d, endH, endM, 0, 0)
  const times: Date[] = []
  let cur = new Date(y, m - 1, d, startH, startM, 0, 0)
  while (cur <= latestStart) {
    times.push(new Date(cur))
    cur = new Date(cur.getTime() + BUCKET_MINUTES * 60000)
  }
  return times
}

// Live-recomputes whenever the selected date changes — reads only that one
// DM's lock docs for that one day (scoped by the dateKey prefix baked into
// each lock id), so this stays cheap even once a DM has many past bookings.
// `daysOff` is a list of "YYYY-MM-DD" dates the DM has blocked out entirely
// (vacation, one-off day off, etc.) — a day on this list short-circuits to
// no available times regardless of opening hours or existing bookings.
export function useAvailableStartTimes(
  dmUid: string | null,
  dateStr: string | null,
  openingStart: string = DEFAULT_OPENING_START,
  openingEnd: string = DEFAULT_OPENING_END,
  daysOff: string[] = []
) {
  const [times, setTimes] = useState<Date[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!dmUid || !dateStr) { setTimes([]); return }
    if (daysOff.includes(dateStr)) { setTimes([]); setLoading(false); return }
    setLoading(true)
    const candidates = allStartTimesForDate(dateStr, openingStart, openingEnd)
    const day = dateKey(candidates[0] ?? new Date(dateStr))

    getDocs(query(collection(db, 'dndDmLocks'), where('dmUid', '==', dmUid), where('dateKey', '==', day)))
      .then(snap => {
        const takenBuckets = new Set(snap.docs.map(d => d.id))
        const available = candidates.filter(start => {
          const sessionEnd = new Date(start.getTime() + SESSION_DURATION_MINUTES * 60000)
          return bucketStartTimesInRange(start, sessionEnd).every(b => !takenBuckets.has(lockDocId(dmUid, b)))
        })
        setTimes(available)
        setLoading(false)
      })
  // Depends on a stringified key, not the `daysOff` array itself — a fresh
  // array reference (e.g. from the `= []` default, re-created on every call
  // where the caller passes nothing) would otherwise re-subscribe this
  // effect on every render even when the actual contents haven't changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmUid, dateStr, openingStart, openingEnd, daysOff.join(',')])

  return { times, loading }
}

export async function createReservationRequest(input: {
  userId: string
  userName: string
  campaignId: string
  campaignTitle: string
  location: string
  dmUid: string
  startAt: Date
  participants: { uid: string; name: string }[]
  participantPhones: string[]
}): Promise<void> {
  const endAt = new Date(input.startAt.getTime() + SESSION_DURATION_MINUTES * 60000)
  const blockedUntil = new Date(endAt.getTime() + DM_RESET_BUFFER_MINUTES * 60000)
  const lockBuckets = bucketStartTimesInRange(input.startAt, blockedUntil)
  const reservationRef = doc(collection(db, 'dndReservations'))

  await runTransaction(db, async tx => {
    const lockRefs = lockBuckets.map(b => doc(db, 'dndDmLocks', lockDocId(input.dmUid, b)))
    const snaps = await Promise.all(lockRefs.map(ref => tx.get(ref)))
    if (snaps.some(s => s.exists())) throw new Error('slot-taken')

    // Reservation is written before the locks that reference it — the lock
    // create rule (firestore.rules) looks this doc up via get() to confirm
    // each lock is backed by a real, owned reservation, and get() within a
    // transaction only sees writes that happened earlier in that same
    // transaction.
    tx.set(reservationRef, {
      campaignId: input.campaignId,
      campaignTitle: input.campaignTitle,
      location: input.location,
      dmUid: input.dmUid,
      userId: input.userId,
      userName: input.userName,
      participants: input.participants,
      participantPhones: input.participantPhones,
      startAt: Timestamp.fromDate(input.startAt),
      endAt: Timestamp.fromDate(endAt),
      blockedUntil: Timestamp.fromDate(blockedUntil),
      status: 'pending',
      requestedBy: input.userId,
      createdAt: serverTimestamp(),
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    })

    lockRefs.forEach((ref, i) => tx.set(ref, {
      dmUid: input.dmUid,
      dateKey: dateKey(lockBuckets[i]),
      bucketStart: Timestamp.fromDate(lockBuckets[i]),
      reservationId: reservationRef.id,
      createdAt: serverTimestamp(),
    }))
  })

  if (input.participants.length > 0) {
    await createParticipantInvites({
      reservationType: 'dnd',
      reservationId: reservationRef.id,
      reservationLabel: input.campaignTitle,
      reservationDate: input.startAt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
      inviterUid: input.userId,
      inviterName: input.userName,
      participants: input.participants,
    })
  }
}

// Customer's own reservations, newest first.
export function useUserReservations(uid: string | null) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setReservations([]); setLoading(false); return }
    setLoading(true)
    const q = query(collection(db, 'dndReservations'), where('userId', '==', uid), orderBy('startAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { reservations, loading }
}

// Manager/admin queue — every pending reservation. A DM's queue — only the
// ones where they're the assigned DM. Pass 'all' or a specific dmUid.
export function usePendingReservations(scope: 'all' | string | null) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!scope) { setReservations([]); setLoading(false); return }
    setLoading(true)
    const base = collection(db, 'dndReservations')
    const q = scope === 'all'
      ? query(base, where('status', '==', 'pending'), orderBy('startAt', 'asc'))
      : query(base, where('dmUid', '==', scope), where('status', '==', 'pending'), orderBy('startAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)))
      setLoading(false)
    })
    return unsub
  }, [scope])

  return { reservations, loading }
}

// A DM's (or, for admin/manager, everyone's) schedule — pending and
// approved sessions still in the future, oldest first. Unlike the pending
// queue above, approved sessions stay visible here even after they've been
// confirmed — this is the only place a DM can see their own upcoming
// schedule once a session leaves the approval queue.
export function useUpcomingReservations(scope: 'all' | string | null) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!scope) { setReservations([]); setLoading(false); return }
    setLoading(true)
    const base = collection(db, 'dndReservations')
    const now = Timestamp.now()
    const q = scope === 'all'
      ? query(base, where('status', 'in', ['pending', 'approved']), where('startAt', '>=', now), orderBy('startAt', 'asc'))
      : query(base, where('dmUid', '==', scope), where('status', 'in', ['pending', 'approved']), where('startAt', '>=', now), orderBy('startAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)))
      setLoading(false)
    })
    return unsub
  }, [scope])

  return { reservations, loading }
}

export async function approveReservation(reservation: Reservation, staffUid: string): Promise<void> {
  await updateDoc(doc(db, 'dndReservations', reservation.id), {
    status: 'approved',
    approvedBy: staffUid,
    approvedAt: serverTimestamp(),
  })
  createStatusNotification({
    uid: reservation.userId,
    type: 'reservation_approved',
    reservationType: 'dnd',
    reservationId: reservation.id,
    label: reservation.campaignTitle,
    dateLabel: reservation.startAt.toDate().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
  }).catch(err => console.error('[approveReservation] notification write failed:', err))

  await logUpdate(
    'D&D Reservation',
    `${reservation.campaignTitle} — ${reservation.location}`,
    { status: 'pending' },
    { status: 'approved' }
  )
}

// Rejecting frees the slot back up — the lock buckets are recomputed
// deterministically from dmUid/startAt (same formula used to create them)
// and deleted in the same batch as the status update.
export async function rejectReservation(reservation: Reservation, staffUid: string, reason: string): Promise<void> {
  const startAt = reservation.startAt.toDate()
  const blockedUntil = reservation.blockedUntil.toDate()
  const lockBuckets = bucketStartTimesInRange(startAt, blockedUntil)

  const batch = writeBatch(db)
  batch.update(doc(db, 'dndReservations', reservation.id), {
    status: 'rejected',
    rejectedBy: staffUid,
    rejectedAt: serverTimestamp(),
    rejectionReason: reason || null,
  })
  lockBuckets.forEach(b => batch.delete(doc(db, 'dndDmLocks', lockDocId(reservation.dmUid, b))))
  await batch.commit()
  createStatusNotification({
    uid: reservation.userId,
    type: 'reservation_rejected',
    reservationType: 'dnd',
    reservationId: reservation.id,
    label: reservation.campaignTitle,
    dateLabel: reservation.startAt.toDate().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
    rejectionReason: reason || null,
  }).catch(err => console.error('[rejectReservation] notification write failed:', err))

  await logUpdate(
    'D&D Reservation',
    `${reservation.campaignTitle} — ${reservation.location}`,
    { status: 'pending' },
    { status: 'rejected', rejectionReason: reason }
  )
}
