// Who gets told about a new wholesale order.
//
// Pure — deliberately NOT 'use client' and with no Firebase import — so the
// browser (app/lib/wholesale.ts) and the route handler
// (app/api/wholesale/orders) share one definition instead of drifting apart.
// Same split as invoiceFormat.ts / invoiceNumber.ts.
//
// NEXT_PUBLIC_WHOLESALE_ORDERS_EMAIL overrides the list without a deploy. It
// takes a COMMA-SEPARATED list, so setting it to one address is still valid.
//
// ── Delivery will not work for these addresses until Resend is set up ──
// app/lib/server/email.ts falls back to `onboarding@resend.dev` when
// RESEND_FROM is unset, and on that shared sender Resend only delivers to the
// Resend account's own address — every other recipient is refused. To actually
// reach the addresses below, verify a domain in Resend and set RESEND_FROM to
// something on it (e.g. "Onboard <orders@onboard.lb>").

// Elie runs wholesale, so his address is the primary recipient — first in the
// list is the one anything single-address falls back to. The other two stay on
// copy; nobody who was being notified has stopped being notified.
export const DEFAULT_WHOLESALE_ORDERS_EMAILS = [
  'elie_kesrouany@hotmail.com',
  'markzakkak@gmail.com',
  'fatenabboud40@gmail.com',
]

// Duplicates are dropped case-insensitively: sending the same person two
// copies of every order is the kind of thing nobody reports and everybody
// mutes.
export function parseOrdersEmails(raw: string | undefined | null): string[] {
  const listed = (raw ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const source = listed.length > 0 ? listed : DEFAULT_WHOLESALE_ORDERS_EMAILS

  const seen = new Set<string>()
  const out: string[] = []
  for (const email of source) {
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(email)
  }
  return out
}
