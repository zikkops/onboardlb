'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRequireRole, ALL_ROLES, SECTION_ACCESS, ROLE_LABELS, type Role } from '../lib/adminAuth'

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

export default function AdminPage() {
  const router  = useRouter()
  const { checking, role, user } = useRequireRole(ALL_ROLES)
  const isMobile = useIsMobile()

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/admin/login')
  }

  const cards = [
    { label: 'Manage Games',  desc: 'Add, edit or remove games from the shop', href: '/admin/games',  color: 'var(--purple)', access: SECTION_ACCESS.games },
    { label: 'Manage Menu',   desc: 'Update food and drink items',              href: '/admin/menu',   color: 'var(--teal)', access: SECTION_ACCESS.menu },
    { label: 'Manage Events', desc: 'Create and manage D&D sessions and events', href: '/admin/events', color: 'var(--red)', access: SECTION_ACCESS.events },
    { label: 'D&D Campaigns', desc: 'Add and manage D&D campaigns', href: '/admin/dnd', color: 'var(--navy)', access: SECTION_ACCESS.dnd },
    { label: 'Media Library', desc: 'View and delete previously uploaded images', href: '/admin/media', color: 'rgba(245,242,236,0.4)', access: ALL_ROLES },
    { label: 'Manage Users',  desc: 'Create accounts and set access levels', href: '/admin/users', color: 'rgba(245,242,236,0.4)', access: ['admin'] as Role[] },
    { label: 'Activity Log',  desc: 'See who created, edited, or deleted what, and when', href: '/admin/logs', color: 'rgba(245,242,236,0.4)', access: ['admin'] as Role[] },
  ].filter(({ access }) => role && access.includes(role))

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
      padding: isMobile ? '1.5rem' : '3rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '1.25rem' : '0',
          marginBottom: isMobile ? '2rem' : '3rem',
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
              Signed in as {user?.email} · {role ? ROLE_LABELS[role] : ''}
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
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '1.5rem',
        }}>
          {cards.map(({ label, desc, href, color }) => (
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