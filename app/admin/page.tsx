'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRequireRole, ALL_ROLES, SECTION_ACCESS, ROLE_LABELS, type Role } from '../lib/adminAuth'
import { usePendingTransactions } from '../lib/loyalty'
import { usePendingRedemptions } from '../lib/redemptions'

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
  const { checking, role, branchIds, user } = useRequireRole(ALL_ROLES)
  const isMobile = useIsMobile()

  // Memoized — usePendingTransactions/usePendingRedemptions re-subscribe
  // whenever this array's reference changes, so it must stay stable across
  // renders where the underlying filter hasn't actually changed. Badge counts
  // just need the combined total across all of a manager's branches, so no
  // per-branch narrowing is needed here (unlike the approvals/redemptions
  // queue pages, which let a multi-branch manager pick one branch at a time).
  const loyaltyBranchFilter = useMemo(
    () => checking ? null : role === 'admin' ? 'all' : branchIds,
    [checking, role, branchIds]
  )
  const effectiveLoyaltyFilter = role && SECTION_ACCESS.loyalty.includes(role) ? loyaltyBranchFilter : null
  const { transactions: pendingLoyalty } = usePendingTransactions(effectiveLoyaltyFilter)
  const { redemptions: pendingRedemptions } = usePendingRedemptions(effectiveLoyaltyFilter)

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

  // Everything loyalty-related lives in one combined group — submissions,
  // approvals, redemption configuration/confirmation, and the audit trail.
  const loyaltyManagementCards = [
    { label: 'D&D Session Attendance', desc: 'Log session attendees to send them for manager approval', href: '/admin/loyalty/dnd', color: 'var(--navy)', access: SECTION_ACCESS.loyaltyDnd },
    { label: 'Event Attendance', desc: 'Log event attendees to send them for manager approval', href: '/admin/loyalty/events', color: 'var(--red)', access: SECTION_ACCESS.loyaltyEvents },
    { label: 'Loyalty Approvals', desc: 'Approve or reject pending XP and OB Coin submissions', href: '/admin/loyalty/approvals', color: 'var(--teal)', access: SECTION_ACCESS.loyalty, badge: pendingLoyalty.length },
    { label: 'Redemption Items', desc: 'Add, edit or deactivate items customers can redeem with OB Coins', href: '/admin/loyalty/redemption-items', color: 'var(--purple)', access: SECTION_ACCESS.loyalty },
    { label: 'Redemption Requests', desc: 'Confirm or reject pending OB Coin redemption requests', href: '/admin/loyalty/redemptions', color: 'var(--teal)', access: SECTION_ACCESS.loyalty, badge: pendingRedemptions.length },
    { label: 'Loyalty Activity', desc: 'Submissions, approvals, rejections, and redemption item changes', href: '/admin/loyalty/activity', color: 'var(--navy)', access: SECTION_ACCESS.loyalty },
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
          {cards.map(card => <DashboardCard key={card.label} {...card} />)}
        </div>

        {/* Loyalty Management group — combined submissions, approvals, and redemption tools */}
        {loyaltyManagementCards.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <p style={{
              fontSize: '0.68rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(245,242,236,0.3)',
              fontFamily: 'var(--font-inter)',
              marginBottom: '1rem',
            }}>Loyalty Management</p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}>
              {loyaltyManagementCards.map(card => <DashboardCard key={card.label} {...card} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function DashboardCard({ label, desc, href, color, badge }: {
  label: string
  desc: string
  href: string
  color: string
  badge?: number
}) {
  return (
    <a href={href} style={{
      position: 'relative',
      display: 'block',
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid rgba(255,255,255,0.06)`,
      borderRadius: '4px',
      padding: '2rem',
      textDecoration: 'none',
      borderTop: `3px solid ${color}`,
    }}>
      {!!badge && badge > 0 && (
        <span style={{
          position: 'absolute',
          top: '-10px',
          right: '1.5rem',
          backgroundColor: 'var(--red)',
          color: '#fff',
          borderRadius: '999px',
          minWidth: '24px',
          height: '24px',
          padding: '0 0.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-inter)',
          fontWeight: 600,
          border: '2px solid var(--black)',
        }}>{badge}</span>
      )}
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
  )
}