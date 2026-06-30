'use client'

import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, setDoc,
  arrayRemove, increment, serverTimestamp, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// Adding a registered customer as a participant on a D&D session or event
// reservation, or to a Looking-for-Players party (app/lib/dndGroups.ts), is,
// functionally, the same kind of "the other party has to confirm" situation
// as a friend request — they shouldn't just show up on someone else's
// booking or party with no say. Phone-number participants have no account
// to ask, so they never get an invite; only uid-based participants do.

export type ReservationType = 'dnd' | 'event' | 'lfp'

export interface ParticipantInvite {
  id: string
  reservationType: ReservationType
  reservationId: string
  reservationLabel: string
  reservationDate: string
  // Only set (and only needed) for reservationType 'lfp' — acceptInvite
  // needs campaignId to build the accepting customer's own lfpEntries doc
  // id, and location to carry the party's branch onto that same doc.
  campaignId?: string
  location?: string
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
  campaignId?: string
}): Promise<void> {
  await Promise.all(input.participants.map(p => addDoc(collection(db, 'participantInvites'), {
    reservationType: input.reservationType,
    reservationId: input.reservationId,
    reservationLabel: input.reservationLabel,
    reservationDate: input.reservationDate,
    ...(input.campaignId ? { campaignId: input.campaignId } : {}),
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

// Every 'lfp' invite this customer has sent out as a party leader,
// regardless of status — used to compute "X of Y responded" for a forming
// party, since pending/accepted/declined all matter for that count.
export function useSentLfpInvites(leaderUid: string | null) {
  const [invites, setInvites] = useState<ParticipantInvite[]>([])

  useEffect(() => {
    if (!leaderUid) { setInvites([]); return }
    const q = query(
      collection(db, 'participantInvites'),
      where('inviterUid', '==', leaderUid),
      where('reservationType', '==', 'lfp')
    )
    const unsub = onSnapshot(q, snap => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as ParticipantInvite)))
    }, err => console.error('[useSentLfpInvites] participantInvites listener failed:', err))
    return unsub
  }, [leaderUid])

  return invites
}

// 'lfp' also creates the accepting customer's own lfpEntries doc, pointing
// at the leader's group — firestore.rules lets a customer create that doc
// for themselves as long as the referenced group already exists, which it
// does (the leader created it when they started the party). Nothing else
// about the group needs touching here; the leader's own client finalizes
// it (flips 'forming' -> 'confirmed') once every invite they sent has been
// resolved — see maybeFinalizeParty in app/lib/dndGroups.ts.
export async function acceptInvite(invite: ParticipantInvite): Promise<void> {
  if (invite.reservationType === 'lfp' && invite.campaignId) {
    await setDoc(doc(db, 'lfpEntries', `${invite.campaignId}_${invite.inviteeUid}`), {
      campaignId: invite.campaignId,
      campaignTitle: invite.reservationLabel,
      location: invite.location ?? '',
      userId: invite.inviteeUid,
      userName: invite.inviteeName,
      status: 'grouped',
      groupId: invite.reservationId,
      createdAt: serverTimestamp(),
    })
  }
  await updateDoc(doc(db, 'participantInvites', invite.id), { status: 'accepted' })
}

// Declining a 'dnd'/'event' invite drops the invitee from the
// reservation's participant list (the reservation itself continues for
// everyone else) — `arrayRemove` needs an exact match, which works here
// because the invite snapshotted the same {uid, name} pair that was
// written onto the reservation's `participants` array at booking time.
// Event reservations also store a separate `partySize` number (D&D ones
// compute it on the fly), so that needs an explicit decrement to avoid
// going stale. Declining an 'lfp' invite needs nothing beyond flipping the
// invite itself — there's no entry to remove, since accepting is the only
// thing that ever creates one.
export async function declineInvite(invite: ParticipantInvite): Promise<void> {
  if (invite.reservationType === 'lfp') {
    await updateDoc(doc(db, 'participantInvites', invite.id), { status: 'declined' })
    return
  }
  const collectionName = invite.reservationType === 'dnd' ? 'dndReservations' : 'eventReservations'
  await updateDoc(doc(db, collectionName, invite.reservationId), {
    participants: arrayRemove({ uid: invite.inviteeUid, name: invite.inviteeName }),
    ...(invite.reservationType === 'event' ? { partySize: increment(-1) } : {}),
  })
  await updateDoc(doc(db, 'participantInvites', invite.id), { status: 'declined' })
}
