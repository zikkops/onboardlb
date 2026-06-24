// imgbb's delete_url deletes the hosted file when visited — calling it from
// the browser would leak it cross-origin and may get blocked by CORS, so we
// trigger it server-side instead.

import { verifyIdToken, bearerToken } from '../../../lib/serverAuth'

export async function POST(request: Request) {
  const idToken = bearerToken(request)
  if (!idToken || !(await verifyIdToken(idToken))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { deleteUrl } = await request.json()
  if (typeof deleteUrl !== 'string' || !/^https:\/\/ibb\.co\//i.test(deleteUrl)) {
    return Response.json({ error: 'Invalid delete url' }, { status: 400 })
  }

  try {
    const res = await fetch(deleteUrl)
    if (!res.ok) throw new Error(`imgbb delete failed (${res.status})`)
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
