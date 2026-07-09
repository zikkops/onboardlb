import {
  collection, addDoc, getDocs, query, orderBy,
  doc, updateDoc, deleteDoc, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { logActivity, logUpdate, logDelete } from './activityLog'

export type OrderUnit = 'box' | 'kg' | 'liter'

export const UNIT_LABELS: Record<OrderUnit, string> = {
  box:   'Box',
  kg:    'KG',
  liter: 'Liter',
}

export interface OrderTemplateItem {
  id: string
  name: string
  nameAr?: string      // Arabic translation, set in template editor
  category: string
  unit: OrderUnit
  sortOrder: number
  createdAt: { seconds: number } | null
}

export interface OrderCategoryMeta {
  providerName: string
  providerPhone: string
}

export interface WeeklyOrderReportItem {
  templateId: string
  name: string
  category: string
  unit: OrderUnit
  quantity: number
}

export interface WeeklyOrderReport {
  id: string
  branch: string
  weekStart: string      // YYYY-MM-DD (Monday)
  weekLabel: string      // "7 Jul – 13 Jul 2026"
  items: WeeklyOrderReportItem[]
  notes: string
  submittedBy: string    // uid
  submittedByEmail: string
  submittedAt: { seconds: number } | null
}

// ---- Template items ----

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
// One doc per category, doc id = category name, e.g. orderCategoryMeta/Beverages

export async function listCategoryMeta(): Promise<Record<string, OrderCategoryMeta>> {
  const snap = await getDocs(collection(db, 'orderCategoryMeta'))
  return Object.fromEntries(
    snap.docs.map(d => [d.id, d.data() as OrderCategoryMeta])
  )
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

// ---- Translation helper ----

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
  nameArMap: Record<string, string>,  // templateId -> nameAr
  showArabic: boolean,
  categoryFilter?: string,            // if set, only include this category
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
    const meta = categoryMeta[category]
    lines.push(`*${category.toUpperCase()}*`)
    if (meta?.providerName) {
      lines.push(`المورد: ${meta.providerName}${meta.providerPhone ? ` — ${meta.providerPhone}` : ''}`)
    }
    for (const item of items) {
      const ar = nameArMap[item.templateId]
      const nameDisplay = showArabic && ar ? `${item.name} (${ar})` : item.name
      lines.push(`• ${nameDisplay}: ${item.quantity} ${UNIT_LABELS[item.unit]}`)
    }
    lines.push('')
  }

  if (!categoryFilter && report.notes) {
    lines.push(`ملاحظات: ${report.notes}`)
  }

  return lines.join('\n').trimEnd()
}

export function whatsappUrl(phone: string, text: string): string {
  // Normalize phone: strip spaces and leading zeros, ensure it starts with country code
  const clean = phone.replace(/\s+/g, '').replace(/^0+/, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
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
