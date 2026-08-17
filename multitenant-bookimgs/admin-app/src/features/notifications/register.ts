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

function getVapidKey(): Uint8Array<ArrayBuffer> | null {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured — skipping push registration');
    return null;
  }
  return urlBase64ToUint8Array(vapidPublicKey);
}

async function subscribeAndRegister(): Promise<void> {
  const applicationServerKey = getVapidKey();
  if (!applicationServerKey) return;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  }
  await adminApi.registerPushSubscription(subscription.toJSON());
}

// Runs once per authenticated session. Only re-registers a subscription when
// the browser already has notification permission granted (e.g. returning
// user, or a fresh service worker after a deploy) — never prompts. Asking
// for permission is a separate, user-triggered action (see
// requestPushPermissionAndRegister) surfaced via the install/notify banner,
// not something to spring on a page load.
export function useAutoPushRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    subscribeAndRegister().catch((err) => {
      console.warn('[push] failed to refresh subscription with backend', err);
    });
  }, [enabled]);
}

// User-triggered: requests notification permission, and if granted,
// subscribes + registers with the backend. Returns whether it ended up
// granted, so the caller (the install/notify banner) can update its UI.
export async function requestPushPermissionAndRegister(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;

  if (Notification.permission === 'denied') return false;
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
  }

  try {
    await subscribeAndRegister();
    return true;
  } catch (err) {
    console.warn('[push] failed to register subscription with backend', err);
    return false;
  }
}
