'use client'

import {
  collection, doc, getDocs, updateDoc, runTransaction,
  serverTimestamp, query, orderBy, limit, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { logActivity } from './activityLog'
import { uploadImage } from './media'
import { BRANCHES, normalizeStock } from './branches'

export interface PurchaseItem {
  gameId: string
  gameName: string
  quantity: number
  unitPrice: number
  priceType: 'retail' | 'wholesale'
  subtotal: number
}

export interface GamePurchaseOrder {
  id: string
  invoiceNumber: string
  customerName: string
  items: PurchaseItem[]
  total: number
  branch: string
  status: 'completed' | 'refunded'
  invoiceUrl: string | null
  processedBy: string
  processedByEmail: string
  createdAt: Timestamp | null
  refundedAt: Timestamp | null
  refundedBy: string | null
  refundNote: string | null
}

// Atomic sequential invoice number — increments a counter doc inside a
// Firestore transaction so two simultaneous orders can't receive the same
// number. Gaps are possible (if the main purchase transaction later fails),
// which is standard and acceptable in accounting systems.
async function nextInvoiceNumber(): Promise<string> {
  const counterRef = doc(db, 'appSettings', 'invoiceCounter')
  const year = new Date().getFullYear()
  let num = 1
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const data = snap.data() ?? {}
    num = data.year === year ? (data.nextNumber ?? 0) + 1 : 1
    tx.set(counterRef, { year, nextNumber: num })
  })
  return `INV-${year}-${String(num).padStart(4, '0')}`
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

export function drawInvoiceCanvas(
  invoiceNumber: string,
  customerName: string,
  branch: string,
  items: PurchaseItem[],
  total: number,
  processedByEmail: string,
  createdAt: Date,
  status: 'completed' | 'refunded',
): HTMLCanvasElement {
  const W = 794
  const PAD = 48
  const ROW_H = 32
  const HEADER_H = 100
  const TABLE_HDR_H = 38
  const ITEMS_H = items.length * ROW_H
  const H = HEADER_H + 180 + TABLE_HDR_H + ITEMS_H + 100 + 60

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // ── Header bar ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#150d2e'
  ctx.fillRect(0, 0, W, HEADER_H)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 20px Georgia, serif'
  ctx.textAlign = 'left'
  ctx.fillText('ONBOARD — GAMES & TALES', PAD, 44)
  ctx.font = '11px Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText('Board Game Café', PAD, 64)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 30px Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('INVOICE', W - PAD, 60)
  ctx.textAlign = 'left'

  // ── Meta block ──────────────────────────────────────────────────────────
  let y = HEADER_H + 32
  ctx.fillStyle = '#111111'
  ctx.font = 'bold 13px Arial, sans-serif'
  ctx.fillText(`Invoice: ${invoiceNumber}`, PAD, y)
  ctx.textAlign = 'right'
  ctx.fillStyle = status === 'refunded' ? '#cc2200' : '#006e6a'
  ctx.font = 'bold 13px Arial, sans-serif'
  ctx.fillText(status === 'refunded' ? '● REFUNDED' : '● COMPLETED', W - PAD, y)
  ctx.textAlign = 'left'

  y += 26
  ctx.fillStyle = '#555555'
  ctx.font = '12px Arial, sans-serif'
  ctx.fillText(`Date: ${createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, PAD, y)
  ctx.textAlign = 'right'
  ctx.fillText(`Branch: ${branch}`, W - PAD, y)
  ctx.textAlign = 'left'

  y += 28
  ctx.fillStyle = '#888888'
  ctx.font = '11px Arial, sans-serif'
  ctx.fillText('BILL TO', PAD, y)
  y += 20
  ctx.fillStyle = '#111111'
  ctx.font = 'bold 16px Arial, sans-serif'
  ctx.fillText(customerName, PAD, y)
  y += 22
  ctx.fillStyle = '#999999'
  ctx.font = '11px Arial, sans-serif'
  ctx.fillText(`Processed by: ${processedByEmail}`, PAD, y)

  // ── Divider ─────────────────────────────────────────────────────────────
  y += 24
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 16

  // ── Table header ────────────────────────────────────────────────────────
  const C_QTY   = W - PAD - 200
  const C_PRICE = W - PAD - 110
  const C_TOTAL = W - PAD

  ctx.fillStyle = '#f3f3f3'
  ctx.fillRect(PAD, y, W - PAD * 2, TABLE_HDR_H)
  ctx.fillStyle = '#444444'
  ctx.font = 'bold 10px Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('ITEM', PAD + 10, y + 24)
  ctx.textAlign = 'right'
  ctx.fillText('QTY', C_QTY, y + 24)
  ctx.fillText('UNIT PRICE', C_PRICE, y + 24)
  ctx.fillText('SUBTOTAL', C_TOTAL, y + 24)
  y += TABLE_HDR_H

  // ── Items ───────────────────────────────────────────────────────────────
  ctx.font = '13px Arial, sans-serif'
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (i % 2 === 1) {
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(PAD, y, W - PAD * 2, ROW_H)
    }
    ctx.textAlign = 'left'
    ctx.fillStyle = '#222222'
    ctx.fillText(truncate(ctx, item.gameName, C_QTY - PAD - 30), PAD + 10, y + 21)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#555555'
    ctx.fillText(String(item.quantity), C_QTY, y + 21)
    ctx.fillText(`$${item.unitPrice.toFixed(2)}`, C_PRICE, y + 21)
    ctx.fillStyle = '#222222'
    ctx.font = '13px Arial, sans-serif'
    ctx.fillText(`$${item.subtotal.toFixed(2)}`, C_TOTAL, y + 21)
    y += ROW_H
  }

  // ── Total row ────────────────────────────────────────────────────────────
  y += 16
  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(C_QTY - 20, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 24
  ctx.fillStyle = '#150d2e'
  ctx.fillRect(C_QTY - 30, y - 24, W - PAD - (C_QTY - 30), 36)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 15px Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`TOTAL:  $${total.toFixed(2)}`, W - PAD - 8, y - 4)
  ctx.textAlign = 'left'

  // ── Footer ───────────────────────────────────────────────────────────────
  const FOOTER_Y = H - 60
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, FOOTER_Y, W, 60)
  ctx.fillStyle = '#888888'
  ctx.font = '11px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Thank you for your business — Onboard Games & Tales', W / 2, FOOTER_Y + 24)
  ctx.fillText('This invoice was generated automatically. Please retain for your records.', W / 2, FOOTER_Y + 44)
  ctx.textAlign = 'left'

  return canvas
}

async function uploadInvoiceImage(
  invoiceNumber: string,
  customerName: string,
  branch: string,
  items: PurchaseItem[],
  total: number,
  processedByEmail: string,
  status: 'completed' | 'refunded' = 'completed',
): Promise<string> {
  const canvas = drawInvoiceCanvas(
    invoiceNumber, customerName, branch, items, total,
    processedByEmail, new Date(), status,
  )
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('canvas toBlob failed'))), 'image/png'),
  )
  const file = new File([blob], `invoice-${invoiceNumber}.png`, { type: 'image/png' })
  const { url } = await uploadImage(file)
  return url
}

export async function createPurchaseOrder(input: {
  customerName: string
  branch: string
  items: PurchaseItem[]
  processedBy: string
  processedByEmail: string
}): Promise<{ orderId: string; invoiceUrl: string | null }> {
  const total = input.items.reduce((s, it) => s + it.subtotal, 0)
  const invoiceNumber = await nextInvoiceNumber()

  // Aggregate quantities per game so duplicate cart entries don't cause
  // partial deduction (the second tx.update would overwrite the first).
  const qtyByGame = new Map<string, number>()
  for (const it of input.items) {
    qtyByGame.set(it.gameId, (qtyByGame.get(it.gameId) ?? 0) + it.quantity)
  }
  const gameIds = [...qtyByGame.keys()]
  const gameRefs = gameIds.map(id => doc(db, 'games', id))

  let orderId = ''
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(gameRefs.map(r => tx.get(r)))

    for (const [gameId, need] of qtyByGame) {
      const snap = snaps.find(s => s.id === gameId)!
      const data = snap.data() ?? {}
      // Legacy flat-number stock → treat as Beirut-only on first purchase
      const rawStock = data.stock
      const stock: Record<string, number> =
        typeof rawStock === 'number'
          ? Object.fromEntries(BRANCHES.map((b, i) => [b, i === 0 ? rawStock : 0]))
          : { ...(rawStock ?? {}) }
      const have = stock[input.branch] ?? 0
      const gameName = input.items.find(it => it.gameId === gameId)?.gameName ?? gameId
      if (have < need) throw new Error(`insufficient-stock:${gameName}`)
      stock[input.branch] = have - need
      tx.update(snaps.find(s => s.id === gameId)!.ref, { stock, updatedAt: serverTimestamp() })
    }

    const orderRef = doc(collection(db, 'gamePurchaseOrders'))
    orderId = orderRef.id
    tx.set(orderRef, {
      invoiceNumber,
      customerName: input.customerName,
      items: input.items,
      total,
      branch: input.branch,
      status: 'completed',
      invoiceUrl: null,
      processedBy: input.processedBy,
      processedByEmail: input.processedByEmail,
      createdAt: serverTimestamp(),
      refundedAt: null,
      refundedBy: null,
      refundNote: null,
    })
  })

  // Invoice image is generated outside the transaction (canvas → upload)
  let invoiceUrl: string | null = null
  try {
    invoiceUrl = await uploadInvoiceImage(
      invoiceNumber, input.customerName, input.branch,
      input.items, total, input.processedByEmail,
    )
    await updateDoc(doc(db, 'gamePurchaseOrders', orderId), { invoiceUrl })
  } catch {
    // Non-fatal — the order is already committed; invoice image can be
    // regenerated later via regenerateOrderInvoice().
  }

  await logActivity('create', 'Game Sale', `${invoiceNumber} — ${input.customerName} (${input.branch}) $${total.toFixed(2)}`)
  return { orderId, invoiceUrl }
}

// Re-renders and re-uploads the invoice image for an existing order — useful
// if the initial upload failed right after the order transaction committed.
export async function regenerateOrderInvoice(order: GamePurchaseOrder): Promise<string> {
  const url = await uploadInvoiceImage(
    order.invoiceNumber, order.customerName, order.branch,
    order.items, order.total, order.processedByEmail,
    order.status,
  )
  await updateDoc(doc(db, 'gamePurchaseOrders', order.id), { invoiceUrl: url })
  return url
}

export async function refundOrder(
  orderId: string,
  refundNote: string,
  processedByEmail: string,
): Promise<void> {
  const orderRef = doc(db, 'gamePurchaseOrders', orderId)

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists()) throw new Error('order-not-found')
    const order = orderSnap.data() as Omit<GamePurchaseOrder, 'id'>
    if (order.status === 'refunded') throw new Error('already-refunded')

    const qtyByGame = new Map<string, number>()
    for (const it of order.items as PurchaseItem[]) {
      qtyByGame.set(it.gameId, (qtyByGame.get(it.gameId) ?? 0) + it.quantity)
    }
    const gameRefs = [...qtyByGame.keys()].map(id => doc(db, 'games', id))
    const snaps = await Promise.all(gameRefs.map(r => tx.get(r)))

    for (const [gameId, qty] of qtyByGame) {
      const snap = snaps.find(s => s.id === gameId)!
      if (!snap.exists()) continue
      const data = snap.data() ?? {}
      const rawStock = data.stock
      const stock: Record<string, number> =
        typeof rawStock === 'number'
          ? Object.fromEntries(BRANCHES.map((b, i) => [b, i === 0 ? rawStock : 0]))
          : { ...(rawStock ?? {}) }
      stock[order.branch] = (stock[order.branch] ?? 0) + qty
      tx.update(snap.ref, { stock, updatedAt: serverTimestamp() })
    }

    tx.update(orderRef, {
      status: 'refunded',
      refundedAt: serverTimestamp(),
      refundedBy: processedByEmail,
      refundNote: refundNote.trim() || null,
    })
  })

  await logActivity('update', 'Game Sale Refund', `Order ${orderId} refunded by ${processedByEmail}`)
}

// Atomically moves copies of one or more games from one branch to another in a
// single Firestore transaction — all reads happen first, all stock is validated,
// then all writes are applied together so a failure on any one game rolls back
// everything. Throws 'insufficient-stock:<gameName>' if any game doesn't have
// enough stock at fromBranch.
export async function transferGameStock(
  items: { gameId: string; gameName: string; quantity: number }[],
  fromBranch: string,
  toBranch: string,
): Promise<void> {
  const refs = items.map(item => doc(db, 'games', item.gameId))
  await runTransaction(db, async tx => {
    const snaps = await Promise.all(refs.map(ref => tx.get(ref)))
    for (let i = 0; i < items.length; i++) {
      if (!snaps[i].exists()) throw new Error(`game-not-found:${items[i].gameId}`)
      const stock = normalizeStock(snaps[i].data()!.stock)
      if ((stock[fromBranch] ?? 0) < items[i].quantity)
        throw new Error(`insufficient-stock:${items[i].gameName}`)
    }
    for (let i = 0; i < items.length; i++) {
      const stock = normalizeStock(snaps[i].data()!.stock)
      stock[fromBranch] = (stock[fromBranch] ?? 0) - items[i].quantity
      stock[toBranch]   = (stock[toBranch]   ?? 0) + items[i].quantity
      tx.update(refs[i], { stock, updatedAt: serverTimestamp() })
    }
  })
  await logActivity(
    'update', 'Stock Transfer',
    `${fromBranch} → ${toBranch}: ${items.map(i => `${i.gameName} ×${i.quantity}`).join(', ')}`,
  )
}

export async function listPurchaseOrders(max = 200): Promise<GamePurchaseOrder[]> {
  const snap = await getDocs(
    query(collection(db, 'gamePurchaseOrders'), orderBy('createdAt', 'desc'), limit(max)),
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as GamePurchaseOrder))
}

// Exports the game library as a CSV file directly from the browser.
// includeWholesale controls whether the wholesalePrice column appears.
export function exportGamesCSV(
  games: Array<{
    name: string
    category: string
    price: number
    wholesalePrice?: number | null
    stock?: Record<string, number> | number
  }>,
  includeWholesale: boolean,
): void {
  const headers = [
    'Name', 'Category', 'Retail Price ($)',
    ...(includeWholesale ? ['Wholesale Price ($)'] : []),
    ...BRANCHES.map(b => `Stock — ${b}`),
    'Total Stock',
  ]
  const rows = games.map(g => {
    const stockMap: Record<string, number> =
      typeof g.stock === 'number'
        ? Object.fromEntries(BRANCHES.map((b, i) => [b, i === 0 ? (g.stock as number) : 0]))
        : { ...(g.stock ?? {}) }
    const total = BRANCHES.reduce((s, b) => s + (stockMap[b] ?? 0), 0)
    return [
      `"${g.name.replace(/"/g, '""')}"`,
      `"${(g.category ?? '').replace(/"/g, '""')}"`,
      g.price > 0 ? g.price.toFixed(2) : '',
      ...(includeWholesale ? [g.wholesalePrice != null ? (g.wholesalePrice as number).toFixed(2) : ''] : []),
      ...BRANCHES.map(b => stockMap[b] ?? 0),
      total,
    ]
  })
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = includeWholesale ? 'game-library-full.csv' : 'game-library-retail.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
