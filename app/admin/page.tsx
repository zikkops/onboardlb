'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRequireRole, hasSectionAccess, ALL_ROLES, SECTION_ACCESS, ROLE_LABELS, type Role } from '../lib/adminAuth'
import { usePendingTransactions } from '../lib/loyalty'
import { usePendingRedemptions } from '../lib/redemptions'
import { usePendingReservations } from '../lib/dndReservations'
import { usePendingEventReservations } from '../lib/eventReservations'
import { usePendingTableReservations } from '../lib/tableReservations'
import { checkAndRunLoyaltyReset, migratePrivateFieldsOnce, migrateNameFieldsOnce } from '../lib/customerManagement'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCashRegister, faReceipt, faDice, faUtensils, faCalendar, faCalendarCheck,
  faCalendarDay, faDiceD20, faDragon, faUsers, faUser, faClock, faMap,
  faClipboard, faThumbsUp, faGift, faTag, faTrophy, faUserShield,
  faFile, faPaperPlane, faTruck, faList, faImage, faScroll,
  faClockRotateLeft, faChair, faThumbtack, faGear, faXmark, faMoneyBill,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'

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
  const { checking, role, branchIds, sectionGrants, isDungeonMaster, user } = useRequireRole(ALL_ROLES)
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
  const canSeeDndReservations = hasSectionAccess(role, isDungeonMaster, SECTION_ACCESS.dndReservations, sectionGrants, 'dndReservations')
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

  // Admins see every pending table reservation; managers see their own
  // branches only (no "All Branches" literal here — unlike events, a table
  // reservation always belongs to exactly one real branch).
  const tableReservationFilter = useMemo(() => {
    if (checking || !role || !SECTION_ACCESS.tableReservations.includes(role)) return null
    return role === 'admin' ? 'all' : branchIds
  }, [checking, role, branchIds])
  const { reservations: pendingTableReservations } = usePendingTableReservations(tableReservationFilter)

  // No server/cron job exists in this app — the annual points reset is
  // checked passively here instead, the first time an admin opens the
  // dashboard on or after the configured date. See checkAndRunLoyaltyReset.
  useEffect(() => {
    if (!checking && role === 'admin') {
      checkAndRunLoyaltyReset()
      migratePrivateFieldsOnce()
      migrateNameFieldsOnce()
    }
  }, [checking, role])

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/admin/login')
  }

  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>([])
  useEffect(() => {
    if (!user?.uid) return
    const saved = localStorage.getItem(`quickaccess-${user.uid}`)
    if (saved) try { setPinnedHrefs(JSON.parse(saved)) } catch {}
  }, [user?.uid])

  function togglePin(href: string) {
    setPinnedHrefs(prev => {
      const next = prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
      if (user?.uid) localStorage.setItem(`quickaccess-${user.uid}`, JSON.stringify(next))
      return next
    })
  }

  // Every card within a section shares that section's color — the color is
  // the grouping signal, not a per-card decoration, so it's set once here
  // rather than picked individually for each card.
  const sections = [
    {
      title: 'Game Sales',
      color: 'var(--teal)',
      cards: [
        { label: 'Record a Sale',    icon: faCashRegister, daily: true,  desc: 'Process a game purchase, deduct stock, and generate an invoice', href: '/admin/games/purchase', access: SECTION_ACCESS.gamePurchases },
        { label: 'Sales & Invoices', icon: faReceipt,      daily: false, desc: 'View past sales, download invoices, and process refunds',       href: '/admin/games/invoices', access: SECTION_ACCESS.gamePurchases },
      ],
    },
    {
      title: 'Content Management',
      color: 'var(--teal)',
      cards: [
        { label: 'Event Reservations', icon: faCalendarCheck, daily: true,  desc: 'Approve or reject pending event spot requests',        href: '/admin/events/reservations', access: SECTION_ACCESS.events, badge: pendingEventReservations.length },
        { label: 'Manage Games',       icon: faDice,          daily: false, desc: 'Add, edit or remove games from the shop',              href: '/admin/games',               access: SECTION_ACCESS.games },
        { label: 'Manage Menu',        icon: faUtensils,      daily: false, desc: 'Update food and drink items',                           href: '/admin/menu',                access: SECTION_ACCESS.menu },
        { label: 'Manage Events',      icon: faCalendar,      daily: false, desc: 'Create and manage D&D sessions and events',            href: '/admin/events',              access: SECTION_ACCESS.events },
        { label: 'D&D Campaigns',      icon: faDragon,        daily: false, desc: 'Add and manage D&D campaigns',                         href: '/admin/dnd',                 access: SECTION_ACCESS.dnd },
      ],
    },
    {
      title: 'D&D Bookings',
      color: 'var(--purple)',
      cards: [
        { label: 'D&D Reservations',  icon: faDiceD20,     daily: true,  desc: 'Approve or reject pending session booking requests',                      href: '/admin/dnd/reservations', access: SECTION_ACCESS.dndReservations, badge: pendingDndReservations.length },
        { label: 'D&D Schedule',      icon: faCalendarDay, daily: true,  desc: 'See upcoming sessions and who is coming',                                  href: '/admin/dnd/schedule',     access: SECTION_ACCESS.dndReservations },
        { label: 'D&D Groups',        icon: faUsers,       daily: true,  desc: 'Sort customers looking for players into tables for each campaign',         href: '/admin/dnd/groups',       access: SECTION_ACCESS.dndGroups },
        { label: 'Your Availability', icon: faClock,       daily: true,  desc: 'Set your opening hours and days off for session bookings',                 href: '/admin/dnd/availability', access: SECTION_ACCESS.dmAvailability },
      ],
    },
    {
      title: 'Table Bookings',
      color: 'var(--navy)',
      cards: [
        { label: "Today's Schedule",   icon: faCalendarDay, daily: true,  desc: 'All approved reservations for today — tables, events, and D&D', href: '/admin/schedule',            access: SECTION_ACCESS.tableReservations },
        { label: 'Table Reservations', icon: faChair,       daily: true,  desc: 'Approve or reject pending table booking requests',               href: '/admin/tables/reservations', access: SECTION_ACCESS.tableReservations, badge: pendingTableReservations.length },
        { label: 'Table Map Editor',   icon: faMap,         daily: false, desc: 'Upload floor plans and place table markers for each branch',     href: '/admin/branches/tables',     access: SECTION_ACCESS.branchTables },
      ],
    },
    {
      title: 'Loyalty Submissions',
      color: 'var(--navy)',
      cards: [
        { label: 'D&D Session Attendance', icon: faDiceD20,   daily: true, desc: 'Log session attendees to send them for manager approval', href: '/admin/loyalty/dnd',    access: SECTION_ACCESS.loyaltyDnd },
        { label: 'Event Attendance',       icon: faClipboard, daily: true, desc: 'Log event attendees to send them for manager approval',   href: '/admin/loyalty/events', access: SECTION_ACCESS.loyaltyEvents },
      ],
    },
    {
      title: 'Loyalty Approvals',
      color: 'var(--navy)',
      cards: [
        { label: 'Loyalty Approvals',   icon: faThumbsUp, daily: true, desc: 'Approve or reject pending XP and OB Coin submissions',  href: '/admin/loyalty/approvals',   access: SECTION_ACCESS.loyalty, badge: pendingLoyalty.length },
        { label: 'Redemption Requests', icon: faGift,     daily: true, desc: 'Confirm or reject pending OB Coin redemption requests', href: '/admin/loyalty/redemptions', access: SECTION_ACCESS.loyalty, badge: pendingRedemptions.length },
      ],
    },
    {
      title: 'Loyalty Catalog',
      color: 'var(--navy)',
      cards: [
        { label: 'Redemption Items', icon: faTag,    daily: false, desc: 'Add, edit or deactivate items customers can redeem with OB Coins',        href: '/admin/loyalty/redemption-items', access: SECTION_ACCESS.loyalty },
        { label: 'Level Perks',      icon: faTrophy, daily: false, desc: 'Edit the perks customers unlock at each level, shown on the Loyalty page', href: '/admin/loyalty/perks',            access: SECTION_ACCESS.loyalty },
      ],
    },
    {
      title: 'Customer Accounts',
      color: 'var(--navy)',
      cards: [
        { label: 'Manage Customers', icon: faUser,            daily: false, desc: 'Edit XP and OB Coins, resend password resets, delete accounts, and set the annual points reset date', href: '/admin/loyalty/customers', access: ['admin'] as Role[] },
        { label: 'Loyalty Activity', icon: faClockRotateLeft, daily: false, desc: 'Submissions, approvals, rejections, and redemption item changes',                                     href: '/admin/loyalty/activity',  access: SECTION_ACCESS.loyalty },
      ],
    },
    {
      title: 'Weekly Orders',
      color: 'var(--teal)',
      cards: [
        { label: 'End of Week Order', icon: faPaperPlane, daily: true,  desc: "Fill in quantities and submit this week's stock order",             href: '/admin/weekly-orders/submit',    access: SECTION_ACCESS.weeklyOrdersSubmit },
        { label: 'Order Reports',    icon: faFile,       daily: true,  desc: 'View all end-of-week order reports submitted by staff',             href: '/admin/weekly-orders',           access: SECTION_ACCESS.weeklyOrders },
        { label: 'Manage Providers', icon: faTruck,      daily: false, desc: 'Add suppliers with per-branch phone numbers for WhatsApp ordering', href: '/admin/weekly-orders/providers', access: ['admin'] as Role[] },
        { label: 'Edit Template',    icon: faList,       daily: false, desc: 'Manage orderable items, pack sizes, Arabic names, and units',      href: '/admin/weekly-orders/template',  access: ['admin'] as Role[] },
      ],
    },
    {
      title: 'End of Day',
      color: '#C9962C',
      cards: [
        { label: 'Submit EOD Report', icon: faMoneyBill,       daily: true,  desc: 'Fill in cash count, expenses, income, and attendance for the end of shift', href: '/admin/end-of-day',          access: SECTION_ACCESS.endOfDay },
        { label: 'EOD History',       icon: faClockRotateLeft, daily: true,  desc: 'Browse past end-of-day reports by branch',                                   href: '/admin/end-of-day/history',  access: SECTION_ACCESS.endOfDayHistory },
        { label: 'Daily Summary',     icon: faReceipt,         daily: true,  desc: 'View daily totals and add tips — mobile-friendly for screenshots',           href: '/admin/end-of-day/summary',  access: SECTION_ACCESS.endOfDayHistory },
        { label: 'Staff Roster',      icon: faUsers,           daily: false, desc: 'Configure the default staff list per branch for EOD attendance tracking',    href: '/admin/end-of-day/staff',    access: ['admin'] as Role[] },
      ],
    },
    {
      title: 'Administration',
      color: 'var(--red)',
      cards: [
        { label: 'Media Library', icon: faImage,      daily: false, desc: 'View and delete previously uploaded images',          href: '/admin/media', access: ALL_ROLES },
        { label: 'Manage Users',  icon: faUserShield, daily: false, desc: 'Create accounts and set access levels',               href: '/admin/users', access: ['admin'] as Role[] },
        { label: 'Activity Log',  icon: faScroll,     daily: false, desc: 'See who created, edited, or deleted what, and when', href: '/admin/logs',  access: ['admin'] as Role[] },
      ],
    },
  ]
    .map(section => ({
      ...section,
      cards: section.cards.filter(({ access }) => {
        const key = Object.entries(SECTION_ACCESS).find(([, v]) => v === access)?.[0]
        return hasSectionAccess(role, isDungeonMaster, access, sectionGrants, key)
      }),
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
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <Link
              href="/"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(245,242,236,0.5)',
                padding: '0.6rem 1.5rem',
                borderRadius: '2px',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-inter)',
                textDecoration: 'none',
              }}
            >
              View Site
            </Link>
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
        </div>

        {/* Quick Access */}
        {(() => {
          const allCards = sections.flatMap(s => s.cards.map(c => ({ ...c, color: s.color })))
          const pinned = pinnedHrefs.map(h => allCards.find(c => c.href === h)).filter(Boolean) as typeof allCards
          return (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.25rem' }}>
                <FontAwesomeIcon icon={faThumbtack} style={{ fontSize: '0.65rem', color: 'rgba(245,242,236,0.4)' }} />
                <p style={{
                  fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: 'rgba(245,242,236,0.4)', fontFamily: 'var(--font-inter)', fontWeight: 600,
                }}>Quick Access</p>
                <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
              </div>
              {pinned.length === 0 ? (
                <p style={{
                  fontFamily: 'var(--font-inter)', fontSize: '0.78rem',
                  color: 'rgba(245,242,236,0.2)', fontStyle: 'italic',
                  border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '6px',
                  padding: '1.25rem 1.5rem',
                }}>
                  Hover any card below and click the <FontAwesomeIcon icon={faThumbtack} style={{ margin: '0 0.3rem' }} /> pin to add it here.
                </p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                  gap: '0.75rem',
                }}>
                  {pinned.map(card => (
                    <div key={card.href} style={{ position: 'relative' }}>
                      <a href={card.href} style={{
                        display: 'flex', alignItems: 'center', gap: '0.8rem',
                        background: `${card.color}0d`,
                        borderTop: `2px solid ${card.color}`,
                        borderRight: `1px solid ${card.color}25`,
                        borderBottom: `1px solid ${card.color}25`,
                        borderLeft: `1px solid ${card.color}25`,
                        borderRadius: '6px', padding: '0.85rem 1rem',
                        textDecoration: 'none', paddingRight: '2.2rem',
                      }}>
                        <FontAwesomeIcon icon={card.icon} style={{ color: card.color, fontSize: '1rem', width: '1rem', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'var(--offwhite)', fontWeight: 500, lineHeight: 1.3 }}>
                          {card.label}
                        </span>
                        {card.badge != null && card.badge > 0 && (
                          <span style={{
                            marginLeft: 'auto', backgroundColor: 'var(--red)', color: '#fff',
                            borderRadius: '999px', minWidth: '20px', height: '20px', padding: '0 0.3rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.68rem', fontFamily: 'var(--font-inter)', fontWeight: 700, flexShrink: 0,
                          }}>{card.badge}</span>
                        )}
                      </a>
                      <button
                        onClick={() => togglePin(card.href)}
                        title="Remove from Quick Access"
                        style={{
                          position: 'absolute', top: '0.4rem', right: '0.4rem',
                          background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem',
                          color: 'rgba(245,242,236,0.25)', fontSize: '0.65rem', lineHeight: 1,
                        }}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Needs Attention */}
        {(() => {
          const attention = sections.flatMap(s =>
            s.cards.filter(c => c.badge && c.badge > 0).map(c => ({ ...c, color: s.color }))
          )
          if (attention.length === 0) return null
          return (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.25rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--red)', flexShrink: 0 }} />
                <p style={{
                  fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: 'var(--red)', fontFamily: 'var(--font-inter)', fontWeight: 600,
                }}>Needs Attention</p>
                <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(180,30,30,0.3)' }} />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(attention.length, 3)}, 1fr)`,
                gap: '1rem',
              }}>
                {attention.map(card => (
                  <a key={card.label} href={card.href} style={{
                    display: 'flex', alignItems: 'center', gap: '1.2rem',
                    background: 'rgba(200,50,50,0.07)',
                    borderTop: '1px solid rgba(200,50,50,0.25)',
                    borderRight: '1px solid rgba(200,50,50,0.25)',
                    borderBottom: '1px solid rgba(200,50,50,0.25)',
                    borderLeft: '4px solid var(--red)',
                    borderRadius: '4px', padding: '1.1rem 1.4rem', textDecoration: 'none',
                  }}>
                    <FontAwesomeIcon icon={card.icon} style={{ fontSize: '1.4rem', color: card.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.95rem', color: 'var(--offwhite)', marginBottom: '0.1rem' }}>{card.label}</p>
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.4)' }}>
                        {card.badge} pending
                      </p>
                    </div>
                    <span style={{
                      backgroundColor: 'var(--red)', color: '#fff', borderRadius: '999px',
                      minWidth: '28px', height: '28px', padding: '0 0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.82rem', fontFamily: 'var(--font-inter)', fontWeight: 700, flexShrink: 0,
                    }}>{card.badge}</span>
                  </a>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Sections */}
        {sections.map((section, i) => {
          const dailyCards  = section.cards.filter(c => c.daily)
          const configCards = section.cards.filter(c => !c.daily)
          return (
            <div key={section.title} style={{ marginTop: i === 0 ? 0 : '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.25rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: section.color, flexShrink: 0 }} />
                <p style={{
                  fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: section.color, fontFamily: 'var(--font-inter)', fontWeight: 600,
                }}>{section.title}</p>
                <span style={{ flex: 1, height: '1px', backgroundColor: `${section.color}30` }} />
              </div>

              {dailyCards.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                  gap: '1.5rem',
                  marginBottom: configCards.length > 0 ? '1rem' : 0,
                }}>
                  {dailyCards.map(card => (
                    <DashboardCard
                      key={card.label} {...card} color={section.color}
                      pinned={pinnedHrefs.includes(card.href)}
                      onTogglePin={() => togglePin(card.href)}
                    />
                  ))}
                </div>
              )}

              {configCards.length > 0 && (
                <>
                  {dailyCards.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
                      <FontAwesomeIcon icon={faGear} style={{ fontSize: '0.6rem', color: 'rgba(245,242,236,0.2)' }} />
                      <span style={{
                        fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: 'rgba(245,242,236,0.2)', fontFamily: 'var(--font-inter)',
                      }}>Configure</span>
                      <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: '1.5rem',
                  }}>
                    {configCards.map(card => (
                      <DashboardCard
                        key={card.label} {...card} color={section.color}
                        pinned={pinnedHrefs.includes(card.href)}
                        onTogglePin={() => togglePin(card.href)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}

function DashboardCard({ label, desc, href, color, badge, icon, daily, pinned, onTogglePin }: {
  label: string
  desc: string
  href: string
  color: string
  badge?: number
  icon: IconDefinition
  daily: boolean
  pinned: boolean
  onTogglePin: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: hovered ? `${color}14` : `${color}08`,
        borderTop: `3px solid ${color}`,
        borderRight: `1px solid ${hovered ? `${color}55` : `${color}25`}`,
        borderBottom: `1px solid ${hovered ? `${color}55` : `${color}25`}`,
        borderLeft: `1px solid ${hovered ? `${color}55` : `${color}25`}`,
        borderRadius: '6px',
        padding: '1.5rem',
        textDecoration: 'none',
        transition: 'background 0.15s, border-color 0.15s, transform 0.15s, opacity 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        opacity: daily || hovered ? 1 : 0.55,
      }}
    >
      {!!badge && badge > 0 && (
        <span style={{
          position: 'absolute', top: '-10px', right: '1.2rem',
          backgroundColor: 'var(--red)', color: '#fff', borderRadius: '999px',
          minWidth: '24px', height: '24px', padding: '0 0.4rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontFamily: 'var(--font-inter)', fontWeight: 600,
          border: '2px solid var(--black)',
        }}>{badge}</span>
      )}

      {/* Pin button — visible on hover or when already pinned */}
      {(hovered || pinned) && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onTogglePin() }}
          title={pinned ? 'Remove from Quick Access' : 'Add to Quick Access'}
          style={{
            position: 'absolute', top: '0.7rem', right: '0.8rem',
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
            color: pinned ? color : 'rgba(245,242,236,0.25)',
            fontSize: '0.75rem', lineHeight: 1,
            transform: pinned ? 'rotate(-45deg)' : 'none',
            transition: 'color 0.15s, transform 0.15s',
          }}
        >
          <FontAwesomeIcon icon={faThumbtack} />
        </button>
      )}

      <FontAwesomeIcon icon={icon} style={{ fontSize: '1.5rem', color, width: '1.5rem' }} />
      <div>
        <h2 style={{
          fontFamily: 'var(--font-cinzel)', fontSize: '1rem',
          color: 'var(--offwhite)', marginBottom: '0.35rem',
        }}>{label}</h2>
        <p style={{
          fontFamily: 'var(--font-inter)', fontSize: '0.78rem',
          color: 'rgba(245,242,236,0.4)', lineHeight: 1.5,
        }}>{desc}</p>
      </div>
    </a>
  )
}
