// Wholesale order submission.
//
// The write lives here rather than in the browser for two reasons: the standing
// rule from Phase 00 on is that new privileged mutations go behind a route
// handler, and the notification email can only be sent somewhere the API key
// exists — which is never the client.
//
// Prices are re-read from Firestore rather than trusted from the request, so a
// shop can't submit an order priced at $0.01 by editing what the browser sends.

import { adminAuth, adminDb } from '../../../lib/server/firebaseAdmin'
import { toResponse, HttpError, bearerToken, requireSection } from '../../../lib/server/auth'
import { sendEmail, emailConfigured } from '../../../lib/server/email'
import { FieldValue } from 'firebase-admin/firestore'
import { formatInvoiceNumber, INVOICE_NUMBER_PATTERN } from '../../../lib/invoiceFormat'
import { availableStock } from '../../../lib/branches'
import { parseOrdersEmails } from '../../../lib/ordersRecipients'

export const runtime = 'nodejs'

// Everyone who should hear about a new order. One send with several
// recipients, not one send each: a single Resend call means the notification
// either reaches the team or doesn't, instead of half-arriving.
const ORDERS_EMAILS = parseOrdersEmails(process.env.NEXT_PUBLIC_WHOLESALE_ORDERS_EMAIL)

interface LineInput { gameId: string; quantity: number }

interface Account {
  uid: string
  email: string
  shopName: string
  contactName: string
  phone: string
}

// Wholesale accounts are not staff, so getCaller()/requireStaff() don't apply.
// The claim is checked first (free); the document is only read to fetch the
// shop's details, which we need for the order anyway.
async function requireWholesale(request: Request): Promise<Account> {
  const token = bearerToken(request)
  if (!token) throw new HttpError(401, 'Not signed in.')

  let decoded
  try {
    decoded = await adminAuth().verifyIdToken(token, true)
  } catch {
    throw new HttpError(401, 'Session expired — please sign in again.')
  }
  if (decoded.wholesale !== true) throw new HttpError(403, 'Not a wholesale account.')

  const snap = await adminDb().doc(`users/${decoded.uid}`).get()
  const data = snap.data()
  if (!snap.exists || data?.isWholesale !== true) throw new HttpError(403, 'Not a wholesale account.')
  // Belt and braces: the claim is dropped on deactivation, but a token issued
  // moments before that still carries it for up to an hour.
  if (data?.wholesaleActive === false) throw new HttpError(403, 'This wholesale account is inactive.')

  return {
    uid: decoded.uid,
    email: (data.email as string) ?? decoded.email ?? '',
    shopName: (data.shopName as string) ?? '',
    contactName: (data.contactName as string) ?? '',
    phone: (data.phone as string) ?? '',
  }
}

function parseLines(body: Record<string, unknown>): LineInput[] {
  const raw = body.items
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, 'The order is empty.')
  if (raw.length > 200) throw new HttpError(400, 'Too many lines in one order.')

  // Merged by gameId, not just collected. Two lines naming the same game would
  // otherwise be stock-checked independently — each seeing the full available
  // quantity — and could reserve twice what exists.
  const byGame = new Map<string, number>()
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const gameId = (r as { gameId?: unknown }).gameId
    const quantity = Number((r as { quantity?: unknown }).quantity)
    if (typeof gameId !== 'string' || !gameId) continue
    if (!Number.isFinite(quantity) || quantity <= 0) continue
    byGame.set(gameId, (byGame.get(gameId) ?? 0) + Math.floor(quantity))
  }
  const lines: LineInput[] = [...byGame].map(([gameId, quantity]) => ({ gameId, quantity }))
  if (lines.length === 0) throw new HttpError(400, 'The order is empty.')
  return lines
}

function orderText(o: {
  id: string; shopName: string; email: string; contactName: string; phone: string
  items: Array<{ name: string; unitPrice: number; quantity: number }>
  totalUsd: number; itemCount: number; notes: string
  invoiceNumber?: string; invoiceUrl?: string
}): string {
  const lines = [
    `New wholesale order — ${o.shopName}`,
    `Reference: ${o.id.slice(0, 8).toUpperCase()}`,
    ...(o.invoiceNumber ? [`Invoice:   ${o.invoiceNumber}`] : []),
    '',
    'WHO ORDERED',
    `Name:    ${o.contactName || '—'}`,
    `Shop:    ${o.shopName}`,
    `Email:   ${o.email}`,
    `Phone:   ${o.phone || '—'}`,
    '',
    'ITEMS',
    ...o.items.map(i =>
      `${String(i.quantity).padStart(3)} x ${i.name} @ $${i.unitPrice.toFixed(2)} = $${(i.quantity * i.unitPrice).toFixed(2)}`),
    '',
    `${o.itemCount} units across ${o.items.length} titles`,
    `TOTAL: $${o.totalUsd.toFixed(2)}`,
  ]
  if (o.notes) lines.push('', `Notes: ${o.notes}`)
  if (o.invoiceUrl) lines.push('', `Invoice: ${o.invoiceUrl}`)
  lines.push('', 'Approve or reject: /admin/wholesale/orders')
  return lines.join('\n')
}

// Issues the next invoice number for a wholesale account.
//
// This exists because the counter document is admin-only in the Firestore
// rules, so a shop's browser cannot run the transaction itself — it got a 403
// and the invoice silently never appeared. The Admin SDK bypasses rules, so the
// number is minted here and the browser only draws with it.
export async function GET(request: Request): Promise<Response> {
  try {
    await requireWholesale(request)

    const db = adminDb()
    const ref = db.doc('appSettings/invoiceCounter')
    const issuedAt = new Date()
    const year = issuedAt.getFullYear()

    const sequence = await db.runTransaction(async tx => {
      const snap = await tx.get(ref)
      const data = snap.data() ?? {}
      const next = data.year === year ? (data.nextNumber ?? 0) + 1 : 1
      tx.set(ref, { year, nextNumber: next }, { merge: true })
      return next
    })

    return Response.json({ invoiceNumber: formatInvoiceNumber(sequence, issuedAt) })
  } catch (err) {
    return toResponse(err)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const account = await requireWholesale(request)

    let body: Record<string, unknown>
    try {
      body = await request.json() as Record<string, unknown>
    } catch {
      throw new HttpError(400, 'Request body must be JSON.')
    }

    const lines = parseLines(body)
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''

    // The invoice is drawn in the browser (canvas) and uploaded before this
    // call, so it arrives as a number plus a URL. Both are validated rather
    // than trusted: the number must match the OB- format, and the URL must be
    // an imgbb link, so neither can be used to smuggle arbitrary text or a
    // link to somewhere else into an email that goes out under our name.
    const rawNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : ''
    const rawUrl = typeof body.invoiceUrl === 'string' ? body.invoiceUrl.trim() : ''
    const invoiceNumber = INVOICE_NUMBER_PATTERN.test(rawNumber) ? rawNumber : ''
    const invoiceUrl = /^https:\/\/i\.ibb\.co\/[\w./-]+$/.test(rawUrl) ? rawUrl : ''

    // Re-price server-side. Whatever the browser claimed the price was is
    // ignored entirely.
    //
    // Pricing, the stock check and the reservation all happen in ONE
    // transaction. Checking availability with a plain read and then writing
    // would leave a window where two shops both pass the check on the last
    // copy and both reserve it. Firestore retries the transaction when a game
    // doc changes underneath it, so the loser re-reads and is told the truth.
    const db = adminDb()
    const refs = lines.map(l => db.doc(`games/${l.gameId}`))
    const ref = db.collection('wholesaleOrders').doc()

    let items: Array<{ gameId: string; name: string; unitPrice: number; quantity: number }> = []
    let totalUsd = 0
    let itemCount = 0

    await db.runTransaction(async tx => {
      const snaps = await tx.getAll(...refs)

      items = []
      for (let i = 0; i < lines.length; i++) {
        const snap = snaps[i]
        if (!snap.exists) throw new HttpError(400, 'One of those games no longer exists.')
        const data = snap.data() ?? {}
        const unitPrice = Number(data.wholesalePrice)
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new HttpError(400, `"${data.name ?? 'A game'}" is not available at wholesale.`)
        }

        // Checked HERE as well as in the browser, because the browser's cap is
        // only a convenience — this route takes gameId and quantity from the
        // request, so a hand-made POST could ask for a thousand of anything.
        // `available` nets off stock already held by other pending orders, so
        // the same copy can't be promised to two shops.
        const name = (data.name as string) ?? 'A game'
        const available = availableStock(data.stock, data.reservedQty)
        if (lines[i].quantity > available) {
          throw new HttpError(
            400,
            available > 0
              ? `Only ${available} of "${name}" ${available === 1 ? 'is' : 'are'} available. Please reduce the quantity.`
              : `"${name}" is out of stock or fully reserved by pending orders.`,
          )
        }

        items.push({ gameId: lines[i].gameId, name: (data.name as string) ?? '', unitPrice, quantity: lines[i].quantity })
      }

      totalUsd = Math.round(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 100) / 100
      itemCount = items.reduce((s, i) => s + i.quantity, 0)

      // Hold the stock. Nothing is deducted — `stock` itself is untouched, so
      // the shelves stay truthful; the hold is released whole on approve or
      // reject (see PATCH).
      for (let i = 0; i < lines.length; i++) {
        tx.update(refs[i], { reservedQty: FieldValue.increment(lines[i].quantity) })
      }

      tx.set(ref, {
        accountUid:     account.uid,
        accountEmail:   account.email,
        shopName:       account.shopName,
        contactName:    account.contactName,
        phone:          account.phone,
        items, totalUsd, itemCount, notes,
        ...(invoiceNumber ? { invoiceNumber } : {}),
        ...(invoiceUrl ? { invoiceUrl, invoicedAt: FieldValue.serverTimestamp() } : {}),
        status:         'pending',
        // Marks that this order is currently holding stock. PATCH clears it as
        // it releases, so a second decision on the same order can't release
        // the same hold twice.
        stockReserved:  true,
        createdAt:      FieldValue.serverTimestamp(),
        decidedBy:      '',
        decidedByEmail: '',
        decidedAt:      null,
        emailedAt:      null,
      })
    })

    // The order is saved. From here every failure is a notification failure,
    // never an order failure — the shop is told their order went through
    // regardless, because it did.
    const message = {
      subject: `New wholesale order — ${account.shopName} — ${totalUsd.toFixed(2)}`,
      text: orderText({ id: ref.id, ...account, items, totalUsd, itemCount, notes, invoiceNumber, invoiceUrl }),
      // Replying goes straight to the shop that ordered.
      replyTo: account.email,
      ...(invoiceUrl ? {
        attachments: [{ path: invoiceUrl, filename: `${invoiceNumber || 'invoice'}.png` }],
      } : {}),
    }

    let email = await sendEmail({ to: ORDERS_EMAILS, ...message })

    // Until a domain is verified in Resend, RESEND_FROM is unset and the sender
    // is the shared onboarding@resend.dev, which refuses to deliver to anyone
    // but the Resend account's own address — and it refuses the WHOLE request,
    // not just the addresses it objects to. Without this, adding recipients
    // would silently stop the notification that used to work.
    //
    // Retry EACH address on its own rather than just the first: which single
    // address happens to be deliverable is a property of the Resend account,
    // not of the order of this list, so falling back to ORDERS_EMAILS[0] would
    // break the moment someone reorders it. Only runs on the failure path.
    //
    // Delete this whole block once RESEND_FROM points at a verified domain.
    if (!email.sent && ORDERS_EMAILS.length > 1) {
      console.warn(
        `[wholesale] send to ${ORDERS_EMAILS.length} recipients failed (${email.reason}); ` +
        `retrying each address individually`,
      )
      const reached: string[] = []
      for (const address of ORDERS_EMAILS) {
        const one = await sendEmail({ to: address, ...message })
        if (one.sent) reached.push(address)
      }
      if (reached.length > 0) {
        const missed = ORDERS_EMAILS.filter(a => !reached.includes(a))
        email = {
          sent: true,
          reason: `partial: reached ${reached.join(', ')}; could not reach ${missed.join(', ')} — ` +
            `verify a domain in Resend and set RESEND_FROM`,
        }
        await ref.update({ emailPartial: email.reason }).catch(() => {})
        console.warn('[wholesale] ' + email.reason)
      }
    }

    if (email.sent) {
      await ref.update({ emailedAt: FieldValue.serverTimestamp() }).catch(() => {})
    } else {
      // Recorded on the order so the admin page can show that the notification
      // didn't go out, rather than it failing silently.
      await ref.update({ emailError: email.reason ?? 'unknown' }).catch(() => {})
      console.error('[wholesale] order saved but email not sent:', email.reason)
    }

    return Response.json({
      id: ref.id,
      totalUsd,
      itemCount,
      emailed: email.sent,
      emailConfigured: emailConfigured(),
    }, { status: 201 })
  } catch (err) {
    return toResponse(err)
  }
}

// ---- Staff: decide an order ----
//
// Records the decision and nothing else. Shops are deliberately NOT emailed
// here — the only address this system mails is the orders inbox, on submission.
// A shop sees its order status and invoice by signing in to /wholesale/orders.
//
// Keeping the single recipient also means Resend needs no verified domain:
// it only ever sends to the Resend account's own address.
export async function PATCH(request: Request): Promise<Response> {
  try {
    const actor = await requireSection(request, 'games')

    let body: Record<string, unknown>
    try {
      body = await request.json() as Record<string, unknown>
    } catch {
      throw new HttpError(400, 'Request body must be JSON.')
    }

    const orderId = typeof body.orderId === 'string' ? body.orderId : ''
    const status = typeof body.status === 'string' ? body.status : ''
    if (!orderId) throw new HttpError(400, 'orderId is required.')
    if (!['approved', 'rejected', 'fulfilled'].includes(status)) {
      throw new HttpError(400, 'Unknown status.')
    }

    const db = adminDb()
    const ref = db.doc(`wholesaleOrders/${orderId}`)

    // Deciding an order releases the stock it was holding — on approve just as
    // much as on reject. Approving is a "seen, being processed" signal, not a
    // stock movement: the copies leave inventory later, through the branch's
    // own sale, exactly as they did before reservations existed.
    //
    // In a transaction with the status write, and guarded by the order's own
    // stockReserved flag, so deciding twice (a double-click, a retry) can't
    // release the same hold twice and drive reservedQty negative.
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref)
      if (!snap.exists) throw new HttpError(404, 'Order not found.')
      const order = snap.data() ?? {}

      const patch: Record<string, unknown> = {
        status,
        decidedBy: actor.uid,
        decidedByEmail: actor.email ?? '',
        decidedAt: FieldValue.serverTimestamp(),
      }
      // The invoice is drawn in the browser (it's a canvas), so the URL arrives
      // with this request rather than being produced here.
      if (typeof body.invoiceNumber === 'string' && body.invoiceNumber) patch.invoiceNumber = body.invoiceNumber
      if (typeof body.invoiceUrl === 'string' && body.invoiceUrl) patch.invoiceUrl = body.invoiceUrl

      if (order.stockReserved === true) {
        const orderItems = Array.isArray(order.items) ? order.items : []
        for (const it of orderItems) {
          const gameId = (it as { gameId?: unknown }).gameId
          const qty = Number((it as { quantity?: unknown }).quantity)
          if (typeof gameId !== 'string' || !gameId || !Number.isFinite(qty) || qty <= 0) continue
          tx.update(db.doc(`games/${gameId}`), { reservedQty: FieldValue.increment(-qty) })
        }
        patch.stockReserved = false
        patch.stockReleasedAt = FieldValue.serverTimestamp()
      }

      tx.update(ref, patch)
    })

    return Response.json({ orderId, status })

  } catch (err) {
    return toResponse(err)
  }
}
