'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAuth, onAuthStateChanged, signOut, type User,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { auth, db, firebaseConfig } from './firebase'
import { logActivity, logUpdate } from './activityLog'

export type Role = 'admin' | 'manager' | 'social' | 'gamer' | 'dungeonmaster'

export const ALL_ROLES: Role[] = ['admin', 'manager', 'social', 'gamer', 'dungeonmaster']

export const ROLE_LABELS: Record<Role, string> = {
  admin:         'Admin',
  manager:       'Manager',
  social:        'Social Media',
  gamer:         'Gamer',
  dungeonmaster: 'Dungeon Master',
}

export const ROLE_COLORS: Record<Role, string> = {
  admin:         'var(--purple)',
  manager:       'var(--navy)',
  social:        'var(--red)',
  gamer:         'var(--teal)',
  dungeonmaster: '#C9962C',
}

export const SECTION_ACCESS = {
  games:         ['admin', 'manager', 'gamer'] as Role[],
  menu:          ['admin', 'manager'] as Role[],
  events:        ['admin', 'manager', 'social'] as Role[],
  dnd:           ['admin', 'manager', 'dungeonmaster'] as Role[],
  loyalty:       ['admin', 'manager'] as Role[],
  // Submission panels (Step 5) — distinct from `dnd`/`events` above, which
  // gate the public-facing content management sections, not loyalty logging.
  loyaltyDnd:    ['admin', 'manager', 'dungeonmaster'] as Role[],
  loyaltyEvents: ['admin', 'manager', 'social'] as Role[],
  dndReservations: ['admin', 'manager', 'dungeonmaster'] as Role[],
  dndGroups:       ['admin', 'manager', 'dungeonmaster'] as Role[],
  // Deliberately DM-only (not admin/manager) — this page edits the signed-in
  // user's own opening hours, not anyone else's, so admin/manager wouldn't
  // see anything meaningful here unless they're also DM-flagged, which the
  // 'dungeonmaster' entry already covers via hasSectionAccess below.
  dmAvailability: ['dungeonmaster'] as Role[],
  branchTables:      ['admin', 'manager'] as Role[],
  tableReservations: ['admin', 'manager'] as Role[],
  gamePurchases:     ['admin', 'manager', 'gamer'] as Role[],
  gameTransfers:     ['admin', 'manager', 'gamer'] as Role[],
}

// Reads either shape — the new `branchIds` array, or the older singular
// `branchId` from accounts created before multi-branch support existed —
// so existing managers keep their access without a manual data migration.
function normalizeBranchIds(data: { branchIds?: unknown; branchId?: unknown }): string[] {
  if (Array.isArray(data.branchIds)) return data.branchIds as string[]
  return data.branchId ? [data.branchId as string] : []
}

// Firebase Auth keeps its session in IndexedDB, not a cookie — proxy.ts (see
// project root) only ever sees HTTP requests, so it has no way to know a
// Firebase session exists unless the app also tells it via a cookie. This
// cookie is *not* cryptographic proof of anything — it's just "this browser
// has a Firebase session," so proxy.ts can redirect a fully-anonymous
// request away before the admin page's shell ever renders. The actual
// security boundary stays exactly where it already was: Firestore rules.
// A signed-in-but-unauthorized visitor still reaches the page; useRequireRole
// below is what bounces them from there.
const ADMIN_SESSION_COOKIE = 'admin_session'

// Exported — /admin/login calls setAdminSessionCookie() itself, right after
// a successful sign-in and before its redirect to /admin. That page never
// calls useAdminUser() (no reason to — it's the one page a signed-out visitor
// is supposed to reach), so without this, the cookie wouldn't exist yet at
// the exact moment proxy.ts needs it for that first post-login navigation.
export function setAdminSessionCookie() {
  document.cookie = `${ADMIN_SESSION_COOKIE}=1; path=/; max-age=2592000; SameSite=Lax`
}

export function clearAdminSessionCookie() {
  document.cookie = `${ADMIN_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

export function useAdminUser() {
  const [user, setUser]             = useState<User | null>(null)
  const [role, setRole]             = useState<Role | null>(null)
  const [branchIds, setBranchIds]   = useState<string[]>([])
  const [isDungeonMaster, setIsDungeonMaster] = useState(false)
  const [superadmin, setSuperadmin] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [provisioned, setProvisioned] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        clearAdminSessionCookie()
        setUser(null)
        setRole(null)
        setBranchIds([])
        setIsDungeonMaster(false)
        setSuperadmin(false)
        setProvisioned(true)
        setLoading(false)
        return
      }
      setAdminSessionCookie()
      setUser(u)
      const snap = await getDoc(doc(db, 'users', u.uid))
      const data = snap.exists() ? snap.data() : null
      if (data?.isStaff === true) {
        setRole((data.role as Role) ?? null)
        setBranchIds(normalizeBranchIds(data))
        setIsDungeonMaster(data.isDungeonMaster === true)
        setSuperadmin(data.superadmin === true)
        setProvisioned(true)
      } else {
        // users/{uid} either doesn't exist or has no isStaff: true.
        // First-time admins must be provisioned by hand in Firebase Console:
        // create users/{uid} with isStaff: true, role: 'admin', superadmin: true,
        // xp: 0, obCoins: 0. See ARCHITECTURE.md.
        setRole(null)
        setBranchIds([])
        setIsDungeonMaster(false)
        setSuperadmin(false)
        setProvisioned(false)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return { user, role, branchIds, isDungeonMaster, superadmin, loading, provisioned }
}

// Lightweight, read-only staff check for public/customer-facing components
// (e.g. swapping a CTA for staff) — unlike useAdminUser(), this never
// attempts to write anything (no self-elect-first-admin side effect), since
// it has to run safely on every page load for every anonymous visitor too.
export function useIsStaff(): boolean {
  const [isStaff, setIsStaff] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setIsStaff(false); return }
      const snap = await getDoc(doc(db, 'users', u.uid))
      setIsStaff(snap.exists() && snap.data()?.isStaff === true)
    })
    return unsub
  }, [])

  return isStaff
}

// A section whose access list includes 'dungeonmaster' is treated as
// "DM-gated" — anyone with the isDungeonMaster flag gets in too, regardless
// of their primary role (e.g. an admin or a gamer who also runs sessions).
// Shared by useRequireRole below and by dashboard card visibility filters,
// so the two never drift out of sync.
export function hasSectionAccess(role: Role | null, isDungeonMaster: boolean, allowed: Role[]): boolean {
  return !!role && (allowed.includes(role) || (isDungeonMaster && allowed.includes('dungeonmaster')))
}

export function useRequireRole(allowed: Role[]) {
  const router = useRouter()
  const { user, role, branchIds, isDungeonMaster, superadmin, loading, provisioned } = useAdminUser()

  const hasAccess = hasSectionAccess(role, isDungeonMaster, allowed)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/admin/login')
      return
    }
    if (!provisioned) {
      signOut(auth).then(() => router.replace('/admin/login'))
      return
    }
    if (!hasAccess) {
      router.replace('/admin')
    }
  }, [loading, user, hasAccess, provisioned, router])

  const checking = loading || !user || !provisioned || !hasAccess
  return { checking, role, branchIds, isDungeonMaster, superadmin, user }
}

// Staff accounts live in the same `users` collection as customers — they just
// have isStaff: true plus role/branchIds/isDungeonMaster fields. Creating one
// has two steps:
//   1. Admin writes a transient adminInvitations/{uid} doc (isStaff() reads
//      users, writes adminInvitations — different collections, no conflict).
//   2. The new user creates their own users/{uid} doc using their own idToken
//      (the rule checks adminInvitations exists — different collection, no
//      conflict; isStaff() is not called at all in the users create rule).
export async function createAccount(email: string, password: string, role: Role, branchIds?: string[], isDungeonMaster?: boolean) {
  const adminUser = auth.currentUser
  if (!adminUser) throw new Error('Session expired — please sign in again.')
  const adminToken = await adminUser.getIdToken(true)

  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  // Step 1: create the Firebase Auth account and capture the new user's token.
  // This token is used in step 3 so the new user creates their own doc
  // (request.auth.uid == userId in the rule). Never injected into the SDK —
  // the admin's own session is untouched.
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const code: string = body?.error?.message ?? 'UNKNOWN_ERROR'
    if (code.startsWith('EMAIL_EXISTS'))        throw new Error('An account with this email already exists.')
    if (code.startsWith('WEAK_PASSWORD'))       throw new Error('Password must be at least 6 characters.')
    if (code === 'INVALID_EMAIL')               throw new Error('Invalid email address.')
    if (code === 'OPERATION_NOT_ALLOWED')       throw new Error('Email/password sign-in is disabled in Firebase. Enable it in the console.')
    if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') throw new Error('Too many attempts. Please try again in a few minutes.')
    throw new Error(`Account creation failed: ${code}`)
  }
  const { localId: uid, idToken: newUserToken } = await res.json()

  // Step 2: admin writes the invitation (isStaff() reads users, writes
  // adminInvitations — different collections, no same-collection conflict)
  const inviteRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/adminInvitations/${uid}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ fields: {
        createdBy: { stringValue: adminUser.uid },
        createdAt: { timestampValue: new Date().toISOString() },
      } }),
    }
  )
  if (!inviteRes.ok) {
    const body = await inviteRes.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? 'Failed to write invitation — check that your account still has staff access.')
  }

  // Step 3: new user creates their own users/{uid} doc using their own token.
  // Rule: request.auth.uid == userId && exists(adminInvitations/${userId})
  // — different collection read, no conflict. Retry with backoff in case
  // the exists() check races against Firestore's replication of the invitation.
  const userDocBody = JSON.stringify({ fields: {
    email:           { stringValue: email },
    isStaff:         { booleanValue: true },
    role:            { stringValue: role },
    branchIds:       { arrayValue: { values: (branchIds ?? []).map(b => ({ stringValue: b })) } },
    isDungeonMaster: { booleanValue: isDungeonMaster ?? false },
    xp:              { integerValue: '0' },
    obCoins:         { integerValue: '0' },
    createdAt:       { timestampValue: new Date().toISOString() },
  } })
  let docRes!: Response
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 600 * attempt))
    docRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newUserToken}` },
        body: userDocBody,
      }
    )
    if (docRes.ok) break
    const errBody = await docRes.clone().json().catch(() => ({}))
    if (errBody?.error?.status !== 'PERMISSION_DENIED') break
  }

  // Step 4: clean up the invitation regardless of outcome
  fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/adminInvitations/${uid}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } }
  )

  if (!docRes.ok) {
    const body = await docRes.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? 'Failed to save account record.')
  }

  await logActivity('create', 'User Account', `${email} (${role})`)
  return uid as string
}

// Lets an admin change an existing account's role/branches without
// recreating it — recreating would mint a new Firebase Auth UID and break
// that person's login entirely.
export async function updateAccountAccess(
  uid: string,
  email: string,
  before: { role: Role; branchIds: string[]; isDungeonMaster: boolean },
  after: { role: Role; branchIds: string[]; isDungeonMaster: boolean }
) {
  await updateDoc(doc(db, 'users', uid), { role: after.role, branchIds: after.branchIds, isDungeonMaster: after.isDungeonMaster })
  await logUpdate('User Account', email, before, after)
}
