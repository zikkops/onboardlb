// Manage Accessories — price, wholesale price and per-branch stock for the
// keychains (games docs with category KEYCHAIN_CATEGORY).
//
// Behind a route per the Phase 00 rule: no new client SDK writes. Gated on the
// games section, same as Manage Games, because these are games docs and the
// games rules already let that section write them.
//
// PATCH { updates: [{ id, price?, wholesalePrice?, stock? }] }
//   price          retail, >= 0
//   wholesalePrice > 0, or null to take the item off wholesale
//   stock          { [branch]: whole number >= 0 } for any BRANCHES
// Only the fields sent are changed. Ids that aren't keychains are refused, so
// this can't become a back door into editing board games.

import { requireSection, toResponse, HttpError } from '../../../lib/server/auth'
import { adminDb } from '../../../lib/server/firebaseAdmin'
import { logUpdate } from '../../../lib/server/activityLog'
import { FieldValue } from 'firebase-admin/firestore'
import { BRANCHES, normalizeStock } from '../../../lib/branches'
import { KEYCHAIN_CATEGORY } from '../../../lib/accessories'

export const runtime = 'nodejs'

const MAX_UPDATES = 200

interface Patch {
  price?: number
  wholesalePrice?: number | null
  stock?: Record<string, number>
}

function money(value: unknown, field: string, allowZero: boolean): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 100000) {
    throw new HttpError(400, `${field} must be a ${allowZero ? '' : 'positive '}price.`)
  }
  return Math.round(n * 100) / 100
}

function parsePatch(raw: Record<string, unknown>): Patch {
  const patch: Patch = {}
  if ('price' in raw) patch.price = money(raw.price, 'Retail price', true)
  if ('wholesalePrice' in raw) {
    patch.wholesalePrice = raw.wholesalePrice === null || raw.wholesalePrice === ''
      ? null
      : money(raw.wholesalePrice, 'Wholesale price', false)
  }
  if ('stock' in raw) {
    if (!raw.stock || typeof raw.stock !== 'object') throw new HttpError(400, 'Stock must be an object.')
    const stock: Record<string, number> = {}
    for (const [branch, qty] of Object.entries(raw.stock as Record<string, unknown>)) {
      if (!(BRANCHES as readonly string[]).includes(branch)) throw new HttpError(400, `Unknown branch "${branch}".`)
      const n = Number(qty)
      if (!Number.isInteger(n) || n < 0 || n > 100000) throw new HttpError(400, `Stock for ${branch} must be a whole number.`)
      stock[branch] = n
    }
    patch.stock = stock
  }
  return patch
}

export async function PATCH(request: Request) {
  try {
    const caller = await requireSection(request, 'games')

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      throw new HttpError(400, 'Invalid request body.')
    }

    const updates = Array.isArray(body.updates) ? body.updates as Record<string, unknown>[] : []
    if (updates.length === 0) throw new HttpError(400, 'Nothing to update.')
    if (updates.length > MAX_UPDATES) throw new HttpError(400, `Too many updates at once (max ${MAX_UPDATES}).`)

    const parsed = updates.map(u => {
      const id = typeof u.id === 'string' ? u.id : ''
      if (!id || id.includes('/')) throw new HttpError(400, 'Each update needs an id.')
      return { id, patch: parsePatch(u) }
    })

    const db = adminDb()
    const refs = parsed.map(p => db.doc(`games/${p.id}`))
    const snaps = await db.getAll(...refs)

    const logs: { name: string; before: object; after: object }[] = []
    const batch = db.batch()
    snaps.forEach((snap, i) => {
      const data = snap.data()
      if (!snap.exists || data?.category !== KEYCHAIN_CATEGORY) {
        throw new HttpError(404, `"${parsed[i].id}" is not an accessory.`)
      }
      const { patch } = parsed[i]
      const before = {
        price: data.price ?? null,
        wholesalePrice: data.wholesalePrice ?? null,
        stock: normalizeStock(data.stock),
      }
      // Stock is merged per branch, so sending one branch leaves the others.
      const after = {
        price: patch.price ?? before.price,
        wholesalePrice: 'wholesalePrice' in patch ? patch.wholesalePrice : before.wholesalePrice,
        stock: patch.stock ? { ...before.stock, ...patch.stock } : before.stock,
      }
      batch.update(refs[i], { ...after, updatedAt: FieldValue.serverTimestamp() })
      logs.push({ name: (data.name as string) ?? parsed[i].id, before, after })
    })
    await batch.commit()

    // logUpdate skips entries with no real change, so a bulk "set wholesale
    // price" only logs the items it actually moved.
    await Promise.all(logs.map(l => logUpdate(caller, 'Accessory', l.name, l.before, l.after)))

    return Response.json({ updated: parsed.length })
  } catch (err) {
    return toResponse(err)
  }
}
