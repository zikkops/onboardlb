'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRequireRole, hasSectionAccess, ALL_ROLES, SECTION_ACCESS, ROLE_LABELS, type Role } from '../lib/adminAuth'
import { usePendingTransactions } from '../lib/loyalty'
import { usePendingRedemptions } from '../lib/redemptions'
import { usePendingReservations } from '../lib/dndReservations'
import { usePendingEventReservations } from '../lib/eventReservations'
import { checkAndRunLoyaltyReset, migratePrivateFieldsOnce } from '../lib/customerManagement'

// Events can be set to the literal branch "All Branches" in Manage Events —
// always include it alongside a manager's real branchIds so those events
// aren't missed in their badge count.
const ALL_BRANCHES_LABEL = 'All Branches'

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
  const { checking, role, branchIds, isDungeonMaster, user } = useRequireRole(ALL_ROLES)
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

  // Admins/managers see every pending reservation; anyone who's a DM (by
  // role or by the separate isDungeonMaster flag) sees only their own.
  const canSeeDndReservations = hasSectionAccess(role, isDungeonMaster, SECTION_ACCESS.dndReservations)
  const dndReservationScope = checking || !canSeeDndReservations
    ? null
    : (role === 'admin' || role === 'manager') ? 'all' : (user?.uid ?? null)
  const { reservations: pendingDndReservations } = usePendingReservations(dndReservationScope)

  // Admins/social see every pending event reservation; managers see their
  // own branches plus anything set to "All Branches".
  const eventReservationFilter = useMemo(() => {
    if (checking || !role || !SECTION_ACCESS.events.includes(role)) return null
    if (role === 'admin' || role === 'social') return 'all'
    return [...branchIds, ALL_BRANCHES_LABEL]
  }, [checking, role, branchIds])
  const { reservations: pendingEventReservations } = usePendingEventReservations(eventReservationFilter)

  // No server/cron job exists in this app — the annual points reset is
  // checked passively here instead, the first time an admin opens the
  // dashboard on or after the configured date. See checkAndRunLoyaltyReset.
  useEffect(() => {
    if (!checking && role === 'admin') {
      checkAndRunLoyaltyReset()
      migratePrivateFieldsOnce()
    }
  }, [checking, role])

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/admin/login')
  }

  // Every card within a section shares that section's color — the color is
  // the grouping signal, not a per-card decoration, so it's set once here
  // rather than picked individually for each card.
  const sections = [
    {
      title: 'Content Management',
      color: 'var(--teal)',
      cards: [
        { label: 'Manage Games',  desc: 'Add, edit or remove games from the shop', href: '/admin/games',  access: SECTION_ACCESS.games },
        { label: 'Manage Menu',   desc: 'Update food and drink items',              href: '/admin/menu',   access: SECTION_ACCESS.menu },
        { label: 'Manage Events', desc: 'Create and manage D&D sessions and events', href: '/admin/events', access: SECTION_ACCESS.events },
        { label: 'Event Reservations', desc: 'Approve or reject pending event spot requests', href: '/admin/events/reservations', access: SECTION_ACCESS.events, badge: pendingEventReservations.length },
        { label: 'D&D Campaigns', desc: 'Add and manage D&D campaigns', href: '/admin/dnd', access: SECTION_ACCESS.dnd },
      ],
    },
    {
      title: 'D&D Bookings',
      color: 'var(--purple)',
      cards: [
        { label: 'D&D Reservations', desc: 'Approve or reject pending session booking requests', href: '/admin/dnd/reservations', access: SECTION_ACCESS.dndReservations, badge: pendingDndReservations.length },
        { label: 'D&D Schedule', desc: 'See upcoming sessions and who is coming', href: '/admin/dnd/schedule', access: SECTION_ACCESS.dndReservations },
        { label: 'Your Availability', desc: 'Set your opening hours and days off for session bookings', href: '/admin/dnd/availability', access: SECTION_ACCESS.dmAvailability },
      ],
    },
    {
      title: 'Loyalty Management',
      color: 'var(--navy)',
      cards: [
        { label: 'D&D Session Attendance', desc: 'Log session attendees to send them for manager approval', href: '/admin/loyalty/dnd', access: SECTION_ACCESS.loyaltyDnd },
        { label: 'Event Attendance', desc: 'Log event attendees to send them for manager approval', href: '/admin/loyalty/events', access: SECTION_ACCESS.loyaltyEvents },
        { label: 'Loyalty Approvals', desc: 'Approve or reject pending XP and OB Coin submissions', href: '/admin/loyalty/approvals', access: SECTION_ACCESS.loyalty, badge: pendingLoyalty.length },
        { label: 'Redemption Items', desc: 'Add, edit or deactivate items customers can redeem with OB Coins', href: '/admin/loyalty/redemption-items', access: SECTION_ACCESS.loyalty },
        { label: 'Redemption Requests', desc: 'Confirm or reject pending OB Coin redemption requests', href: '/admin/loyalty/redemptions', access: SECTION_ACCESS.loyalty, badge: pendingRedemptions.length },
        { label: 'Loyalty Activity', desc: 'Submissions, approvals, rejections, and redemption item changes', href: '/admin/loyalty/activity', access: SECTION_ACCESS.loyalty },
        { label: 'Manage Customers', desc: 'Edit XP and OB Coins, resend password resets, delete accounts, and set the annual points reset date', href: '/admin/loyalty/customers', access: ['admin'] as Role[] },
      ],
    },
    {
      title: 'Administration',
      color: 'var(--red)',
      cards: [
        { label: 'Media Library', desc: 'View and delete previously uploaded images', href: '/admin/media', access: ALL_ROLES },
        { label: 'Manage Users',  desc: 'Create accounts and set access levels', href: '/admin/users', access: ['admin'] as Role[] },
        { label: 'Activity Log',  desc: 'See who created, edited, or deleted what, and when', href: '/admin/logs', access: ['admin'] as Role[] },
      ],
    },
  ]
    .map(section => ({
      ...section,
      cards: section.cards.filter(({ access }) => hasSectionAccess(role, isDungeonMaster, access)),
    }))
    .filter(section => section.cards.length > 0)

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

        {/* Sections */}
        {sections.map((section, i) => (
          <div key={section.title} style={{ marginTop: i === 0 ? 0 : '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: section.color, flexShrink: 0 }} />
              <p style={{
                fontSize: '0.72rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: section.color,
                fontFamily: 'var(--font-inter)',
                fontWeight: 600,
              }}>{section.title}</p>
              <span style={{ flex: 1, height: '1px', backgroundColor: `${section.color}30` }} />
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}>
              {section.cards.map(card => <DashboardCard key={card.label} {...card} color={section.color} />)}
            </div>
          </div>
        ))}

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
      background: `${color}0a`,
      border: `1px solid ${color}30`,
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
