// Optimistic check only — confirms a Firebase session cookie is present
// before the admin page shell ever renders for a fully-anonymous request.
// This is NOT cryptographic verification (Proxy shouldn't be the real
// security boundary — see the Next.js auth guide), and it does not replace
// useRequireRole()'s client-side role check or, more importantly, Firestore
// rules, which remain the actual enforcement. The cookie itself is set/
// cleared by app/lib/adminAuth.ts's useAdminUser() alongside Firebase's own
// onAuthStateChanged — see the comment there for the full reasoning.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'admin_session'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
