import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Web push delivery — payload shape mirrors mobile-app's Expo push data
// ({ title, body, data: { referenceCode, ... } }), same TEMPLATES map on the
// backend, so both platforms deep-link the same way on tap.
interface PushPayload {
  title: string;
  body: string;
  data?: { referenceCode?: string | null; [key: string]: unknown };
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Bookaata', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data ?? {},
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const referenceCode = (event.notification.data as PushPayload['data'] | undefined)?.referenceCode;
  const targetPath = referenceCode ? `/bookings?ref=${encodeURIComponent(referenceCode)}` : '/bookings';

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await (existing as WindowClient).navigate(new URL(targetPath, self.location.origin).href);
        return;
      }
      await self.clients.openWindow(targetPath);
    })(),
  );
});
