# Multi-Tenant Booking SaaS — Technical Requirements Document

**Version:** 1.0
**Status:** Ready for implementation
**Audience:** This document is written for direct implementation by an AI coding agent (Claude Code) or a human engineer. Every entity, field, state, and rule below is intended to be unambiguous. Where a decision was made to remove ambiguity, the reasoning is stated inline so it is not re-litigated during implementation.

---

## 1. Product Summary

A multi-tenant SaaS booking platform, accessed entirely through the browser (no native app download required for tenants or their clients — this is a core differentiator).

- **Tenants** are small businesses (salons, spas, consultants, service providers) who sign up, configure their brand, services, availability, and payment sources, and manage bookings.
- **Clients** (the tenant's customers) visit a public booking page per tenant, pick a service and time slot, and pay a required deposit/booking amount directly to the tenant via a manually configured payment channel (bank transfer, mobile money, Zelle, etc.) — **no payment gateway integration**. This is a deliberate architectural decision (see §6) to avoid gateway fees and let tenants — who are mostly small businesses — receive funds instantly and directly.
- The platform serves **both international and local tenants** (initial markets: Ghana and the United States, architecture must not hardcode assumptions to either).

---

## 2. Non-Negotiable Architectural Decisions

These are decided. Do not re-derive or second-guess them during implementation.

1. **All primary keys and foreign keys are UUIDs (v4)**, stored as Postgres `uuid` type. No auto-incrementing integer IDs anywhere in the schema.
2. **Multi-tenancy model: shared database, shared schema, `tenant_id` on every tenant-owned table.** Not schema-per-tenant, not database-per-tenant. Tenant isolation is enforced at the application layer via a Prisma middleware (see §5.2) that auto-injects `tenant_id` into every query. This is chosen for operational simplicity and cost at current scale; do not introduce schema-per-tenant.
3. **No payment gateway integration in v1.** Payments are proof-based / manually confirmed by the tenant. Do not add Stripe/Paystack/Flutterwave SDK integration unless a future version explicitly requests it.
4. **All timestamps stored in UTC.** Each tenant has an IANA timezone string (e.g. `Africa/Accra`, `America/New_York`) used only for display/conversion, never for storage.
5. **All monetary amounts are stored as integers in the smallest currency unit** (e.g. cents, pesewas) to avoid floating-point rounding errors. A separate `currency` field (ISO 4217, e.g. `GHS`, `USD`) accompanies every monetary field.
6. **Tech stack (fixed):** Node.js + TypeScript, PostgreSQL, Prisma ORM, Redis (locking + caching), BullMQ (background jobs/queues), Docker (containerization). Do not substitute these unless explicitly instructed.

---

## 3. Actors & Roles

| Role | Scope | Description |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide | Internal platform operator. Manages tenants, can suspend/activate accounts. Not tenant-scoped. |
| `TENANT_OWNER` | Single tenant | Full access to their tenant: brand, services, availability, staff, payment sources, bookings, analytics. |
| `TENANT_STAFF` | Single tenant | Restricted access, defined by permissions on the `TenantUser` record (e.g. can view/manage bookings but not payment sources or billing). |
| `CLIENT` | Cross-tenant (customer identity is tenant-scoped in v1 — see §4.3 note) | Books services, submits payment proof, receives notifications. No login required for v1 (booking flow is guest-checkout style, identified by phone/email). |

---

## 4. Data Model

All tables include `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` unless otherwise noted. These are omitted from the field lists below for brevity — assume every table has them.

### 4.1 `Tenant`

| Field | Type | Notes |
|---|---|---|
| `name` | string | Business name |
| `subdomain` | string, unique | e.g. `glow-spa` → `glow-spa.app.com`. Used for tenant resolution. |
| `country_code` | string (ISO 3166-1 alpha-2) | e.g. `GH`, `US` |
| `timezone` | string (IANA) | e.g. `Africa/Accra` |
| `default_currency` | string (ISO 4217) | e.g. `GHS`, `USD` |
| `status` | enum: `PENDING`, `ACTIVE`, `SUSPENDED` | `PENDING` until onboarding is complete |
| `booking_confirmation_sla_hours` | integer, default `48` | How long a tenant has to review a `PROOF_SUBMITTED` booking before an escalation notification fires |
| `settings` | jsonb | Free-form, non-critical settings (branding colors, etc.) |

### 4.2 `Brand`

A tenant may run more than one brand under one account (e.g. two salon locations).

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `name` | string | |
| `logo_url` | string, nullable | |
| `description` | text, nullable | |
| `is_primary` | boolean, default `true` | First brand created for a tenant |

### 4.3 `TenantUser`

Staff/owner accounts for a tenant.

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `email` | string, unique per tenant | |
| `password_hash` | string | |
| `full_name` | string | |
| `role` | enum: `TENANT_OWNER`, `TENANT_STAFF` | |
| `permissions` | jsonb, nullable | Fine-grained overrides for `TENANT_STAFF`, e.g. `{"can_manage_payment_sources": false}` |
| `status` | enum: `ACTIVE`, `INVITED`, `DISABLED` | |

### 4.4 `Customer`

**Design note:** Customers are tenant-scoped in v1 (one customer record per tenant, even if the same phone number books with two different tenants). This matches how most booking SaaS products operate and avoids the complexity of cross-tenant identity resolution. Do not build a global customer identity system unless explicitly requested later.

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `full_name` | string | |
| `email` | string, nullable | |
| `phone` | string | Required — primary contact/notification channel |
| `notes` | text, nullable | Tenant-visible notes about this customer |

### 4.5 `Service`

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `brand_id` | uuid, FK → Brand | |
| `name` | string | |
| `description` | text, nullable | |
| `duration_minutes` | integer | |
| `price_amount` | integer | Smallest currency unit |
| `price_currency` | string (ISO 4217) | |
| `deposit_type` | enum: `PERCENTAGE`, `FIXED` | How the required booking amount is calculated |
| `deposit_value` | integer | If `PERCENTAGE`: whole number 1–100. If `FIXED`: smallest currency unit. |
| `is_active` | boolean, default `true` | Inactive services are hidden from the public booking page but preserved for historical bookings |

**Derived rule:** `required_deposit_amount` = `price_amount * deposit_value / 100` if `PERCENTAGE`, else `deposit_value` if `FIXED`. Compute this at booking-creation time and store it on the `Booking` record (do not recompute later — service pricing may change after a booking is made).

### 4.6 `Availability`

Recurring weekly availability per service (or per staff member if staff-level scheduling is added later — v1 is service-level).

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `service_id` | uuid, FK → Service | |
| `day_of_week` | integer, 0–6 | 0 = Sunday |
| `start_time` | time (no timezone, interpreted in `Tenant.timezone`) | |
| `end_time` | time | |
| `slot_duration_minutes` | integer | Should default to `Service.duration_minutes` but can be set independently to allow buffer time between bookings |

### 4.7 `AvailabilityException`

One-off overrides — closures, holidays, extra hours.

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `service_id` | uuid, FK → Service, nullable | Null = applies to all services |
| `date` | date | |
| `type` | enum: `BLOCKED`, `CUSTOM_HOURS` | |
| `start_time` | time, nullable | Required if `CUSTOM_HOURS` |
| `end_time` | time, nullable | Required if `CUSTOM_HOURS` |
| `reason` | string, nullable | |

### 4.8 `PaymentSource`

Tenant-configured payment channel. No gateway credentials — these are display/instruction records only.

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `type` | enum: `MOBILE_MONEY`, `BANK_TRANSFER`, `ZELLE`, `VENMO`, `CASH_APP`, `PAYPAL`, `CASH`, `OTHER` | Extensible — do not hardcode a closed list in application logic, treat as a lookup that can grow |
| `label` | string | Tenant-facing name, e.g. "MTN MoMo — Main" |
| `details` | jsonb | Shape varies by `type` — see §4.8.1 |
| `instructions` | text, nullable | Free text shown to client at checkout, e.g. "Include your booking code in the transfer note" |
| `is_active` | boolean, default `true` | |
| `display_order` | integer, default `0` | Order shown to client when multiple sources exist |

#### 4.8.1 `details` jsonb shapes by type

```
MOBILE_MONEY:  { "network": "MTN" | "VODAFONE" | "AIRTELTIGO", "number": string, "account_name": string }
BANK_TRANSFER: { "bank_name": string, "account_name": string, "account_number": string, "routing_number"?: string }
ZELLE:         { "email_or_phone": string, "account_name": string }
VENMO:         { "handle": string }
CASH_APP:      { "cashtag": string }
PAYPAL:        { "email": string }
CASH:          {}
OTHER:         { "description": string }
```

### 4.9 `Booking`

The central entity. State machine detailed in §6.

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `customer_id` | uuid, FK → Customer | |
| `service_id` | uuid, FK → Service | |
| `slot_start` | timestamptz | |
| `slot_end` | timestamptz | |
| `status` | enum (see §6) | |
| `required_amount` | integer | Snapshot of `required_deposit_amount` at booking creation — see §4.5 |
| `required_currency` | string (ISO 4217) | Snapshot of `Service.price_currency` |
| `reference_code` | string, unique | System-generated short code (e.g. `MKC-7F2X`), client is instructed to quote this in the payment note — this is the mechanism that lets a tenant match an incoming transfer to a booking |
| `hold_expires_at` | timestamptz, nullable | Set when status = `SLOT_HELD`. Used by a scheduled job to auto-release expired holds. |
| `client_notes` | text, nullable | Optional note from client at booking time |
| `rejection_reason` | text, nullable | Set if tenant rejects payment proof |
| `confirmed_by_user_id` | uuid, FK → TenantUser, nullable | Who confirmed/rejected |
| `confirmed_at` | timestamptz, nullable | |

### 4.10 `Payment`

A booking may have more than one `Payment` attempt (e.g. first proof rejected, client resubmits).

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `booking_id` | uuid, FK → Booking | |
| `payment_source_id` | uuid, FK → PaymentSource | |
| `amount` | integer | What the client claims to have paid |
| `currency` | string (ISO 4217) | |
| `client_reference` | string, nullable | The transaction ID/reference the client entered from their own bank/momo app |
| `proof_url` | string, nullable | Uploaded receipt/screenshot (object storage) |
| `status` | enum: `AWAITING_REVIEW`, `CONFIRMED`, `REJECTED` | |
| `reviewed_by_user_id` | uuid, FK → TenantUser, nullable | |
| `reviewed_at` | timestamptz, nullable | |

### 4.11 `Notification`

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | uuid, FK → Tenant | |
| `booking_id` | uuid, FK → Booking, nullable | |
| `recipient_type` | enum: `CLIENT`, `TENANT` | |
| `channel` | enum: `EMAIL`, `SMS` | |
| `template` | string | e.g. `booking_hold_created`, `payment_proof_reminder`, `booking_confirmed`, `booking_rejected`, `tenant_new_booking_alert`, `tenant_review_sla_reminder` |
| `status` | enum: `QUEUED`, `SENT`, `FAILED` | |
| `sent_at` | timestamptz, nullable | |
| `error_message` | text, nullable | |

---

## 5. Multi-Tenancy Implementation Rules

### 5.1 Tenant resolution
Every incoming request (public booking pages and authenticated dashboard requests) resolves a `tenant_id` from the subdomain (e.g. `glow-spa.app.com` → look up `Tenant` where `subdomain = 'glow-spa'`). Attach the resolved `tenant_id` to the request context before any handler runs. Reject with 404 if no matching tenant or `Tenant.status != ACTIVE`.

### 5.2 Query isolation
Implement a Prisma middleware (or extension, depending on Prisma version used) that automatically injects a `where: { tenant_id }` filter on every query against a tenant-scoped model, sourced from the request context. **No handler should ever manually filter by `tenant_id`** — this is a systemic safeguard, not a per-query convention, so that a missed filter cannot leak cross-tenant data. `SUPER_ADMIN`-scoped endpoints are the sole exception and must be explicitly flagged to bypass this middleware.

### 5.3 Which tables are tenant-scoped
All tables in §4 except: none — every table in this schema carries `tenant_id`, including `Payment` and `Notification`.

---

## 6. Booking State Machine

```
SLOT_HELD ──(proof submitted)──▶ PROOF_SUBMITTED ──(tenant confirms)──▶ CONFIRMED
   │                                    │
   │ (hold_expires_at passed,           │ (tenant rejects)
   │  no proof submitted)               ▼
   ▼                              REJECTED ──(client resubmits proof)──▶ PROOF_SUBMITTED
EXPIRED

CONFIRMED ──(slot_start passed, service rendered)──▶ COMPLETED
CONFIRMED ──(tenant or client cancels before slot_start)──▶ CANCELLED
```

### States

| Status | Meaning |
|---|---|
| `SLOT_HELD` | Client selected a slot. Slot is soft-reserved. `hold_expires_at` set to `now() + tenant's configured hold window` (default 20 minutes — configurable per tenant, add `slot_hold_minutes` to `Tenant` if not already present, default `20`). |
| `PROOF_SUBMITTED` | Client submitted a `Payment` record with proof. Slot hold becomes firm (no expiry) — `hold_expires_at` cleared. Awaiting tenant review. |
| `CONFIRMED` | Tenant reviewed and approved the payment. Booking is locked in. |
| `REJECTED` | Tenant reviewed and declined the payment (wrong amount, no reference found, etc.). `rejection_reason` populated. Client may resubmit a new `Payment` → returns to `PROOF_SUBMITTED`. |
| `EXPIRED` | `hold_expires_at` passed with no proof submitted. Slot released back to availability. |
| `CANCELLED` | Cancelled after confirmation, by either party. |
| `COMPLETED` | Slot time has passed and booking was `CONFIRMED`. Set by scheduled job, not user action. |

### Rules
- A slot (service_id + overlapping time range) cannot have two bookings simultaneously in `SLOT_HELD`, `PROOF_SUBMITTED`, or `CONFIRMED` state. Enforce with a Redis lock (`SETNX` with the slot key, TTL matching `hold_expires_at`) at creation time, backed by a database-level unique constraint or exclusion constraint as the source of truth (Redis is a fast-path lock, not the sole guarantee).
- Transitioning `SLOT_HELD → EXPIRED` is handled by a BullMQ delayed job scheduled at booking-creation time for `hold_expires_at`. On execution, re-check the booking is still `SLOT_HELD` before expiring (avoid a race where proof was submitted moments before the job runs).
- Transitioning `CONFIRMED → COMPLETED` is handled by a BullMQ job (cron-style, e.g. hourly) that finds all `CONFIRMED` bookings where `slot_end < now()`.
- If a tenant does not act on a `PROOF_SUBMITTED` booking within `Tenant.booking_confirmation_sla_hours`, fire a `tenant_review_sla_reminder` notification (does not change status).

---

## 7. Notification Rules

| Trigger | Recipient | Channel(s) | Template |
|---|---|---|---|
| Booking reaches `SLOT_HELD` | Client | Email + SMS | `booking_hold_created` — includes payment instructions, reference code, hold expiry time |
| Hold at ~50% of expiry window with no proof | Client | SMS | `payment_proof_reminder` |
| Booking reaches `PROOF_SUBMITTED` | Tenant | Email + SMS | `tenant_new_booking_alert` |
| Booking reaches `CONFIRMED` | Client | Email + SMS | `booking_confirmed` |
| Booking reaches `REJECTED` | Client | Email + SMS | `booking_rejected` — includes `rejection_reason` |
| `PROOF_SUBMITTED` exceeds SLA | Tenant | Email | `tenant_review_sla_reminder` |
| Booking reaches `COMPLETED` | Client | Email | (optional, v2 — review request) |

### Provider routing
- **Email:** single provider globally (e.g. Resend or SendGrid) — no regional routing needed.
- **SMS:** route by `Customer` phone country code (derive from phone number, e.g. via `libphonenumber`). Implement an `SMSProvider` interface with at least two implementations selectable by country: one for US numbers, one for Ghanaian numbers. Do not hardcode a single SMS provider as if it were global.
- All notification sends go through a BullMQ `notifications` queue — no synchronous send calls from request handlers.

---

## 8. Public Booking Flow (Client-Facing)

1. Client visits `{subdomain}.app.com` → sees `Brand` info and list of active `Service`s.
2. Client selects a `Service` → sees available slots, computed from `Availability` + `AvailabilityException` minus already-held/confirmed `Booking`s, displayed in the tenant's local time but the client's own browser timezone should also be indicated if it differs.
3. Client selects a slot → provides `full_name`, `phone`, `email` (optional) → `Customer` record created or matched (match on `phone` within the tenant) → `Booking` created in `SLOT_HELD`.
4. Client is shown: `required_amount` + `required_currency`, the tenant's active `PaymentSource` list with instructions, and the `reference_code` to quote.
5. Client pays externally, returns to the booking page (link from the confirmation email/SMS works too), and submits a `Payment` with `client_reference` and/or uploaded `proof_url`.
6. Booking → `PROOF_SUBMITTED`. Client sees a "pending tenant confirmation" status page.
7. Client is notified when tenant confirms or rejects.

## 9. Tenant Dashboard Requirements

- **Bookings queue**, filterable by status — the `PROOF_SUBMITTED` view is the priority screen: shows amount, reference code, client-entered reference, proof image, with Confirm/Reject actions.
- **Availability management** — weekly recurring schedule per service, plus exceptions calendar.
- **Services** — CRUD, including deposit type/value configuration.
- **Customers** — list/search, booking history per customer.
- **Payment sources** — CRUD, reorderable, active/inactive toggle.
- **Analytics** — at minimum: bookings per period, revenue per service (sum of `CONFIRMED` `Payment.amount`), cancellation/rejection rate, repeat-customer rate. Build as nightly rollup tables/materialized views populated by a BullMQ scheduled job, not live aggregation on raw tables, once volume justifies it — v1 can query live if volume is low.

---

## 10. Explicitly Out of Scope for v1

State these are **not** to be built unless a future revision of this document says otherwise:
- Payment gateway integration (Stripe/Paystack/etc.)
- Cross-tenant global customer identity
- Staff-level (as opposed to service-level) availability/scheduling
- Client login/accounts (v1 booking flow is guest-checkout, identified by phone)
- Multi-currency conversion or FX (money never crosses currencies — each tenant operates in its own currency)
- Native mobile apps

---

## 11. Implementation Notes for the Coding Agent

- Every `enum` listed above should be implemented as a Prisma `enum` (or a Postgres native enum), not a free-text string column, to prevent invalid states.
- Every monetary field pair (`*_amount` + `*_currency`) must always be written together — never allow one to be updated without the other.
- The Redis slot-lock key format: `lock:slot:{tenant_id}:{service_id}:{slot_start_iso}`.
- The BullMQ queue names to create: `notifications`, `booking-expiry`, `booking-completion`, `analytics-rollup`.
- Do not invent additional tenant-facing features not listed in this document without flagging them as an assumption first.
