import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'admin_session'

function buildCsp(): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    // Next.js App Router emits <script src> chunk tags and inline <script> RSC
    // data blocks — neither gets a nonce automatically without wiring the root
    // layout to read x-nonce from headers(). 'unsafe-inline' + 'self' is the
    // standard pragmatic approach for Next.js; the real auth boundary is Firebase.
    // 'unsafe-eval' is needed in dev because React uses eval for error overlays.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    // Inline styles are used throughout via JSX style={{}} props.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // i.ibb.co: user-uploaded images. api.dicebear.com: legacy avatars.
    "img-src 'self' blob: data: https://i.ibb.co https://api.dicebear.com",
    // Firebase Auth REST, Firestore (incl. WebSocket), token refresh.
    // api.mymemory.translated.net: translateToArabic() in weeklyOrders.ts.
    "connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://*.firebaseapp.com https://api.mymemory.translated.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // frame-ancestors here + X-Frame-Options in next.config.ts cover both
    // modern browsers (CSP) and legacy ones (X-Frame-Options).
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

export function proxy(request: NextRequest) {
  const csp = buildCsp()

  const pathname = request.nextUrl.pathname

  // Let the login page through without a session check
  if (pathname === '/admin/login') {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // All other /admin/** routes require the session cookie (optimistic check —
  // see ARCHITECTURE.md for why this isn't the real security boundary).
  if (pathname.startsWith('/admin') && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const response = NextResponse.next()
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
