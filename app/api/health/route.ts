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

  const describe = (err: unknown) =>
    err instanceof Error
      ? `${err.name}: ${err.message}`.slice(0, 500)
      : String(err).slice(0, 500)

  let firebaseAdmin: { ok: boolean; error?: string } = { ok: false }
  try {
    const mod = await import('firebase-admin/app')
    firebaseAdmin = { ok: typeof mod.initializeApp === 'function' }
  } catch (err) {
    firebaseAdmin = { ok: false, error: describe(err) }
  }

  // firebase-admin itself imports fine and the credential is set, yet every
  // route importing app/lib/server/** still 500s before its handler runs.
  // These load the same modules those routes load, one at a time, so the
  // failure has to name itself.
  const probe = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: describe(err), label }
    }
  }

  const serverLayer = {
    // The alias form the failing routes use.
    aliasImport:  await probe('alias', () => import('@/app/lib/server/firebaseAdmin')),
    // The same module by relative path — if this succeeds where the alias
    // fails, the alias is not resolving in the deployed function.
    relativeImport: await probe('relative', () => import('../../lib/server/firebaseAdmin')),
    authImport:   await probe('auth', () => import('../../lib/server/auth')),
    // Actually building the credential — this is where a malformed
    // FIREBASE_SERVICE_ACCOUNT (bad base64, mangled PEM newlines) surfaces.
    credential:   await probe('credential', async () => {
      const { adminAuth } = await import('../../lib/server/firebaseAdmin')
      return adminAuth().listUsers(1)
    }),
  }

  return Response.json({
    node: process.version,
    platform: process.platform,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    firebaseAdmin,
    serverLayer,
    env: {
      FIREBASE_SERVICE_ACCOUNT: env('FIREBASE_SERVICE_ACCOUNT'),
      RESEND_API_KEY:           env('RESEND_API_KEY'),
      IMGBB_API_KEY:            env('IMGBB_API_KEY'),
    },
  })
}
