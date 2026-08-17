Task:
    Let make this app a PWA.
    Let make sure it pushes notifications.
    List what will be needed.

Scope: admin-app only (Next.js 15 dashboard on :3001). Not mobile-app (already has Expo push, see push-notifications memory) and not the customer booking pages, unless we decide later to extend.

Current state (checked 2026-08-16): no manifest, no service worker, no next-pwa/serwist dep, no VAPID keys, layout.tsx has no manifest/theme-color meta tags. Clean slate.

1. Installability (PWA manifest)
    - Add admin-app/public/manifest.webmanifest: name, short_name, start_url ("/"), display: "standalone", theme_color, background_color, icons.
    - Icons needed: 192x192, 512x512, one maskable, plus apple-touch-icon (180x180) for iOS home-screen add.
    - Link it + theme-color/apple-mobile-web-app meta tags via metadata export in src/app/layout.tsx.

2. Service worker
    - Pick a tool: next-pwa is effectively unmaintained for App Router; use @serwist/next (successor) or hand-roll a minimal SW. Recommend serwist.
    - SW responsibilities: asset caching for installability/offline shell, plus 'push' and 'notificationclick' listeners (see #4).
    - Requires HTTPS in prod (already true) — localhost is exempt for dev.

3. Web Push backend (separate from mobile's Expo push)
    - Generate VAPID keypair (`web-push generate-vapid-keys`), store as env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:).
    - Add `web-push` npm package to api/.
    - Extend PushToken model (or add a platform value) to hold a browser subscription (endpoint, keys.p256dh, keys.auth) alongside the existing Expo token/platform fields — same tenant-scoped model, don't fork a new table.
    - Extend NotificationService.sendPush to branch by platform: expo-server-sdk for EXPO tokens (existing), web-push for WEB subscriptions (new). Same TEMPLATES map, same 3 trigger points — no new notification logic, just a new delivery branch.

4. Admin-app registration + receive flow
    - New hook (mirror mobile-app/features/notifications/register.ts pattern): register SW, request Notification permission, `registration.pushManager.subscribe()` with the VAPID public key, POST subscription to /api/tenant-users/me/push-token (reuse existing endpoint, extend its schema to accept a subscription object instead of/alongside an Expo token string).
    - SW 'push' handler: show notification with title/body from payload.
    - SW 'notificationclick' handler: deep-link into /bookings/[id] (mirror mobile's use-notification-router.ts).

5. Known constraint
    - Safari/iOS web push only works from an installed (Add to Home Screen) PWA on iOS 16.4+, not a regular browser tab. Since bug 003 shows the admin is a Safari user, flag this to the client — installability (#1) isn't optional, it's a prerequisite for push actually reaching them on iOS.

6. Testing
    - Verify manifest + SW pass Lighthouse's installability audit.
    - Manual test: install on iOS Safari and desktop Chrome, trigger a booking event, confirm notification arrives and tapping it deep-links correctly.


VAPID_PUBLIC_KEY=BOn0l0UNl-D01y0Xq7RPdsO5WIE-vG0jSdrOCNn7nt28hmAdBOdyRnd4pW0FB5w86iohMXvBx7VjENb-7ImLiqQ                                                                                                                              
VAPID_PRIVATE_KEY=AZDW6gmRlN8NL27Ym92Id0sZJvvr7RSOWeyoSRvKMlY                                                                                                                                                                         
VAPID_SUBJECT=mailto:noreply@bookimgs.app