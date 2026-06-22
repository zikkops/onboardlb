'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import {
  useRequireRole, createAccount,
  ROLE_LABELS, ROLE_COLORS, type Role,
} from '../../lib/adminAuth'

interface Account {
  id: string
  email: string
  role: Role
}

const ROLES: Role[] = ['admin', 'manager', 'social', 'gamer']

const EMPTY = { email: '', password: '', role: 'manager' as Role }

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
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function loadAccounts() {
    const snap = await getDocs(collection(db, 'adminUsers'))
    setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)))
    setLoading(false)
  }

  useEffect(() => { loadAccounts() }, [])

  function openNew() {
    setForm({ ...EMPTY })
    setError('')
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createAccount(form.email.trim(), form.password, form.role)
      setOpen(false)
      loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(account: Account) {
    if (!confirm(`Revoke admin panel access for ${account.email}? This does not delete their login — only their access here.`)) return
    await deleteDoc(doc(db, 'adminUsers', account.id))
    loadAccounts()
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
          Admin and Manager can access every section below. Social Media is limited to Events, and Gamer is limited to Games.
          Only Admin can create accounts.
        </p>

        {/* Table */}
        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            overflow: 'hidden',
            overflowX: 'auto',
          }}>
            <table style={{ width: '100%', minWidth: isMobile ? '500px' : undefined, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Email', 'Role', 'Actions'].map(h => (
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
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.25rem 0.7rem',
                        borderRadius: '2px',
                        backgroundColor: `${ROLE_COLORS[account.role]}25`,
                        color: ROLE_COLORS[account.role],
                        fontFamily: 'var(--font-inter)',
                        letterSpacing: '0.05em',
                      }}>{ROLE_LABELS[account.role] ?? account.role}</span>
                    </td>
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <button
                        onClick={() => handleRevoke(account)}
                        disabled={account.id === user?.uid}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(228,51,41,0.3)',
                          color: account.id === user?.uid ? 'rgba(228,51,41,0.25)' : 'var(--red)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '2px',
                          fontSize: '0.7rem',
                          cursor: account.id === user?.uid ? 'not-allowed' : 'pointer',
                          fontFamily: 'var(--font-inter)',
                        }}>Revoke Access</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
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
                Add New Account
              </h2>
              <button onClick={() => setOpen(false)} style={{
                background: 'transparent', border: 'none',
                color: 'rgba(245,242,236,0.4)', fontSize: '1.2rem', cursor: 'pointer',
              }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: isMobile ? '1.5rem' : '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.email} required
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={form.password} required minLength={6}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={inputStyle} />
              </div>

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
                }}>{saving ? 'Creating…' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
