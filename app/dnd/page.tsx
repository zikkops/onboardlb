'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Skeleton from '../components/Skeleton'
import ReservationModal from '../components/dnd/ReservationModal'
import { useCustomerUser } from '../lib/customerAuth'
import { useUserLfpEntries, joinLfp, leaveLfp, startLfpParty, type LfpEntry } from '../lib/dndGroups'
import { fetchCustomerDirectory, type DirectoryUser } from '../lib/friends'
import Link from 'next/link'

interface Campaign {
  id: string
  title: string
  type: string
  description: string
  duration: string
  sessions: string
  players: string
  level: string
  image: string
  color: string
  locations: string[]
  contactNumber?: string
  dmUid?: string | null
  dmBranchIds?: string[]
  dmOpeningStart?: string
  dmOpeningEnd?: string
  dmDaysOff?: string[]
  order: number
}

const FALLBACK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    title: 'Curse of Strahd',
    type: 'Horror Campaign',
    description: 'Delve into the dark land of Barovia, ruled by the vampire lord Strahd von Zarovich. A gothic horror adventure for those who dare.',
    duration: '6–12 months',
    sessions: 'Weekly',
    players: '4–6',
    level: 'Intermediate',
    image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=800&q=80',
    color: '#E43329',
    locations: ['Beirut — Hamra', 'Zouk'],
    contactNumber: '+96181950042',
    order: 0,
  },
  {
    id: '2',
    title: 'Eve of Ruin — Vecna',
    type: 'Epic Campaign',
    description: 'Face the undying lich lord Vecna before he unmakes reality itself. A multiverse-spanning adventure for seasoned adventurers.',
    duration: '8–14 months',
    sessions: 'Weekly',
    players: '4–6',
    level: 'Advanced',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
    color: '#6A6AB7',
    locations: ['Beirut — Hamra'],
    contactNumber: '+96181950042',
    order: 1,
  },
  {
    id: '3',
    title: 'The Rise of Tiamat',
    type: 'Dragon Campaign',
    description: 'Stop the Cult of the Dragon from summoning Tiamat, the five-headed Dragon Queen, from her prison in the Nine Hells.',
    duration: '4–8 months',
    sessions: 'Weekly',
    players: '4–6',
    level: 'Beginner Friendly',
    image: 'https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=800&q=80',
    color: '#00A098',
    locations: ['Beirut — Hamra', 'Zouk', 'Broummana'],
    contactNumber: '+96181950042',
    order: 2,
  },
]

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

const faqs = [
  {
    q: 'Do I need experience to join?',
    a: 'Not at all! We welcome complete beginners. Our Dungeon Masters will walk you through everything you need to know before your first session.',
  },
  {
    q: 'What do I need to bring?',
    a: 'Just yourself and your imagination. We provide dice, character sheets, rulebooks, and all the materials you need.',
  },
  {
    q: 'How long is each session?',
    a: 'Sessions typically run 3–4 hours. We recommend arriving 15 minutes early for your first session.',
  },
  {
    q: 'How much does it cost?',
    a: 'Session fees vary by campaign. Reserve a session directly from this page to check availability — pricing is confirmed along with your booking.',
  },
  {
    q: 'Can I join an ongoing campaign?',
    a: 'It depends on the campaign and where the group is in the story. Contact us and we will find the best fit for you.',
  },
]

export default function DndPage() {
  const [campaigns, setCampaigns]     = useState<Campaign[]>([])
  const [loading, setLoading]         = useState(true)
  const [hoveredBtn, setHoveredBtn]   = useState<string | null>(null)
  const [openFaq, setOpenFaq]         = useState<number | null>(null)
  const [reserving, setReserving]     = useState<{ campaign: Campaign; location: string } | null>(null)
  const [hoveredFaq, setHoveredFaq]   = useState<number | null>(null)
  const isMobile = useIsMobile()
  const { user } = useCustomerUser()
  const { entries: lfpEntries } = useUserLfpEntries(user?.uid ?? null)
  const [lfpBusyId, setLfpBusyId]     = useState<string | null>(null)
  // Which branch is currently picked in each campaign's LFP join control —
  // only matters while choosing, before an entry exists.
  const [lfpLocation, setLfpLocation] = useState<Record<string, string>>({})

  // Inline "alone vs. with friends" panel state (up to 2 friends)
  interface LfpPanel { campaignId: string; withFriend: boolean; friendQuery: string; selectedFriends: DirectoryUser[] }
  const [lfpPanel, setLfpPanel]           = useState<LfpPanel | null>(null)
  const [lfpDirectory, setLfpDirectory]   = useState<DirectoryUser[]>([])
  const [lfpDirLoading, setLfpDirLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'dndCampaigns'))
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Campaign))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      setCampaigns(data.length > 0 ? data : FALLBACK_CAMPAIGNS)
      setLoading(false)
    }
    load()
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleJoinLfp(campaign: Campaign, location: string) {
    if (!user) return
    setLfpBusyId(campaign.id)
    try {
      await joinLfp({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        location,
        userId: user.uid,
        userName: user.displayName || user.email || 'Customer',
      })
    } finally {
      setLfpBusyId(null)
    }
  }

  async function ensureDirectoryLoaded() {
    if (!user || lfpDirLoading || lfpDirectory.length > 0) return
    setLfpDirLoading(true)
    try {
      const dir = await fetchCustomerDirectory(user.uid)
      setLfpDirectory(dir)
    } finally {
      setLfpDirLoading(false)
    }
  }

  async function handleStartParty(campaign: Campaign, location: string, friends: DirectoryUser[]) {
    if (!user) return
    setLfpBusyId(campaign.id)
    try {
      await startLfpParty({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        location,
        leaderUid: user.uid,
        leaderName: user.displayName || user.email || 'Customer',
        friends: friends.map(f => ({ uid: f.uid, name: f.displayName })),
      })
      setLfpPanel(null)
    } finally {
      setLfpBusyId(null)
    }
  }

  async function handleLeaveLfp(entry: LfpEntry) {
    setLfpBusyId(entry.campaignId)
    try {
      await leaveLfp(entry)
    } finally {
      setLfpBusyId(null)
    }
  }

  const displayCampaigns = campaigns.length > 0 ? campaigns : FALLBACK_CAMPAIGNS

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          minHeight: isMobile ? '50vh' : '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          paddingBottom: isMobile ? '3rem' : '4rem',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/images/bg-dnd.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(50,50,124,0.3) 100%)',
          }} />

          <div style={{ position: 'relative', zIndex: 1, paddingTop: isMobile ? '11rem' : '10rem' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Dungeons & Dragons</p>

            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '2.2rem' : '4rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}>
              Enter the Realm<br />of Adventure
            </h1>

            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: isMobile ? '0.85rem' : '1rem',
              color: 'rgba(245,242,236,0.55)',
              maxWidth: isMobile ? '300px' : '480px',
              lineHeight: 1.8,
              marginBottom: '2.5rem',
            }}>
              Lebanon's home for Dungeons & Dragons. Epic campaigns, expert Dungeon Masters, all materials provided.
            </p>

            {/* Scroll Buttons */}
            <div style={{ display: 'flex', gap: isMobile ? '0.6rem' : '1rem', justifyContent: 'center' }}>
              {([
                { key: 'campaigns', label: 'Campaigns' },
                { key: 'faq',       label: 'FAQ' },
              ] as const).map(({ key, label }) => {
                const isHovered = hoveredBtn === key
                return (
                  <button
                    key={key}
                    onClick={() => scrollTo(key)}
                    onMouseEnter={() => setHoveredBtn(key)}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      width: isMobile ? '130px' : '160px',
                      backgroundColor: isHovered
                        ? 'rgba(106,106,183,0.2)'
                        : 'rgba(106,106,183,0.1)',
                      color: '#fff',
                      padding: isMobile ? '0.7rem 0.5rem' : '0.7rem 2rem',
                      borderRadius: '2px',
                      fontSize: '0.78rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      border: `1px solid ${isHovered ? 'var(--purple)' : 'rgba(106,106,183,0.35)'}`,
                      backdropFilter: 'blur(10px)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.3s ease',
                      boxShadow: isHovered
                        ? '0 0 20px rgba(106,106,183,0.3), inset 0 0 20px rgba(106,106,183,0.1)'
                        : 'none',
                    }}>
                    <span style={{
                      position: 'absolute',
                      top: 0,
                      left: isHovered ? '120%' : '-60%',
                      width: '40%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transform: 'skewX(-20deg)',
                      transition: 'left 0.5s ease',
                      pointerEvents: 'none',
                    }} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '3rem 1.25rem' : '5rem 3rem' }}>

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: isMobile ? '1rem' : '1.5rem',
            marginBottom: isMobile ? '3rem' : '6rem',
          }}>
            {[
              { title: 'Weekly Sessions',        text: 'Regular games every week at all 3 branches' },
              { title: 'All Levels Welcome',     text: 'Beginners to veterans — everyone has a seat at the table' },
              { title: 'Expert Dungeon Masters', text: 'Our DMs craft stories you will never forget' },
              { title: 'All Materials Provided', text: 'Dice, character sheets, rulebooks — all included' },
            ].map(({ title, text }) => (
              <div key={title} style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '1.5rem',
                border: '1px solid rgba(106,106,183,0.15)',
                borderRadius: '4px',
                background: 'rgba(50,50,124,0.05)',
              }}>
                <div style={{
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--purple)',
                  marginTop: '6px',
                  flexShrink: 0,
                }} />
                <div>
                  <p style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '0.9rem',
                    color: 'var(--offwhite)',
                    marginBottom: '0.3rem',
                  }}>{title}</p>
                  <p style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.8rem',
                    color: 'rgba(245,242,236,0.45)',
                    lineHeight: 1.7,
                  }}>{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Campaigns */}
          <div id="campaigns" style={{ marginBottom: isMobile ? '3rem' : '6rem', scrollMarginTop: '80px' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Active Campaigns</p>

            <h2 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              color: 'var(--offwhite)',
              marginBottom: '1.5rem',
            }}>Choose Your Adventure</h2>

            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--purple)',
              marginBottom: isMobile ? '2rem' : '3rem',
            }} />

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.5rem' : '2rem' }}>
                {[0, 1].map(i => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '380px 1fr',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <Skeleton height={isMobile ? '180px' : '300px'} borderRadius="0" />
                    <div style={{ padding: isMobile ? '1.5rem' : '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <Skeleton width="35%" height="1.6rem" />
                      <Skeleton width="90%" height="0.9rem" />
                      <Skeleton width="80%" height="0.9rem" />
                      <Skeleton width="60%" height="0.9rem" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1.5rem' : '2rem' }}>
                {displayCampaigns.map(campaign => (
                  <div key={campaign.id} style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '380px 1fr',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    borderTop: `3px solid ${campaign.color}`,
                  }}>

                    {/* Image */}
                    <div style={{
                      position: 'relative',
                      backgroundImage: `url(${campaign.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      minHeight: isMobile ? '180px' : '300px',
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to right, transparent, rgba(10,10,10,0.3))',
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '1.2rem', left: '1.2rem',
                        backgroundColor: campaign.color,
                        color: '#fff',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '2px',
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-inter)',
                      }}>{campaign.type}</div>
                    </div>

                    {/* Content */}
                    <div style={{
                      padding: isMobile ? '1.25rem' : '2rem',
                      background: 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <h3 style={{
                        fontFamily: 'var(--font-cinzel)',
                        fontSize: isMobile ? '1.2rem' : '1.6rem',
                        color: 'var(--offwhite)',
                        marginBottom: '0.8rem',
                      }}>{campaign.title}</h3>

                      <p style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: isMobile ? '0.82rem' : '0.88rem',
                        color: 'rgba(245,242,236,0.5)',
                        lineHeight: 1.8,
                        marginBottom: '1.5rem',
                      }}>{campaign.description}</p>

                      {/* Details */}
                      <div style={{
                        display: 'flex',
                        gap: isMobile ? '1rem 1.5rem' : '2rem',
                        flexWrap: 'wrap',
                        marginBottom: '1.5rem',
                      }}>
                        {[
                          { label: 'Duration',  value: campaign.duration },
                          { label: 'Sessions',  value: campaign.sessions },
                          { label: 'Players',   value: campaign.players },
                          { label: 'Level',     value: campaign.level },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p style={{
                              fontSize: '0.62rem',
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: 'rgba(245,242,236,0.3)',
                              fontFamily: 'var(--font-inter)',
                              marginBottom: '0.2rem',
                            }}>{label}</p>
                            <p style={{
                              fontFamily: 'var(--font-cinzel)',
                              fontSize: '0.85rem',
                              color: 'var(--offwhite)',
                            }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Locations — bookable only where the campaign lists the
                          location AND the assigned DM is also assigned there
                          (campaign.dmBranchIds, snapshotted from the DM's own
                          branches in Manage Users). */}
                      {campaign.locations?.length > 0 && (() => {
                        const bookableLocations = new Set(campaign.dmUid ? (campaign.dmBranchIds ?? []) : [])
                        const anyBookable = campaign.locations.some(loc => bookableLocations.has(loc))
                        return (
                          <div style={{ marginTop: 'auto' }}>
                            <p style={{
                              fontSize: '0.65rem',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              color: 'rgba(245,242,236,0.3)',
                              fontFamily: 'var(--font-inter)',
                              marginBottom: '0.8rem',
                            }}>{anyBookable ? 'Available at — click to reserve a session' : 'Available at'}</p>
                            <div style={{
                              display: 'flex',
                              gap: '0.6rem',
                              flexWrap: 'wrap',
                            }}>
                              {campaign.locations.map(loc => (
                                bookableLocations.has(loc) ? (
                                  <button
                                    key={loc}
                                    type="button"
                                    onClick={() => setReserving({ campaign, location: loc })}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                      backgroundColor: `${campaign.color}15`,
                                      border: `1px solid ${campaign.color}50`,
                                      color: campaign.color,
                                      padding: '0.5rem 1rem',
                                      borderRadius: '2px',
                                      fontSize: '0.78rem',
                                      letterSpacing: '0.05em',
                                      cursor: 'pointer',
                                      fontFamily: 'var(--font-inter)',
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${campaign.color}30`
                                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = campaign.color
                                    }}
                                    onMouseLeave={e => {
                                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${campaign.color}15`
                                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${campaign.color}50`
                                    }}
                                  >
                                    📍 {loc}
                                  </button>
                                ) : (
                                  <span
                                    key={loc}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                      backgroundColor: 'rgba(255,255,255,0.03)',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      color: 'rgba(245,242,236,0.35)',
                                      padding: '0.5rem 1rem',
                                      borderRadius: '2px',
                                      fontSize: '0.78rem',
                                      letterSpacing: '0.05em',
                                      fontFamily: 'var(--font-inter)',
                                    }}
                                  >
                                    📍 {loc}
                                  </span>
                                )
                              ))}
                            </div>
                            {!anyBookable && (
                              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.25)', marginTop: '0.6rem' }}>
                                {campaign.dmUid
                                  ? 'Booking opens once the assigned Dungeon Master has branches set up.'
                                  : 'Booking opens once a Dungeon Master is assigned to this campaign.'}
                              </p>
                            )}
                          </div>
                        )
                      })()}

                      {/* Looking for Players — joining a campaign's queue
                          has no date/time at all, unlike the booking flow
                          above; staff sort interested customers into
                          groups from the admin side. */}
                      {(() => {
                        const entry = lfpEntries.find(e => e.campaignId === campaign.id)
                        const busy = lfpBusyId === campaign.id
                        const locations = campaign.locations ?? []
                        const chosenLocation = lfpLocation[campaign.id] ?? locations[0] ?? ''
                        const panel = lfpPanel?.campaignId === campaign.id ? lfpPanel : null
                        const selectedFriends = panel?.selectedFriends ?? []
                        const selectedIds = new Set(selectedFriends.map(f => f.uid))
                        const filteredDir = (panel?.friendQuery
                          ? lfpDirectory.filter(u => u.displayName.toLowerCase().includes(panel.friendQuery.toLowerCase()) || u.email.toLowerCase().includes(panel.friendQuery.toLowerCase()))
                          : lfpDirectory.slice(0, 6)
                        ).filter(u => !selectedIds.has(u.uid))
                        return (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            {!user ? (
                              <Link href="/customer/login" style={{
                                fontFamily: 'var(--font-inter)', fontSize: '0.75rem',
                                color: campaign.color, textDecoration: 'none',
                              }}>Sign in to look for players →</Link>
                            ) : locations.length === 0 ? null : !entry ? (
                              <>
                                {/* Location picker (always visible when multi-branch) */}
                                {locations.length > 1 && (
                                  <div style={{ marginBottom: '0.7rem' }}>
                                    <select
                                      value={chosenLocation}
                                      onChange={e => setLfpLocation(prev => ({ ...prev, [campaign.id]: e.target.value }))}
                                      style={{
                                        backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'var(--offwhite)', padding: '0.5rem 0.7rem', borderRadius: '2px',
                                        fontSize: '0.75rem', fontFamily: 'var(--font-inter)',
                                      }}
                                    >
                                      {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                    </select>
                                  </div>
                                )}

                                {!panel ? (
                                  /* Step 1 — entry button */
                                  <button
                                    onClick={() => setLfpPanel({ campaignId: campaign.id, withFriend: false, friendQuery: '', selectedFriends: [] })}
                                    disabled={busy}
                                    style={{
                                      background: 'transparent',
                                      border: `1px solid ${campaign.color}50`,
                                      color: campaign.color,
                                      padding: '0.5rem 1rem',
                                      borderRadius: '2px',
                                      fontSize: '0.75rem',
                                      letterSpacing: '0.05em',
                                      cursor: busy ? 'not-allowed' : 'pointer',
                                      opacity: busy ? 0.6 : 1,
                                      fontFamily: 'var(--font-inter)',
                                    }}
                                  >{busy ? 'Joining…' : `🔍 Looking for Players${locations.length > 1 ? '' : ` at ${chosenLocation}`}`}</button>
                                ) : !panel.withFriend ? (
                                  /* Step 2 — alone or with a friend */
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.35)', marginBottom: '0.2rem' }}>
                                      How do you want to join?
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <button
                                        onClick={() => { handleJoinLfp(campaign, chosenLocation); setLfpPanel(null) }}
                                        disabled={busy}
                                        style={{
                                          background: 'transparent', border: `1px solid ${campaign.color}50`,
                                          color: campaign.color, padding: '0.5rem 1rem', borderRadius: '2px',
                                          fontSize: '0.75rem', cursor: busy ? 'not-allowed' : 'pointer',
                                          opacity: busy ? 0.6 : 1, fontFamily: 'var(--font-inter)',
                                        }}
                                      >{busy ? 'Joining…' : 'Join alone'}</button>
                                      <button
                                        onClick={() => {
                                          setLfpPanel(p => p ? { ...p, withFriend: true } : null)
                                          ensureDirectoryLoaded()
                                        }}
                                        style={{
                                          background: `${campaign.color}15`, border: `1px solid ${campaign.color}60`,
                                          color: campaign.color, padding: '0.5rem 1rem', borderRadius: '2px',
                                          fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-inter)',
                                        }}
                                      >👥 Bring a friend</button>
                                      <button
                                        onClick={() => setLfpPanel(null)}
                                        style={{
                                          background: 'transparent', border: 'none',
                                          color: 'rgba(245,242,236,0.3)', fontSize: '0.72rem',
                                          cursor: 'pointer', fontFamily: 'var(--font-inter)', padding: '0.5rem',
                                        }}
                                      >Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Step 3 — friend picker (up to 2) */
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.35)' }}>
                                      {selectedFriends.length === 0
                                        ? 'Add up to 2 friends'
                                        : selectedFriends.length === 1
                                          ? 'Add one more friend, or confirm'
                                          : 'Party full — confirm when ready'}
                                    </p>

                                    {/* Selected friend chips */}
                                    {selectedFriends.length > 0 && (
                                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {selectedFriends.map(f => (
                                          <div key={f.uid} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            backgroundColor: `${campaign.color}15`, border: `1px solid ${campaign.color}40`,
                                            borderRadius: '2px', padding: '0.35rem 0.7rem',
                                          }}>
                                            <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'var(--offwhite)' }}>
                                              👤 {f.displayName}
                                            </span>
                                            <button
                                              onClick={() => setLfpPanel(p => p ? { ...p, selectedFriends: p.selectedFriends.filter(x => x.uid !== f.uid) } : null)}
                                              style={{ background: 'none', border: 'none', color: 'rgba(245,242,236,0.4)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0 0 0.2rem', lineHeight: 1 }}
                                            >✕</button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Search input + results — hidden once 2 friends selected */}
                                    {selectedFriends.length < 2 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <input
                                          autoFocus={selectedFriends.length === 0}
                                          type="text"
                                          placeholder="Search by name…"
                                          value={panel.friendQuery}
                                          onChange={e => setLfpPanel(p => p ? { ...p, friendQuery: e.target.value } : null)}
                                          style={{
                                            backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
                                            color: 'var(--offwhite)', padding: '0.55rem 0.8rem', borderRadius: '2px',
                                            fontSize: '0.78rem', fontFamily: 'var(--font-inter)', outline: 'none',
                                            width: '220px',
                                          }}
                                        />
                                        {lfpDirLoading ? (
                                          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.3)' }}>Loading…</p>
                                        ) : filteredDir.length === 0 ? (
                                          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.3)' }}>No users found.</p>
                                        ) : (
                                          <div style={{
                                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px',
                                            backgroundColor: '#111', maxHeight: '160px', overflowY: 'auto',
                                          }}>
                                            {filteredDir.map(u => (
                                              <button
                                                key={u.uid}
                                                onClick={() => setLfpPanel(p => p ? { ...p, selectedFriends: [...p.selectedFriends, u], friendQuery: '' } : null)}
                                                style={{
                                                  display: 'block', width: '100%', textAlign: 'left',
                                                  background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                  color: 'var(--offwhite)', padding: '0.55rem 0.8rem',
                                                  fontSize: '0.78rem', fontFamily: 'var(--font-inter)', cursor: 'pointer',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                              >
                                                {u.displayName}
                                                {u.email && <span style={{ color: 'rgba(245,242,236,0.3)', fontSize: '0.7rem', marginLeft: '0.5rem' }}>{u.email}</span>}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Confirm / Cancel row */}
                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                      {selectedFriends.length > 0 && (
                                        <button
                                          onClick={() => handleStartParty(campaign, chosenLocation, selectedFriends)}
                                          disabled={busy}
                                          style={{
                                            backgroundColor: campaign.color, color: '#fff', border: 'none',
                                            padding: '0.5rem 1.2rem', borderRadius: '2px',
                                            fontSize: '0.75rem', letterSpacing: '0.05em',
                                            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                                            fontFamily: 'var(--font-inter)',
                                          }}
                                        >{busy ? 'Joining…' : 'Confirm'}</button>
                                      )}
                                      <button
                                        onClick={() => setLfpPanel(null)}
                                        style={{
                                          background: 'transparent', border: 'none',
                                          color: 'rgba(245,242,236,0.3)', fontSize: '0.72rem',
                                          cursor: 'pointer', fontFamily: 'var(--font-inter)', padding: '0.5rem 0',
                                        }}
                                      >Cancel</button>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : entry.status === 'waiting' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.5)' }}>
                                  ✓ Waiting for a group{entry.location ? ` at ${entry.location}` : ''}
                                </span>
                                <button
                                  onClick={() => handleLeaveLfp(entry)}
                                  disabled={busy}
                                  style={{
                                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(245,242,236,0.4)', padding: '0.3rem 0.8rem', borderRadius: '2px',
                                    fontSize: '0.7rem', cursor: busy ? 'not-allowed' : 'pointer',
                                    opacity: busy ? 0.6 : 1, fontFamily: 'var(--font-inter)',
                                  }}
                                >{busy ? 'Leaving…' : 'Leave Queue'}</button>
                              </div>
                            ) : (
                              <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: campaign.color }}>
                                ✓ You&apos;re grouped{entry.location ? ` at ${entry.location}` : ''}! See your profile for who&apos;s with you.
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FAQ */}
          <div id="faq" style={{ scrollMarginTop: '80px' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Got Questions?</p>

            <h2 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              color: 'var(--offwhite)',
              marginBottom: '1.5rem',
            }}>Frequently Asked</h2>

            <div style={{
              width: '60px', height: '2px',
              backgroundColor: 'var(--purple)',
              marginBottom: isMobile ? '2rem' : '3rem',
            }} />

            <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column' }}>
              {faqs.map(({ q, a }, i) => (
                <div key={q} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    onMouseEnter={() => setHoveredFaq(i)}
                    onMouseLeave={() => setHoveredFaq(null)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: isMobile ? '1.4rem 0' : '1.8rem 0',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: '1rem',
                    }}>
                    <p style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      color: hoveredFaq === i ? 'var(--purple)' : 'var(--offwhite)',
                      transition: 'color 0.2s ease',
                    }}>{q}</p>
                    <span style={{
                      color: 'var(--purple)',
                      fontSize: '0.8rem',
                      transition: 'transform 0.3s',
                      transform: openFaq === i ? 'rotate(180deg)' : hoveredFaq === i ? 'scale(1.2)' : 'rotate(0deg)',
                      flexShrink: 0,
                    }}>▼</span>
                  </button>
                  <div style={{
                    maxHeight: openFaq === i ? '200px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.88rem',
                      color: 'rgba(245,242,236,0.5)',
                      lineHeight: 1.8,
                      paddingBottom: '1.8rem',
                    }}>{a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {reserving && reserving.campaign.dmUid && (
        <ReservationModal
          campaign={{
            id: reserving.campaign.id,
            title: reserving.campaign.title,
            color: reserving.campaign.color,
            dmUid: reserving.campaign.dmUid,
            dmOpeningStart: reserving.campaign.dmOpeningStart,
            dmOpeningEnd: reserving.campaign.dmOpeningEnd,
            dmDaysOff: reserving.campaign.dmDaysOff,
          }}
          location={reserving.location}
          onClose={() => setReserving(null)}
        />
      )}
    </>
  )
}