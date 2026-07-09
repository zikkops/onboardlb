import {
  collection, addDoc, getDocs, query, orderBy,
  doc, updateDoc, deleteDoc, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { logActivity, logUpdate, logDelete } from './activityLog'
import { BRANCHES } from './branches'

export type OrderUnit = 'box' | 'kg' | 'liter'

export const UNIT_LABELS: Record<OrderUnit, string> = {
  box:   'Box',
  kg:    'KG',
  liter: 'Liter',
}

// ---- Providers ----

export interface OrderProvider {
  id: string
  name: string
  phones: Partial<Record<typeof BRANCHES[number], string>>  // branch -> phone
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
  category: string
  unit: OrderUnit
  packSize?: number    // e.g. 4 — how many individual items are in one ordered unit
  packUnit?: string    // e.g. "bottles" — the name of the individual item inside the pack
  sortOrder: number
  createdAt: { seconds: number } | null
}

export interface OrderCategoryMeta {
  providerId?: string   // reference to orderProviders/{id}
}

export interface WeeklyOrderReportItem {
  templateId: string
  name: string
  category: string
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
  const snap = await getDocs(query(collection(db, 'orderTemplateItems'), orderBy('category')))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as OrderTemplateItem))
    .sort((a, b) =>
      a.category.localeCompare(b.category) ||
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.name.localeCompare(b.name)
    )
}

export async function addTemplateItem(
  item: Omit<OrderTemplateItem, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'orderTemplateItems'), { ...item, createdAt: serverTimestamp() })
  await logActivity('create', 'Weekly Order Template', `${item.category} — ${item.name}`)
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

// ---- Category provider meta ----

export async function listCategoryMeta(): Promise<Record<string, OrderCategoryMeta>> {
  const snap = await getDocs(collection(db, 'orderCategoryMeta'))
  return Object.fromEntries(snap.docs.map(d => [d.id, d.data() as OrderCategoryMeta]))
}

export async function setCategoryMeta(category: string, meta: OrderCategoryMeta): Promise<void> {
  await setDoc(doc(db, 'orderCategoryMeta', category), meta)
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

// Returns a label like "Box of 4 bottles" or just "KG" if no pack info
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

export function generateOrderText(
  report: WeeklyOrderReport,
  categoryMeta: Record<string, OrderCategoryMeta>,
  providers: Record<string, OrderProvider>,   // id -> provider
  nameArMap: Record<string, string>,          // templateId -> nameAr
  showArabic: boolean,
  categoryFilter?: string,
): string {
  const lines: string[] = []

  if (!categoryFilter) {
    lines.push(`*طلب أسبوعي — ${report.branch}*`)
    lines.push(`الأسبوع: ${report.weekLabel}`)
    lines.push('')
  }

  const groups = groupByCategory(report.items)
  const filtered = categoryFilter ? groups.filter(g => g.category === categoryFilter) : groups

  for (const { category, items } of filtered) {
    const providerId = categoryMeta[category]?.providerId
    const provider   = providerId ? providers[providerId] : undefined
    const phone      = provider ? getProviderPhone(provider, report.branch) : ''

    lines.push(`*${category.toUpperCase()}*`)
    if (provider?.name) {
      lines.push(`المورد: ${provider.name}${phone ? ` — ${phone}` : ''}`)
    }
    for (const item of items) {
      const ar    = nameArMap[item.templateId]
      const label = packLabel(item.unit, item.packSize, item.packUnit)
      const nameDisplay = showArabic && ar ? `${item.name} (${ar})` : item.name
      lines.push(`• ${nameDisplay}: ${item.quantity} ${label}`)
    }
    lines.push('')
  }

  if (!categoryFilter && report.notes) {
    lines.push(`ملاحظات: ${report.notes}`)
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

export function groupByCategory<T extends { category: string }>(items: T[]): { category: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, [])
    map.get(item.category)!.push(item)
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
}
