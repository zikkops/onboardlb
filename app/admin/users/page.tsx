'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, updateDoc, doc, query, where, deleteField } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import {
  useRequireRole, createAccount, updateAccountAccess,
  ROLE_LABELS, ROLE_COLORS, SECTION_ACCESS, SECTION_LABELS, type Role,
} from '../../lib/adminAuth'
import { logActivity } from '../../lib/activityLog'
import { BRANCHES, resolveBranchName } from '../../lib/branches'

interface Account {
  id: string
  email: string
  role: Role
  branchIds: string[]
  isDungeonMaster: boolean
  superadmin: boolean
  sectionGrants: string[]
}

const ROLES: Role[] = ['admin', 'manager', 'social', 'gamer', 'dungeonmaster']

const EMPTY = { email: '', password: '', role: 'manager' as Role, branchIds: [] as string[], isDungeonMaster: false, sectionGrants: [] as string[] }

// Reads either the new `branchIds` array or the older singular `branchId`
// from accounts created before multi-branch support existed.
function normalizeBranchIds(data: { branchIds?: unknown; branchId?: unknown }): string[] {
  if (Array.isArray(data.branchIds)) return data.branchIds as string[]
  return data.branchId ? [data.branchId as string] : []
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

export default function AdminUsersPage() {
  const { checking, user } = useRequireRole(['admin'])
  const isMobile = useIsMobile()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<Account | null>(null)
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function loadAccounts() {
    const snap = await getDocs(query(collection(db, 'users'), where('isStaff', '==', true)))
    setAccounts(snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id, email: data.email, role: data.role,
        branchIds: normalizeBranchIds(data),
        isDungeonMaster: data.isDungeonMaster === true,
        superadmin: data.superadmin === true,
        sectionGrants: Array.isArray(data.sectionGrants) ? data.sectionGrants as string[] : [],
      } as Account
    }))
    setLoading(false)
  }

  useEffect(() => { loadAccounts() }, [])

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY })
    setError('')
    setOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setForm({ email: account.email, password: '', role: account.role, branchIds: account.branchIds, isDungeonMaster: account.isDungeonMaster, sectionGrants: account.sectionGrants })
    setError('')
    setOpen(true)
  }

  function toggleBranch(branch: string) {
    setForm(f => ({
      ...f,
      branchIds: f.branchIds.includes(branch) ? f.branchIds.filter(b => b !== branch) : [...f.branchIds, branch],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      // The dungeonmaster role already implies DM capability — the flag is
      // only meaningful (and only edited) for every other role.
      const isDungeonMaster = form.role === 'dungeonmaster' || form.isDungeonMaster
      // Branches are kept for managers (loyalty-data scoping) and for any
      // DM-capable account (which branches they can be booked at) — discarded
      // for everyone else so a stale selection doesn't linger unused.
      const branchIds = (form.role === 'manager' || isDungeonMaster) ? form.branchIds : []
      if (editing) {
        await updateAccountAccess(
          editing.id,
          editing.email,
          { role: editing.role, branchIds: editing.branchIds, isDungeonMaster: editing.isDungeonMaster },
          { role: form.role, branchIds, isDungeonMaster }
        )
        // Save section grants separately — only meaningful fields that differ from role defaults
        await updateDoc(doc(db, 'users', editing.id), { sectionGrants: form.sectionGrants })
      } else {
        await createAccount(form.email.trim(), form.password, form.role, branchIds, isDungeonMaster)
      }
      setOpen(false)
      loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save account.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(account: Account) {
    if (!confirm(`Revoke admin panel access for ${account.email}? This removes their staff tag — any customer data (XP, coins) stays intact.`)) return
    await updateDoc(doc(db, 'users', account.id), {
      isStaff: deleteField(),
      role: deleteField(),
      branchIds: deleteField(),
      isDungeonMaster: deleteField(),
    })
    await logActivity('delete', 'User Account', `${account.email} (${account.role})`)
    loadAccounts()
  }

  function showsBranches(account: Account): boolean {
    return account.role === 'manager' || account.role === 'dungeonmaster' || account.isDungeonMaster
  }

  function branchSummary(account: Account): string {
    if (!showsBranches(account)) return '—'
    return account.branchIds.length > 0 ? account.branchIds.map(resolveBranchName).join(', ') : '— unassigned —'
  }

  // Mirrors firestore.rules' adminUsers rule exactly: a superadmin's own
  // doc can only be edited by the superadmin themselves, and can never be
  // deleted through the app by anyone at all — these just keep the UI
  // from offering a button that the rule would reject anyway.
  function canEdit(account: Account): boolean {
    return !account.superadmin || account.id === user?.uid
  }
  function canRevoke(account: Account): boolean {
    return !account.superadmin
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
              Manage Users
            </h1>
          </div>
          <button onClick={openNew} style={{
            backgroundColor: 'var(--purple)',
            color: '#fff',
            padding: '0.7rem 1.5rem',
            border: 'none',
            borderRadius: '2px',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
          }}>+ Add Account</button>
        </div>

        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '0.78rem',
          color: 'rgba(245,242,236,0.3)',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}>
          Admin and Manager can access every section below. Social Media is limited to Events, Gamer is limited to Games,
          and Dungeon Master is limited to D&amp;D Campaigns. Only Admin can create or edit accounts. Managers can be
          assigned one or more branches — they only see loyalty data for their assigned branches. A 👑 Superadmin account
          can only be edited by itself and can never be deleted, by anyone, through this page — that protection is set
          by hand directly in Firebase, not from here.
        </p>

        {/* Table */}
        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {accounts.map(account => (
              <div key={account.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                padding: '1rem 1.2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)', wordBreak: 'break-word' }}>
                  {account.email}
                  {account.id === user?.uid && (
                    <span style={{ color: 'rgba(245,242,236,0.3)', marginLeft: '0.5rem' }}>(you)</span>
                  )}
                </p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {account.superadmin && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.25rem 0.7rem',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(229,163,61,0.18)',
                      color: '#E5A33D',
                      fontFamily: 'var(--font-inter)',
                      letterSpacing: '0.05em',
                      width: 'fit-content',
                    }}>👑 Superadmin</span>
                  )}
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.25rem 0.7rem',
                    borderRadius: '2px',
                    backgroundColor: `${ROLE_COLORS[account.role]}25`,
                    color: ROLE_COLORS[account.role],
                    fontFamily: 'var(--font-inter)',
                    letterSpacing: '0.05em',
                    width: 'fit-content',
                  }}>{ROLE_LABELS[account.role] ?? account.role}</span>
                  {account.isDungeonMaster && account.role !== 'dungeonmaster' && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.25rem 0.7rem',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(201,150,44,0.18)',
                      color: '#C9962C',
                      fontFamily: 'var(--font-inter)',
                      letterSpacing: '0.05em',
                      width: 'fit-content',
                    }}>🎲 DM</span>
                  )}
                </div>
                {showsBranches(account) && (
                  <p style={{ fontSize: '0.75rem', color: 'rgba(245,242,236,0.4)', fontFamily: 'var(--font-inter)' }}>
                    Branches: {branchSummary(account)}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => openEdit(account)}
                    disabled={!canEdit(account)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: canEdit(account) ? 'rgba(245,242,236,0.6)' : 'rgba(245,242,236,0.2)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '2px',
                      fontSize: '0.72rem',
                      cursor: canEdit(account) ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--font-inter)',
                    }}>Edit</button>
                  <button
                    onClick={() => handleRevoke(account)}
                    disabled={account.id === user?.uid || !canRevoke(account)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid rgba(228,51,41,0.3)',
                      color: account.id === user?.uid || !canRevoke(account) ? 'rgba(228,51,41,0.25)' : 'var(--red)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '2px',
                      fontSize: '0.72rem',
                      cursor: account.id === user?.uid || !canRevoke(account) ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-inter)',
                    }}>Revoke Access</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Email', 'Role', 'Branches', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '1rem 1.2rem',
                      textAlign: 'left',
                      fontSize: '0.65rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'rgba(245,242,236,0.3)',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 400,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)' }}>
                      {account.email}
                      {account.id === user?.uid && (
                        <span style={{ color: 'rgba(245,242,236,0.3)', marginLeft: '0.5rem' }}>(you)</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {account.superadmin && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.7rem',
                            borderRadius: '2px',
                            backgroundColor: 'rgba(229,163,61,0.18)',
                            color: '#E5A33D',
                            fontFamily: 'var(--font-inter)',
                            letterSpacing: '0.05em',
                          }}>👑 Superadmin</span>
                        )}
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.25rem 0.7rem',
                          borderRadius: '2px',
                          backgroundColor: `${ROLE_COLORS[account.role]}25`,
                          color: ROLE_COLORS[account.role],
                          fontFamily: 'var(--font-inter)',
                          letterSpacing: '0.05em',
                        }}>{ROLE_LABELS[account.role] ?? account.role}</span>
                        {account.isDungeonMaster && account.role !== 'dungeonmaster' && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.7rem',
                            borderRadius: '2px',
                            backgroundColor: 'rgba(201,150,44,0.18)',
                            color: '#C9962C',
                            fontFamily: 'var(--font-inter)',
                            letterSpacing: '0.05em',
                          }}>🎲 DM</span>
                        )}
                        {account.sectionGrants.length > 0 && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.7rem',
                            borderRadius: '2px',
                            backgroundColor: 'rgba(149,102,210,0.15)',
                            color: 'var(--purple)',
                            fontFamily: 'var(--font-inter)',
                            letterSpacing: '0.05em',
                          }}>+{account.sectionGrants.length} extra</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.2rem', fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)' }}>
                      {branchSummary(account)}
                    </td>
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEdit(account)}
                          disabled={!canEdit(account)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: canEdit(account) ? 'rgba(245,242,236,0.6)' : 'rgba(245,242,236,0.2)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '2px',
                            fontSize: '0.7rem',
                            cursor: canEdit(account) ? 'pointer' : 'not-allowed',
                            fontFamily: 'var(--font-inter)',
                          }}>Edit</button>
                        <button
                          onClick={() => handleRevoke(account)}
                          disabled={account.id === user?.uid || !canRevoke(account)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(228,51,41,0.3)',
                            color: account.id === user?.uid || !canRevoke(account) ? 'rgba(228,51,41,0.25)' : 'var(--red)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '2px',
                            fontSize: '0.7rem',
                            cursor: account.id === user?.uid || !canRevoke(account) ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-inter)',
                          }}>Revoke Access</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Account Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: isMobile ? '1rem' : '2rem',
        }}>
          <div style={{
            backgroundColor: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '1.25rem 1.5rem' : '1.5rem 2rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.2rem', color: 'var(--offwhite)' }}>
                {editing ? 'Edit Account' : 'Add New Account'}
              </h2>
              <button onClick={() => setOpen(false)} style={{
                background: 'transparent', border: 'none',
                color: 'rgba(245,242,236,0.4)', fontSize: '1.2rem', cursor: 'pointer',
              }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: isMobile ? '1.5rem' : '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={labelStyle}>Email</label>
                {editing ? (
                  <p style={{ ...inputStyle, color: 'rgba(245,242,236,0.5)' }}>{form.email}</p>
                ) : (
                  <input type="email" value={form.email} required
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={inputStyle} />
                )}
              </div>

              {!editing && (
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" value={form.password} required minLength={6}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={inputStyle} />
                </div>
              )}

              <div>
                <label style={{ ...labelStyle, marginBottom: '0.8rem' }}>Access Level</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ROLES.map(r => (
                    <button key={r} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r }))}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: form.role === r ? `${ROLE_COLORS[r]}15` : 'transparent',
                        border: `1px solid ${form.role === r ? ROLE_COLORS[r] : 'rgba(255,255,255,0.1)'}`,
                        color: form.role === r ? ROLE_COLORS[r] : 'rgba(245,242,236,0.5)',
                        padding: '0.6rem 1rem',
                        borderRadius: '2px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                        textAlign: 'left',
                      }}>
                      <span style={{ fontWeight: 600 }}>{ROLE_LABELS[r]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const formIsDm = form.role === 'dungeonmaster' || form.isDungeonMaster
                if (form.role !== 'manager' && !formIsDm) return null
                return (
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.8rem' }}>Branches</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {BRANCHES.map(b => {
                        const checked = form.branchIds.includes(b)
                        return (
                          <button key={b} type="button"
                            onClick={() => toggleBranch(b)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: checked ? 'rgba(0,160,152,0.12)' : 'transparent',
                              border: `1px solid ${checked ? 'var(--teal)' : 'rgba(255,255,255,0.1)'}`,
                              color: checked ? 'var(--teal)' : 'rgba(245,242,236,0.5)',
                              padding: '0.6rem 1rem',
                              borderRadius: '2px',
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-inter)',
                              textAlign: 'left',
                            }}>
                            <span>{b}</span>
                            <span style={{
                              width: '16px', height: '16px',
                              borderRadius: '3px',
                              border: `1px solid ${checked ? 'var(--teal)' : 'rgba(255,255,255,0.2)'}`,
                              backgroundColor: checked ? 'var(--teal)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem',
                              color: '#fff',
                              flexShrink: 0,
                            }}>{checked ? '✓' : ''}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)', marginTop: '0.5rem' }}>
                      {form.role === 'manager' && formIsDm
                        ? 'Managers only see loyalty data for their assigned branches, and Dungeon Masters can only be booked at theirs — this account uses the same branch list for both. Multiple branches can be assigned.'
                        : form.role === 'manager'
                          ? 'Managers only see loyalty data for their assigned branches. Multiple branches can be assigned.'
                          : 'Dungeon Masters can only be booked for sessions at their assigned branches. Multiple branches can be assigned — the same DM can run campaigns at more than one location.'}
                    </p>
                  </div>
                )
              })()}

              {form.role !== 'dungeonmaster' && (
                <div>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, isDungeonMaster: !f.isDungeonMaster }))}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      backgroundColor: form.isDungeonMaster ? 'rgba(201,150,44,0.12)' : 'transparent',
                      border: `1px solid ${form.isDungeonMaster ? '#C9962C' : 'rgba(255,255,255,0.1)'}`,
                      color: form.isDungeonMaster ? '#C9962C' : 'rgba(245,242,236,0.5)',
                      padding: '0.6rem 1rem',
                      borderRadius: '2px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-inter)',
                      textAlign: 'left',
                    }}>
                    <span>🎲 Also a Dungeon Master</span>
                    <span style={{
                      width: '16px', height: '16px',
                      borderRadius: '3px',
                      border: `1px solid ${form.isDungeonMaster ? '#C9962C' : 'rgba(255,255,255,0.2)'}`,
                      backgroundColor: form.isDungeonMaster ? '#C9962C' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem',
                      color: '#fff',
                      flexShrink: 0,
                    }}>{form.isDungeonMaster ? '✓' : ''}</span>
                  </button>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)', marginTop: '0.5rem' }}>
                    Lets this account be assigned as a Dungeon Master on D&amp;D campaigns and access D&amp;D Reservations, in addition to their main role.
                  </p>
                </div>
              )}

              {/* Per-user section grants — only shown when editing, not on create */}
              {editing && (() => {
                const formIsDm = form.role === 'dungeonmaster' || form.isDungeonMaster
                const sectionKeys = Object.keys(SECTION_ACCESS) as (keyof typeof SECTION_ACCESS)[]
                return (
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '0.4rem' }}>Extra Section Access</label>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)', marginBottom: '0.8rem', lineHeight: 1.5 }}>
                      Grant access to specific sections beyond what this user&apos;s role normally covers. Sections already unlocked by their role are shown greyed out.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {sectionKeys.map(key => {
                        const viaRole = SECTION_ACCESS[key].includes(form.role) ||
                          (formIsDm && SECTION_ACCESS[key].includes('dungeonmaster'))
                        const granted = form.sectionGrants.includes(key)
                        return (
                          <button key={key} type="button"
                            disabled={viaRole}
                            onClick={() => {
                              if (viaRole) return
                              setForm(f => ({
                                ...f,
                                sectionGrants: f.sectionGrants.includes(key)
                                  ? f.sectionGrants.filter(g => g !== key)
                                  : [...f.sectionGrants, key],
                              }))
                            }}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              backgroundColor: viaRole ? 'rgba(255,255,255,0.02)' : granted ? 'rgba(149,102,210,0.12)' : 'transparent',
                              border: `1px solid ${viaRole ? 'rgba(255,255,255,0.05)' : granted ? 'var(--purple)' : 'rgba(255,255,255,0.08)'}`,
                              color: viaRole ? 'rgba(245,242,236,0.2)' : granted ? 'var(--purple)' : 'rgba(245,242,236,0.5)',
                              padding: '0.45rem 0.8rem',
                              borderRadius: '2px',
                              fontSize: '0.78rem',
                              cursor: viaRole ? 'default' : 'pointer',
                              fontFamily: 'var(--font-inter)',
                              textAlign: 'left',
                              width: '100%',
                            }}>
                            <span>{SECTION_LABELS[key] ?? key}</span>
                            <span style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, flexShrink: 0, marginLeft: '0.5rem' }}>
                              {viaRole ? 'via role' : granted ? '✓ granted' : ''}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {error && (
                <p style={{ color: 'var(--red)', fontSize: '0.78rem', fontFamily: 'var(--font-inter)' }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  flex: 1, background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(245,242,236,0.5)', padding: '0.8rem',
                  borderRadius: '2px', fontSize: '0.75rem',
                  cursor: 'pointer', fontFamily: 'var(--font-inter)',
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 1, backgroundColor: 'var(--purple)',
                  border: 'none', color: '#fff', padding: '0.8rem',
                  borderRadius: '2px', fontSize: '0.75rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1, fontFamily: 'var(--font-inter)',
                }}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
