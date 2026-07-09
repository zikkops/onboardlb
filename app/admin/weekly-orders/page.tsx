'use client'

import { useEffect, useState } from 'react'
import { useRequireRole, ALL_ROLES } from '../../lib/adminAuth'
import {
  listWeeklyReports, UNIT_LABELS,
  type WeeklyOrderReport, type WeeklyOrderReportItem,
} from '../../lib/weeklyOrders'
import { BRANCHES } from '../../lib/branches'

function fmtDate(ts: { seconds: number } | null): string {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ReportCard({ report }: { report: WeeklyOrderReport }) {
  const [open, setOpen] = useState(false)

  const byCategory = report.items.reduce<Record<string, WeeklyOrderReportItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '4px', overflow: 'hidden',
    }}>
      {/* Summary row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '1.1rem 1.4rem', textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          gap: '1.25rem', alignItems: 'center',
        }}
      >
        {/* Branch badge */}
        <span style={{
          backgroundColor: 'rgba(0,160,152,0.12)', border: '1px solid rgba(0,160,152,0.3)',
          color: 'var(--teal)', borderRadius: '2px', padding: '0.25rem 0.65rem',
          fontSize: '0.72rem', letterSpacing: '0.1em', fontFamily: 'var(--font-inter)', fontWeight: 600,
        }}>
          {report.branch}
        </span>

        {/* Week + submitter */}
        <div>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.9rem', color: 'var(--offwhite)', fontWeight: 600, marginBottom: '0.15rem' }}>
            {report.weekLabel}
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.35)' }}>
            {report.submittedByEmail} · {fmtDate(report.submittedAt)}
          </p>
        </div>

        {/* Item count */}
        <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.78rem', color: 'rgba(245,242,236,0.35)' }}>
          {report.items.length} item{report.items.length !== 1 ? 's' : ''}
        </span>

        {/* Chevron */}
        <span style={{ color: 'rgba(245,242,236,0.3)', fontSize: '1.1rem', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 1.4rem' }}>
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '1.25rem' }}>
              <p style={{
                fontFamily: 'var(--font-cinzel)', fontSize: '0.68rem', color: 'var(--teal)',
                letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.6rem',
              }}>{cat}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {items.map(item => (
                  <div key={item.templateId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255,255,255,0.02)', borderRadius: '2px',
                  }}>
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)' }}>{item.name}</span>
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 700 }}>
                      {item.quantity} {UNIT_LABELS[item.unit]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {report.notes && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.35)', marginBottom: '0.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notes</p>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.7)' }}>{report.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WeeklyOrdersPage() {
  const { checking, role } = useRequireRole(ALL_ROLES)
  const [reports,    setReports]    = useState<WeeklyOrderReport[]>([])
  const [loading,    setLoading]    = useState(true)
  const [branchFilter, setBranchFilter] = useState<string>('all')

  useEffect(() => {
    listWeeklyReports().then(data => { setReports(data); setLoading(false) })
  }, [])

  const visible = branchFilter === 'all'
    ? reports
    : reports.filter(r => r.branch === branchFilter)

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <a href="/admin" style={{
            fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
            marginBottom: '0.5rem', display: 'block', fontFamily: 'var(--font-inter)',
          }}>← Dashboard</a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
                Weekly Order Reports
              </h1>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)' }}>
                End-of-week stock and supply orders submitted by staff
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a href="/admin/weekly-orders/submit" style={{
                backgroundColor: 'var(--teal)', color: '#fff', textDecoration: 'none',
                padding: '0.65rem 1.4rem', borderRadius: '2px', fontSize: '0.75rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-inter)',
              }}>+ Submit Report</a>
              {role === 'admin' && (
                <a href="/admin/weekly-orders/template" style={{
                  backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(245,242,236,0.5)', textDecoration: 'none',
                  padding: '0.65rem 1.2rem', borderRadius: '2px', fontSize: '0.72rem',
                  letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-inter)',
                }}>Edit Template</a>
              )}
            </div>
          </div>
        </div>

        {/* Branch filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['all', ...BRANCHES] as const).map(b => (
            <button key={b} onClick={() => setBranchFilter(b)} style={{
              backgroundColor: branchFilter === b ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${branchFilter === b ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
              color: branchFilter === b ? 'var(--offwhite)' : 'rgba(245,242,236,0.4)',
              padding: '0.45rem 1rem', borderRadius: '2px', fontSize: '0.72rem',
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
            }}>
              {b === 'all' ? `All Branches (${reports.length})` : `${b} (${reports.filter(r => r.branch === b).length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>Loading…</p>
        ) : visible.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px',
            padding: '3rem', textAlign: 'center',
            color: 'rgba(245,242,236,0.25)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem',
          }}>
            {branchFilter === 'all' ? 'No reports submitted yet.' : `No reports for ${branchFilter} yet.`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visible.map(r => <ReportCard key={r.id} report={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
