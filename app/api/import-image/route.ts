// Server-side proxy used by the bulk-import wizard: browsers can't reliably
// download images from arbitrary third-party domains (CORS), but a Node
// fetch has no such restriction. Downloads the source image, then re-hosts
// it on imgbb exactly like the existing manual upload flow does.

import { verifyIdToken, bearerToken } from '../../lib/serverAuth'

export async function POST(request: Request) {
  const idToken = bearerToken(request)
  if (!idToken || !(await verifyIdToken(idToken))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await request.json()
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: 'Invalid image url' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const imgRes = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!imgRes.ok) throw new Error(`Source image fetch failed (${imgRes.status})`)
    const contentType = imgRes.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) throw new Error('URL did not return an image')

    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const base64 = buffer.toString('base64')

    const form = new FormData()
    form.append('image', base64)
    form.append('key', process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? '')

    const uploadRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
    const data = await uploadRes.json()
    if (!data?.data?.url) throw new Error('imgbb upload failed')

    return Response.json({
      url: data.data.url as string,
      deleteUrl: (data.data.delete_url as string) ?? null,
      fileName: (data.data.image?.filename as string) ?? null,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
