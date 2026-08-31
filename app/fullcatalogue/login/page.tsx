// A shareable sign-in link for the full catalogue.
//
// This is a redirect rather than a second copy of the login form: one form
// means one place where the credential handling, the sign-out-on-failure rule
// and the error wording live. /wholesale/login reads ?next= and lands the shop
// on the catalogue instead of the order page.
//
// The catalogue shows TRADE prices next to retail, so it stays behind an
// account — this only changes where a shop arrives after signing in, not who
// may see it. /fullcatalogue does its own entitlement check either way.

import { redirect } from 'next/navigation'

export default function FullCatalogueLoginPage() {
  redirect('/wholesale/login?next=%2Ffullcatalogue')
}
