// Streams a game image back from our own origin with Content-Disposition:
// attachment, so the download button on a catalogue card actually saves a file.
//
// Why a route at all, when the image is already at a public URL:
//   1. `<a download href="https://i.ibb.co/...">` does NOT download. Browsers
//      honour the download attribute only for same-origin URLs (and blob:/
//      data:); for a cross-origin href they ignore it and navigate to the
//      image instead, which is the opposite of what the button promises.
//   2. Fetching the bytes in page JS to build a blob doesn't work either —
//      proxy.ts sends connect-src 'self' …googleapis/firebaseapp/mymemory,
//      so i.ibb.co is unreachable from the browser and the fetch is blocked
//      by CSP with no useful error.
// Serving the bytes from here solves both: same-origin fetch is allowed, and
// the blob the client builds from it is same-origin too.
//
// This is the same "a Node fetch has no CORS restriction" trick that
// app/api/import-image/route.ts already relies on, pointed the other way.

import { adminAuth, adminDb } from '../../lib/server/firebaseAdmin'
import { toResponse, HttpError, bearerToken } from '../../lib/server/auth'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// imgbb and nothing else. Without a host allowlist this route is an open
// proxy: anyone with a trade login could point it at an internal address and
// read the response through us.
const ALLOWED_HOST = 'i.ibb.co'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'image/avif': 'avif',
}

// The two viewers /fullcatalogue admits. Both facts live in custom claims, so
// this costs no Firestore reads — see app/lib/server/claims.ts.
async function requireCatalogueViewer(request: Request): Promise<void> {
  const token = bearerToken(request)
  if (!token) throw new HttpError(401, 'Not signed in.')

  let decoded
  try {
    decoded = await adminAuth().verifyIdToken(token, true)
  } catch {
    throw new HttpError(401, 'Session expired — please sign in again.')
  }

  if (decoded.wholesale === true || decoded.superadmin === true) return

  // TRANSITIONAL, and the same fallback getCaller() carries: a token minted
  // before the claims backfill ran has neither claim, so the claim check alone
  // would refuse an account every other part of the app admits. One read, only
  // on the path that would otherwise be a 403.
  const data = (await adminDb().doc(`users/${decoded.uid}`).get()).data()
  const isTrade = data?.isWholesale === true && data?.wholesaleActive !== false
  const isSuperadmin = data?.isStaff === true && data?.superadmin === true
  if (!isTrade && !isSuperadmin) throw new HttpError(403, 'Not a trade account.')
}

// The game name is used verbatim in a header, so everything that isn't a
// plain word character survives as a hyphen or not at all — a quote or a
// newline in a game name would otherwise break the header apart.
function safeFilename(name: string, contentType: string, pathname: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'game-image'

  const fromPath = pathname.match(/\.(jpe?g|png|webp|gif|avif)$/i)?.[1]?.toLowerCase()
  const ext = EXTENSIONS[contentType.split(';')[0].trim()] ?? (fromPath === 'jpeg' ? 'jpg' : fromPath) ?? 'jpg'

  return `${base}.${ext}`
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireCatalogueViewer(request)

    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('url') ?? ''
    const name = searchParams.get('name') ?? ''

    let target: URL
    try {
      target = new URL(raw)
    } catch {
      throw new HttpError(400, 'Invalid image url.')
    }
    if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST) {
      throw new HttpError(400, 'That image is not hosted somewhere we can fetch from.')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    let upstream: Response
    try {
      upstream = await fetch(target.toString(), { signal: controller.signal })
    } catch {
      throw new HttpError(502, 'Could not reach the image host.')
    } finally {
      clearTimeout(timeout)
    }

    if (!upstream.ok) throw new HttpError(502, `Could not fetch that image (${upstream.status}).`)

    const contentType = upstream.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) throw new HttpError(502, 'That URL did not return an image.')

    // Checked before the body is read, so a host reporting its real size is
    // rejected without being downloaded. A host that omits content-length
    // still gets buffered — the post-read check below is the real cap. Same
    // trade-off as import-image, and this route is behind a login too.
    const declared = Number(upstream.headers.get('content-length') ?? 0)
    if (declared > MAX_IMAGE_BYTES) throw new HttpError(502, 'That image is too large (max 10MB).')

    const bytes = new Uint8Array(await upstream.arrayBuffer())
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new HttpError(502, 'That image is too large (max 10MB).')

    return new Response(bytes, {
      headers: {
        'Content-Type':        contentType,
        'Content-Length':      String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${safeFilename(name, contentType, target.pathname)}"`,
        // Private: the response is behind a per-user login, so no shared cache
        // should hold it even though the underlying image is public.
        'Cache-Control':       'private, max-age=3600',
      },
    })
  } catch (err) {
    return toResponse(err)
  }
}
