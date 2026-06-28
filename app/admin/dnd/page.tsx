'use client'

import { useEffect, useState, useRef } from 'react'
import {
  collection, getDocs, addDoc, deleteDoc, query, where,
  doc, updateDoc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../lib/adminAuth'
import { logCreate, logUpdate, logDelete } from '../../lib/activityLog'
import { recordMediaUpload, uploadImage } from '../../lib/media'
import MediaPickerModal from '../../components/admin/MediaPickerModal'
import { DEFAULT_OPENING_START, DEFAULT_OPENING_END } from '../../lib/dndReservations'

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
  // Snapshot of the assigned DM's own branchIds/opening hours at the moment
  // the campaign was last saved — kept on the campaign doc (not looked up
  // live) so the public /dnd page can compute bookable locations and times
  // without needing to read adminUsers, which it has no permission to do as
  // a guest.
  dmBranchIds?: string[]
  dmOpeningStart?: string
  dmOpeningEnd?: string
  dmDaysOff?: string[]
  order: number
}

interface DmAccount {
  id: string
  email: string
  branchIds: string[]
  openingStart: string
  openingEnd: string
  daysOff: string[]
}

// Reads either the new `branchIds` array or the older singular `branchId`
// from accounts created before multi-branch support existed.
function normalizeBranchIds(data: { branchIds?: unknown; branchId?: unknown }): string[] {
  if (Array.isArray(data.branchIds)) return data.branchIds as string[]
  return data.branchId ? [data.branchId as string] : []
}

const EMPTY = {
  title: '',
  type: '',
  description: '',
  duration: '',
  sessions: 'Weekly',
  players: '4–6',
  level: 'Beginner Friendly',
  image: '',
  color: '#6A6AB7',
  locations: [] as string[],
  contactNumber: '+96181950042',
  dmUid: '' as string,
  order: 0,
}

const LEVELS = ['Beginner Friendly', 'Intermediate', 'Advanced', 'All Levels']
const COLORS = [
  { label: 'Purple', value: '#6A6AB7' },
  { label: 'Teal',   value: '#00A098' },
  { label: 'Red',    value: '#E43329' },
  { label: 'Navy',   value: '#32327C' },
]
const BRANCH_NUMBERS = [
  { label: 'Hamra',     number: '+96181950042' },
  { label: 'Zouk',      number: '+96170973242' },
  { label: 'Broummana', number: '+96176648054' },
]
const ALL_LOCATIONS = ['Beirut — Hamra', 'Zouk', 'Broummana']

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

export default function AdminDndPage() {
  const { checking } = useRequireRole(SECTION_ACCESS.dnd)
  const isMobile = useIsMobile()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [dms, setDms]             = useState<DmAccount[]>([])
  const [loading, setLoading]     = useState(true)
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState<Campaign | null>(null)
  const [form, setForm]           = useState({ ...EMPTY })
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const fileRef                   = useRef<HTMLInputElement>(null)

  async function loadCampaigns() {
    const snap = await getDocs(collection(db, 'dndCampaigns'))
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Campaign))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    setCampaigns(data)
    setLoading(false)
  }

  // Anyone with the dungeonmaster role, plus anyone of any other role who's
  // been separately flagged isDungeonMaster in Manage Users — merged and
  // deduped since the two queries can't be combined into one `where`.
  async function loadDms() {
    const [byRole, byFlag] = await Promise.all([
      getDocs(query(collection(db, 'adminUsers'), where('role', '==', 'dungeonmaster'))),
      getDocs(query(collection(db, 'adminUsers'), where('isDungeonMaster', '==', true))),
    ])
    const map = new Map<string, DmAccount>()
    for (const d of [...byRole.docs, ...byFlag.docs]) {
      const data = d.data()
      map.set(d.id, {
        id: d.id,
        email: (data.email as string) ?? d.id,
        branchIds: normalizeBranchIds(data),
        openingStart: (data.openingStart as string) || DEFAULT_OPENING_START,
        openingEnd: (data.openingEnd as string) || DEFAULT_OPENING_END,
        daysOff: Array.isArray(data.daysOff) ? data.daysOff as string[] : [],
      })
    }
    setDms([...map.values()].sort((a, b) => a.email.localeCompare(b.email)))
  }

  useEffect(() => { loadCampaigns(); loadDms() }, [])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url, deleteUrl, fileName } = await uploadImage(file)
      setForm(f => ({ ...f, image: url }))
      await recordMediaUpload({ url, deleteUrl, fileName })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed.')
      e.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  function toggleLocation(loc: string) {
    setForm(f => ({
      ...f,
      locations: f.locations.includes(loc)
        ? f.locations.filter(l => l !== loc)
        : [...f.locations, loc],
    }))
  }

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY, order: campaigns.length })
    setOpen(true)
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign)
    setForm({
      title:         campaign.title,
      type:          campaign.type,
      description:   campaign.description,
      duration:      campaign.duration,
      sessions:      campaign.sessions,
      players:       campaign.players,
      level:         campaign.level,
      image:         campaign.image,
      color:         campaign.color,
      locations:     campaign.locations ?? [],
      contactNumber: campaign.contactNumber ?? '+96181950042',
      dmUid:         campaign.dmUid ?? '',
      order:         campaign.order ?? 0,
    })
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // Refreshed from the live `dms` list on every save, so re-saving a
    // campaign (even with no other changes) picks up the DM's latest
    // branches/opening hours from Manage Users / their own Availability page.
    const selectedDm = form.dmUid ? dms.find(d => d.id === form.dmUid) : undefined
    const dmBranchIds = selectedDm?.branchIds ?? []
    const dmOpeningStart = selectedDm?.openingStart ?? DEFAULT_OPENING_START
    const dmOpeningEnd = selectedDm?.openingEnd ?? DEFAULT_OPENING_END
    const dmDaysOff = selectedDm?.daysOff ?? []
    const payload = { ...form, dmUid: form.dmUid || null, dmBranchIds, dmOpeningStart, dmOpeningEnd, dmDaysOff }
    if (editing) {
      await updateDoc(doc(db, 'dndCampaigns', editing.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      })
      await logUpdate('D&D Campaign', form.title, editing, payload)
    } else {
      await addDoc(collection(db, 'dndCampaigns'), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await logCreate('D&D Campaign', form.title, payload)
    }
    setSaving(false)
    setOpen(false)
    if (fileRef.current) fileRef.current.value = ''
    loadCampaigns()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign?')) return
    const campaign = campaigns.find(c => c.id === id)
    await deleteDoc(doc(db, 'dndCampaigns', id))
    await logDelete('D&D Campaign', campaign?.title ?? id, campaign)
    loadCampaigns()
  }

  async function moveUp(index: number) {
    if (index === 0) return
    const batch = writeBatch(db)
    batch.update(doc(db, 'dndCampaigns', campaigns[index].id),     { order: index - 1 })
    batch.update(doc(db, 'dndCampaigns', campaigns[index - 1].id), { order: index })
    await batch.commit()
    loadCampaigns()
  }

  async function moveDown(index: number) {
    if (index === campaigns.length - 1) return
    const batch = writeBatch(db)
    batch.update(doc(db, 'dndCampaigns', campaigns[index].id),     { order: index + 1 })
    batch.update(doc(db, 'dndCampaigns', campaigns[index + 1].id), { order: index })
    await batch.commit()
    loadCampaigns()
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#F5F2EC',
    padding: '0.75rem 1rem',
    borderRadius: '2px',
    fontSize: '0.85rem',
    outline: 'none',
    fontFamily: 'var(--font-inter)',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.68rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,242,236,0.35)',
    marginBottom: '0.5rem',
    fontFamily: 'var(--font-inter)',
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '1.25rem' : '0',
          marginBottom: '2rem',
        }}>
          <div>
            <a href="/admin" style={{
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(245,242,236,0.3)',
              textDecoration: 'none',
              fontFamily: 'var(--font-inter)',
              marginBottom: '0.5rem',
              display: 'block',
            }}>← Back to Dashboard</a>
            <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)' }}>
              D&D Campaigns
            </h1>
          </div>
          <button onClick={openNew} style={{
            backgroundColor: 'var(--navy)',
            color: '#fff',
            padding: '0.7rem 1.5rem',
            border: '1px solid rgba(106,106,183,0.4)',
            borderRadius: '2px',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
          }}>+ Add Campaign</button>
        </div>

        {/* Campaigns */}
        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : campaigns.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '4px',
            padding: '4rem',
            textAlign: 'center',
            color: 'rgba(245,242,236,0.2)',
            fontFamily: 'var(--font-inter)',
          }}>No campaigns yet — click + Add Campaign</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {campaigns.map((campaign, index) => (
              <div key={campaign.id} style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '120px 1fr auto',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                overflow: 'hidden',
                borderLeft: `4px solid ${campaign.color}`,
              }}>
                {/* Image */}
                {campaign.image ? (
                  <div style={{
                    height: isMobile ? '160px' : undefined,
                    backgroundImage: `url(${campaign.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} />
                ) : (
                  <div style={{
                    height: isMobile ? '160px' : undefined,
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.1)',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-inter)',
                  }}>No img</div>
                )}

                {/* Info */}
                <div style={{ padding: isMobile ? '1rem 1.25rem' : '1.2rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
                    <h3 style={{
                      fontFamily: 'var(--font-cinzel)',
                      fontSize: '1rem',
                      color: 'var(--offwhite)',
                    }}>{campaign.title}</h3>
                    <span style={{
                      fontSize: '0.62rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '2px',
                      backgroundColor: `${campaign.color}25`,
                      color: campaign.color,
                      fontFamily: 'var(--font-inter)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}>{campaign.type}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.72rem',
                    color: 'rgba(245,242,236,0.4)',
                    fontFamily: 'var(--font-inter)',
                    marginBottom: '0.4rem',
                    flexWrap: 'wrap',
                  }}>
                    <span>⏱ {campaign.duration}</span>
                    <span>👥 {campaign.players}</span>
                    <span>📅 {campaign.sessions}</span>
                    <span style={{ color: campaign.color }}>{campaign.level}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: campaign.dmUid ? 'var(--teal)' : 'rgba(228,51,41,0.7)', fontFamily: 'var(--font-inter)', marginBottom: '0.4rem' }}>
                    🎲 {campaign.dmUid ? (dms.find(d => d.id === campaign.dmUid)?.email ?? 'DM assigned') : 'No DM assigned — not bookable yet'}
                  </div>
                  {campaign.locations?.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '0.4rem',
                      flexWrap: 'wrap',
                    }}>
                      {campaign.locations.map(loc => (
                        <span key={loc} style={{
                          fontSize: '0.65rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '2px',
                          backgroundColor: 'rgba(0,160,152,0.1)',
                          color: 'var(--teal)',
                          fontFamily: 'var(--font-inter)',
                        }}>📍 {loc}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  gap: '0.4rem',
                  padding: isMobile ? '0 1.25rem 1.25rem' : '1rem',
                  justifyContent: isMobile ? 'space-between' : 'center',
                  alignItems: isMobile ? 'center' : 'flex-end',
                  minWidth: isMobile ? undefined : '160px',
                }}>
                  {/* Order buttons */}
                  <div style={{ display: 'flex', gap: '0.3rem', marginBottom: isMobile ? 0 : '0.4rem' }}>
                    <button onClick={() => moveUp(index)} disabled={index === 0} style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: index === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(245,242,236,0.5)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '2px',
                      fontSize: '0.7rem',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-inter)',
                    }}>↑</button>
                    <button onClick={() => moveDown(index)} disabled={index === campaigns.length - 1} style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: index === campaigns.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(245,242,236,0.5)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '2px',
                      fontSize: '0.7rem',
                      cursor: index === campaigns.length - 1 ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-inter)',
                    }}>↓</button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => openEdit(campaign)} style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(245,242,236,0.5)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '2px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-inter)',
                    }}>Edit</button>
                    <button onClick={() => handleDelete(campaign.id)} style={{
                      background: 'transparent',
                      border: '1px solid rgba(228,51,41,0.3)',
                      color: 'var(--red)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '2px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-inter)',
                    }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: '#0d0d0d',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '1.25rem 1.5rem' : '1.5rem 3rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: isMobile ? '1.1rem' : '1.5rem', color: 'var(--offwhite)' }}>
              {editing ? 'Edit Campaign' : 'Add New Campaign'}
            </h2>
            <button onClick={() => setOpen(false)} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,242,236,0.5)',
              padding: '0.5rem 1.2rem',
              borderRadius: '2px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>✕ Close</button>
          </div>

          <form onSubmit={handleSave} style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            overflow: isMobile ? 'auto' : 'hidden',
          }}>

            {/* Left */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2.5rem 3rem',
              borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
              borderBottom: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              overflowY: isMobile ? 'visible' : 'auto',
            }}>
              <p style={{
                fontSize: '0.68rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--purple)',
                fontFamily: 'var(--font-inter)',
              }}>Campaign Details</p>

              <div>
                <label style={labelStyle}>Title</label>
                <input type="text" value={form.title} required
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Type (e.g. Horror Campaign)</label>
                <input type="text" value={form.type} required
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} rows={4} required
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Duration</label>
                  <input type="text" value={form.duration} required
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sessions</label>
                  <input type="text" value={form.sessions} required
                    onChange={e => setForm(f => ({ ...f, sessions: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Players</label>
                  <input type="text" value={form.players} required
                    onChange={e => setForm(f => ({ ...f, players: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Level</label>
                  <select value={form.level}
                    onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    style={{ ...inputStyle, color: '#F5F2EC', backgroundColor: '#1a1a1a' }}>
                    {LEVELS.map(l => (
                      <option key={l} value={l} style={{ backgroundColor: '#1a1a1a', color: '#F5F2EC' }}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color */}
              <div>
                <label style={labelStyle}>Accent Color</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {COLORS.map(({ label, value }) => (
                    <button key={value} type="button"
                      onClick={() => setForm(f => ({ ...f, color: value }))}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '2px',
                        border: `2px solid ${form.color === value ? value : 'rgba(255,255,255,0.1)'}`,
                        backgroundColor: `${value}20`,
                        color: value,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                        fontSize: '0.72rem',
                      }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div>
                <label style={labelStyle}>Available Locations</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ALL_LOCATIONS.map(loc => (
                    <button key={loc} type="button"
                      onClick={() => toggleLocation(loc)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        backgroundColor: form.locations.includes(loc)
                          ? 'rgba(0,160,152,0.15)'
                          : 'transparent',
                        border: `1px solid ${form.locations.includes(loc)
                          ? 'var(--teal)'
                          : 'rgba(255,255,255,0.1)'}`,
                        color: form.locations.includes(loc)
                          ? 'var(--teal)'
                          : 'rgba(245,242,236,0.5)',
                        padding: '0.6rem 1rem',
                        borderRadius: '2px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}>
                      <span style={{
                        width: '16px', height: '16px',
                        borderRadius: '3px',
                        border: `1px solid ${form.locations.includes(loc) ? 'var(--teal)' : 'rgba(255,255,255,0.2)'}`,
                        backgroundColor: form.locations.includes(loc) ? 'var(--teal)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        color: '#fff',
                        flexShrink: 0,
                      }}>
                        {form.locations.includes(loc) ? '✓' : ''}
                      </span>
                      📍 {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dungeon Master */}
              <div>
                <label style={labelStyle}>Assigned Dungeon Master</label>
                <select value={form.dmUid}
                  onChange={e => setForm(f => ({ ...f, dmUid: e.target.value }))}
                  style={{ ...inputStyle, color: '#F5F2EC', backgroundColor: '#1a1a1a' }}>
                  <option value="">— Unassigned —</option>
                  {dms.map(dm => (
                    <option key={dm.id} value={dm.id} style={{ backgroundColor: '#1a1a1a', color: '#F5F2EC' }}>{dm.email}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.72rem', color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)', marginTop: '0.5rem' }}>
                  Customers can only book a session once a Dungeon Master is assigned. A DM's booked time is blocked across every campaign and location they're assigned to.
                </p>
                {form.dmUid && (() => {
                  const dm = dms.find(d => d.id === form.dmUid)
                  const dmBranches = dm?.branchIds ?? []
                  return (
                    <>
                      <p style={{ fontSize: '0.72rem', fontFamily: 'var(--font-inter)', marginTop: '0.4rem', color: dmBranches.length > 0 ? 'var(--teal)' : 'var(--red)' }}>
                        {dmBranches.length > 0
                          ? `This DM is assigned to: ${dmBranches.join(', ')}. Only locations on both lists are bookable.`
                          : `This DM has no branches assigned yet — set their branches in Manage Users, or nothing above will be bookable.`}
                      </p>
                      <p style={{ fontSize: '0.72rem', fontFamily: 'var(--font-inter)', marginTop: '0.3rem', color: 'rgba(245,242,236,0.3)' }}>
                        Bookable start times: {dm?.openingStart ?? DEFAULT_OPENING_START}–{dm?.openingEnd ?? DEFAULT_OPENING_END} (set by the DM in their Availability page).
                        {dm && dm.daysOff.length > 0 && ` This DM has ${dm.daysOff.length} day${dm.daysOff.length === 1 ? '' : 's'} off blocked.`}
                      </p>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Right */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2.5rem 3rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              overflowY: isMobile ? 'visible' : 'auto',
            }}>
              <p style={{
                fontSize: '0.68rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--purple)',
                fontFamily: 'var(--font-inter)',
              }}>Image & Contact</p>

              <div>
                <label style={labelStyle}>Campaign Image</label>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <input ref={fileRef} type="file" accept="image/*"
                    onChange={handleImageUpload}
                    style={{ ...inputStyle, cursor: 'pointer', flex: 1 }} />
                  <button type="button" onClick={() => setShowPicker(true)} style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(245,242,236,0.6)',
                    padding: '0.6rem 1rem',
                    borderRadius: '2px',
                    fontSize: '0.72rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                    whiteSpace: 'nowrap',
                  }}>Choose from Media</button>
                </div>
                {uploading && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--teal)', fontFamily: 'var(--font-inter)' }}>
                    Uploading…
                  </p>
                )}
              </div>

              {form.image && !uploading ? (
                <div style={{
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.06)',
                  height: '220px',
                }}>
                  <img src={form.image} alt="Preview" style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                  }} />
                </div>
              ) : (
                <div style={{
                  height: '220px',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(245,242,236,0.2)',
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.82rem',
                }}>Image preview will appear here</div>
              )}

              {/* Contact Number */}
              <div>
                <label style={labelStyle}>Default WhatsApp Contact</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  {BRANCH_NUMBERS.map(({ label, number }) => (
                    <button key={label} type="button"
                      onClick={() => setForm(f => ({ ...f, contactNumber: number }))}
                      style={{
                        backgroundColor: form.contactNumber === number ? 'rgba(0,160,152,0.15)' : 'transparent',
                        border: `1px solid ${form.contactNumber === number ? 'var(--teal)' : 'rgba(255,255,255,0.1)'}`,
                        color: form.contactNumber === number ? 'var(--teal)' : 'rgba(245,242,236,0.5)',
                        padding: '0.6rem 1rem',
                        borderRadius: '2px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                      }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ opacity: 0.7 }}>{number}</span>
                    </button>
                  ))}
                </div>
                <input type="tel" placeholder="+9611234567"
                  value={form.contactNumber}
                  onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))}
                  style={inputStyle} />
              </div>

              {/* Preview */}
              <div style={{
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                padding: '1.2rem',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <p style={{ ...labelStyle, marginBottom: '0.8rem' }}>WhatsApp Message Preview</p>
                <p style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: '0.78rem',
                  color: 'rgba(245,242,236,0.5)',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                }}>
                  "Hello, I would like to know more about the <span style={{ color: 'var(--teal)' }}>{form.title || '[Campaign Name]'}</span> campaign and how to start it."
                </p>
              </div>

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(245,242,236,0.5)',
                  padding: '0.9rem',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                }}>Cancel</button>
                <button type="submit" disabled={saving || uploading} style={{
                  flex: 1,
                  backgroundColor: 'var(--navy)',
                  border: '1px solid rgba(106,106,183,0.4)',
                  color: '#fff',
                  padding: '0.9rem',
                  borderRadius: '2px',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: saving || uploading ? 'not-allowed' : 'pointer',
                  opacity: saving || uploading ? 0.6 : 1,
                  fontFamily: 'var(--font-inter)',
                }}>{saving ? 'Saving…' : 'Save Campaign'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={url => setForm(f => ({ ...f, image: url }))}
      />
    </div>
  )
}