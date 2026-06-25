'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  doc, onSnapshot, updateDoc,
  collection, query, where, orderBy, limit, type Timestamp,
} from 'firebase/firestore'
import { db, auth } from '../../../lib/firebase'
import { useCustomerUser, signOutCustomer } from '../../../lib/customerAuth'
import { useIsMobile } from '../../../lib/useIsMobile'
import { useUserRedemptions, type Redemption } from '../../../lib/redemptions'
import Skeleton from '../../../components/Skeleton'
import { getLevelFromXP, TIER_COLORS } from '../../../lib/levelConfig'
import { resolveBranchName } from '../../../lib/branches'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPen, faReceipt, faCalendarDay, faDiceD20, type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'

interface CustomerProfile {
  username: string
  displayName: string
  email: string
  avatarUrl: string
  avatarDeleteUrl?: string | null
  themeId: string
  xp: number
  level: number
  levelTitle: string
  obCoins: number
  badges: string[]
}

interface Transaction {
  id: string
  type: 'check' | 'event' | 'dnd'
  userId: string[]
  xpAmount: number
  coinsAmount: number
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: string
  approvedBy?: string
  checkPhotoUrl?: string
  checkNumber?: string
  branchId: string
  createdAt: Timestamp | null
}

const TYPE_INFO: Record<Transaction['type'], { label: string; icon: IconDefinition }> = {
  check: { label: 'Check',        icon: faReceipt },
  event: { label: 'Event',        icon: faCalendarDay },
  dnd:   { label: 'D&D Session',  icon: faDiceD20 },
}

const STATUS_COLORS: Record<Transaction['status'], string> = {
  pending:  '#E5A33D',
  approved: '#2ECC71',
  rejected: 'var(--red)',
}

const REDEMPTION_STATUS_COLORS: Record<Redemption['status'], string> = {
  pending:  '#E5A33D',
  redeemed: '#2ECC71',
  rejected: 'var(--red)',
}

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—'
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Theme {
  id: string
  label: string
  background: string
  accent: string
}

const THEMES: Theme[] = [
  { id: 'dungeon',     label: 'Dungeon',    background: '#1a1a2e', accent: '#16213e' },
  { id: 'forest',      label: 'Forest',     background: '#0F6E56', accent: '#1D9E75' },
  { id: 'arcane',      label: 'Arcane',     background: '#3C3489', accent: '#7F77DD' },
  { id: 'ember',       label: 'Ember',      background: '#854F0B', accent: '#EF9F27' },
  { id: 'siege',       label: 'Siege',      background: '#993C1D', accent: '#D85A30' },
  { id: 'ocean',       label: 'Ocean',      background: '#185FA5', accent: '#378ADD' },
  { id: 'ash',         label: 'Ash',        background: '#444441', accent: '#888780' },
  { id: 'blood-moon',  label: 'Blood Moon', background: '#4B1528', accent: '#D4537E' },
]

const DEFAULT_THEME = THEMES[0]

// Stable, key-free placeholder avatars (deterministic SVGs from a seed —
// no risk of a guessed photo URL not existing). Fantasy-styled to match the
// site's D&D/tabletop theme.
const PREMADE_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Aiden',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Zephyr',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Nova',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Orion',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Willow',
]

function TransactionCard({
  tx, theme, isMobile, showStatus, showCheckDetails, showSplit, onImageClick,
}: {
  tx: Transaction
  theme: Theme
  isMobile: boolean
  showStatus?: boolean
  showCheckDetails?: boolean
  showSplit?: boolean
  onImageClick: (url: string) => void
}) {
  const info = TYPE_INFO[tx.type]
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: isMobile ? '0.8rem' : '1rem',
      padding: isMobile ? '1rem' : '1.2rem',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '4px',
      width: '100%',
    }}>
      <div style={{
        width: '40px', height: '40px',
        borderRadius: '50%',
        backgroundColor: `${theme.accent}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <FontAwesomeIcon icon={info.icon} style={{ width: '16px', color: theme.accent }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
          <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.9rem', color: 'var(--offwhite)' }}>{info.label}</p>
          {showStatus && (
            <span style={{
              fontSize: '0.62rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '2px',
              backgroundColor: `${STATUS_COLORS[tx.status]}25`,
              color: STATUS_COLORS[tx.status],
              fontFamily: 'var(--font-inter)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>{tx.status}</span>
          )}
        </div>

        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.5)', marginTop: '0.3rem' }}>
          {resolveBranchName(tx.branchId)} · {formatDate(tx.createdAt)}
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'var(--teal)' }}>+{tx.xpAmount} XP</span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: theme.accent }}>+{tx.coinsAmount} OB Coins</span>
        </div>

        {showSplit && tx.userId.length > 1 && (
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.4)', marginTop: '0.4rem' }}>
            Split with {tx.userId.length - 1} other{tx.userId.length - 1 === 1 ? '' : 's'}
          </p>
        )}

        {showCheckDetails && tx.type === 'check' && (tx.checkPhotoUrl || tx.checkNumber) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.6rem' }}>
            {tx.checkPhotoUrl && (
              <button
                onClick={() => onImageClick(tx.checkPhotoUrl!)}
                style={{
                  width: isMobile ? '60px' : '50px',
                  height: isMobile ? '60px' : '50px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: 0,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <img src={tx.checkPhotoUrl} alt="Check" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            )}
            {tx.checkNumber && (
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.5)' }}>
                Check #{tx.checkNumber}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Matches the hover treatment used by the home page's hero/nav buttons —
// background lightens to a translucent tint of `color` with a blur, plus a
// diagonal shine sweeps across. `color` must be a literal hex value (not a
// CSS var()) since the tint/glow below append alpha digits onto it directly.
function ActionButton({ href, label, color, variant = 'solid' }: {
  href: string
  label: string
  color: string
  variant?: 'solid' | 'outline'
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
        display: 'block',
        textAlign: 'center',
        backgroundColor: hovered ? `${color}15` : (variant === 'solid' ? color : 'transparent'),
        color: variant === 'solid' || hovered ? '#fff' : 'rgba(245,242,236,0.7)',
        border: `1px solid ${hovered ? color : (variant === 'solid' ? color : 'rgba(255,255,255,0.1)')}`,
        padding: '0.9rem',
        borderRadius: '4px',
        fontSize: '0.8rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        fontFamily: 'var(--font-inter)',
        backdropFilter: hovered ? 'blur(10px)' : 'none',
        boxShadow: hovered ? `0 0 20px ${color}50, inset 0 0 20px ${color}15` : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 0,
        left: hovered ? '120%' : '-60%',
        width: '40%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
        transform: 'skewX(-20deg)',
        transition: 'left 0.5s ease',
        pointerEvents: 'none',
      }} />
      {label}
    </Link>
  )
}

export default function CustomerProfilePage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { user } = useCustomerUser()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [publicFeed, setPublicFeed]   = useState<Transaction[]>([])
  const [fullHistory, setFullHistory] = useState<Transaction[]>([])
  const [pending, setPending]         = useState<Transaction[]>([])
  const [loadingPublicFeed, setLoadingPublicFeed] = useState(true)
  const [privateTab, setPrivateTab]   = useState<'history' | 'pending' | 'redemptions'>('history')
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  // This page only ever shows the signed-in user's own profile right now —
  // there's no /customer/profile/[uid] route yet to view someone else's.
  // Written as a comparison rather than a hardcoded `true` so a future
  // shared-profile-view route can swap in a different profileUid without
  // touching the gating logic below.
  const profileUid = user?.uid ?? null
  const isOwnProfile = !!user && !!profileUid && user.uid === profileUid

  const { redemptions } = useUserRedemptions(isOwnProfile ? profileUid : null)

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, snap => {
      const data = snap.data() as CustomerProfile
      setProfile(data)

      // Keep the stored level/levelTitle in sync with xp, so other parts of
      // the app can read them directly without recomputing the curve. Only
      // writes when they actually differ, so this can't loop — the write
      // that follows makes the next snapshot already match.
      const computed = getLevelFromXP(data.xp)
      if (data.level !== computed.level || data.levelTitle !== computed.levelTitle) {
        updateDoc(ref, { level: computed.level, levelTitle: computed.levelTitle }).catch(() => {})
      }
    })
    return unsub
  }, [user])

  // Public feed — last 5 approved transactions. Visible regardless of whose
  // profile this is.
  useEffect(() => {
    if (!profileUid) return
    const q = query(
      collection(db, 'transactions'),
      where('userId', 'array-contains', profileUid),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    const unsub = onSnapshot(q, snap => {
      setPublicFeed(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))
      setLoadingPublicFeed(false)
    })
    return unsub
  }, [profileUid])

  // Private — full history (all statuses, no limit). Owner only.
  useEffect(() => {
    if (!isOwnProfile || !profileUid) return
    const q = query(
      collection(db, 'transactions'),
      where('userId', 'array-contains', profileUid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setFullHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))
    })
    return unsub
  }, [isOwnProfile, profileUid])

  // Private — pending submissions only. Owner only.
  useEffect(() => {
    if (!isOwnProfile || !profileUid) return
    const q = query(
      collection(db, 'transactions'),
      where('userId', 'array-contains', profileUid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setPending(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))
    })
    return unsub
  }, [isOwnProfile, profileUid])

  async function handleSignOut() {
    await signOutCustomer()
    router.replace('/customer/login')
  }

  // Best-effort cleanup of whatever avatar they're replacing — only does
  // anything if the old one was a custom upload we host (premade avatars
  // and Google photos have no delete URL, so this is a no-op for those).
  async function deleteOldAvatarIfAny() {
    const deleteUrl = profile?.avatarDeleteUrl
    if (!deleteUrl) return
    try {
      const idToken = await auth.currentUser?.getIdToken()
      await fetch('/api/media/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ deleteUrl }),
      })
    } catch {
      // Not fatal — the new avatar still gets set either way.
    }
  }

  async function handleSelectPremadeAvatar(url: string) {
    if (!user) return
    await deleteOldAvatarIfAny()
    await updateDoc(doc(db, 'users', user.uid), { avatarUrl: url, avatarDeleteUrl: null })
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('key', process.env.NEXT_PUBLIC_IMGBB_API_KEY!)
      const res  = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData })
      const data = await res.json()
      await deleteOldAvatarIfAny()
      await updateDoc(doc(db, 'users', user.uid), {
        avatarUrl: data.data.url,
        avatarDeleteUrl: data.data.delete_url ?? null,
      })
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSelectTheme(themeId: string) {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid), { themeId })
  }

  const theme = THEMES.find(t => t.id === profile?.themeId) ?? DEFAULT_THEME
  const avatarSize = isMobile ? '80px' : '120px'
  const initials = (profile?.displayName || '?').trim().charAt(0).toUpperCase()
  const levelInfo = getLevelFromXP(profile?.xp ?? 0)
  const tierColor = TIER_COLORS[levelInfo.tier] ?? TIER_COLORS.Apprentice

  const sectionLabelStyle = {
    fontSize: '0.65rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,242,236,0.3)',
    fontFamily: 'var(--font-inter)',
    marginBottom: '1rem',
  }

  const emptyStateStyle = {
    border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: '4px',
    padding: isMobile ? '2rem 1rem' : '2.5rem',
    textAlign: 'center' as const,
    color: 'rgba(245,242,236,0.3)',
    fontFamily: 'var(--font-inter)',
    fontSize: '0.85rem',
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{
              padding: isMobile ? '2rem 1.25rem' : '3rem',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? '1.25rem' : '2rem',
            }}>
              <Skeleton width={avatarSize} height={avatarSize} borderRadius="50%" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, width: isMobile ? '100%' : 'auto' }}>
                <Skeleton width="50%" height="1.5rem" />
                <Skeleton width="35%" height="1rem" />
                <Skeleton width="30%" height="1rem" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Profile Card */}
        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Banner */}
          <div style={{
            backgroundColor: theme.background,
            padding: isMobile ? '2rem 1.25rem' : '3rem',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'flex-start',
            gap: isMobile ? '1.25rem' : '2rem',
            textAlign: isMobile ? 'center' : 'left',
          }}>

            {/* Avatar — click to open the customize popup */}
            <button
              onClick={() => setModalOpen(true)}
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
              style={{
                position: 'relative',
                width: avatarSize,
                height: avatarSize,
                borderRadius: '50%',
                overflow: 'hidden',
                border: `3px solid ${theme.accent}`,
                backgroundColor: 'rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{
                  fontFamily: 'var(--font-cinzel)',
                  fontSize: isMobile ? '1.8rem' : '2.6rem',
                  color: 'rgba(245,242,236,0.5)',
                }}>{initials}</span>
              )}

              {/* Hover overlay (desktop) */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: avatarHovered ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}>
                <span style={{
                  color: '#fff',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter)',
                }}>Edit</span>
              </div>

              {/* Persistent edit badge (always visible — covers touch/mobile, where hover doesn't apply) */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: isMobile ? '26px' : '30px',
                height: isMobile ? '26px' : '30px',
                borderRadius: '50%',
                backgroundColor: theme.accent,
                border: '2px solid var(--black)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FontAwesomeIcon icon={faPen} style={{ width: '11px', color: '#fff' }} />
              </div>
            </button>

            {/* Info */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: isMobile ? 'center' : 'flex-start',
              minWidth: 0,
              width: isMobile ? '100%' : 'auto',
              flex: isMobile ? undefined : 1,
            }}>
              <h1 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: isMobile ? '1.4rem' : '1.9rem',
                color: '#fff',
                wordBreak: 'break-word',
              }}>{profile.displayName || profile.username}</h1>

              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                gap: isMobile ? '0.4rem' : '0.6rem',
              }}>
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.75)',
                }}>
                  Level {levelInfo.level} — {levelInfo.levelTitle}
                </p>
                <span style={{
                  fontSize: '0.62rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '2px',
                  backgroundColor: `${tierColor}30`,
                  color: tierColor,
                  fontFamily: 'var(--font-inter)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>{levelInfo.tier}</span>
              </div>

              {/* XP Bar */}
              <div style={{ width: '100%', marginTop: '0.2rem', marginBottom: '0.3rem' }}>
                <div style={{
                  width: '100%',
                  height: '10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${levelInfo.progressPercent}%`,
                    backgroundColor: theme.accent,
                    borderRadius: '6px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: isMobile ? '0.68rem' : '0.75rem',
                  color: 'rgba(255,255,255,0.55)',
                  marginTop: '0.4rem',
                }}>
                  {levelInfo.level >= 50
                    ? 'Max level reached'
                    : `${(profile.xp ?? 0).toLocaleString()} / ${levelInfo.nextLevelXP.toLocaleString()} XP`}
                </p>
              </div>

              <p style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '1.1rem',
                color: theme.accent,
              }}>
                {profile.obCoins} OB Coins
              </p>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                justifyContent: isMobile ? 'center' : 'flex-start',
                marginTop: '0.3rem',
              }}>
                {profile.badges && profile.badges.length > 0 ? (
                  profile.badges.map(badge => (
                    <span key={badge} style={{
                      fontSize: '0.68rem',
                      padding: '0.25rem 0.7rem',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontFamily: 'var(--font-inter)',
                      letterSpacing: '0.05em',
                    }}>{badge}</span>
                  ))
                ) : (
                  <span style={{
                    fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'var(--font-inter)',
                  }}>No badges yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.8rem' }}>
          <ActionButton href="/customer/submit-check" label="Submit a Check" color="#6A6AB7" />
          <ActionButton href="/customer/redeem" label="Redeem OB Coins" color="#00A098" />
          <ActionButton href="/customer/friends" label="Friends" color="#00A098" variant="outline" />
        </div>

        {/* Public Activity Feed — last 5 approved transactions, visible to anyone */}
        <div>
          <p style={sectionLabelStyle}>Recent Activity</p>
          {loadingPublicFeed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {[0, 1].map(i => <Skeleton key={i} height="76px" borderRadius="4px" />)}
            </div>
          ) : publicFeed.length === 0 ? (
            <div style={emptyStateStyle}>No activity yet — come visit us!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {publicFeed.map(tx => (
                <TransactionCard key={tx.id} tx={tx} theme={theme} isMobile={isMobile} onImageClick={setViewingImage} />
              ))}
            </div>
          )}
        </div>

        {/* Private — full history + pending submissions. Owner only. */}
        {isOwnProfile && (
          <div>
            <p style={sectionLabelStyle}>Your History</p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {(['history', 'pending', 'redemptions'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPrivateTab(tab)}
                  style={{
                    flex: isMobile ? 1 : 'initial',
                    backgroundColor: privateTab === tab ? theme.accent : 'transparent',
                    border: `1px solid ${privateTab === tab ? theme.accent : 'rgba(255,255,255,0.1)'}`,
                    color: privateTab === tab ? '#fff' : 'rgba(245,242,236,0.5)',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '2px',
                    fontSize: '0.75rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  {tab === 'history' ? 'Full History' : tab === 'pending' ? `Pending${pending.length > 0 ? ` (${pending.length})` : ''}` : 'Redemptions'}
                </button>
              ))}
            </div>

            {privateTab === 'history' ? (
              fullHistory.length === 0 ? (
                <div style={emptyStateStyle}>Your adventure hasn&apos;t started yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {fullHistory.map(tx => (
                    <TransactionCard
                      key={tx.id} tx={tx} theme={theme} isMobile={isMobile}
                      showStatus showCheckDetails showSplit onImageClick={setViewingImage}
                    />
                  ))}
                </div>
              )
            ) : privateTab === 'pending' ? (
              pending.length === 0 ? (
                <div style={emptyStateStyle}>No pending submissions</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {pending.map(tx => (
                    <TransactionCard
                      key={tx.id} tx={tx} theme={theme} isMobile={isMobile}
                      showStatus onImageClick={setViewingImage}
                    />
                  ))}
                </div>
              )
            ) : (
              redemptions.length === 0 ? (
                <div style={emptyStateStyle}>No redemption requests yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {redemptions.map(r => (
                    <div key={r.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: isMobile ? '0.8rem' : '1rem',
                      padding: isMobile ? '1rem' : '1.2rem',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '4px',
                      width: '100%',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.9rem', color: 'var(--offwhite)' }}>{r.itemName}</p>
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '2px',
                            backgroundColor: `${REDEMPTION_STATUS_COLORS[r.status]}25`,
                            color: REDEMPTION_STATUS_COLORS[r.status],
                            fontFamily: 'var(--font-inter)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}>{r.status}</span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.5)', marginTop: '0.3rem' }}>
                          {r.itemDescription}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: theme.accent }}>-{r.coinCost} OB Coins</span>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.4)' }}>
                            {resolveBranchName(r.branchId)} · {formatDate(r.createdAt)}
                          </span>
                        </div>
                        {r.status === 'rejected' && r.rejectionReason && (
                          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'var(--red)', marginTop: '0.4rem' }}>
                            Reason: {r.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        <button onClick={handleSignOut} style={{
          alignSelf: isMobile ? 'stretch' : 'flex-start',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(245,242,236,0.6)',
          padding: '0.7rem 1.5rem',
          borderRadius: '2px',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter)',
        }}>Sign Out</button>
      </div>

      {/* Customize Profile Modal — avatar + theme color */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '1.25rem' : '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#0d0d0d',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              <h3 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.1rem', color: 'var(--offwhite)' }}>
                Customize Profile
              </h3>
              <button onClick={() => setModalOpen(false)} style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(245,242,236,0.5)',
                padding: '0.4rem 1rem',
                borderRadius: '2px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>✕ Close</button>
            </div>

            <div style={{
              padding: isMobile ? '1.25rem' : '1.75rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
            }}>

              {/* Avatar picker */}
              <div>
                <p style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,242,236,0.3)',
                  fontFamily: 'var(--font-inter)',
                  marginBottom: '1rem',
                }}>Choose an Avatar</p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.8rem',
                  marginBottom: '1.2rem',
                }}>
                  {PREMADE_AVATARS.map(url => {
                    const selected = profile.avatarUrl === url
                    return (
                      <button
                        key={url}
                        onClick={() => handleSelectPremadeAvatar(url)}
                        disabled={uploadingAvatar}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          padding: 0,
                          backgroundColor: '#1a1a1a',
                          border: selected ? `3px solid ${theme.accent}` : '2px solid rgba(255,255,255,0.1)',
                          cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    )
                  })}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  style={{
                    width: '100%',
                    backgroundColor: theme.accent,
                    color: '#fff',
                    border: 'none',
                    padding: '0.8rem',
                    borderRadius: '2px',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-inter)',
                    cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                    opacity: uploadingAvatar ? 0.6 : 1,
                  }}
                >
                  {uploadingAvatar ? 'Uploading…' : 'Upload Your Own Image'}
                </button>
              </div>

              {/* Theme picker */}
              <div>
                <p style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,242,236,0.3)',
                  fontFamily: 'var(--font-inter)',
                  marginBottom: '1rem',
                }}>Theme Color</p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.8rem',
                  justifyItems: 'center',
                }}>
                  {THEMES.map(t => {
                    const selected = t.id === profile.themeId
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTheme(t.id)}
                        aria-label={t.label}
                        title={t.label}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: t.background,
                          border: selected ? `3px solid ${t.accent}` : '2px solid rgba(255,255,255,0.15)',
                          boxShadow: selected ? `0 0 0 2px #0d0d0d, 0 0 0 4px ${t.accent}` : 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen check photo viewer */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            cursor: 'pointer',
          }}
        >
          <img src={viewingImage} alt="Check" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
      )}
    </div>
  )
}
