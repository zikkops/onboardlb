// One-off seed: put the best-seller keychains from app/lib/accessories.ts into
// the `games` collection, category "Keychains", so they share stock, sales,
// transfers and wholesale ordering with everything else. Staff manage them
// afterwards at /admin/accessories.
//
// Each keychain gets:
//   price          3.3 (retail)
//   wholesalePrice null — set later in Manage Accessories; wholesale only
//                  lists items that have one
//   stock          5 at every branch except Faten (0)
//   sku            next numbers from appSettings/skuCounter, same as Manage Games
//   image          uploaded to imgbb, like every game image, and recorded in
//                  the Media Library. The pictures are read from a local
//                  folder (one <supplier code>.jpg each, pulled from the
//                  supplier sheet) and are deliberately NOT kept in the repo.
//
// Usage (Node 22.6+ — imports the .ts list directly):
//   node --env-file=.env.local scripts/seed-keychains.mjs --images <dir>          # dry run
//   node --env-file=.env.local scripts/seed-keychains.mjs --images <dir> --apply  # write
//
// Safe to re-run. Doc ids are keychain-<supplier code>, and an existing doc is
// skipped, never overwritten — once staff have changed a price or a stock
// count, re-seeding must not put it back to 5.

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { KEYCHAINS, KEYCHAIN_CATEGORY, KEYCHAIN_RETAIL_PRICE } from '../app/lib/accessories.ts'

const APPLY = process.argv.includes('--apply')
const imagesArg = process.argv.indexOf('--images')
const IMAGES_DIR = imagesArg > -1 ? process.argv[imagesArg + 1] : null
if (!IMAGES_DIR) {
  console.error('Pass --images <dir> — a folder with one <supplier code>.jpg per keychain.')
  process.exit(1)
}
if (!process.env.IMGBB_API_KEY) {
  console.error('IMGBB_API_KEY is not set (needed to host the pictures).')
  process.exit(1)
}

// Same upload /api/upload-image does server-side (that route needs a signed-in
// browser, which a script doesn't have): base64 body, server-held key.
async function uploadToImgbb(file) {
  const upstream = new FormData()
  upstream.append('key', process.env.IMGBB_API_KEY)
  upstream.append('image', readFileSync(file).toString('base64'))
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: upstream })
  const data = await res.json()
  if (!data?.data?.url) throw new Error(data?.error?.message ?? 'imgbb upload failed')
  return { url: data.data.url, deleteUrl: data.data.delete_url ?? null, fileName: data.data.image?.filename ?? null }
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT
if (!raw) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not set. See docs/server-setup.md.')
  console.error('Did you forget --env-file=.env.local ?')
  process.exit(1)
}

const sa = JSON.parse(
  raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
)

initializeApp({
  credential: cert({
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: String(sa.private_key).replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore()

// Duplicated from app/lib/skuFormat.ts, as in backfill-skus.mjs.
function skuLetters(name) {
  const letters = (name ?? '').replace(/[^a-zA-Z]/g, '').toUpperCase()
  if (letters.length === 0) return 'XXX'
  return letters.slice(0, 3).padEnd(3, 'X')
}
function formatSku(name, sequence) {
  return `ob-${skuLetters(name)}${String(sequence).padStart(4, '0')}`
}

const STOCK = { Beirut: 5, Zouk: 5, Broummana: 5, Faten: 0 }
const docId = code => `keychain-${code}`

const existing = await db.getAll(...KEYCHAINS.map(k => db.doc(`games/${docId(k.code)}`)))
const todo = KEYCHAINS.filter((_, i) => !existing[i].exists)
console.log(`${KEYCHAINS.length} keychains · ${KEYCHAINS.length - todo.length} already seeded · ${todo.length} to add`)

const catSnap = await db.collection('gameCategories').where('name', '==', KEYCHAIN_CATEGORY).limit(1).get()
console.log(`Category "${KEYCHAIN_CATEGORY}": ${catSnap.empty ? 'will be created' : 'exists'}`)

const missing = todo.filter(k => !existsSync(join(IMAGES_DIR, `${k.code}.jpg`)))
if (missing.length > 0) {
  console.error(`Missing pictures in ${IMAGES_DIR}: ${missing.map(k => k.code).join(', ')}`)
  process.exit(1)
}

if (!APPLY) {
  for (const k of todo.slice(0, 5)) console.log(`  + ${docId(k.code)}  ${k.name}  (${k.series})`)
  if (todo.length > 5) console.log(`  … and ${todo.length - 5} more`)
  console.log('\nDry run — nothing written. Re-run with --apply.')
  process.exit(0)
}

// Upload first, write after: a doc should never point at a picture that
// didn't make it. A failure stops the run before anything is written, and a
// re-run starts clean because nothing was seeded.
const hosted = {}
for (const [i, k] of todo.entries()) {
  hosted[k.code] = await uploadToImgbb(join(IMAGES_DIR, `${k.code}.jpg`))
  process.stdout.write(`  uploaded ${i + 1}/${todo.length}`)
}
if (todo.length > 0) console.log()

if (todo.length > 0) {
  // Reserve a block of SKU numbers in one transaction, exactly like
  // app/api/admin/sku/route.ts, so nothing interleaves with a game being
  // added by hand at the same moment.
  let first = 1
  const counterRef = db.doc('appSettings/skuCounter')
  await db.runTransaction(async tx => {
    const snap = await tx.get(counterRef)
    const current = snap.data()?.nextNumber ?? 0
    first = current + 1
    tx.set(counterRef, { nextNumber: current + todo.length }, { merge: true })
  })

  const batch = db.batch()
  todo.forEach((k, i) => {
    batch.set(db.doc(`games/${docId(k.code)}`), {
      name: k.name,
      category: KEYCHAIN_CATEGORY,
      series: k.series,
      supplierCode: k.code,
      description: `${k.name} keychain — ${k.series}.`,
      players: '',
      duration: '',
      age: '',
      price: KEYCHAIN_RETAIL_PRICE,
      wholesalePrice: null,
      stock: STOCK,
      image: hosted[k.code].url,
      sku: formatSku(k.name, first + i),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  for (const k of todo) {
    batch.set(db.collection('mediaLibrary').doc(), {
      url: hosted[k.code].url,
      deleteUrl: hosted[k.code].deleteUrl,
      fileName: hosted[k.code].fileName,
      uploadedBy: 'scripts/seed-keychains.mjs',
      uploadedAt: FieldValue.serverTimestamp(),
      source: 'upload',
    })
  }
  await batch.commit()
}

if (catSnap.empty) {
  await db.collection('gameCategories').add({ name: KEYCHAIN_CATEGORY, createdAt: FieldValue.serverTimestamp() })
}

await db.collection('activityLog').add({
  action: 'create',
  section: 'Accessory',
  label: `Seeded ${todo.length} keychains (scripts/seed-keychains.mjs)`,
  changes: null,
  snapshot: null,
  userEmail: 'scripts/seed-keychains.mjs',
  userId: null,
  createdAt: FieldValue.serverTimestamp(),
})

console.log(`\nWrote ${todo.length} keychains.`)
