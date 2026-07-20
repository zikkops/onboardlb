import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'admin_session'

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets scripts loaded by a nonced script also execute,
    // which is how Next.js loads its dynamic chunks from the inline bootstrap.
    // 'unsafe-eval' is needed in dev because React uses eval for error stacks.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Inline styles are used throughout via JSX style={{}} props — no way to
    // nonce those without rewriting every component, so unsafe-inline is the
    // pragmatic choice for styles (CSS injection is lower-risk than JS injection).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // i.ibb.co: user-uploaded images. api.dicebear.com: legacy avatars stored
    // in Firestore before the premade-avatar migration — some users still have them.
    "img-src 'self' blob: data: https://i.ibb.co https://api.dicebear.com",
    // Firebase Auth REST, Firestore (incl. WebSocket), token refresh.
    // api.mymemory.translated.net: the browser-side translateToArabic() call in weeklyOrders.ts.
    "connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://*.firebaseapp.com https://api.mymemory.translated.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // frame-ancestors here + X-Frame-Options in next.config.ts together cover
    // both modern browsers (CSP) and legacy ones (X-Frame-Options).
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

export default function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)

  // Pass the nonce to the page via a request header so server components can
  // read it if needed (e.g. to pass to a <Script nonce={nonce}>).
  // Next.js also auto-extracts the nonce from the CSP response header and
  // applies it to its own injected scripts — no manual layout wiring needed.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const pathname = request.nextUrl.pathname

  // Let the login page through without a session check
  if (pathname === '/admin/login') {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // All other /admin/** routes require the session cookie (optimistic check —
  // see ARCHITECTURE.md for why this isn't the real security boundary).
  if (pathname.startsWith('/admin') && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    // Run on all page routes; skip API routes, Next.js internals, and prefetches
    // so we don't add nonce overhead to requests that don't render HTML.
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
