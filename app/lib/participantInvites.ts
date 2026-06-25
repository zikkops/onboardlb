'use client'

import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc,
  arrayRemove, increment, serverTimestamp, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// Adding a registered customer as a participant on a D&D session or event
// reservation is, functionally, the same kind of "the other party has to
// confirm" situation as a friend request — they shouldn't just show up on
// someone else's booking with no say. Phone-number participants have no
// account to ask, so they never get an invite; only uid-based participants do.

export type ReservationType = 'dnd' | 'event'

export interface ParticipantInvite {
  id: string
  reservationType: ReservationType
  reservationId: string
  reservationLabel: string
  reservationDate: string
  inviterUid: string
  inviterName: string
  inviteeUid: string
  inviteeName: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: Timestamp | null
}

// Called by the booking flow right after the reservation itself is created
// — one invite per uid-based participant. Best-effort, separate from the
// booking transaction: an invite failing to write shouldn't undo a booking
// that already locked a slot (D&D) or passed capacity validation (events).
export async function createParticipantInvites(input: {
  reservationType: ReservationType
  reservationId: string
  reservationLabel: string
  reservationDate: string
  inviterUid: string
  inviterName: string
  participants: { uid: string; name: string }[]
}): Promise<void> {
  await Promise.all(input.participants.map(p => addDoc(collection(db, 'participantInvites'), {
    reservationType: input.reservationType,
    reservationId: input.reservationId,
    reservationLabel: input.reservationLabel,
    reservationDate: input.reservationDate,
    inviterUid: input.inviterUid,
    inviterName: input.inviterName,
    inviteeUid: p.uid,
    inviteeName: p.name,
    status: 'pending',
    createdAt: serverTimestamp(),
  })))
}

// Pending invites for the signed-in customer — shown on their profile.
export function usePendingInvites(uid: string | null) {
  const [invites, setInvites] = useState<ParticipantInvite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setInvites([]); setLoading(false); return }
    setLoading(true)
    const q = query(
      collection(db, 'participantInvites'),
      where('inviteeUid', '==', uid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as ParticipantInvite)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { invites, loading }
}

export async function acceptInvite(invite: ParticipantInvite): Promise<void> {
  await updateDoc(doc(db, 'participantInvites', invite.id), { status: 'accepted' })
}

// Declining drops the invitee from the reservation's participant list (the
// reservation itself continues for everyone else) — `arrayRemove` needs an
// exact match, which works here because the invite snapshotted the same
// {uid, name} pair that was written onto the reservation's `participants`
// array at booking time. Event reservations also store a separate
// `partySize` number (D&D ones compute it on the fly), so that needs an
// explicit decrement to avoid going stale.
export async function declineInvite(invite: ParticipantInvite): Promise<void> {
  const collectionName = invite.reservationType === 'dnd' ? 'dndReservations' : 'eventReservations'
  await updateDoc(doc(db, collectionName, invite.reservationId), {
    participants: arrayRemove({ uid: invite.inviteeUid, name: invite.inviteeName }),
    ...(invite.reservationType === 'event' ? { partySize: increment(-1) } : {}),
  })
  await updateDoc(doc(db, 'participantInvites', invite.id), { status: 'declined' })
}
