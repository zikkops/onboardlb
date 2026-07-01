'use client'

import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, getDocs, addDoc,
  updateDoc, writeBatch, serverTimestamp, documentId, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { getLevelFromXP } from './levelConfig'
import { logCreate, logUpdate } from './activityLog'

// Mirrors the shape created by the customer submit-check flow
// (app/(customer)/customer/submit-check/page.tsx) and read on the profile
// page — xpAmount/coinsAmount are already the per-person share, computed at
// submission time, so approval just adds them directly to each user's total.
export interface Transaction {
  id: string
  type: 'check' | 'event' | 'dnd'
  userId: string[]
  xpAmount: number
  coinsAmount: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  submittedBy: string
  approvedBy?: string | null
  rejectedBy?: string | null
  rejectionReason?: string | null
  checkPhotoUrl?: string
  checkNumber?: string
  branchId: string
  totalAmount?: number
  splitCount?: number
  // "event" type, written by the Event Attendance submission panel.
  eventName?: string
  eventDate?: string
  // "dnd" type, written by the D&D Session Attendance submission panel.
  sessionDate?: string
  campaignName?: string | null
  createdAt: Timestamp | null
}

// Fixed per-person awards for staff-logged attendance — flat rates, unlike
// check submissions where xp/coins scale with the amount spent.
export const DND_XP_PER_PERSON = 400
export const DND_COINS_PER_PERSON = 75
export const EVENT_XP_PER_PERSON = 250
export const EVENT_COINS_PER_PERSON = 50

export interface ResolvedProfile {
  displayName: string
  avatarUrl: string
}

// Live pending queue. Pass an array of branch names to scope to those
// branches (managers, who may now have more than one assigned), or 'all'
// for unfiltered oversight (admins). The caller must memoize any array it
// passes in — a fresh array reference on every render would re-subscribe
// this effect in a loop.
export function usePendingTransactions(branchFilter: string[] | 'all' | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!branchFilter || (Array.isArray(branchFilter) && branchFilter.length === 0)) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const base = collection(db, 'transactions')
    const q = branchFilter === 'all'
      ? query(base, where('status', '==', 'pending'), orderBy('createdAt', 'asc'))
      : query(base, where('branchId', 'in', branchFilter), where('status', '==', 'pending'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))
      setLoading(false)
    })
    return unsub
  }, [branchFilter])

  return { transactions, loading }
}

// Resolves customer profiles (users/{uid}) in as few reads as possible —
// Firestore's `in` operator covers up to 30 ids per query, comfortably
// enough for even a full 10-person split.
export async function resolveUserProfiles(uids: string[]): Promise<Map<string, ResolvedProfile>> {
  const unique = Array.from(new Set(uids.filter(Boolean)))
  const map = new Map<string, ResolvedProfile>()
  if (unique.length === 0) return map

  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30)
    const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
    snap.docs.forEach(d => {
      const data = d.data() as { displayName?: string; username?: string; avatarUrl?: string }
      map.set(d.id, { displayName: data.displayName || data.username || 'Unnamed', avatarUrl: data.avatarUrl || '' })
    })
  }
  return map
}

// Blocks re-submitting a check that's already been credited, or
// re-submitting your own still-pending one — the two cases a customer's
// own client can actually see. Firestore rules only let a customer read
// *another* customer's transaction once it's 'approved' (or if they're
// staff), so a different customer's still-pending claim on the same check
// number genuinely can't be checked from here; that gap is covered by the
// duplicate flag on the staff approval queue instead (app/admin/loyalty/
// approvals/page.tsx), which has full read access to every pending one.
export async function checkNumberAlreadyUsed(branchId: string, checkNumber: string, ownUid: string): Promise<boolean> {
  const trimmed = checkNumber.trim()
  if (!trimmed) return false

  const approvedQuery = query(
    collection(db, 'transactions'),
    where('type', '==', 'check'),
    where('branchId', '==', branchId),
    where('checkNumber', '==', trimmed),
    where('status', '==', 'approved'),
    limit(1)
  )
  const ownPendingQuery = query(
    collection(db, 'transactions'),
    where('type', '==', 'check'),
    where('branchId', '==', branchId),
    where('checkNumber', '==', trimmed),
    where('userId', 'array-contains', ownUid),
    where('status', '==', 'pending'),
    limit(1)
  )
  const [approvedSnap, ownPendingSnap] = await Promise.all([getDocs(approvedQuery), getDocs(ownPendingQuery)])
  return !approvedSnap.empty || !ownPendingSnap.empty
}

export async function resolveStaffEmails(uids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(uids.filter(Boolean)))
  const map = new Map<string, string>()
  if (unique.length === 0) return map

  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30)
    const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
    snap.docs.forEach(d => {
      const data = d.data() as { email?: string }
      map.set(d.id, data.email || 'Unknown')
    })
  }
  return map
}

function txLabel(tx: Transaction): string {
  if (tx.type === 'check') return `Check #${tx.checkNumber || tx.id} — $${(tx.totalAmount ?? 0).toFixed(2)}`
  if (tx.type === 'event') return `Event — ${tx.eventName || tx.id}`
  return `D&D Session — ${tx.sessionDate || tx.id}`
}

// Reads (current xp/obCoins per user) happen before the batch is built —
// Firestore batches are write-only, so this isn't itself atomic with the
// writes, but the writes (every user update + the transaction status flip +
// the log entry) commit together as one unit, which is what the batch
// guarantees.
export async function approveTransaction(tx: Transaction, managerUid: string): Promise<void> {
  const batch = writeBatch(db)

  const userSnaps = await Promise.all(tx.userId.map(uid => getDoc(doc(db, 'users', uid))))

  userSnaps.forEach((snap, i) => {
    if (!snap.exists()) return
    const uid = tx.userId[i]
    const data = snap.data() as { xp?: number; obCoins?: number }
    const newXp = (data.xp ?? 0) + tx.xpAmount
    const newCoins = (data.obCoins ?? 0) + tx.coinsAmount
    const { level, levelTitle } = getLevelFromXP(newXp)
    batch.update(doc(db, 'users', uid), { xp: newXp, obCoins: newCoins, level, levelTitle })
  })

  batch.update(doc(db, 'transactions', tx.id), {
    status: 'approved',
    approvedBy: managerUid,
    approvedAt: serverTimestamp(),
  })

  batch.set(doc(collection(db, 'transactionLog')), {
    transactionId: tx.id,
    action: 'approved',
    performedBy: managerUid,
    branchId: tx.branchId,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
  await logUpdate('Loyalty Management', txLabel(tx), { status: 'pending' }, { status: 'approved' })
}

export async function rejectTransaction(tx: Transaction, managerUid: string, reason: string): Promise<void> {
  const batch = writeBatch(db)

  batch.update(doc(db, 'transactions', tx.id), {
    status: 'rejected',
    rejectedBy: managerUid,
    rejectedAt: serverTimestamp(),
    rejectionReason: reason,
  })

  batch.set(doc(collection(db, 'transactionLog')), {
    transactionId: tx.id,
    action: 'rejected',
    performedBy: managerUid,
    branchId: tx.branchId,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
  await logUpdate('Loyalty Management', txLabel(tx), { status: 'pending' }, { status: 'rejected', rejectionReason: reason })
}

// Customer-initiated — withdrawing their own submission before staff act on
// it (e.g. they forgot to add a friend to the split, or mistyped something).
// Not logged via logUpdate: activityLog is staff-write-only (see
// firestore.rules), and this isn't a staff action — the transaction's own
// status change is the record. Only the original submitter may cancel, not
// every person tagged in a split.
export async function cancelTransaction(tx: Transaction): Promise<void> {
  await updateDoc(doc(db, 'transactions', tx.id), { status: 'cancelled' })
}

export async function createDndSessionTransaction(input: {
  submittedBy: string
  branchId: string
  sessionDate: string
  campaignName: string
  attendeeUids: string[]
}): Promise<void> {
  await addDoc(collection(db, 'transactions'), {
    type: 'dnd',
    userId: input.attendeeUids,
    xpAmount: DND_XP_PER_PERSON,
    coinsAmount: DND_COINS_PER_PERSON,
    status: 'pending',
    submittedBy: input.submittedBy,
    approvedBy: null,
    branchId: input.branchId,
    sessionDate: input.sessionDate,
    campaignName: input.campaignName.trim() || null,
    splitCount: input.attendeeUids.length,
    createdAt: serverTimestamp(),
  })
  await logCreate('Loyalty Submission', `D&D Session — ${input.sessionDate} (${input.attendeeUids.length} attendees)`, {
    branchId: input.branchId,
    sessionDate: input.sessionDate,
    campaignName: input.campaignName.trim() || null,
    attendees: input.attendeeUids.length,
    xpAmount: DND_XP_PER_PERSON,
    coinsAmount: DND_COINS_PER_PERSON,
  })
}

export async function createEventAttendanceTransaction(input: {
  submittedBy: string
  branchId: string
  eventDate: string
  eventName: string
  attendeeUids: string[]
}): Promise<void> {
  await addDoc(collection(db, 'transactions'), {
    type: 'event',
    userId: input.attendeeUids,
    xpAmount: EVENT_XP_PER_PERSON,
    coinsAmount: EVENT_COINS_PER_PERSON,
    status: 'pending',
    submittedBy: input.submittedBy,
    approvedBy: null,
    branchId: input.branchId,
    eventDate: input.eventDate,
    eventName: input.eventName.trim(),
    splitCount: input.attendeeUids.length,
    createdAt: serverTimestamp(),
  })
  await logCreate('Loyalty Submission', `Event — ${input.eventName.trim()} (${input.attendeeUids.length} attendees)`, {
    branchId: input.branchId,
    eventDate: input.eventDate,
    attendees: input.attendeeUids.length,
    xpAmount: EVENT_XP_PER_PERSON,
    coinsAmount: EVENT_COINS_PER_PERSON,
  })
}
