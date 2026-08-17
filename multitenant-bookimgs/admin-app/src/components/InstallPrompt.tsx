'use client';

import { useEffect, useState } from 'react';
import { requestPushPermissionAndRegister } from '@/features/notifications/register';

// Not in lib.dom.d.ts — this event is Chromium-specific (Chrome, Edge,
// Android WebView) and has no standard type definition.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'bookaata_install_banner_dismissed';

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's legacy, non-standard way of exposing the same thing.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Neither iOS (no beforeinstallprompt at all) nor Android's automatic
// install banner (gated behind an engagement-time heuristic) can be relied
// on to actually reach a tenant owner. This surfaces the same two things —
// "put this on your home screen" and "turn on alerts" — as an explicit,
// dismissible banner instead of hoping the browser's own UI shows up.
export function InstallPrompt() {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIos());
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
    if ('Notification' in window) setNotifPermission(Notification.permission);
    setReady(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    setEnabling(true);
    const granted = await requestPushPermissionAndRegister();
    setNotifPermission(granted ? 'granted' : (('Notification' in window && Notification.permission) || 'denied'));
    setEnabling(false);
  };

  if (!ready || dismissed) return null;

  // Not installed yet — offer install. On iOS there's no programmatic
  // trigger, only static instructions; elsewhere, only show a button once
  // the browser has actually handed us a capturable prompt.
  if (!standalone) {
    if (ios) {
      return (
        <Banner onDismiss={dismiss}>
          <strong>Get instant booking alerts.</strong> Tap the Share icon{' '}
          <ShareIcon /> below, then <strong>&quot;Add to Home Screen&quot;</strong>.
        </Banner>
      );
    }
    if (deferredPrompt) {
      return (
        <Banner onDismiss={dismiss} action={{ label: 'Install', onClick: handleInstallClick }}>
          <strong>Install Bookaata</strong> to get instant alerts when a client books.
        </Banner>
      );
    }
    return null;
  }

  // Installed, but hasn't decided on notifications yet — this is the whole
  // point of installing, so ask explicitly rather than leaving it silent.
  if (notifPermission === 'default') {
    return (
      <Banner
        onDismiss={dismiss}
        action={{ label: enabling ? 'Enabling…' : 'Enable notifications', onClick: handleEnableNotifications, disabled: enabling }}
      >
        <strong>Turn on notifications</strong> to get alerted the moment a client books an appointment.
      </Banner>
    );
  }

  return null;
}

function Banner({
  children,
  onDismiss,
  action,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--brand-light, #fdf4fb)',
        marginBottom: 20,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{children}</div>
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: action.disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            opacity: action.disabled ? 0.7 : 1,
          }}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, flexShrink: 0, display: 'flex' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
