'use client'

import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, onSnapshot, doc, getDocs, setDoc, deleteDoc,
  addDoc, updateDoc, writeBatch, arrayUnion, arrayRemove, serverTimestamp, type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { logCreate, logUpdate, logDelete } from './activityLog'

// Looking-for-Players matchmaking — a customer expresses interest in a
// campaign with no date/time involved at all (that's dndReservations, a
// separate concept), and either staff sort interested customers into
// groups, or a customer starts a group themselves and invites friends
// into it directly (see startLfpParty below).

export interface LfpEntry {
  id: string
  campaignId: string
  campaignTitle: string
  // Which of the campaign's own branches (campaign.locations) this person
  // wants to play at — a campaign can run at more than one, and a group
  // only ever meets at one physical place, so this is what staff match on,
  // not just campaignId alone. Empty string on entries that predate this
  // field; treated as "unspecified" wherever it's matched against.
  location: string
  userId: string
  userName: string
  status: 'waiting' | 'grouped'
  groupId: string | null
  createdAt: Timestamp | null
}

export interface DndGroup {
  id: string
  campaignId: string
  campaignTitle: string
  location: string
  name: string
  memberUids: string[]
  members: { uid: string; name: string }[]
  // null + 'confirmed' for a staff-assembled group; set to the leader's
  // uid + 'forming' while a customer-started party is still collecting
  // invite responses, then 'confirmed' once resolved — see
  // maybeFinalizeParty.
  formedBy: string | null
  status: 'forming' | 'confirmed'
  // Staff-only toggle — once locked, the group is hidden from every
  // "add a new player" surface (waiting pool's + Add to…, Transfer to…,
  // + Merge into…) without otherwise touching its members. See
  // setGroupLocked below.
  locked: boolean
  createdBy: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

function lfpEntryId(campaignId: string, userId: string): string {
  return `${campaignId}_${userId}`
}

// Lenient on purpose — entries/groups created before branch-splitting was
// added have no location at all, so an empty string on either side is
// treated as "unspecified" rather than a hard mismatch.
export function sameLocation(a: string, b: string): boolean {
  return !a || !b || a === b
}

// Idempotent — re-joining (e.g. after refreshing the page) just overwrites
// the same doc with the same values, since the id is deterministic.
export async function joinLfp(input: {
  campaignId: string
  campaignTitle: string
  location: string
  userId: string
  userName: string
}): Promise<void> {
  await setDoc(doc(db, 'lfpEntries', lfpEntryId(input.campaignId, input.userId)), {
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle,
    location: input.location,
    userId: input.userId,
    userName: input.userName,
    status: 'waiting',
    groupId: null,
    createdAt: serverTimestamp(),
  })
}

// Only succeeds while still 'waiting' — firestore.rules rejects this once
// staff have placed the entry into a group, so the group's member list
// can't go out of sync with a customer leaving on their own.
export async function leaveLfp(entry: LfpEntry): Promise<void> {
  await deleteDoc(doc(db, 'lfpEntries', entry.id))
}

// A customer's own entries across every campaign they've queued for —
// drives the "you're waiting for X" / "you're grouped for Y" display on
// their profile.
export function useUserLfpEntries(uid: string | null) {
  const [entries, setEntries] = useState<LfpEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setEntries([]); setLoading(false); return }
    setLoading(true)
    const q = query(collection(db, 'lfpEntries'), where('userId', '==', uid))
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as LfpEntry)))
      setLoading(false)
    }, err => console.error('[useUserLfpEntries] lfpEntries listener failed:', err))
    return unsub
  }, [uid])

  return { entries, loading }
}

// Staff view — every entry for one campaign (or several at once, for the
// "All Campaigns" admin view — Firestore's 'in' caps at 30, comfortably
// above any realistic campaign count here), waiting and grouped alike;
// the admin page splits these into "pool" vs. per-group lists itself
// rather than needing a second query.
export function useLfpEntriesForCampaign(campaignId: string | string[] | null) {
  const [entries, setEntries] = useState<LfpEntry[]>([])
  const [loading, setLoading] = useState(true)
  const ids = Array.isArray(campaignId) ? campaignId.join(',') : campaignId

  useEffect(() => {
    if (!ids) { setEntries([]); setLoading(false); return }
    setLoading(true)
    const idList = ids.split(',')
    const q = idList.length === 1
      ? query(collection(db, 'lfpEntries'), where('campaignId', '==', idList[0]), orderBy('createdAt', 'asc'))
      : query(collection(db, 'lfpEntries'), where('campaignId', 'in', idList.slice(0, 30)), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as LfpEntry)))
      setLoading(false)
    }, err => console.error('[useLfpEntriesForCampaign] lfpEntries listener failed:', err))
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return { entries, loading }
}

export function useGroupsForCampaign(campaignId: string | string[] | null) {
  const [groups, setGroups] = useState<DndGroup[]>([])
  const [loading, setLoading] = useState(true)
  const ids = Array.isArray(campaignId) ? campaignId.join(',') : campaignId

  useEffect(() => {
    if (!ids) { setGroups([]); setLoading(false); return }
    setLoading(true)
    const idList = ids.split(',')
    // 'confirmed' only — a leader-formed party that's still 'forming'
    // isn't staff's to manage yet (its membership is still in flux while
    // invited friends respond). Once every invite resolves and it flips to
    // 'confirmed' (see maybeFinalizeParty), it shows up here exactly like
    // a staff-built group — same add/remove/transfer controls apply to
    // both, no distinction in the admin UI.
    const q = idList.length === 1
      ? query(collection(db, 'dndGroups'), where('campaignId', '==', idList[0]), where('status', '==', 'confirmed'), orderBy('createdAt', 'asc'))
      : query(collection(db, 'dndGroups'), where('campaignId', 'in', idList.slice(0, 30)), where('status', '==', 'confirmed'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as DndGroup)))
      setLoading(false)
    }, err => console.error('[useGroupsForCampaign] dndGroups listener failed:', err))
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return { groups, loading }
}

// A customer's own group(s) across every campaign — drives "your party"
// display on their profile (who else is in it).
export function useUserGroups(uid: string | null) {
  const [groups, setGroups] = useState<DndGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setGroups([]); setLoading(false); return }
    setLoading(true)
    const q = query(collection(db, 'dndGroups'), where('memberUids', 'array-contains', uid))
    const unsub = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as DndGroup)))
      setLoading(false)
    }, err => console.error('[useUserGroups] dndGroups listener failed:', err))
    return unsub
  }, [uid])

  return { groups, loading }
}

// Parties this customer started themselves that are still collecting
// invite responses — drives the "X of Y friends responded" progress
// display (and the speculative maybeFinalizeParty calls) on their profile.
export function useMyFormingParties(uid: string | null) {
  const [groups, setGroups] = useState<DndGroup[]>([])

  useEffect(() => {
    if (!uid) { setGroups([]); return }
    const q = query(collection(db, 'dndGroups'), where('formedBy', '==', uid), where('status', '==', 'forming'))
    const unsub = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as DndGroup)))
    }, err => console.error('[useMyFormingParties] dndGroups listener failed:', err))
    return unsub
  }, [uid])

  return groups
}

export async function createGroup(input: {
  campaignId: string
  campaignTitle: string
  location: string
  name: string
  staffUid: string
}): Promise<void> {
  await addDoc(collection(db, 'dndGroups'), {
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle,
    location: input.location,
    name: input.name.trim(),
    memberUids: [],
    members: [],
    formedBy: null,
    status: 'confirmed',
    locked: false,
    createdBy: input.staffUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logCreate('D&D Groups', `${input.campaignTitle} — ${input.name.trim()}`, {
    campaignId: input.campaignId,
  })
}

// A customer starts their own party and invites friends directly, rather
// than joining the anonymous waiting pool for staff to sort — the group
// exists immediately (so the leader can see it forming), but starts
// 'forming' with only the leader as a confirmed member; friends join by
// accepting the invite sent to them (acceptInvite's 'lfp' branch in
// app/lib/participantInvites.ts), and maybeFinalizeParty below promotes it
// to 'confirmed' once every invite is resolved.
export async function startLfpParty(input: {
  campaignId: string
  campaignTitle: string
  location: string
  leaderUid: string
  leaderName: string
  friends: { uid: string; name: string }[]
}): Promise<string> {
  const groupRef = doc(collection(db, 'dndGroups'))
  try {
    await setDoc(groupRef, {
      campaignId: input.campaignId,
      campaignTitle: input.campaignTitle,
      location: input.location,
      name: `${input.leaderName}'s Party`,
      memberUids: [input.leaderUid],
      members: [{ uid: input.leaderUid, name: input.leaderName }],
      formedBy: input.leaderUid,
      status: 'forming',
      locked: false,
      createdBy: input.leaderUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('[startLfpParty] step 1/3 — creating dndGroups doc failed:', err)
    throw err
  }
  try {
    await setDoc(doc(db, 'lfpEntries', lfpEntryId(input.campaignId, input.leaderUid)), {
      campaignId: input.campaignId,
      campaignTitle: input.campaignTitle,
      location: input.location,
      userId: input.leaderUid,
      userName: input.leaderName,
      status: 'grouped',
      groupId: groupRef.id,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('[startLfpParty] step 2/3 — creating leader lfpEntries doc failed:', err)
    throw err
  }
  if (input.friends.length > 0) {
    // Deterministic id (groupId_inviteeUid), not the auto-id
    // createParticipantInvites normally uses — firestore.rules needs to
    // look up "does an invite exist for (this group, this caller)" by a
    // known path when the invitee creates their own lfpEntries doc on
    // accept; it can't run an arbitrary query to find it.
    try {
      await Promise.all(input.friends.map(f => setDoc(doc(db, 'participantInvites', `${groupRef.id}_${f.uid}`), {
        reservationType: 'lfp',
        reservationId: groupRef.id,
        reservationLabel: input.campaignTitle,
        reservationDate: 'Looking for Players',
        campaignId: input.campaignId,
        location: input.location,
        inviterUid: input.leaderUid,
        inviterName: input.leaderName,
        inviteeUid: f.uid,
        inviteeName: f.name,
        status: 'pending',
        createdAt: serverTimestamp(),
      })))
    } catch (err) {
      console.error('[startLfpParty] step 3/3 — creating friend invites failed:', err)
      throw err
    }
  }
  return groupRef.id
}

// Safe to call speculatively any time the leader's own client has a
// forming party in view (e.g. every time its sent invites change) — a
// no-op unless every invite has actually been resolved. Declining just
// shrinks the roster rather than blocking confirmation forever: whoever
// actually has an lfpEntries doc for this group (the leader, plus anyone
// who accepted) becomes the final member list.
export async function maybeFinalizeParty(group: DndGroup): Promise<void> {
  if (group.status !== 'forming') return

  // Filtering on inviterUid (always the leader, i.e. this caller) rather
  // than just reservationId — firestore.rules' read access for
  // participantInvites is keyed on inviterUid/inviteeUid, neither of which
  // the query would otherwise constrain, so an unfiltered-by-those-fields
  // query gets rejected outright for a non-staff caller even though every
  // matching invite really was sent by them.
  const pendingSnap = await getDocs(query(
    collection(db, 'participantInvites'),
    where('reservationType', '==', 'lfp'),
    where('reservationId', '==', group.id),
    where('status', '==', 'pending'),
    where('inviterUid', '==', group.formedBy ?? '')
  ))
  if (!pendingSnap.empty) return

  // Same reasoning applies here — lfpEntries' read rule lets the group's
  // own leader (formedBy) read every entry pointing at that group, which
  // is exactly what this query's groupId filter pins down.
  const entriesSnap = await getDocs(query(collection(db, 'lfpEntries'), where('groupId', '==', group.id)))
  const members = entriesSnap.docs.map(d => {
    const data = d.data() as LfpEntry
    return { uid: data.userId, name: data.userName }
  })

  await updateDoc(doc(db, 'dndGroups', group.id), {
    status: 'confirmed',
    memberUids: members.map(m => m.uid),
    members,
    updatedAt: serverTimestamp(),
  })
}

// Moves a waiting entry into a group — updates both docs in one batch so
// they can't drift out of sync (entry says it's in group X, but group X's
// member list doesn't include it, or vice versa).
export async function addToGroup(entry: LfpEntry, group: DndGroup): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'lfpEntries', entry.id), { status: 'grouped', groupId: group.id })
  batch.update(doc(db, 'dndGroups', group.id), {
    memberUids: arrayUnion(entry.userId),
    members: arrayUnion({ uid: entry.userId, name: entry.userName }),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  await logUpdate('D&D Groups', `${group.campaignTitle} — ${group.name}`, { added: null }, { added: entry.userName })
}

// Drops a grouped entry back into the waiting pool.
export async function removeFromGroup(entry: LfpEntry, group: DndGroup): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'lfpEntries', entry.id), { status: 'waiting', groupId: null })
  batch.update(doc(db, 'dndGroups', group.id), {
    memberUids: arrayRemove(entry.userId),
    members: arrayRemove({ uid: entry.userId, name: entry.userName }),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  await logUpdate('D&D Groups', `${group.campaignTitle} — ${group.name}`, { removed: null }, { removed: entry.userName })
}

// Same campaign only in practice (the UI never offers a different
// campaign's group as a transfer target, since the entry's interest was
// only ever in its own campaign) — moves membership from one group to the
// other in a single batch.
export async function transferToGroup(entry: LfpEntry, fromGroup: DndGroup, toGroup: DndGroup): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'lfpEntries', entry.id), { groupId: toGroup.id })
  batch.update(doc(db, 'dndGroups', fromGroup.id), {
    memberUids: arrayRemove(entry.userId),
    members: arrayRemove({ uid: entry.userId, name: entry.userName }),
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'dndGroups', toGroup.id), {
    memberUids: arrayUnion(entry.userId),
    members: arrayUnion({ uid: entry.userId, name: entry.userName }),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  await logUpdate(
    'D&D Groups', `${entry.campaignTitle} — ${entry.userName}`,
    { group: fromGroup.name }, { group: toGroup.name }
  )
}

// Folds every member of `sourceGroup` into `targetGroup` (e.g. two small
// parties combining into one table) and removes the now-empty source —
// each member's own lfpEntries doc is repointed at the target group in the
// same batch, same as transferToGroup does for a single person.
export async function mergeGroups(sourceGroup: DndGroup, targetGroup: DndGroup): Promise<void> {
  const batch = writeBatch(db)
  sourceGroup.members.forEach(m => {
    batch.update(doc(db, 'lfpEntries', lfpEntryId(sourceGroup.campaignId, m.uid)), { groupId: targetGroup.id })
  })
  batch.update(doc(db, 'dndGroups', targetGroup.id), {
    memberUids: arrayUnion(...sourceGroup.memberUids),
    members: arrayUnion(...sourceGroup.members),
    updatedAt: serverTimestamp(),
  })
  batch.delete(doc(db, 'dndGroups', sourceGroup.id))
  await batch.commit()
  await logUpdate(
    'D&D Groups', `${sourceGroup.campaignTitle}`,
    { groups: [sourceGroup.name, targetGroup.name] }, { mergedInto: targetGroup.name }
  )
}

// Locking only hides a group from every "bring a new player in" surface
// (waiting pool's + Add to…, Transfer to…, + Merge into…) — it doesn't
// touch existing members, who can still be removed or transferred out.
export async function setGroupLocked(group: DndGroup, locked: boolean): Promise<void> {
  await updateDoc(doc(db, 'dndGroups', group.id), { locked, updatedAt: serverTimestamp() })
  await logUpdate('D&D Groups', `${group.campaignTitle} — ${group.name}`, { locked: group.locked }, { locked })
}

// Deleting a group sends every one of its members back to the waiting
// pool (rather than leaving their lfpEntries doc pointing at a group that
// no longer exists) before removing the group itself — all in one batch.
export async function deleteGroup(group: DndGroup): Promise<void> {
  const batch = writeBatch(db)
  group.members.forEach(m => {
    batch.update(doc(db, 'lfpEntries', lfpEntryId(group.campaignId, m.uid)), {
      status: 'waiting', groupId: null,
    })
  })
  batch.delete(doc(db, 'dndGroups', group.id))
  await batch.commit()
  await logDelete('D&D Groups', `${group.campaignTitle} — ${group.name}`, { memberCount: group.members.length })
}
