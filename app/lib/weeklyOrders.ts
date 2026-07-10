import {
  collection, addDoc, getDocs, query, orderBy,
  doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { logActivity, logUpdate, logDelete } from './activityLog'
import { BRANCHES } from './branches'

export type OrderUnit = 'box' | 'kg' | 'liter'
export type Department = 'Kitchen' | 'Bar'

export const UNIT_LABELS: Record<OrderUnit, string> = {
  box:   'Box',
  kg:    'KG',
  liter: 'Liter',
}

export const DEPARTMENTS: Department[] = ['Kitchen', 'Bar']

// ---- Providers ----

export interface OrderProvider {
  id: string
  name: string
  phones: Partial<Record<typeof BRANCHES[number], string>>
  notes?: string
  createdAt: { seconds: number } | null
}

export async function listProviders(): Promise<OrderProvider[]> {
  const snap = await getDocs(query(collection(db, 'orderProviders'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderProvider))
}

export async function addProvider(p: Omit<OrderProvider, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'orderProviders'), { ...p, createdAt: serverTimestamp() })
  await logActivity('create', 'Order Provider', p.name)
}

export async function updateProvider(
  id: string,
  before: Partial<OrderProvider>,
  after: Partial<OrderProvider>,
): Promise<void> {
  await updateDoc(doc(db, 'orderProviders', id), { ...after })
  await logUpdate('Order Provider', after.name ?? id, before, after)
}

export async function deleteProvider(id: string, name: string): Promise<void> {
  await deleteDoc(doc(db, 'orderProviders', id))
  await logDelete('Order Provider', name)
}

export function getProviderPhone(provider: OrderProvider | undefined, branch: string): string {
  return provider?.phones?.[branch as typeof BRANCHES[number]] ?? ''
}

// ---- Template items ----

export interface OrderTemplateItem {
  id: string
  name: string
  nameAr?: string
  department: Department
  providerId?: string
  unit: OrderUnit
  packSize?: number
  packUnit?: string
  sortOrder: number
  createdAt: { seconds: number } | null
}

export interface WeeklyOrderReportItem {
  templateId: string
  name: string
  department: Department
  providerId?: string
  unit: OrderUnit
  quantity: number
  packSize?: number
  packUnit?: string
}

export interface WeeklyOrderReport {
  id: string
  branch: string
  weekStart: string
  weekLabel: string
  items: WeeklyOrderReportItem[]
  notes: string
  submittedBy: string
  submittedByEmail: string
  submittedAt: { seconds: number } | null
}

export async function listTemplateItems(): Promise<OrderTemplateItem[]> {
  const snap = await getDocs(query(collection(db, 'orderTemplateItems'), orderBy('name')))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as OrderTemplateItem))
    .sort((a, b) => {
      const dA = DEPARTMENTS.indexOf(a.department ?? 'Kitchen')
      const dB = DEPARTMENTS.indexOf(b.department ?? 'Kitchen')
      if (dA !== dB) return dA - dB
      return (a.providerId ?? '').localeCompare(b.providerId ?? '') || a.name.localeCompare(b.name)
    })
}

export async function addTemplateItem(
  item: Omit<OrderTemplateItem, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'orderTemplateItems'), { ...item, createdAt: serverTimestamp() })
  await logActivity('create', 'Weekly Order Template', `${item.department} — ${item.name}`)
}

export async function updateTemplateItem(
  id: string,
  before: Partial<OrderTemplateItem>,
  after: Partial<OrderTemplateItem>,
): Promise<void> {
  await updateDoc(doc(db, 'orderTemplateItems', id), { ...after })
  await logUpdate('Weekly Order Template', after.name ?? id, before, after)
}

export async function deleteTemplateItem(id: string, name: string): Promise<void> {
  await deleteDoc(doc(db, 'orderTemplateItems', id))
  await logDelete('Weekly Order Template', name)
}

// ---- Reports ----

export async function submitWeeklyReport(
  report: Omit<WeeklyOrderReport, 'id' | 'submittedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'weeklyOrderReports'), {
    ...report,
    submittedAt: serverTimestamp(),
  })
  await logActivity('create', 'Weekly Order Report', `${report.branch} — ${report.weekLabel}`)
  return ref.id
}

export async function listWeeklyReports(): Promise<WeeklyOrderReport[]> {
  const snap = await getDocs(
    query(collection(db, 'weeklyOrderReports'), orderBy('submittedAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyOrderReport))
}

// ---- Grouping helpers ----

export function groupByProvider<T extends { providerId?: string }>(
  items: T[]
): { providerId: string | undefined; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = item.providerId ?? '__none__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    providerId: key === '__none__' ? undefined : key,
    items,
  }))
}

// ---- Pack label ----

export function packLabel(unit: OrderUnit, packSize?: number, packUnit?: string): string {
  if (!packSize) return UNIT_LABELS[unit]
  const inside = packUnit ? ` ${packUnit}` : ''
  return `${UNIT_LABELS[unit]} (${packSize}${inside} each)`
}

// ---- Translation ----

export async function translateToArabic(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Translation request failed')
  const data = await res.json()
  if (data.responseStatus !== 200) throw new Error('Translation failed')
  return data.responseData.translatedText as string
}

// ---- Order text generation ----

// providerFilter: when set, generates text only for that provider's items (across all departments)
export function generateOrderText(
  report: WeeklyOrderReport,
  providers: Record<string, OrderProvider>,
  nameArMap: Record<string, string>,
  showArabic: boolean,
  providerFilter?: string,
): string {
  const lines: string[] = []

  // Always open with branch + week so the recipient knows context
  lines.push(`*Weekly Order — ${report.branch}*`)
  lines.push(`Week: ${report.weekLabel}`)
  lines.push('')

  for (const dept of DEPARTMENTS) {
    const deptItems = report.items.filter(i => (i.department ?? 'Kitchen') === dept)
    if (deptItems.length === 0) continue

    const provGroups = groupByProvider(deptItems)
    const filtered = providerFilter
      ? provGroups.filter(g => g.providerId === providerFilter)
      : provGroups

    if (filtered.length === 0) continue

    lines.push(`*${dept.toUpperCase()}*`)

    for (const { providerId, items: pItems } of filtered) {
      const provider = providerId ? providers[providerId] : undefined

      // In the full copy show the provider name; in a per-provider WhatsApp skip it
      // (they already know who they are) and never include the phone number
      if (!providerFilter) {
        lines.push(`*${provider?.name ?? 'No Provider'}*`)
      }

      for (const item of pItems) {
        const ar    = nameArMap[item.templateId]
        const nameDisplay = showArabic && ar ? `${item.name} (${ar})` : item.name
        lines.push(`• ${nameDisplay}: ${item.quantity} ${UNIT_LABELS[item.unit]}`)
      }
      lines.push('')
    }
  }

  if (!providerFilter && report.notes) {
    lines.push(`Notes: ${report.notes}`)
  }

  return lines.join('\n').trimEnd()
}

export function whatsappUrl(phone: string, text: string): string {
  const clean = phone.replace(/[\s\-().]/g, '').replace(/^00/, '+').replace(/^0/, '')
  const num   = clean.startsWith('+') ? clean.slice(1) : clean
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

// ---- Date helpers ----

export function getCurrentWeek(): { startStr: string; label: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const label = `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`
  const startStr = [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, '0'),
    String(monday.getDate()).padStart(2, '0'),
  ].join('-')

  return { startStr, label }
}
