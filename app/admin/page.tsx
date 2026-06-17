'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function AdminPage() {
  const router  = useRouter()
  const [checking, setChecking] = useState(true)
  const [email, setEmail]       = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/admin/login')
      } else {
        setEmail(user.email ?? '')
      }
      setChecking(false)
    })
    return unsub
  }, [router])

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/admin/login')
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--black)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{
          color: 'var(--teal)',
          fontFamily: 'var(--font-cinzel)',
          fontSize: '1.2rem',
        }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--black)',
      padding: '3rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: '2rem',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '2rem',
              color: 'var(--offwhite)',
              marginBottom: '0.3rem',
            }}>
              Dashboard
            </h1>
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '0.78rem',
              color: 'rgba(245,242,236,0.3)',
            }}>
              Signed in as {email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,242,236,0.5)',
              padding: '0.6rem 1.5rem',
              borderRadius: '2px',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
        }}>
          {[
            { label: 'Manage Games',  desc: 'Add, edit or remove games from the shop', href: '/admin/games',  color: 'var(--purple)' },
            { label: 'Manage Menu',   desc: 'Update food and drink items',              href: '/admin/menu',   color: 'var(--teal)' },
            { label: 'Manage Events', desc: 'Create and manage D&D sessions and events', href: '/admin/events', color: 'var(--red)' },
          ].map(({ label, desc, href, color }) => (
            <a key={label} href={href} style={{
              display: 'block',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid rgba(255,255,255,0.06)`,
              borderRadius: '4px',
              padding: '2rem',
              textDecoration: 'none',
              borderTop: `3px solid ${color}`,
            }}>
              <h2 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1.2rem',
                color: 'var(--offwhite)',
                marginBottom: '0.5rem',
              }}>{label}</h2>
              <p style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '0.82rem',
                color: 'rgba(245,242,236,0.4)',
              }}>{desc}</p>
            </a>
          ))}
        </div>

      </div>
    </div>
  )
}