'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useRequireRole, SECTION_ACCESS } from '../../../lib/adminAuth'
import { useStaffContactDirectory, migrateNameFieldsOnce, migratePrivateFieldsOnce } from '../../../lib/customerManagement'
import {
  useLfpEntriesForCampaign, useGroupsForCampaign, createGroup, addToGroup,
  removeFromGroup, transferToGroup, mergeGroups, deleteGroup, setGroupLocked, sameLocation, type LfpEntry, type DndGroup,
} from '../../../lib/dndGroups'

// Real name + phone — staff-only, kept off anything another customer
// could read. Lets a DM/admin match a username in the pool to the actual
// person showing up to play.
function contactLine(contact: { firstName: string; lastName: string; phoneNumber: string } | undefined): string | null {
  if (!contact || (!contact.firstName && !contact.lastName && !contact.phoneNumber)) return null
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ')
  return contact.phoneNumber ? (name ? `${name} · ${contact.phoneNumber}` : contact.phoneNumber) : name
}

interface Campaign {
  id: string
  title: string
  color: string
  dmUid?: string | null
  players: string
  locations: string[]
}

// "4–6" -> 6, "4" -> 4 — same free-text parsing already used for games'
// player counts (app/shop/page.tsx) since campaigns store it the same way.
function maxPlayers(playersStr: string): number | null {
  const nums = playersStr.match(/\d+/g)?.map(Number) ?? []
  if (nums.length === 0) return null
  return Math.max(...nums)
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

const inputStyle = {
  width: '100%',
  backgroundColor: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F2EC',
  padding: '0.7rem 1rem',
  borderRadius: '2px',
  fontSize: '0.85rem',
  outline: 'none',
  fontFamily: 'var(--font-inter)',
}

const actionBtnStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(245,242,236,0.6)',
  padding: '0.35rem 0.7rem',
  borderRadius: '2px',
  fontSize: '0.68rem',
  cursor: 'pointer',
  fontFamily: 'var(--font-inter)',
  whiteSpace: 'nowrap' as const,
}

export default function DndGroupsPage() {
  const { checking, role, isDungeonMaster, user } = useRequireRole(SECTION_ACCESS.dndGroups)
  const isMobile = useIsMobile()

  // Same one-time passive migration app/admin/page.tsx already triggers —
  // repeated here too so an admin landing directly on this page (rather
  // than via the dashboard root first) still gets real name/phone moved
  // into the place this page reads them from. Idempotent; a double-run
  // across both pages is harmless.
  useEffect(() => {
    if (!checking && role === 'admin') {
      migratePrivateFieldsOnce()
      migrateNameFieldsOnce()
    }
  }, [checking, role])

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  // Defaults to the combined view across every visible campaign, rather
  // than requiring staff to pick one before seeing anything — narrowing to
  // a single campaign is still available via the picker below.
  const [selectedId, setSelectedId] = useState<string | 'all'>('all')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCampaignId, setNewGroupCampaignId] = useState('')
  const [newGroupLocation, setNewGroupLocation] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(() => {
    getDocs(collection(db, 'dndCampaigns')).then(snap => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)))
      setLoadingCampaigns(false)
    }).catch(err => {
      console.error('[DndGroupsPage] dndCampaigns fetch failed:', err)
      setLoadingCampaigns(false)
    })
  }, [])

  // Admins/managers manage every campaign's groups; a plain DM only sees
  // campaigns they're actually assigned to — same scoping used for the
  // reservation queue/schedule pages.
  const isDm = role === 'dungeonmaster' || isDungeonMaster
  const visibleCampaigns = (role === 'admin' || role === 'manager')
    ? campaigns
    : campaigns.filter(c => c.dmUid === user?.uid)

  const selected = selectedId === 'all' ? null : visibleCampaigns.find(c => c.id === selectedId) ?? null
  const { entries } = useLfpEntriesForCampaign(selectedId === 'all' ? visibleCampaigns.map(c => c.id) : selectedId)
  const { groups } = useGroupsForCampaign(selectedId === 'all' ? visibleCampaigns.map(c => c.id) : selectedId)
  const waiting = entries.filter(e => e.status === 'waiting')
  const contacts = useStaffContactDirectory([
    ...entries.map(e => e.userId),
    ...groups.flatMap(g => g.members.map(m => m.uid)),
  ])

  function campaignFor(campaignId: string): Campaign | undefined {
    return visibleCampaigns.find(c => c.id === campaignId)
  }

  // A group that already has members but hasn't hit its campaign's target
  // size is, functionally, also "waiting" — for a solo player to join, or
  // for another small group to merge into it — so it belongs in the same
  // pool as the individual waiters, not hidden away in the Groups column.
  // Locked groups are excluded — locking means "no new players," so it
  // shouldn't keep advertising itself as looking to expand.
  const underCapacityGroups = groups.filter(g => {
    if (g.members.length === 0 || g.locked) return false
    const max = maxPlayers(campaignFor(g.campaignId)?.players ?? '')
    return max === null || g.members.length < max
  })

  if (checking) return null

  async function handleCreateGroup() {
    const campaignId = selected?.id ?? newGroupCampaignId
    const campaign = campaignFor(campaignId)
    const location = newGroupLocation || campaign?.locations?.[0] || ''
    if (!campaign || !user || !newGroupName.trim() || !location) return
    setCreating(true)
    try {
      await createGroup({ campaignId: campaign.id, campaignTitle: campaign.title, location, name: newGroupName, staffUid: user.uid })
      setNewGroupName('')
      setNewGroupCampaignId('')
      setNewGroupLocation('')
    } finally {
      setCreating(false)
    }
  }

  async function handleAdd(entry: LfpEntry, group: DndGroup) {
    setBusyKey(entry.id)
    try { await addToGroup(entry, group) } finally { setBusyKey(null) }
  }

  async function handleRemove(entry: LfpEntry, group: DndGroup) {
    setBusyKey(entry.id)
    try { await removeFromGroup(entry, group) } finally { setBusyKey(null) }
  }

  async function handleTransfer(entry: LfpEntry, fromGroup: DndGroup, toGroupId: string) {
    const toGroup = groups.find(g => g.id === toGroupId)
    if (!toGroup) return
    setBusyKey(entry.id)
    try { await transferToGroup(entry, fromGroup, toGroup) } finally { setBusyKey(null) }
  }

  async function handleMerge(sourceGroup: DndGroup, targetGroupId: string) {
    const targetGroup = groups.find(g => g.id === targetGroupId)
    if (!targetGroup) return
    setBusyKey(sourceGroup.id)
    try { await mergeGroups(sourceGroup, targetGroup) } finally { setBusyKey(null) }
  }

  async function handleDeleteGroup(group: DndGroup) {
    if (!confirm(`Delete "${group.name}"? Its ${group.members.length} member${group.members.length === 1 ? '' : 's'} will go back to the waiting pool.`)) return
    setBusyKey(group.id)
    try { await deleteGroup(group) } finally { setBusyKey(null) }
  }

  async function handleToggleLock(group: DndGroup) {
    setBusyKey(group.id)
    try { await setGroupLocked(group, !group.locked) } finally { setBusyKey(null) }
  }

  // Scoped to the group's own campaign, not just uid — in the combined
  // "All Campaigns" view, entries span multiple campaigns, and the same
  // person could in principle be waiting/grouped in more than one.
  function entryForMember(uid: string, group: DndGroup): LfpEntry | undefined {
    return entries.find(e => e.userId === uid && e.campaignId === group.campaignId)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem' : '3rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <a href="/admin" style={{
          fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)', textDecoration: 'none', fontFamily: 'var(--font-inter)',
          marginBottom: '0.5rem', display: 'block',
        }}>← Back to Dashboard</a>
        <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.4rem' }}>
          D&D Groups
        </h1>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.3)', marginBottom: '2rem' }}>
          Sort customers looking for players into tables for each campaign
        </p>

        {/* Campaign picker */}
        {loadingCampaigns ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : visibleCampaigns.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.3)' }}>
              {isDm ? "You aren't assigned to any campaigns yet." : 'No campaigns yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button onClick={() => setSelectedId('all')} style={{
              backgroundColor: selectedId === 'all' ? 'var(--offwhite)' : 'transparent',
              border: `1px solid ${selectedId === 'all' ? 'var(--offwhite)' : 'rgba(255,255,255,0.1)'}`,
              color: selectedId === 'all' ? 'var(--black)' : 'rgba(245,242,236,0.6)',
              padding: '0.6rem 1.2rem', borderRadius: '2px', fontSize: '0.78rem',
              cursor: 'pointer', fontFamily: 'var(--font-inter)', fontWeight: selectedId === 'all' ? 600 : 400,
            }}>All Campaigns</button>
            {visibleCampaigns.map(c => {
              const active = selectedId === c.id
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
                  backgroundColor: active ? c.color : 'transparent',
                  border: `1px solid ${active ? c.color : 'rgba(255,255,255,0.1)'}`,
                  color: active ? '#fff' : 'rgba(245,242,236,0.6)',
                  padding: '0.6rem 1.2rem', borderRadius: '2px', fontSize: '0.78rem',
                  cursor: 'pointer', fontFamily: 'var(--font-inter)',
                }}>{c.title}</button>
              )
            })}
          </div>
        )}

        {visibleCampaigns.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: '1.5rem' }}>

            {/* Waiting pool */}
            <div>
              <p style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)', marginBottom: '0.8rem' }}>
                Waiting Pool ({waiting.length + underCapacityGroups.length})
              </p>
              {waiting.length === 0 && underCapacityGroups.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.25)' }}>Nobody waiting right now.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {waiting.map(entry => {
                    // Same campaign AND same branch — never let "All
                    // Campaigns" cross-wire someone into a different
                    // campaign's table, and never offer a group meeting at
                    // a different branch than the one this person picked.
                    // Locked groups are never a valid target either.
                    const sameCampaignGroups = groups.filter(g => g.campaignId === entry.campaignId && sameLocation(g.location, entry.location) && !g.locked)
                    return (
                      <div key={entry.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '4px', padding: '0.7rem 0.9rem',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'var(--offwhite)' }}>{entry.userName}</span>
                          {contactLine(contacts[entry.userId]) && (
                            <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.65rem', color: 'rgba(245,242,236,0.35)', marginTop: '0.15rem' }}>
                              {contactLine(contacts[entry.userId])}
                            </p>
                          )}
                          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.65rem', color: 'rgba(245,242,236,0.35)', marginTop: '0.15rem' }}>
                            {selectedId === 'all' ? `${entry.campaignTitle} — ` : ''}{entry.location || 'Branch unspecified'}
                          </p>
                        </div>
                        {sameCampaignGroups.length > 0 && (
                          <select
                            disabled={busyKey === entry.id}
                            value=""
                            onChange={e => { if (e.target.value) handleAdd(entry, sameCampaignGroups.find(g => g.id === e.target.value)!) }}
                            style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            <option value="" disabled>+ Add to…</option>
                            {sameCampaignGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        )}
                      </div>
                    )
                  })}
                  {underCapacityGroups.map(group => {
                    const groupCampaign = campaignFor(group.campaignId)
                    const max = maxPlayers(groupCampaign?.players ?? '')
                    // Same campaign and same branch only, excluding itself —
                    // merging across campaigns or branches would leave
                    // members' lfpEntries pointing at the wrong table.
                    // Locked groups are never a valid merge target.
                    const otherGroups = groups.filter(g => g.id !== group.id && g.campaignId === group.campaignId && sameLocation(g.location, group.location) && !g.locked)
                    return (
                      <div key={group.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
                        background: 'rgba(155,99,201,0.04)', border: '1px solid rgba(155,99,201,0.2)',
                        borderRadius: '4px', padding: '0.7rem 0.9rem',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'var(--offwhite)' }}>
                            {group.name} <span style={{ color: 'rgba(245,242,236,0.3)' }}>({group.members.length}{max ? `/${max}` : ''})</span>
                          </span>
                          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.65rem', color: 'rgba(245,242,236,0.35)', marginTop: '0.15rem' }}>
                            {selectedId === 'all' && groupCampaign ? `${groupCampaign.title} — ` : ''}{group.location || 'Branch unspecified'} — looking to expand
                          </p>
                        </div>
                        {otherGroups.length > 0 && (
                          <select
                            disabled={busyKey === group.id}
                            value=""
                            onChange={e => { if (e.target.value) handleMerge(group, e.target.value) }}
                            style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            <option value="" disabled>+ Merge into…</option>
                            {otherGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Groups */}
            <div>
              {(() => {
                const newGroupCampaign = campaignFor(selected?.id ?? newGroupCampaignId)
                const newGroupLocations = newGroupCampaign?.locations ?? []
                const needsLocationChoice = newGroupLocations.length > 1
                return (
                  <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                    {selectedId === 'all' && (
                      <select
                        value={newGroupCampaignId}
                        onChange={e => { setNewGroupCampaignId(e.target.value); setNewGroupLocation('') }}
                        style={{ ...inputStyle, width: 'auto' }}
                      >
                        <option value="">Campaign…</option>
                        {visibleCampaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    )}
                    {needsLocationChoice && (
                      <select
                        value={newGroupLocation}
                        onChange={e => setNewGroupLocation(e.target.value)}
                        style={{ ...inputStyle, width: 'auto' }}
                      >
                        <option value="">Branch…</option>
                        {newGroupLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    )}
                    <input
                      type="text" value={newGroupName} placeholder="New group name…"
                      onChange={e => setNewGroupName(e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={handleCreateGroup} disabled={
                      creating || !newGroupName.trim() ||
                      (selectedId === 'all' && !newGroupCampaignId) ||
                      (needsLocationChoice && !newGroupLocation)
                    } style={{
                  backgroundColor: 'var(--purple)', color: '#fff', border: 'none', padding: '0.7rem 1.5rem',
                  borderRadius: '2px', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: creating || !newGroupName.trim() ? 'not-allowed' : 'pointer',
                  opacity: creating || !newGroupName.trim() ? 0.6 : 1, fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap',
                }}>{creating ? 'Creating…' : '+ Create Group'}</button>
                  </div>
                )
              })()}

              {groups.length === 0 ? (
                <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px', padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)' }}>No groups yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {groups.map(group => {
                    const groupCampaign = campaignFor(group.campaignId)
                    return (
                    <div key={group.id} style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: `3px solid ${groupCampaign?.color ?? 'rgba(255,255,255,0.2)'}`, borderRadius: '4px', padding: '1.1rem 1.3rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1rem', color: 'var(--offwhite)' }}>
                          {group.name} <span style={{ color: 'rgba(245,242,236,0.3)', fontSize: '0.8rem' }}>({group.members.length})</span>
                          {selectedId === 'all' && groupCampaign && (
                            <span style={{ color: 'rgba(245,242,236,0.35)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>— {groupCampaign.title}</span>
                          )}
                          {group.location && (
                            <span style={{ color: 'rgba(245,242,236,0.35)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>📍 {group.location}</span>
                          )}
                          {group.formedBy && (
                            <span style={{
                              marginLeft: '0.6rem', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'var(--teal)', border: '1px solid rgba(0,160,152,0.3)', borderRadius: '2px', padding: '0.15rem 0.5rem',
                            }}>Player-formed</span>
                          )}
                          {group.locked && (
                            <span style={{
                              marginLeft: '0.6rem', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'var(--red)', border: '1px solid rgba(228,51,41,0.3)', borderRadius: '2px', padding: '0.15rem 0.5rem',
                            }}>🔒 Locked</span>
                          )}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleToggleLock(group)} disabled={busyKey === group.id} style={actionBtnStyle}>
                            {group.locked ? 'Unlock' : 'Lock'}
                          </button>
                          <button onClick={() => handleDeleteGroup(group)} disabled={busyKey === group.id} style={{
                            ...actionBtnStyle, border: '1px solid rgba(228,51,41,0.3)', color: 'var(--red)',
                          }}>Delete Group</button>
                        </div>
                      </div>

                      {group.members.length === 0 ? (
                        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.25)' }}>No members yet — add from the waiting pool.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {group.members.map(m => {
                            const entry = entryForMember(m.uid, group)
                            // Same campaign and branch only — transferring
                            // across either would leave the entry pointing
                            // at a table this person never agreed to.
                            // Locked groups are never a valid destination.
                            const otherGroups = groups.filter(g => g.id !== group.id && g.campaignId === group.campaignId && sameLocation(g.location, group.location) && !g.locked)
                            return (
                              <div key={m.uid} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
                                padding: '0.5rem 0.7rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '2px',
                              }}>
                                <div style={{ minWidth: 0 }}>
                                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.8rem', color: 'rgba(245,242,236,0.8)' }}>{m.name}</span>
                                  {contactLine(contacts[m.uid]) && (
                                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.62rem', color: 'rgba(245,242,236,0.3)', marginTop: '0.1rem' }}>
                                      {contactLine(contacts[m.uid])}
                                    </p>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                  {group.locked ? (
                                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.65rem', color: 'rgba(245,242,236,0.25)' }}>
                                      Locked
                                    </span>
                                  ) : (
                                    <>
                                      {entry && otherGroups.length > 0 && (
                                        <select
                                          disabled={busyKey === entry.id}
                                          value=""
                                          onChange={e => { if (e.target.value) handleTransfer(entry, group, e.target.value) }}
                                          style={{ ...inputStyle, width: 'auto', padding: '0.25rem 0.4rem', fontSize: '0.68rem' }}
                                        >
                                          <option value="" disabled>Transfer to…</option>
                                          {otherGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                      )}
                                      {entry && (
                                        <button onClick={() => handleRemove(entry, group)} disabled={busyKey === entry.id} style={actionBtnStyle}>
                                          Remove
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
