'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRequireRole, SECTION_ACCESS } from '../../../../lib/adminAuth'
import { useIsMobile } from '../../../../lib/useIsMobile'
import {
  INVENTORY_BRANCHES, DEPARTMENTS, listDailyInventories,
  type DailyInventoryReport,
} from '../../../../lib/dailyInventory'

const DEPT_COLOR: Record<string, string> = {
  Kitchen:  '#00A098',
  Bar:      '#C9962C',
  Cleaning: '#8B7CF6',
  Other:    'rgba(245,242,236,0.45)',
}

const sel: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
  color: '#F5F2EC', borderRadius: '4px', padding: '0.5rem 0.7rem',
  fontSize: '0.82rem', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)',
}

function discrepancyCount(r: DailyInventoryReport) {
  return r.items.filter(i => i.countedQty != null && i.countedQty !== i.previousQty).length
}

export default function DailyInventoryHistoryPage() {
  const { checking } = useRequireRole(SECTION_ACCESS.dailyInventoryHistory)
  const isMobile = useIsMobile()

  const [branchFilter, setBranchFilter]         = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  const [reports, setReports] = useState<DailyInventoryReport[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (checking) return
    setLoading(true)
    listDailyInventories(branchFilter === 'all' ? 'all' : branchFilter, 150)
      .then(r => { setReports(r); setLoading(false) })
      .catch(() => setLoading(false))
  }, [checking, branchFilter])

  const visible = useMemo(() => {
    return reports.filter(r => departmentFilter === 'all' || r.department === departmentFilter)
  }, [reports, departmentFilter])

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: isMobile ? '1.25rem 1rem 3rem' : '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <a href="/admin/supplies/daily" style={{
          fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
          display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-inter)',
        }}>← Daily Inventory Count</a>
        <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.8rem', color: 'var(--offwhite)', marginBottom: '0.2rem' }}>
          Daily Inventory History
        </h1>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)', marginBottom: '1.75rem' }}>
          Every submitted and in-progress inventory count, by branch and department.
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={sel}>
            <option value="all">All Branches</option>
            {INVENTORY_BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} style={sel}>
            <option value="all">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem' }}>Loading…</p>
        ) : visible.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px', padding: '3rem', textAlign: 'center', color: 'rgba(245,242,236,0.25)', fontFamily: 'var(--font-inter)', fontSize: '0.85rem' }}>
            No inventory counts match these filters yet.
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {visible.map(r => (
              <ReportRowMobile key={r.id} report={r} expanded={expandedId === r.id} onToggle={() => setExpandedId(v => v === r.id ? null : r.id)} />
            ))}
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Branch', 'Department', 'Status', 'Submitted By', 'Discrepancies', ''].map(h => (
                      <th key={h} style={{
                        padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.62rem',
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map(r => (
                    <ReportRowDesktop key={r.id} report={r} expanded={expandedId === r.id} onToggle={() => setExpandedId(v => v === r.id ? null : r.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemSheet({ report }: { report: DailyInventoryReport }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Item', 'Unit', 'Last Count', 'New Count', 'Δ'].map(h => (
              <th key={h} style={{
                padding: '0.5rem 0.85rem', textAlign: h === 'Item' ? 'left' : 'right',
                fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.items.map(i => {
            const delta = i.countedQty == null ? null : i.countedQty - i.previousQty
            return (
              <tr key={i.supplyId} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', color: 'var(--offwhite)', fontFamily: 'var(--font-inter)' }}>
                  {i.name}
                  {i.nameAr && <span dir="rtl" style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(201,150,44,0.75)', marginTop: '0.1rem' }}>{i.nameAr}</span>}
                </td>
                <td style={{ padding: '0.5rem 0.85rem', fontSize: '0.75rem', color: 'rgba(245,242,236,0.4)', fontFamily: 'var(--font-inter)', textAlign: 'right' }}>{i.unit}</td>
                <td style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', color: 'rgba(245,242,236,0.5)', fontFamily: 'var(--font-inter)', textAlign: 'right' }}>{i.previousQty}</td>
                <td style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, color: i.countedQty == null ? 'rgba(245,242,236,0.2)' : 'var(--offwhite)', fontFamily: 'var(--font-inter)', textAlign: 'right' }}>
                  {i.countedQty == null ? '—' : i.countedQty}
                </td>
                <td style={{
                  padding: '0.5rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-inter)', textAlign: 'right',
                  color: delta == null || delta === 0 ? 'rgba(245,242,236,0.25)' : delta < 0 ? 'var(--red)' : 'var(--teal)',
                }}>
                  {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ReportRowDesktop({ report, expanded, onToggle }: { report: DailyInventoryReport; expanded: boolean; onToggle: () => void }) {
  const discrepancies = discrepancyCount(report)
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.04)', background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
      >
        <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: 'var(--offwhite)', fontWeight: 500, fontFamily: 'var(--font-inter)' }}>{report.date}</td>
        <td style={{ padding: '0.8rem 1rem', fontSize: '0.82rem', color: 'rgba(245,242,236,0.5)', fontFamily: 'var(--font-inter)' }}>{report.branch}</td>
        <td style={{ padding: '0.8rem 1rem', fontSize: '0.78rem', fontFamily: 'var(--font-inter)' }}>
          <span style={{ color: DEPT_COLOR[report.department] ?? 'rgba(245,242,236,0.5)', letterSpacing: '0.05em' }}>{report.department}</span>
        </td>
        <td style={{ padding: '0.8rem 1rem', fontSize: '0.72rem', fontFamily: 'var(--font-inter)' }}>
          <span style={{
            color: report.status === 'submitted' ? 'var(--teal)' : '#C9962C',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{report.status === 'submitted' ? 'Submitted' : 'Draft'}</span>
        </td>
        <td style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', color: 'rgba(245,242,236,0.35)', fontFamily: 'var(--font-inter)' }}>{report.submittedByEmail}</td>
        <td style={{ padding: '0.8rem 1rem', fontSize: '0.75rem', fontFamily: 'var(--font-inter)', color: discrepancies > 0 ? '#C9962C' : 'rgba(245,242,236,0.3)' }}>
          {report.status === 'submitted' ? (discrepancies > 0 ? `${discrepancies} changed` : 'matched') : '—'}
        </td>
        <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: 'rgba(245,242,236,0.25)', textAlign: 'right' }}>{expanded ? '▾' : '▸'}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: '0 1rem 1.25rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ marginBottom: '0.6rem' }}>
              <a
                href={`/admin/supplies/daily?branch=${encodeURIComponent(report.branch)}&department=${encodeURIComponent(report.department)}&date=${report.date}`}
                style={{ fontSize: '0.72rem', color: '#6A9E5A', textDecoration: 'none', fontFamily: 'var(--font-inter)' }}
              >Open in Daily Count →</a>
            </div>
            <ItemSheet report={report} />
          </td>
        </tr>
      )}
    </>
  )
}

function ReportRowMobile({ report, expanded, onToggle }: { report: DailyInventoryReport; expanded: boolean; onToggle: () => void }) {
  const discrepancies = discrepancyCount(report)
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '4px', overflow: 'hidden',
    }}>
      <div onClick={onToggle} style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)', fontWeight: 500 }}>{report.date}</span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.25)' }}>{expanded ? '▾' : '▸'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.5)' }}>{report.branch}</span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: DEPT_COLOR[report.department] ?? 'rgba(245,242,236,0.5)' }}>{report.department}</span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.68rem', color: report.status === 'submitted' ? 'var(--teal)' : '#C9962C', textTransform: 'uppercase' }}>
            {report.status === 'submitted' ? 'Submitted' : 'Draft'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: 'rgba(245,242,236,0.35)' }}>{report.submittedByEmail}</span>
          {report.status === 'submitted' && (
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.72rem', color: discrepancies > 0 ? '#C9962C' : 'rgba(245,242,236,0.3)' }}>
              {discrepancies > 0 ? `${discrepancies} changed` : 'matched'}
            </span>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ margin: '0.6rem 0' }}>
            <a
              href={`/admin/supplies/daily?branch=${encodeURIComponent(report.branch)}&department=${encodeURIComponent(report.department)}&date=${report.date}`}
              style={{ fontSize: '0.72rem', color: '#6A9E5A', textDecoration: 'none', fontFamily: 'var(--font-inter)' }}
            >Open in Daily Count →</a>
          </div>
          <ItemSheet report={report} />
        </div>
      )}
    </div>
  )
}
