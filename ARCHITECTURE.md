# Architecture

## Security Headers

`next.config.ts`'s `headers()` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` denying camera/mic/geolocation, on every route. These are all response headers with effectively zero risk of breaking anything — they don't restrict what the page itself can load.

**No `Content-Security-Policy` yet, deliberately.** This app talks to enough third-party origins at runtime (Firebase Auth's Google sign-in popup, Firestore's realtime connection, imgbb for uploads, DiceBear for avatars, Unsplash for a few placeholder images) that a wrong or incomplete CSP would silently break one of those — usually with no build error, just a browser console warning a customer hits and a developer doesn't notice. If you add one, write it from the actual list of external origins this app calls (grep for `https://` outside `app/lib/firebase.ts`) and manually test sign-in, image upload, and avatar loading afterward — type-checking and a successful build won't catch a CSP violation, since it's a runtime browser policy, not a compile-time concern.

## No Admin SDK

This is the single most important constraint to understand before touching this codebase: **there is no Firebase Admin SDK, no service account, and no Cloud Functions anywhere in this project.** Every Firestore read/write and every Auth operation — including everything staff do in the admin panel — runs through the Firebase **client SDK**, from the browser, using the same public API key a customer's browser uses.

This was a deliberate choice (no backend to host, deploy, or pay for), but it has real consequences worth knowing up front:

- **Access control is client-side and optimistic, not cryptographically enforced at the edge.** `useRequireRole()` / `hasSectionAccess()` (`app/lib/adminAuth.ts`) decide what a staff member *sees* in the UI. `proxy.ts` at the project root adds one more layer in front of that — but it only checks for the *presence* of a non-cryptographic `admin_session` cookie (set/cleared by `useAdminUser()` and, on the login page specifically, by the sign-in handler itself) before letting a request reach an `/admin/**` page at all. It proves "this browser has a Firebase session," nothing more — a signed-in-but-unauthorized visitor still reaches the page, where `useRequireRole()` bounces them. The actual enforcement of who can read/write what happens entirely in **Firestore security rules**, which live only in the Firebase Console... except now also in `firestore.rules` at the project root, which is deployed there manually (see [Firestore Rules](#firestore-rules) below).
- **Proxy is intentionally "optimistic," per Next.js's own guidance** (see the [Authentication guide](https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional)): it should only ever read a cookie, never hit a database or make a network call, since it runs on every matched request including prefetches. If you're tempted to make `proxy.ts` verify the token cryptographically (via the REST pattern in `app/lib/serverAuth.ts`, or eventually the Admin SDK), that's a deliberate tradeoff to make explicitly, not a "just add it" change — it adds latency to every admin page load in exchange for a guarantee Firestore rules already provide.
- **Staff can't truly delete a customer's login.** Deleting another user's Firebase Auth account requires the Admin SDK. `deleteCustomerAccount()` (`app/lib/customerManagement.ts`) only deletes their Firestore profile document — their Auth credentials still exist, and if they sign in again they'd get a brand-new blank profile.
- **There's no cron job / scheduled task.** Anything that needs to "happen on a date" (the annual loyalty points reset, for example) can't run in the background at midnight. Instead, it's checked passively the next time a relevant page loads — see `checkAndRunLoyaltyReset()` in `app/lib/customerManagement.ts` for the pattern.
- **Race-safety has to be done with `runTransaction`/`writeBatch` against Firestore directly**, not with server-side locking. The D&D booking system's conflict-checking (below) is the clearest example of this.

If a future requirement genuinely needs server-side logic (sending transactional emails, truly deleting accounts, a real cron job), that's the point where Cloud Functions + the Admin SDK would need to be introduced — it isn't a small addition, since auth/rules/deploy all change shape around it.

### Authorization in API Routes (no Admin SDK)

The two Route Handlers (`app/api/import-image/route.ts`, `app/api/media/delete/route.ts`) need to check *who's calling* and *what they're allowed to do* — but without an Admin SDK, there's no privileged server-side Firestore access to check that with. `app/lib/serverAuth.ts` solves this with a pattern worth reusing for any future server route:

1. **`verifyIdToken(idToken)`** confirms the token belongs to a real, currently-active Firebase user (via the Identity Toolkit REST API) and returns their uid. This proves *who*, not *what they can do* — a customer's token passes this exactly as well as a staff member's.
2. **Authorization reads happen via the Firestore REST API, passed the caller's own idToken as the Bearer auth** (`isStaffToken()`, `getOwnAvatarDeleteUrl()`) — *not* via the client SDK's `getDoc` called bare from the server. This distinction matters: the client SDK has no signed-in session on the server, so a bare server-side `getDoc` would run as a fully **unauthenticated** Firestore request and get rejected by rules the moment they're not wide open to anonymous reads. Hitting the REST API with the caller's own token instead means the read is bound by the exact same security rules a browser-side `getDoc` from their own session would be — this code has no more access than the calling user already has, it's just checking that access from the server instead of the browser.
3. **Pick the narrowest check the route actually needs.** `import-image` is genuinely staff-only (`verifyStaffToken`), but `media/delete` has two legitimate callers — staff deleting any media-library item, *and* a customer cleaning up their own previous avatar — so it checks `isStaffToken()` first and falls back to comparing the requested `deleteUrl` against that uid's own `users/{uid}.avatarDeleteUrl` rather than just gating the whole route to staff. Don't reach for "is this person staff" as a default check without first asking whether a non-staff caller has a legitimate reason to hit this route too.

## Two Auth Pools, One Firebase Project

There are two completely independent identity systems sharing a single Firebase Auth user pool:

| | Staff | Customers |
|---|---|---|
| Firestore collection | `adminUsers/{uid}` | `users/{uid}` |
| Hook | `useAdminUser()` / `useRequireRole()` | `useCustomerUser()` |
| Identity fields | `role`, `branchIds`, `isDungeonMaster` | `xp`, `level`, `obCoins`, `themeId`, `badges` |
| Login page | `/admin/login` | `/customer/login` |

A single email address *could* theoretically have both an `adminUsers` doc and a `users` doc under different UIDs (or even the same UID) — the two systems never check each other. There's no concept of a staff member also being a logged-in customer in the same session.

Full detail on the staff side is in [docs/admin-panel.md](./docs/admin-panel.md).

## Data Layer Convention

Almost all Firestore access goes through `app/lib/*.ts` — one file per feature area, each exporting a mix of:
- **Hooks** (`useXxx`) that wrap `onSnapshot` for live data — most UI reads are live listeners, not one-off `getDocs` calls, so admin queues and customer profiles update in real time without a manual refresh.
- **Plain async functions** for writes (`createXxx`, `updateXxx`, `approveXxx`/`rejectXxx`) that the UI calls directly from event handlers.

| File | Covers |
|---|---|
| `adminAuth.ts` | Staff identity, roles, section access |
| `customerAuth.ts` | Customer signup/login (Google + email/password linking), username reservation |
| `customerManagement.ts` | Admin-side customer editing: XP/coins, delete, password reset, annual reset |
| `loyalty.ts` | Transaction (check/event/D&D attendance) submission and approval |
| `redemptions.ts` | OB Coin redemption items + requests |
| `friends.ts` | Friend requests, friends list, customer directory search |
| `participantInvites.ts` | Consent flow for being added to someone else's D&D/event booking |
| `dndReservations.ts` | D&D session booking + conflict locking (see below) |
| `eventReservations.ts` | Event spot booking (simpler — capacity check only, no locking) |
| `activityLog.ts` | Generic audit log used by every admin mutation |
| `media.ts` | Shared cross-feature media library |
| `branches.ts` | The three branches, per-branch stock helpers |
| `levelConfig.ts` | XP curve, level titles, tiers — pure functions, no Firestore |

## Firestore Schema

22 top-level collections. None of them have subcollections — everything is flat, with foreign-key-style string fields (`dmUid`, `campaignId`, `userId`, etc.) instead of nesting.

**Staff & customers**
- `adminUsers/{uid}` — staff account: `role`, `branchIds`, `isDungeonMaster`, `openingStart`/`openingEnd`/`daysOff` (DM-only fields)
- `users/{uid}` — customer account: `username`, `displayName`, `email`, `avatarUrl`, `themeId`, `xp`, `level`, `levelTitle`, `obCoins`, `badges`
- `usernames/{lowercased-username}` — uniqueness reservation, written inside the same transaction as account creation

**Content (admin-managed, public-readable)**
- `games`, `gameCategories` — shop catalog; `games.stock` is a `Record<branchName, number>`
- `menuCategories`, `menuItems`
- `events`, `eventTypes`
- `dndCampaigns` — see the D&D booking section below for the DM-snapshot fields on this doc

**Loyalty economy**
- `transactions` — one doc per check/event/D&D attendance submission, `status: pending|approved|rejected`
- `transactionLog` — append-only history of transaction status changes
- `redemptionItems` — catalog of things customers can spend OB Coins on
- `redemptions` — one doc per redemption request, same pending/approved/rejected shape

**Bookings**
- `dndReservations`, `dndDmLocks` — see below
- `eventReservations`
- `participantInvites` — consent records for uid-based participants added to either booking type

**Social**
- `friendRequests` — single collection for both pending requests and accepted friendships (a `status` field distinguishes them)

**Operational**
- `activityLog` — every admin create/update/delete, written by `app/lib/activityLog.ts`
- `mediaLibrary` — every image ever uploaded through any admin form, for the shared media picker
- `appSettings/loyaltyReset` — the one doc holding `nextResetDate` for the annual points reset

## The D&D Booking System

This is the most architecturally involved part of the app, so it's worth walking through.

**The constraint:** a Dungeon Master is one person who might run campaigns at multiple branches. Booking them for a session at one branch must block that same time everywhere — the conflict is on the *DM's calendar*, not on the campaign or the branch.

**The fix:** every session is a fixed `SESSION_DURATION_MINUTES = 180` (3 hours), plus a `DM_RESET_BUFFER_MINUTES = 30` trailing buffer that's never shown as a bookable slot — it just extends how long a confirmed booking keeps blocking that DM. Conflict-checking works through **deterministic lock documents**: a candidate slot's 30-minute buckets each map to a predictable doc id (`${dmUid}__${dateKey}_${bucketIndex}`) in `dndDmLocks`. Booking a session is a single `runTransaction` that checks every bucket the session+buffer would occupy, and only commits if none of them already exist. This is deliberately *not* a query-based check — Firestore transactions can only re-read specific document references, not run a query, so per-bucket lock documents are the only race-safe option available without server-side code.

**The guest-access problem:** `/dnd` must work for signed-out visitors, who can't read `adminUsers` (where a DM's branches/hours/days-off actually live). So a campaign's `dndCampaigns` doc carries a **snapshot** of the assigned DM's `dmBranchIds`, `dmOpeningStart`, `dmOpeningEnd`, `dmDaysOff` — copied over every time an admin saves the campaign in `/admin/dnd`. This snapshot is the actual source of truth the public booking page reads; if a DM changes their own hours on `/admin/dnd/availability`, an admin has to re-open and re-save the campaign for that to propagate. This is a manual step by design, not a bug.

## Firestore Rules

Security rules **are** version-controlled, in `firestore.rules` at the project root — this is the single source of truth for what's actually deployed. Deploy changes with the Firebase CLI (`firebase deploy --only firestore:rules`) rather than pasting into the Console UI, so the repo and the live project never drift apart again.

Every rule follows the same shape: a broad `isStaff()` helper (checks for an `adminUsers/{uid}` doc, not a specific role) gates staff-only writes, while customer-owned documents check `request.auth.uid == resource.data.<ownerField>`. **Granular role checks (admin vs. manager vs. social, etc.) are deliberately not enforced in rules — only in the client via `useRequireRole`.** Any staff account, regardless of role, can write to any staff-gated collection via a direct SDK call; the UI just won't show them the button. This is an accepted tradeoff for an internal tool where every `adminUsers` account is already a trusted employee — but it does mean `adminUsers` itself has to be the one collection that's *not* loosened beyond `isStaff()`, since that's the collection that defines who's staff in the first place (see the comment on that rule for the privilege-escalation bug this used to have).

If you add a new collection, **add its rule to `firestore.rules` and deploy it** — there's no other safety net catching a missing rule (Firestore denies anything unmatched by default, so forgetting a rule fails closed, but a rule that's *wrong* — too permissive — won't be caught by anything automated). A few patterns worth reusing:
- **Schema/bounds validation on create**, not just "who can write": see `transactions`' `xpAmount`/`coinsAmount` caps — a `create` rule that only checks ownership lets the *creator* set any value for fields a normal UI flow would compute for them.
- **Narrow "customer can update their own participation" rules**, not blanket `isStaff()`: see `dndReservations`/`eventReservations`' update rule, which allows a non-staff edit only when `status` doesn't change — wide enough for the decline-invite flow to work, narrow enough that a customer still can't self-approve their own booking.
- **Lock specific high-value fields, not the whole document**, when a document is otherwise legitimately self-editable: see `users`' update rule — a customer can freely rewrite their own avatar/theme/username/etc., but `xp`/`obCoins` must stay equal to `resource.data.xp`/`obCoins` (i.e. unchanged) unless the writer is staff. Before this fix, "customer owns this doc" had silently meant "customer owns every field on this doc, including their own currency balance" — `allow write: if auth.uid == userId` doesn't stop the owner from writing *anything*, just because the *intended* write path (the app's UI) never asks for that field.
- **Don't try to replicate app-level bootstrap logic in rules that rules can't actually express.** The old `adminUsers` rule tried to allow a one-time "first admin self-elects" write by checking `request.auth != null` — but rules have no way to check "is this whole collection empty," only "does this one document exist," so it ended up allowing *every* signup to self-promote, not just the first. When client-side logic and rules can't agree on the same check, provision by hand instead of weakening the rule to match.
