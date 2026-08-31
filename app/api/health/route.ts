// TEMPORARY DIAGNOSTIC — delete once the production server layer is fixed.
//
// Every route that imports app/lib/server/** returns a 500 on Vercel, and it
// happens before any handler code runs, so none of them can report why. This
// route deliberately imports NOTHING from the server layer, so it loads and
// can answer three questions from inside the deployed function:
//
//   1. Which Node version is the function actually running? firebase-admin@14
//      requires >=22, and package.json only started declaring engines.node
//      recently.
//   2. Is FIREBASE_SERVICE_ACCOUNT present? (Reported as a boolean and a
//      length — never the value.)
//   3. What exactly happens when firebase-admin is imported? The dynamic
//      import below is what the failing routes do at module load; catching it
//      here turns their invisible crash into a readable message.
//
// No secret is returned: booleans, lengths, and an error message.

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const env = (name: string) => {
    const v = process.env[name]
    return { set: !!v, length: v?.length ?? 0 }
  }

  let firebaseAdmin: { ok: boolean; error?: string } = { ok: false }
  try {
    const mod = await import('firebase-admin/app')
    firebaseAdmin = { ok: typeof mod.initializeApp === 'function' }
  } catch (err) {
    firebaseAdmin = {
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 500) : String(err).slice(0, 500),
    }
  }

  return Response.json({
    node: process.version,
    platform: process.platform,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    firebaseAdmin,
    env: {
      FIREBASE_SERVICE_ACCOUNT: env('FIREBASE_SERVICE_ACCOUNT'),
      RESEND_API_KEY:           env('RESEND_API_KEY'),
      IMGBB_API_KEY:            env('IMGBB_API_KEY'),
    },
  })
}
