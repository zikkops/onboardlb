import {
  collection, addDoc, getDocs, query, orderBy,
  doc, updateDoc, deleteDoc, serverTimestamp,
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
  category: string
  unit: OrderUnit
  sortOrder: number
  createdAt: { seconds: number } | null
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
