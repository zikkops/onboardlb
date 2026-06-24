// Server-only helper for Route Handlers. Verifies a Firebase ID token via the
// Identity Toolkit REST API instead of the Admin SDK (this app has no service
// account / Admin SDK access — see app/api/import-image/route.ts for why).
export async function verifyIdToken(idToken: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  )
  if (!res.ok) return false
  const data = await res.json()
  return Array.isArray(data.users) && data.users.length > 0
}

export function bearerToken(request: Request): string {
  const authHeader = request.headers.get('authorization') ?? ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
}
