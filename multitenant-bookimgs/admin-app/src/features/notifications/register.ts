'use client';

import { useEffect } from 'react';
import { adminApi } from '@/lib/api';

// Web Push needs the VAPID public key as a Uint8Array, but it's distributed
// as a base64url string — this is the standard conversion (same one used in
// every web-push tutorial/library example).
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

// Mirrors mobile-app/src/features/notifications/register.ts — runs once per
// authenticated session, requests permission, subscribes to Web Push via the
// service worker (@serwist/next registers it automatically), and registers
// the subscription with the backend so this browser can receive tenant
// alerts (new booking, proof submitted, booking expired).
export function usePushNotificationRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured — skipping push registration');
      return;
    }

    (async () => {
      if (Notification.permission === 'denied') return;
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }
        await adminApi.registerPushSubscription(subscription.toJSON());
      } catch (err) {
        console.warn('[push] failed to register subscription with backend', err);
      }
    })();
  }, [enabled]);
}
