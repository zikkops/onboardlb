'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRequireRole, ALL_ROLES } from '../../../lib/adminAuth'
import {
  listTemplateItems, listProviders, submitWeeklyReport, getCurrentWeek,
  groupByProvider, packLabel,
  type OrderTemplateItem, type OrderProvider,
  DEPARTMENTS, type Department,
} from '../../../lib/weeklyOrders'
import { BRANCHES } from '../../../lib/branches'

const DEPT_COLOR: Record<Department, string> = {
  Kitchen: 'var(--teal)',
  Bar:     '#C9962C',
}

const inp: React.CSSProperties = {
  backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
  color: '#F5F2EC', padding: '0.6rem 0.8rem', borderRadius: '2px',
  fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-inter)',
}

export default function SubmitOrderPage() {
  const { checking, role, branchIds, user } = useRequireRole(ALL_ROLES)

  const [items,       setItems]    = useState<OrderTemplateItem[]>([])
  const [providerMap, setProvMap]  = useState<Record<string, OrderProvider>>({})
  const [loading,     setLoading]  = useState(true)
  const [branch,      setBranch]   = useState('')
  const [notes,       setNotes]    = useState('')
  const [qtys,        setQtys]     = useState<Record<string, string>>({})
  const [saving,      setSaving]   = useState(false)
  const [err,         setErr]      = useState('')
  const [done,        setDone]     = useState(false)
  const [showAr,      setShowAr]   = useState(false)

  const week = getCurrentWeek()

  useEffect(() => {
    if (checking) return
    if (role !== 'admin' && branchIds.length === 1) setBranch(branchIds[0])
  }, [checking, role, branchIds])

  useEffect(() => {
    Promise.all([listTemplateItems(), listProviders()]).then(([data, provs]) => {
      setItems(data)
      setProvMap(Object.fromEntries(provs.map(p => [p.id, p])))
      setLoading(false)
    })
  }, [])

  function setQty(id: string, val: string) {
    setQtys(prev => ({ ...prev, [id]: val }))
  }

  // Group by department → provider
  const grouped = useMemo(() =>
    DEPARTMENTS.map(dept => {
      const deptItems = items.filter(i => (i.department ?? 'Kitchen') === dept)
      return { dept, provGroups: groupByProvider(deptItems) }
    }).filter(d => d.provGroups.length > 0),
  [items])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!branch) { setErr('Please select a branch.'); return }

    const reportItems = items.map(item => ({
      templateId: item.id,
      name:       item.name,
      department: item.department ?? ('Kitchen' as Department),
      providerId: item.providerId,
      unit:       item.unit,
      packSize:   item.packSize,
      packUnit:   item.packUnit,
      quantity:   parseFloat(qtys[item.id] ?? '0') || 0,
    })).filter(i => i.quantity > 0)

    if (reportItems.length === 0) { setErr('Please enter at least one quantity.'); return }

    setSaving(true); setErr('')
    try {
      await submitWeeklyReport({
        branch,
        weekStart: week.startStr,
        weekLabel: week.label,
        items:     reportItems,
        notes:     notes.trim(),
        submittedBy:      user?.uid ?? '',
        submittedByEmail: user?.email ?? '',
      })
      setDone(true)
    } catch {
      setErr('Submission failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (checking) return null

  const branchOptions = role === 'admin' ? [...BRANCHES] : branchIds

  if (done) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.5rem', color: 'var(--offwhite)', marginBottom: '0.5rem' }}>Report Submitted</h2>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.4)', marginBottom: '2rem' }}>
            {branch} — {week.label}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="/admin/weekly-orders" style={{
              backgroundColor: 'var(--teal)', color: '#fff', textDecoration: 'none',
              padding: '0.7rem 1.5rem', borderRadius: '2px', fontSize: '0.75rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-inter)',
            }}>View Reports</a>
            <button onClick={() => { setDone(false); setQtys({}); setNotes('') }} style={{
              backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,242,236,0.5)', padding: '0.7rem 1.5rem', borderRadius: '2px',
              fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'var(--font-inter)',
            }}>Submit Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <a href="/admin/weekly-orders" style={{
            fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
            marginBottom: '0.5rem', display: 'block', fontFamily: 'var(--font-inter)',
          }}>← Weekly Orders</a>
          <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
            Weekly Order Report
          </h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.4)' }}>
            Week of {week.label}
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading items…</p>
        ) : items.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px',
            padding: '3rem', textAlign: 'center',
            color: 'rgba(245,242,236,0.25)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem',
          }}>
            No order items defined yet.{' '}
            {role === 'admin' && <a href="/admin/weekly-orders/template" style={{ color: 'var(--teal)' }}>Set up the template →</a>}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* Branch selector */}
            <div style={{ marginBottom: '2.5rem' }}>
              <label style={{
                display: 'block', fontSize: '0.7rem', color: 'rgba(245,242,236,0.35)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem',
                fontFamily: 'var(--font-inter)',
              }}>Branch</label>
              {branchOptions.length === 1 ? (
                <div style={{ ...inp, display: 'inline-block' }}>{branch}</div>
              ) : (
                <select value={branch} onChange={e => setBranch(e.target.value)} style={{ ...inp, minWidth: '200px', cursor: 'pointer' }}>
                  <option value="">— Select Branch —</option>
                  {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
            </div>

            {/* Arabic name toggle */}
            {items.some(i => i.nameAr) && (
              <div style={{ marginBottom: '2rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAr(v => !v)}
                  style={{
                    backgroundColor: showAr ? 'rgba(201,150,44,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${showAr ? 'rgba(201,150,44,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: showAr ? '#C9962C' : 'rgba(245,242,236,0.5)',
                    padding: '0.5rem 1.1rem', borderRadius: '2px', fontSize: '0.73rem',
                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  {showAr ? '🌐 Arabic Names ON' : '🌐 Show Arabic Names'}
                </button>
              </div>
            )}

            {/* Kitchen and Bar sections */}
            {grouped.map(({ dept, provGroups }) => (
              <div key={dept} style={{ marginBottom: '3rem' }}>

                {/* Department header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.7rem',
                  marginBottom: '1.25rem',
                  borderBottom: `1px solid ${DEPT_COLOR[dept]}40`,
                  paddingBottom: '0.65rem',
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: DEPT_COLOR[dept], flexShrink: 0 }} />
                  <p style={{
                    fontFamily: 'var(--font-cinzel)', fontSize: '1rem',
                    color: DEPT_COLOR[dept], letterSpacing: '0.15em',
                  }}>{dept.toUpperCase()}</p>
                </div>

                {/* Provider groups */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {provGroups.map(({ providerId, items: pItems }) => {
                    const provider = providerId ? providerMap[providerId] : undefined
                    return (
                      <div key={providerId ?? '__none__'}>
                        {/* Provider label */}
                        <p style={{
                          fontFamily: 'var(--font-inter)', fontSize: '0.78rem',
                          color: provider ? 'rgba(245,242,236,0.55)' : 'rgba(245,242,236,0.25)',
                          fontWeight: 600, marginBottom: '0.5rem',
                          letterSpacing: '0.04em',
                        }}>
                          {provider?.name ?? 'No Provider'}
                        </p>

                        <div style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                          borderLeft: `3px solid ${DEPT_COLOR[dept]}30`,
                          borderRadius: '4px', overflow: 'hidden',
                        }}>
                          {pItems.map((item, idx) => (
                            <div key={item.id} style={{
                              display: 'grid', gridTemplateColumns: '1fr auto',
                              alignItems: 'center', gap: '1rem',
                              padding: '0.85rem 1.25rem',
                              borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            }}>
                              <div>
                                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.88rem', color: 'var(--offwhite)', fontWeight: 500 }}>
                                  {item.name}
                                </span>
                                {showAr && item.nameAr && (
                                  <span dir="rtl" style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: '#C9962C', marginLeft: '0.5rem' }}>
                                    {item.nameAr}
                                  </span>
                                )}
                                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.3)', marginLeft: '0.5rem' }}>
                                  ({packLabel(item.unit, item.packSize, item.packUnit)})
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={qtys[item.id] ?? ''}
                                  onChange={e => setQty(item.id, e.target.value)}
                                  placeholder="0"
                                  style={{ ...inp, width: '90px', textAlign: 'right' }}
                                />
                                <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.35)', minWidth: '36px' }}>
                                  {packLabel(item.unit, item.packSize, item.packUnit)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Notes */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block', fontSize: '0.7rem', color: 'rgba(245,242,236,0.35)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem',
                fontFamily: 'var(--font-inter)',
              }}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional notes or comments…"
                style={{ ...inp, width: '100%', resize: 'vertical' }}
              />
            </div>

            {err && (
              <p style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: '1rem', fontFamily: 'var(--font-inter)' }}>{err}</p>
            )}

            <button type="submit" disabled={saving} style={{
              backgroundColor: 'var(--teal)', color: '#fff', border: 'none',
              padding: '0.8rem 2rem', borderRadius: '2px', fontSize: '0.82rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-inter)', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Submitting…' : 'Submit Order Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
