'use client'

import { useEffect, useState } from 'react'
import { useRequireRole, ALL_ROLES } from '../../lib/adminAuth'
import {
  listWeeklyReports, listTemplateItems, listCategoryMeta, listProviders,
  generateOrderText, whatsappUrl, groupByCategory, getProviderPhone,
  UNIT_LABELS,
  type WeeklyOrderReport, type WeeklyOrderReportItem,
  type OrderTemplateItem, type OrderCategoryMeta, type OrderProvider,
} from '../../lib/weeklyOrders'
import { BRANCHES } from '../../lib/branches'

function fmtDate(ts: { seconds: number } | null): string {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ReportCard({
  report,
  categoryMeta,
  providers,
  nameArMap,
}: {
  report: WeeklyOrderReport
  categoryMeta: Record<string, OrderCategoryMeta>
  providers: Record<string, OrderProvider>
  nameArMap: Record<string, string>
}) {
  const [open,      setOpen]      = useState(false)
  const [showAr,    setShowAr]    = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [copiedCat, setCopiedCat] = useState<string | null>(null)

  const groups = groupByCategory(report.items)

  function copyAll() {
    const text = generateOrderText(report, categoryMeta, providers, nameArMap, showAr)
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function copyCat(category: string) {
    const text = generateOrderText(report, categoryMeta, providers, nameArMap, showAr, category)
    navigator.clipboard.writeText(text)
    setCopiedCat(category); setTimeout(() => setCopiedCat(null), 2000)
  }

  const hasArabic = report.items.some(i => nameArMap[i.templateId])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '4px', overflow: 'hidden',
    }}>
      {/* Summary row */}
      <div style={{
        padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        cursor: 'pointer',
      }} onClick={() => setOpen(o => !o)}>
        <span style={{
          backgroundColor: 'rgba(0,160,152,0.12)', border: '1px solid rgba(0,160,152,0.3)',
          color: 'var(--teal)', borderRadius: '2px', padding: '0.2rem 0.6rem',
          fontSize: '0.72rem', letterSpacing: '0.1em', fontFamily: 'var(--font-inter)', fontWeight: 600, flexShrink: 0,
        }}>
          {report.branch}
        </span>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.9rem', color: 'var(--offwhite)', fontWeight: 600, marginBottom: '0.1rem' }}>
            {report.weekLabel}
          </p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.73rem', color: 'rgba(245,242,236,0.35)' }}>
            {report.submittedByEmail} · {fmtDate(report.submittedAt)}
          </p>
        </div>

        <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.3)', flexShrink: 0 }}>
          {report.items.length} item{report.items.length !== 1 ? 's' : ''}
        </span>

        <span style={{ color: 'rgba(245,242,236,0.25)', fontSize: '1.1rem', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>›</span>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Action bar */}
          <div style={{
            padding: '0.75rem 1.25rem',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Copy all */}
            <button onClick={copyAll} style={{
              backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: copied ? 'var(--teal)' : 'rgba(245,242,236,0.7)',
              padding: '0.45rem 1rem', borderRadius: '2px', fontSize: '0.72rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'var(--font-inter)', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              {copied ? '✓ Copied!' : '📋 Copy Full Order'}
            </button>

            {/* Arabic toggle */}
            {hasArabic && (
              <button onClick={e => { e.stopPropagation(); setShowAr(v => !v) }} style={{
                backgroundColor: showAr ? 'rgba(201,150,44,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showAr ? 'rgba(201,150,44,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: showAr ? '#C9962C' : 'rgba(245,242,236,0.5)',
                padding: '0.45rem 1rem', borderRadius: '2px', fontSize: '0.72rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
              }}>
                {showAr ? '🌐 Arabic ON' : '🌐 Show Arabic'}
              </button>
            )}
          </div>

          {/* Items by category */}
          <div style={{ padding: '1.25rem' }}>
            {groups.map(({ category, items: catItems }) => {
              const meta      = categoryMeta[category]
              const provider  = meta?.providerId ? providers[meta.providerId] : undefined
              const phone     = provider ? getProviderPhone(provider, report.branch) : ''
              const waText    = generateOrderText(report, categoryMeta, providers, nameArMap, showAr, category)

              return (
                <div key={category} style={{ marginBottom: '1.5rem' }}>
                  {/* Category + provider header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.7rem', color: 'var(--teal)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        {category}
                      </span>
                      {provider && (
                        <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.75rem', color: 'rgba(245,242,236,0.4)', marginLeft: '0.75rem' }}>
                          {provider.name}{phone ? ` · ${phone}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Per-provider action buttons */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => copyCat(category)} style={{
                        backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                        color: copiedCat === category ? 'var(--teal)' : 'rgba(245,242,236,0.4)',
                        padding: '0.3rem 0.7rem', borderRadius: '2px', fontSize: '0.7rem',
                        cursor: 'pointer', fontFamily: 'var(--font-inter)',
                      }}>
                        {copiedCat === category ? '✓' : '📋'}
                      </button>

                      {phone && (
                        <a
                          href={whatsappUrl(phone, waText)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            backgroundColor: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)',
                            color: '#25D366', padding: '0.3rem 0.75rem', borderRadius: '2px',
                            fontSize: '0.7rem', textDecoration: 'none', fontFamily: 'var(--font-inter)',
                          }}
                        >
                          WhatsApp {provider?.name ?? ''}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Item rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {catItems.map(item => {
                      const ar = nameArMap[item.templateId]
                      return (
                        <div key={item.templateId} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.5rem 0.9rem',
                          background: 'rgba(255,255,255,0.025)', borderRadius: '2px',
                        }}>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'var(--offwhite)' }}>
                            {item.name}
                            {showAr && ar && (
                              <span dir="rtl" style={{ color: '#C9962C', marginRight: '0.6rem', marginLeft: '0.6rem' }}>{ar}</span>
                            )}
                          </span>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '0.88rem', color: 'var(--teal)', fontWeight: 700, flexShrink: 0 }}>
                            {item.quantity} {UNIT_LABELS[item.unit]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {report.notes && (
              <div style={{ marginTop: '0.5rem', padding: '0.7rem 0.9rem', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.7rem', color: 'rgba(245,242,236,0.3)', marginBottom: '0.2rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notes</p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.85rem', color: 'rgba(245,242,236,0.7)' }}>{report.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WeeklyOrdersPage() {
  const { checking, role } = useRequireRole(ALL_ROLES)
  const [reports,      setReports]      = useState<WeeklyOrderReport[]>([])
  const [categoryMeta, setCategoryMeta] = useState<Record<string, OrderCategoryMeta>>({})
  const [providers,    setProviders]    = useState<Record<string, OrderProvider>>({})
  const [nameArMap,    setNameArMap]    = useState<Record<string, string>>({})  // templateId -> nameAr
  const [loading,      setLoading]      = useState(true)
  const [branchFilter, setBranchFilter] = useState<string>('all')

  useEffect(() => {
    Promise.all([listWeeklyReports(), listTemplateItems(), listCategoryMeta(), listProviders()]).then(
      ([reps, tItems, meta, provs]) => {
        setReports(reps)
        setCategoryMeta(meta)
        setProviders(Object.fromEntries(provs.map(p => [p.id, p])))
        setNameArMap(Object.fromEntries(
          tItems.filter(i => i.nameAr).map(i => [i.id, i.nameAr!])
        ))
        setLoading(false)
      }
    )
  }, [])

  const visible = branchFilter === 'all'
    ? reports
    : reports.filter(r => r.branch === branchFilter)

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--black)', padding: '3rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <a href="/admin" style={{
            fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.3)', textDecoration: 'none',
            marginBottom: '0.5rem', display: 'block', fontFamily: 'var(--font-inter)',
          }}>← Dashboard</a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '2rem', color: 'var(--offwhite)', marginBottom: '0.25rem' }}>
                Weekly Order Reports
              </h1>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: '0.82rem', color: 'rgba(245,242,236,0.3)' }}>
                End-of-week stock and supply orders — copy or WhatsApp directly to your suppliers
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
              {b === 'all' ? `All (${reports.length})` : `${b} (${reports.filter(r => r.branch === b).length})`}
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
            {visible.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                categoryMeta={categoryMeta}
                providers={providers}
                nameArMap={nameArMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
