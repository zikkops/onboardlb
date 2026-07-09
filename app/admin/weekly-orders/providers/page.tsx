'use client'

import { useEffect, useState } from 'react'
import { useRequireRole } from '../../../lib/adminAuth'
import {
  listProviders, addProvider, updateProvider, deleteProvider,
  type OrderProvider,
} from '../../../lib/weeklyOrders'
import { BRANCHES } from '../../../lib/branches'

const inp: React.CSSProperties = {
  backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F2EC', padding: '0.6rem 0.8rem', borderRadius: '2px',
  fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-inter)',
}

const btnPrimary: React.CSSProperties = {
  backgroundColor: 'var(--teal)', color: '#fff', border: 'none',
  padding: '0.6rem 1.2rem', borderRadius: '2px', fontSize: '0.75rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
  fontFamily: 'var(--font-inter)',
}

const btnGhost: React.CSSProperties = {
  backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(245,242,236,0.5)', padding: '0.55rem 1rem', borderRadius: '2px',
  fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: 'var(--font-inter)',
}

const btnDanger: React.CSSProperties = {
  backgroundColor: 'transparent', border: '1px solid rgba(228,51,41,0.3)',
  color: 'var(--red)', padding: '0.45rem 0.8rem', borderRadius: '2px',
  fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-inter)',
}

type PhoneMap = Partial<Record<typeof BRANCHES[number], string>>

// ---- Add provider form ----
function AddProviderForm({ onSave }: { onSave: (p: Omit<OrderProvider, 'id' | 'createdAt'>) => Promise<void> }) {
  const [name,   setName]   = useState('')
  const [phones, setPhones] = useState<PhoneMap>({})
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  function setPhone(branch: string, val: string) {
    setPhones(p => ({ ...p, [branch]: val }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Provider name is required.'); return }
    setSaving(true); setErr('')
    try {
      await onSave({ name: name.trim(), phones, notes: notes.trim() })
      setName(''); setPhones({}); setNotes('')
    } catch { setErr('Save failed — please try again.') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '4px', padding: '1.4rem 1.6rem', marginBottom: '2rem',
    }}>
      <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.5)', marginBottom: '1rem', letterSpacing: '0.12em' }}>ADD PROVIDER</p>

      {/* Name */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>
          Provider Name *
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Ali Supplies Co."
          style={{ ...inp, width: '360px', maxWidth: '100%' }}
        />
      </div>

      {/* Phone per branch */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-inter)' }}>
          Phone Numbers (per branch)
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {BRANCHES.map(branch => (
            <div key={branch}>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(245,242,236,0.25)', marginBottom: '0.25rem', fontFamily: 'var(--font-inter)' }}>
                {branch}
              </label>
              <input
                value={phones[branch] ?? ''}
                onChange={e => setPhone(branch, e.target.value)}
                placeholder="+961 XX XXX XXX"
                style={{ ...inp, width: '180px' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>
          Notes (optional)
        </label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. available Mon–Sat, orders must be placed by 5 PM"
          style={{ ...inp, width: '100%' }}
        />
      </div>

      {err && <p style={{ color: 'var(--red)', fontSize: '0.78rem', marginBottom: '0.75rem', fontFamily: 'var(--font-inter)' }}>{err}</p>}

      <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving…' : '+ Add Provider'}
      </button>
    </form>
  )
}

// ---- Provider card ----
function ProviderCard({
  provider,
  onUpdated,
  onDeleted,
}: {
  provider: OrderProvider
  onUpdated: (id: string, before: Partial<OrderProvider>, after: Partial<OrderProvider>) => Promise<void>
  onDeleted: (id: string, name: string) => Promise<void>
}) {
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState(provider.name)
  const [phones,   setPhones]   = useState<PhoneMap>({ ...provider.phones })
  const [notes,    setNotes]    = useState(provider.notes ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  function setPhone(branch: string, val: string) {
    setPhones(p => ({ ...p, [branch]: val }))
  }

  async function save() {
    setSaving(true)
    try {
      // Strip empty strings from phones object
      const cleanPhones = Object.fromEntries(
        Object.entries(phones).filter(([, v]) => v.trim())
      )
      await onUpdated(
        provider.id,
        { name: provider.name, phones: provider.phones, notes: provider.notes },
        { name: name.trim(), phones: cleanPhones, notes: notes.trim() },
      )
      setEditing(false)
    } finally { setSaving(false) }
  }

  function cancel() {
    setName(provider.name)
    setPhones({ ...provider.phones })
    setNotes(provider.notes ?? '')
    setEditing(false)
  }

  async function remove() {
    if (!confirm(`Delete provider "${provider.name}"? This will not affect existing reports.`)) return
    setDeleting(true)
    try { await onDeleted(provider.id, provider.name) } finally { setDeleting(false) }
  }

  const hasBranchPhone = BRANCHES.some(b => provider.phones?.[b])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '4px', padding: '1.25rem 1.5rem',
    }}>
      {editing ? (
        <div>
          {/* Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, width: '320px', maxWidth: '100%' }} />
          </div>

          {/* Phones */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-inter)' }}>Phone Numbers</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {BRANCHES.map(branch => (
                <div key={branch}>
                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(245,242,236,0.25)', marginBottom: '0.25rem', fontFamily: 'var(--font-inter)' }}>{branch}</label>
                  <input
                    value={phones[branch] ?? ''}
                    onChange={e => setPhone(branch, e.target.value)}
                    placeholder="+961 XX XXX XXX"
                    style={{ ...inp, width: '170px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--font-inter)' }}>Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp, width: '100%' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={cancel} style={btnGhost}>Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: hasBranchPhone ? '1rem' : '0' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '1rem', fontWeight: 700, color: 'var(--offwhite)', marginBottom: '0.15rem' }}>
                {provider.name}
              </p>
              {provider.notes && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.35)' }}>
                  {provider.notes}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setEditing(true)} style={btnGhost}>Edit</button>
              <button onClick={remove} disabled={deleting} style={{ ...btnDanger, opacity: deleting ? 0.6 : 1 }}>
                {deleting ? '…' : 'Delete'}
              </button>
            </div>
          </div>

          {/* Branch phones */}
          {hasBranchPhone && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {BRANCHES.map(branch => {
                const phone = provider.phones?.[branch]
                return (
                  <div key={branch} style={{
                    background: phone ? 'rgba(0,160,152,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${phone ? 'rgba(0,160,152,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '3px', padding: '0.5rem 0.9rem', minWidth: '140px',
                  }}>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.65rem', color: 'rgba(245,242,236,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{branch}</p>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.9rem', fontWeight: 600, color: phone ? 'var(--teal)' : 'rgba(245,242,236,0.18)' }}>
                      {phone || 'No number set'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Main page ----
export default function ProvidersPage() {
  const { checking } = useRequireRole(['admin'])
  const [providers, setProviders] = useState<OrderProvider[]>([])
  const [loading,   setLoading]   = useState(true)

  async function load() {
    setLoading(true)
    setProviders(await listProviders())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(p: Omit<OrderProvider, 'id' | 'createdAt'>) {
    await addProvider(p); await load()
  }

  async function handleUpdate(id: string, before: Partial<OrderProvider>, after: Partial<OrderProvider>) {
    await updateProvider(id, before, after); await load()
  }

  async function handleDelete(id: string, name: string) {
    await deleteProvider(id, name); await load()
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <a href="/admin/weekly-orders" style={{
            fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
            marginBottom: '0.5rem', display: 'block', fontFamily: 'var(--font-inter)',
          }}>← Weekly Orders</a>
          <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
            Providers
          </h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)' }}>
            Manage supplier contacts. Each provider can have a different phone number per branch.
          </p>
        </div>

        <AddProviderForm onSave={handleAdd} />

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : providers.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px',
            padding: '3rem', textAlign: 'center',
            color: 'rgba(245,242,236,0.25)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem',
          }}>
            No providers yet — add your first one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {providers.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                onUpdated={handleUpdate}
                onDeleted={handleDelete}
              />
            ))}
          </div>
        )}

        <p style={{ marginTop: '1.5rem', fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.2)' }}>
          {providers.length} provider{providers.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
