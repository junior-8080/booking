# Bookaata Mobile App (Business Owner/Staff) — Requirements Document

**Version:** 1.0
**Status:** Ready for implementation
**Stack:** React Native
**Audience:** Written for direct implementation by an AI coding agent or a human engineer. This is a derivative spec — it does not redefine the backend or data model, which are authoritative in `booking-saas-requirements.md`. Where this document lists a field, screen, or rule, it is describing what already exists in `admin-app`'s mobile-responsive web view (source of truth: `admin-app/src/**`), adapted for a native app.

---

## 1. Product Summary

A React Native app for **tenant owners and staff** (`TENANT_OWNER`, `TENANT_STAFF`) to manage their Bookaata business from their phone: review and confirm bookings, manage services and availability, track customers and revenue, and configure payment sources and business settings.

This is **not** the customer-facing booking app. The public booking flow (`admin-app/src/app/book/[subdomain]`) that clients use to book appointments is a separate surface and out of scope for this document — see §11.

This app is a **client of the existing REST API** (`api/`). No new backend endpoints are required to build v1 (see §9 for the full endpoint reference); the only backend gap is push notifications (§7).

---

## 2. Why This App Exists (Gaps in the Current Mobile Web Experience)

The admin dashboard already has a mobile-responsive web view (bottom tab bar, stacked layouts below 768px — see `admin-app/src/components/DashboardShell.tsx` and the `@media (max-width: 768px)` block in `globals.css`). A native app is justified by fixing what the responsive web view cannot do well, not just repackaging it:

1. **No push notifications today.** When a customer submits a booking or payment proof, the *tenant* has no real-time alert — only the customer gets SMS/email. A tenant currently has to remember to open the site. This is the single highest-value addition a native app provides (§7).
2. **The mobile web view silently drops a feature.** `.exceptions-card { display: none !important; }` at ≤768px means **availability exceptions (blocked dates / custom hours) are completely inaccessible on mobile today.** The native app must not repeat this — exceptions management is in scope (§6.3).
3. **The Analytics page's two-column chart layout (`2fr 1fr`) has no mobile breakpoint** — it doesn't stack on narrow viewports. The native app should present these as stacked cards, not replicate the desktop grid.
4. Native affordances the web can't offer well: pull-to-refresh, native camera/photo-library access for viewing payment proofs full-screen, biometric app-lock, deep links from push notifications straight to a booking.

---

## 3. Actors & Auth Model

Same roles as the platform overall (`TENANT_OWNER`, `TENANT_STAFF`), scoped to a single tenant per logged-in session. No `SUPER_ADMIN` or `CLIENT` surface in this app.

**Auth flow (mirrors `admin-app/src/app/login/page.tsx` and `lib/api.ts` exactly — do not invent a new flow):**

1. User enters email + password. Call `POST /api/auth/global-login` with `{ email, password }` — no tenant header needed for this call; the backend resolves the tenant globally by email.
2. Response returns `{ token, subdomain, user }`. Store `token` and `subdomain` in secure device storage (`expo-secure-store` or `react-native-keychain` — **not** `AsyncStorage`, since a JWT is a credential; this is a deliberate improvement over the web app's `localStorage` use, not a deviation to relitigate).
3. **Every subsequent authenticated request** must include both:
   - `Authorization: Bearer <token>`
   - `X-Tenant-Subdomain: <subdomain>`

   This header pair is how the backend's tenant-resolution middleware scopes every query — see `api/src/middleware/tenantResolution.middleware.ts`. There is no per-request tenant picker in the UI; a session is always scoped to exactly one tenant, matching current web behavior.
4. On `401` from any request: clear stored credentials and return to the login screen (matches `lib/api.ts`'s `request()` behavior).
5. On app launch, if credentials exist, call `GET /api/auth/me` to verify the token is still valid before entering the authenticated app (matches the login page's existing token-verification-on-mount behavior) — do not trust a stored token blindly.
6. **Sign-out** clears both stored values and returns to login (matches the "Sign out" row in the mobile "More" sheet).

No onboarding/registration flow is required in this app for v1 — a tenant is created via the web onboarding flow (`admin-app/src/app/onboarding`). This app is login-only. (Open question for a future version, not v1: should tenant self-registration also be supported from mobile? Do not build it speculatively.)

---

## 4. Navigation Structure

Mirror the existing mobile web information architecture exactly — it's already been through a primary/secondary split for a small-screen tab bar, don't redesign it from scratch.

**Bottom tab bar (4 primary tabs + More), matching `PRIMARY_NAV` in `DashboardShell.tsx`:**

| Tab | Screen |
|---|---|
| Bookings | §6.1 |
| Services | §6.2 |
| Availability | §6.3 |
| Payments | §6.5 (payment *sources*, not the billing subscription — see naming note below) |
| More | Opens a sheet/modal with: Customers, Analytics, Billing, Settings, Sign out |

**Naming note:** the web app labels the payment-*sources* tab "Payments" — this is a potential source of user confusion with the *subscription billing* screen ("Billing", tucked in More). Keep the same labels as web for consistency across surfaces, but this is worth a design review before launch, not a blocking issue.

A logged-in user who hasn't paid (subscription `needs_payment: true` from `GET /api/billing/status`) is redirected to the Billing screen on app launch, matching `DashboardShell`'s existing redirect-to-billing guard — do not let them reach other tabs in that state.

---

## 5. Cross-Cutting Requirements

These apply to every screen below; stated once here instead of repeated per-screen.

- **Toasts for success/error feedback.** The web app recently standardized on a toast system (`admin-app/src/components/ToastProvider.tsx`) for every create/update/delete action across every screen. Replicate this pattern natively (e.g. a small toast/snackbar library) — every mutating action needs a success confirmation and a visible error message, never a silent failure.
- **Confirmation before destructive actions.** Deleting a service, payment source, availability range, or exception must show a confirm dialog first (matches `ConfirmModal` usage on web). Note that "delete service" is a **soft delete** (sets `is_active: false`, since services are FK-referenced by bookings with `onDelete: Cascade` — a hard delete would destroy booking history). The confirmation copy must say so accurately ("hidden and marked inactive," not "permanently removed").
- **Pull-to-refresh** on every list screen (Bookings, Services, Customers) — native affordance the web doesn't have, should replace/supplement manual reload-on-focus.
- **Empty states** for every list (no bookings, no services, no customers, no payment sources) — match the tone/copy already established on web rather than inventing new copy.
- **Currency formatting.** All monetary values are integers in the smallest currency unit (cents/pesewas) server-side — never render a raw integer; always run through the same formatting logic as `admin-app/src/types/index.ts`'s `formatAmount`.

---

## 6. Screens — Functional Requirements

### 6.1 Bookings (default landing tab)

Source: `admin-app/src/app/bookings/page.tsx`.

- Status filter tabs: **All / Pending / Booked / Rejected**, backed by `GET /api/bookings?status=<PENDING|BOOKED|REJECTED>` (omit param for All).
- Each booking row shows: customer name, status badge, service name, slot date/time, deposit amount, reference code.
- Tapping a row expands (or navigates to a detail screen — native pattern, doesn't have to be an inline accordion like web) to show: phone, email, time slot, client notes, rejection reason (if rejected), and payment proof details (amount, client reference, payment method, status).
- If a payment proof image exists, must be viewable full-screen (native image viewer with pinch-zoom — an improvement over the web's basic overlay).
- For `PENDING` bookings with a payment attached:
  - **Confirm** button → `POST /api/bookings/:id/confirm` with `{ payment_id }`.
  - **Reject** button → requires a rejection reason to be entered first (non-empty, matches web's required-text-field gate before the button enables) → `POST /api/bookings/:id/reject` with `{ payment_id, rejection_reason }`.
- A **cancel** action exists in the API (`POST /api/bookings/:id/cancel`) that the current web UI doesn't surface anywhere — evaluate whether to expose it in the mobile app (e.g. for confirmed bookings that need to be cancelled after the fact); not required for v1 parity but worth a product decision.
- Surface the tenant's shareable public booking link (`bookaata.app/book/<subdomain>`) somewhere reachable from this screen or Settings, with a native share sheet (`Share.share()`) instead of copy-to-clipboard-only.

### 6.2 Services

Source: `admin-app/src/app/services/page.tsx`.

- List (`GET /api/services?include_inactive=true`) showing name, duration, price, deposit type/value, active/inactive state. Default view hides inactive services with a "Show inactive (N)" toggle to reveal them — do not show inactive services mixed in by default.
- Create/edit form fields: brand (auto-set to primary brand — multi-brand selection is not exposed in the current web UI either, keep parity), name, description (optional), photo (camera roll or camera capture → upload), duration (minutes), price + currency, deposit type (percentage/fixed) + value, active/inactive toggle (edit only).
- Photo upload: accept `image/jpeg, image/png, image/webp, image/gif, image/heic, image/heif` — the backend's multer filter explicitly allows all of these (`api/src/modules/upload/upload.controller.ts`); a narrower native image-picker MIME allowlist would silently break uploads for iPhone users on HEIC/HEIF, which was a real bug already fixed once on web — do not reintroduce it.
- Delete = soft delete (see §5) via `DELETE /api/services/:id`.
- Client-side validation before submit (matches Zod rules on the backend, fail fast rather than round-tripping): price ≥ 0, duration ≥ 1 minute, deposit percentage between 1–100 when type is percentage.

### 6.3 Availability

Source: `admin-app/src/app/availability/page.tsx`. **This is the screen most improved over mobile web** (see §2.2) — exceptions must be fully accessible, not hidden.

- Service picker (tabs or a picker control) to select which service's schedule is being edited — availability is per-service, not per-tenant.
- **Weekly hours:** one row per day (Sun–Sat). Toggling a day on creates a default 09:00–17:00 range (`POST /api/availability/schedule/:serviceId`); toggling off **clears all ranges for that day** (`DELETE /api/availability/schedule/:serviceId/day/:dayOfWeek`) — this is destructive (removes potentially multiple ranges) and must be confirmed first (per §5), matching the confirm-before-clear behavior added on web.
- Each day can have multiple time ranges (e.g. split morning/evening shifts). Each range has: start time, end time, slot duration (minutes), capacity (people per slot). Add/edit/remove per range via `POST` / `PATCH` / `DELETE /api/availability/schedule/:id`.
- **Exceptions** (must be present and reachable, unlike current mobile web): date-specific overrides — either `BLOCKED` (fully closed) or `CUSTOM_HOURS` (different hours for that date) with an optional reason string. List via `GET /api/availability/exceptions/:serviceId`, create via `POST /api/availability/exceptions`, remove via `DELETE /api/availability/exceptions/:id` (confirm first, per §5).
- Validation: range end time must be after start time; slot duration ≥ 5 minutes; capacity ≥ 1.

### 6.4 Customers

Source: `admin-app/src/app/customers/page.tsx`.

- Search-as-you-type (debounced, matches the 380ms debounce on web) over name/phone/email via `GET /api/customers?search=<q>`.
- Selecting a customer shows their booking history (`GET /api/customers/:id/history`): service, date, status, reference code, amount, per past booking.
- Read-only screen — no create/edit/delete of customers from this app (matches web; customers are created implicitly through the booking flow only).

### 6.5 Payment Sources

Source: `admin-app/src/app/payment-sources/page.tsx`.

- List of configured payment methods (Mobile Money, Bank Transfer, Zelle, Venmo, Cash App, PayPal, Cash, Other), each with a label, active/inactive state, and type-specific detail fields shown to customers at checkout.
- Type-specific fields per type (must match exactly — these are what the customer sees on the public booking page's payment step):
  - Mobile Money: network, number, account name
  - Bank Transfer: bank name, account name, account number, routing number
  - Zelle: email or phone, account name
  - Venmo: handle
  - Cash App: cashtag
  - PayPal: email
  - Cash: no detail fields
  - Other: free-text description
- Optional client-facing instructions text field (e.g. "include your booking code in the transfer note").
- Create/update/delete (soft — sets inactive, doesn't remove) via `POST` / `PATCH` / `DELETE /api/payment-sources/:id`; enable/disable via `POST /api/payment-sources/:id/toggle`.
- Reordering exists in the API (`POST /api/payment-sources/reorder`) for controlling display order on the public booking page — expose as drag-to-reorder if feasible for v1, otherwise defer (not currently exposed in the web UI either).

### 6.6 Analytics

Source: `admin-app/src/app/analytics/page.tsx`. **Do not replicate the desktop `2fr 1fr` grid** — present as stacked cards on all screen sizes (see §2.3).

- Stat cards (last 30 days, from `GET /api/analytics/summary`): total bookings, booked count, revenue collected (confirmed deposits only), repeat customers (booked 2+ times), rejection rate.
- Bookings-over-time chart (`GET /api/analytics/bookings-over-time?group_by=day|week|month`) — a simple bar chart is sufficient, matches web's minimal styling; a native charting library (e.g. `react-native-svg`-based) is fine, no need for a heavy charting dependency.
- Revenue by service (`GET /api/analytics/revenue-by-service`), sorted descending, shown as a ranked list with proportional bars.

### 6.7 Settings

Source: `admin-app/src/app/settings/page.tsx`.

- **Profile:** business logo (photo picker → upload), display name, tagline (optional), **WhatsApp number** (optional — newly added; shown as a "Message us" button on the public booking page, so validate as a real phone number before saving), Terms & Conditions (optional long text; shown in a T&C sheet on the public booking page), shareable booking link with native share.
- **Location & currency:** country (drives available timezones and currency, which is auto-derived and read-only), timezone.
- **Booking rules:** slot hold time in minutes (how long a slot is reserved for a customer to pay their deposit before it's released), confirmation SLA in hours (target time for the tenant to review a submitted payment).
- Saved via `PATCH /api/brands/:id` (profile fields) + `PATCH /api/tenant/settings` (location/currency/booking rules) — these are two separate API calls triggered by one "Save" action, matching web's `handleSave`.

### 6.8 Billing

Source: `admin-app/src/app/billing/page.tsx`.

- Shows current subscription status (Trialing / Active / Payment overdue / Cancelled), trial countdown if trialing, current plan + renewal date if active.
- Plan selection (Monthly/Yearly, from `GET /api/subscription-plans`) and a "Pay" action that calls `POST /api/billing/pay` and **redirects to a Paystack-hosted checkout URL** — this happens outside the app (open in the system browser or an in-app browser tab, e.g. `expo-web-browser`), not a native payment SDK integration. Do not attempt to embed Paystack's checkout in a WebView with custom card collection — use their hosted page as-is, same as web.
- After returning from checkout, poll `GET /api/billing/status` a few times (matches web's 3-second-interval poll, up to ~10 attempts) to reflect activation without requiring a manual refresh.
- Error/success messaging here should stay **inline and persistent** (not an auto-dismissing toast) — this was a deliberate choice on web given the financial stakes and redirect-based flow; keep that reasoning, don't "fix" it into a toast.

---

## 7. Push Notifications (New — Not on Web Today)

This is new functionality, not a port of existing behavior — treat it as the primary reason this app is worth building.

**Backend gap:** the current notification system (`api/src/modules/notification`, BullMQ `notifications` queue) sends SMS/email to *customers* only. There is no device-token registry or push-sending path for tenants. This requires backend work:

1. New table: device push tokens per `TenantUser` (Expo push token or FCM/APNs token depending on final push provider choice — Expo push service is the pragmatic default for an Expo-based React Native app, since it unifies iOS/Android delivery).
2. New endpoint: `POST /api/tenant-users/me/push-token` (register/update a device token on login).
3. Trigger points (minimum for v1): new booking created (`PENDING`), payment proof submitted, booking auto-expired without payment.
4. Notification tap should deep-link into the Bookings screen, ideally scrolled/filtered to the relevant booking.

This is the one area of this document that requires new backend work rather than just consuming existing endpoints — call it out explicitly during estimation, don't assume it's client-only work.

---

## 8. Out of Scope for v1

- Customer-facing booking flow (separate app/surface — see §11).
- Multi-brand switching (web doesn't expose it either; always operates on the primary brand).
- Staff invitation/permission management UI (the `TenantUser.permissions` JSON field and role model exist server-side, but there's no web UI for it yet either — don't build the mobile UI ahead of the web one).
- Tenant self-registration/onboarding from the app (§3).
- Offline-first data entry (booking confirm/reject while offline, queued for later sync) — out of scope for v1; the app should clearly show "offline" state and disable mutating actions rather than silently queue them.

---

## 9. API Reference (all under `/api`, all require `Authorization` + `X-Tenant-Subdomain` headers except `auth/global-login`)

| Area | Method & Path |
|---|---|
| Auth | `POST /auth/global-login`, `GET /auth/me` |
| Bookings | `GET /bookings?status=`, `GET /bookings/:id`, `POST /bookings/:id/confirm`, `POST /bookings/:id/reject`, `POST /bookings/:id/cancel` |
| Services | `GET /services?include_inactive=true`, `POST /services`, `PATCH /services/:id`, `DELETE /services/:id` |
| Availability | `GET /availability/schedule/:serviceId`, `POST /availability/schedule/:serviceId`, `PATCH /availability/schedule/:id`, `DELETE /availability/schedule/:id`, `DELETE /availability/schedule/:serviceId/day/:dayOfWeek`, `GET /availability/exceptions/:serviceId`, `POST /availability/exceptions`, `DELETE /availability/exceptions/:id` |
| Customers | `GET /customers?search=`, `GET /customers/:id/history` |
| Payment sources | `GET /payment-sources`, `POST /payment-sources`, `PATCH /payment-sources/:id`, `DELETE /payment-sources/:id`, `POST /payment-sources/:id/toggle`, `POST /payment-sources/reorder` |
| Analytics | `GET /analytics/summary`, `GET /analytics/revenue-by-service`, `GET /analytics/bookings-over-time?group_by=` |
| Brands | `GET /brands`, `POST /brands`, `PATCH /brands/:id` |
| Billing | `GET /billing/status`, `POST /billing/pay`, `POST /billing/verify` |
| Subscription plans | `GET /subscription-plans?active=true` |
| Tenant settings | `GET /tenant/settings`, `PATCH /tenant/settings` |
| Upload | `POST /upload` (multipart, used for service photos, logo, — see §6.2 for accepted MIME types) |
| Push (new, §7) | `POST /tenant-users/me/push-token` — **does not exist yet** |

---

## 10. Design Notes

- Reuse the existing color tokens 1:1 rather than inventing a new palette — see `admin-app/src/app/globals.css` `:root` block (`--brand: #7c3565`, `--success-fg: #15803d`, `--danger-fg: #dc2626`, etc.). The web app is a single fixed light theme today (no dark mode implemented) — matching that is fine for v1; don't take on dark-mode scope unless asked.
- Icons throughout the web app are hand-drawn inline SVGs (Feather-icon-style: 2px stroke, rounded caps). Match this visual language (e.g. `react-native-vector-icons`'s Feather set, or the same SVGs via `react-native-svg`) rather than introducing a different icon style.

---

## 11. Relationship to a Future Customer-Facing App

Not part of this document's scope, but worth stating for planning purposes: the public booking flow (`admin-app/src/app/book/[subdomain]`) is a separate, already mobile-first web experience with its own step-based flow (landing → slot → details → payment → proof → confirm), its own WhatsApp/T&C contact affordances, and no login requirement (guest checkout by phone/email). If a customer-facing native app is built later, it is a **separate requirements document** — do not conflate its scope with this one, and do not assume shared navigation/auth patterns, since the customer flow is deliberately guest-first with no account system.
