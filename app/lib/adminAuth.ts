'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initializeApp, getApps, deleteApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, type User,
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
        setProvisioned(true)
        setLoading(false)
        return
      }
      setAdminSessionCookie()
      setUser(u)
      const ref  = doc(db, 'adminUsers', u.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setRole((data.role as Role) ?? null)
        setBranchIds(normalizeBranchIds(data))
        setIsDungeonMaster(data.isDungeonMaster === true)
        setProvisioned(true)
      } else {
        // No role record for this uid. The write below always fails under
        // firestore.rules — isStaff() checks whether an adminUsers/{uid}
        // doc already exists for the caller, which can never be true for
        // the very doc this call is trying to create — so this falls
        // through to "not provisioned" every time. The first admin account
        // has to be created by hand in the Firebase Console instead.
        let isFirstEverAdmin = false
        try {
          await setDoc(ref, { email: u.email, role: 'admin', createdAt: serverTimestamp() })
          isFirstEverAdmin = true
        } catch {
          // Always lands here — see comment above.
        }
        if (isFirstEverAdmin) {
          setRole('admin')
          setBranchIds([])
          setIsDungeonMaster(false)
          setProvisioned(true)
        } else {
          setRole(null)
          setBranchIds([])
          setIsDungeonMaster(false)
          setProvisioned(false)
        }
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return { user, role, branchIds, isDungeonMaster, loading, provisioned }
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
      const snap = await getDoc(doc(db, 'adminUsers', u.uid))
      setIsStaff(snap.exists())
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
  const { user, role, branchIds, isDungeonMaster, loading, provisioned } = useAdminUser()

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
  return { checking, role, branchIds, isDungeonMaster, user }
}

// Creating a user with the client SDK signs that user in immediately, which would
// kick the admin out of their own session. We spin up a second, throwaway Firebase
// app instance just to create the account, so the admin's session is untouched.
export async function createAccount(email: string, password: string, role: Role, branchIds?: string[], isDungeonMaster?: boolean) {
  const secondary = getApps().find(a => a.name === 'AccountCreator')
    ?? initializeApp(firebaseConfig, 'AccountCreator')
  const secondaryAuth = getAuth(secondary)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await setDoc(doc(db, 'adminUsers', cred.user.uid), {
      email, role, branchIds: branchIds ?? [], isDungeonMaster: isDungeonMaster ?? false, createdAt: serverTimestamp(),
    })
    await logActivity('create', 'User Account', `${email} (${role})`)
    return cred.user.uid
  } finally {
    await signOut(secondaryAuth)
    await deleteApp(secondary)
  }
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
  await updateDoc(doc(db, 'adminUsers', uid), { role: after.role, branchIds: after.branchIds, isDungeonMaster: after.isDungeonMaster })
  await logUpdate('User Account', email, before, after)
}
