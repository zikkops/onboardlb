'use client'

// Sign-in for wholesale accounts. Separate from /admin/login and
// /customer/login because it lands somewhere different and because a shop
// signing in here should never be told whether an email belongs to a staff
// member or a customer.

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { useWholesaleAccount } from '../../lib/wholesale'

// Where a successful sign-in lands, chosen by ?next= on the login URL, so one
// form can serve several entry points (/fullcatalogue/login sends people here
// with next=/fullcatalogue).
//
// An ALLOWLIST, not a "starts with /" check: anything taken from the URL and
// handed to router.replace() is an open-redirect waiting to happen, and
// "//evil.example" passes a naive same-origin test. Unknown values silently
// fall back to the catalogue rather than erroring — a mistyped link should
// still log someone in.
const LOGIN_DESTINATIONS = ['/wholesale', '/fullcatalogue', '/wholesale/orders'] as const
const DEFAULT_DESTINATION = '/wholesale'

function resolveDestination(next: string | null): string {
  return LOGIN_DESTINATIONS.includes((next ?? '') as typeof LOGIN_DESTINATIONS[number])
    ? (next as string)
    : DEFAULT_DESTINATION
}

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

function WholesaleLoginForm() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { account, loading } = useWholesaleAccount()
  const destination = resolveDestination(useSearchParams().get('next'))

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!loading && account) router.replace(destination)
  }, [loading, account, router, destination])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')

    // Only the credential check may sign the user out on failure. This used to
    // be one try/catch around everything, which meant ANY later failure — a
    // token refresh, a network blip — signed a correctly-authenticated shop
    // straight back out and told them their password was wrong. From the shop's
    // side that looks like "it logs me in for a second, then logs me out".
    let cred
    try {
      cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      // Deliberately one message for every credential failure. Distinguishing
      // "no such account" from "wrong password" would let anyone enumerate
      // which shops and staff have logins here. A network failure is not a
      // credential failure, though, and saying so saves a support call.
      setError(
        code === 'auth/network-request-failed'
          ? 'Could not reach the server. Check your connection and try again.'
          : 'Email or password is incorrect.',
      )
      await signOut(auth).catch(() => {})
      setBusy(false)
      return
    }

    // Past this point the credentials were ACCEPTED — never sign the user out
    // for anything that happens next.
    //
    // The refresh is best-effort: it front-loads the `wholesale` claim so the
    // catalogue's first price read has it. If it fails the session is still
    // valid, and the claim arrives on the next natural token rotation, so
    // continuing is strictly better than throwing the login away.
    try {
      await cred.user.getIdToken(true)
    } catch (err) {
      console.warn('Wholesale login: token refresh failed, continuing.', err)
    }

    router.replace(destination)
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#F5F2EC', padding: '0.8rem 1rem', borderRadius: '3px',
    fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-inter)',
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--black, #0a0a0a)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '1.5rem' : '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Image src="/images/logo.png" alt="Onboard" width={120} height={44}
            style={{ width: '120px', height: 'auto', margin: '0 auto 1.5rem' }} />
          <h1 style={{
            fontFamily: 'var(--font-cinzel)', fontSize: isMobile ? '1.5rem' : '1.8rem',
            color: 'var(--offwhite, #F5F2EC)', marginBottom: '0.4rem',
          }}>Wholesale</h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.35)' }}>
            Sign in to see trade pricing and place an order.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email" required value={email} autoComplete="username"
            onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={inp}
          />
          <input
            type="password" required value={password} autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            placeholder="Password" style={inp}
          />

          {error && (
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'var(--red, #E43329)' }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={busy}
            style={{
              backgroundColor: busy ? 'rgba(255,255,255,0.08)' : 'var(--teal, #00A098)',
              color: busy ? 'rgba(245,242,236,0.3)' : '#000',
              border: 'none', borderRadius: '3px', padding: '0.85rem',
              fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-inter)', marginTop: '0.5rem',
            }}
          >{busy ? 'Signing in…' : 'Sign In'}</button>
        </form>

        <p style={{
          fontFamily: 'var(--font-inter)', fontSize: '0.75rem',
          color: 'rgba(245,242,236,0.25)', textAlign: 'center', marginTop: '2rem', lineHeight: 1.7,
        }}>
          Wholesale accounts are set up by Onboard.<br />
          Contact us if you need access.
        </p>
      </div>
    </div>
  )
}

// useSearchParams() opts a route into client-side rendering and Next refuses to
// prerender it without a boundary, so the form is wrapped rather than losing
// the static shell. The fallback is the page's own background, so a viewer
// sees the same dark panel rather than a flash of white.
export default function WholesaleLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: 'var(--black, #0a0a0a)' }} />}>
      <WholesaleLoginForm />
    </Suspense>
  )
}
