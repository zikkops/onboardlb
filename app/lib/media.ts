import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db, auth } from './firebase'

export interface MediaItem {
  id: string
  url: string
  deleteUrl: string | null
  fileName: string | null
  uploadedBy: string | null
  uploadedAt: Timestamp | null
  source?: 'upload' | 'backfill'
}

// Collections (and their image field) that may reference a hosted image —
// used both to backfill the library from images uploaded before it existed,
// and to warn before deleting an image that's still in use.
const IMAGE_SOURCES: { collection: string; label: string }[] = [
  { collection: 'games',          label: 'Game' },
  { collection: 'menuCategories', label: 'Menu Category' },
  { collection: 'events',         label: 'Event' },
  { collection: 'dndCampaigns',   label: 'D&D Campaign' },
]

export async function recordMediaUpload(item: {
  url: string
  deleteUrl?: string | null
  fileName?: string | null
}): Promise<void> {
  await addDoc(collection(db, 'mediaLibrary'), {
    url: item.url,
    deleteUrl: item.deleteUrl ?? null,
    fileName: item.fileName ?? null,
    uploadedBy: auth.currentUser?.email ?? null,
    uploadedAt: serverTimestamp(),
    source: 'upload',
  })
}

export async function listMedia(max = 200): Promise<MediaItem[]> {
  const snap = await getDocs(
    query(collection(db, 'mediaLibrary'), orderBy('uploadedAt', 'desc'), limit(max))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaItem))
}

export async function deleteMediaItem(item: MediaItem): Promise<void> {
  if (item.deleteUrl) {
    const idToken = await auth.currentUser?.getIdToken()
    await fetch('/api/media/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ deleteUrl: item.deleteUrl }),
    })
  }
  await deleteDoc(doc(db, 'mediaLibrary', item.id))
}

// Images uploaded before this library existed were never recorded — scan
// every place an image can live and add any URL that's missing.
export async function backfillMediaLibrary(): Promise<{ added: number }> {
  const existing = await listMedia(1000)
  const known = new Set(existing.map(m => m.url))
  let added = 0

  for (const { collection: colName } of IMAGE_SOURCES) {
    const snap = await getDocs(collection(db, colName))
    for (const d of snap.docs) {
      const url = (d.data() as { image?: string }).image
      if (!url || known.has(url)) continue
      known.add(url)
      await addDoc(collection(db, 'mediaLibrary'), {
        url,
        deleteUrl: null,
        fileName: url.split('/').pop() ?? null,
        uploadedBy: null,
        uploadedAt: serverTimestamp(),
        source: 'backfill',
      })
      added++
    }
  }
  return { added }
}

// Used to warn before deleting an image that's still referenced somewhere live.
export async function findUsages(url: string): Promise<string[]> {
  const usages: string[] = []
  for (const { collection: colName, label } of IMAGE_SOURCES) {
    const snap = await getDocs(collection(db, colName))
    for (const d of snap.docs) {
      const data = d.data() as { image?: string; name?: string; title?: string }
      if (data.image === url) {
        usages.push(`${label}: ${data.name ?? data.title ?? d.id}`)
      }
    }
  }
  return usages
}
