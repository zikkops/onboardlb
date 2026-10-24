// Site-wide switches for features that are built but switched off for now.
//
// CUSTOMER_ACCOUNTS_ENABLED covers customer login/signup, profiles, friends,
// notifications and the loyalty program (XP, OB Coins, leaderboard,
// redemptions) — loyalty can't work without accounts, so they share one flag.
// While it's off:
//   - the Navbar drops the Loyalty link and the Login / profile / bell controls
//   - proxy.ts redirects /loyalty and /customer/** to the home page
//   - events, tables and D&D reserve through WhatsApp (WhatsAppReserveModal)
//     instead of the account-based reservation modals
// Staff login (/admin/login) is separate and unaffected.
//
// Flip to true to bring everything back; the original flows are untouched.
export const CUSTOMER_ACCOUNTS_ENABLED = false
