'use client'

import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
  linkWithCredential, EmailAuthProvider,
  onAuthStateChanged, signOut, type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore'
import { auth, db } from './firebase'

// Independent from app/lib/adminAuth.ts on purpose — customers and CMS staff
// are different audiences with different Firestore collections (`users` vs
// `adminUsers`) and no shared role/permission model.

export function useCustomerUser() {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  return { user, loading }
}

// First-time sign-in only — if the doc already exists this is a no-op, so a
// returning customer's xp/level/badges are never reset on repeat logins.
async function ensureCustomerDoc(user: User, username?: string, phoneNumber?: string) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return

  await setDoc(ref, {
    username: username ?? '',
    displayName: username ?? user.displayName ?? '',
    email: user.email ?? '',
    phoneNumber: phoneNumber ?? '',
    avatarUrl: user.photoURL ?? '',
    themeId: 'dungeon',
    xp: 0,
    level: 1,
    levelTitle: 'Newcomer',
    obCoins: 0,
    badges: [],
    createdAt: serverTimestamp(),
    role: 'customer',
  })
}

async function needsUsername(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid))
  return !snap.data()?.username
}

// Usernames live in their own collection, keyed by the lowercased username,
// so claiming one is an atomic Firestore transaction (the only safe way to
// enforce uniqueness client-side — a read-then-write query has a race window).
// The email is denormalized onto this doc too: logging in by username has to
// resolve to a real email *before* the user is authenticated, and the
// `users/{uid}` doc is locked down to its own owner, so this public mapping
// is the only place that lookup can read from. That does mean the
// usernames collection is publicly readable (see the Firestore rules note).
async function reserveUsername(username: string, uid: string, email: string) {
  const key = username.trim().toLowerCase()
  const ref = doc(db, 'usernames', key)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists()) throw new Error('username-taken')
    tx.set(ref, { uid, email, createdAt: serverTimestamp() })
  })
}

// Turns a login-box value that might be a username into a real email by
// looking it up in the public `usernames` mapping. Passes emails through
// untouched. Exported so the login page can resolve it once up front and
// reuse the result for the Google-link recovery flow if sign-in then fails.
export async function resolveCustomerEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) return trimmed

  const snap = await getDoc(doc(db, 'usernames', trimmed.toLowerCase()))
  const email = snap.exists() ? (snap.data().email as string) : ''
  if (!email) throw new Error('user-not-found')
  return email
}

// Requires Google enabled as a Sign-in provider in Firebase Console:
// Authentication -> Sign-in method -> Google -> Enable. Not something
// this codebase can configure — it's a console-only setting.
export async function signInWithGoogle(): Promise<{ user: User; needsUsername: boolean }> {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  await ensureCustomerDoc(cred.user)
  return { user: cred.user, needsUsername: await needsUsername(cred.user.uid) }
}

const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/

// Lets a Google-only customer (no username yet, e.g. first Google login, or
// any older account from before usernames existed) claim a username and
// record their phone number — both required to finish registering.
export async function completeAccountSetup(uid: string, email: string, username: string, phoneNumber: string): Promise<void> {
  const trimmed = username.trim()
  const phone = phoneNumber.trim()
  if (!trimmed) throw new Error('username-required')
  if (!PHONE_PATTERN.test(phone)) throw new Error('phone-required')
  await reserveUsername(trimmed, uid, email)
  await updateDoc(doc(db, 'users', uid), { username: trimmed, phoneNumber: phone })
}

export async function signUpWithEmail(username: string, email: string, password: string, phoneNumber: string): Promise<User> {
  const trimmed = username.trim()
  const phone = phoneNumber.trim()
  if (!trimmed) throw new Error('username-required')
  if (!PHONE_PATTERN.test(phone)) throw new Error('phone-required')

  const cred = await createUserWithEmailAndPassword(auth, email, password)
  try {
    await reserveUsername(trimmed, cred.user.uid, email)
  } catch (err) {
    // Roll back — otherwise retrying with a different username hits
    // email-already-in-use for an account that never got claimed.
    await cred.user.delete()
    throw err
  }
  await updateProfile(cred.user, { displayName: trimmed })
  await ensureCustomerDoc(cred.user, trimmed, phone)
  return cred.user
}

// Accepts either an email or a username in `identifier`.
export async function signInCustomer(identifier: string, password: string): Promise<User> {
  const email = await resolveCustomerEmail(identifier)
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureCustomerDoc(cred.user)
  return cred.user
}

// Recovery path for a Google-only account: re-authenticating with Google
// proves ownership, then we attach the password they just typed to that same
// account so they can use either method going forward.
export async function linkGoogleWithPassword(email: string, password: string): Promise<{ user: User; needsUsername: boolean }> {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)

  if (cred.user.email?.toLowerCase() !== email.trim().toLowerCase()) {
    await signOut(auth)
    throw new Error('email-mismatch')
  }

  await linkWithCredential(cred.user, EmailAuthProvider.credential(email, password))
  await ensureCustomerDoc(cred.user)
  return { user: cred.user, needsUsername: await needsUsername(cred.user.uid) }
}

export async function signOutCustomer() {
  await signOut(auth)
}
