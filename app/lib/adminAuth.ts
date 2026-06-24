'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initializeApp, getApps, deleteApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, type User,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { auth, db, firebaseConfig } from './firebase'
import { logActivity } from './activityLog'

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
  games:  ['admin', 'manager', 'gamer'] as Role[],
  menu:   ['admin', 'manager'] as Role[],
  events: ['admin', 'manager', 'social'] as Role[],
  dnd:    ['admin', 'manager', 'dungeonmaster'] as Role[],
}

export function useAdminUser() {
  const [user, setUser]             = useState<User | null>(null)
  const [role, setRole]             = useState<Role | null>(null)
  const [loading, setLoading]       = useState(true)
  const [provisioned, setProvisioned] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null)
        setRole(null)
        setProvisioned(true)
        setLoading(false)
        return
      }
      setUser(u)
      const ref  = doc(db, 'adminUsers', u.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setRole((snap.data().role as Role) ?? null)
        setProvisioned(true)
      } else {
        // No role record yet. If this is the very first sign-in (the account that
        // pre-dates this access-control system), self-elect it as admin instead
        // of locking everyone out.
        const allSnap = await getDocs(collection(db, 'adminUsers'))
        if (allSnap.empty) {
          await setDoc(ref, { email: u.email, role: 'admin', createdAt: serverTimestamp() })
          setRole('admin')
          setProvisioned(true)
        } else {
          setRole(null)
          setProvisioned(false)
        }
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return { user, role, loading, provisioned }
}

export function useRequireRole(allowed: Role[]) {
  const router = useRouter()
  const { user, role, loading, provisioned } = useAdminUser()

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
    if (!role || !allowed.includes(role)) {
      router.replace('/admin')
    }
  }, [loading, user, role, provisioned, router, allowed])

  const checking = loading || !user || !provisioned || !role || !allowed.includes(role)
  return { checking, role, user }
}

// Creating a user with the client SDK signs that user in immediately, which would
// kick the admin out of their own session. We spin up a second, throwaway Firebase
// app instance just to create the account, so the admin's session is untouched.
export async function createAccount(email: string, password: string, role: Role) {
  const secondary = getApps().find(a => a.name === 'AccountCreator')
    ?? initializeApp(firebaseConfig, 'AccountCreator')
  const secondaryAuth = getAuth(secondary)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await setDoc(doc(db, 'adminUsers', cred.user.uid), {
      email, role, createdAt: serverTimestamp(),
    })
    await logActivity('create', 'User Account', `${email} (${role})`)
    return cred.user.uid
  } finally {
    await signOut(secondaryAuth)
    await deleteApp(secondary)
  }
}
