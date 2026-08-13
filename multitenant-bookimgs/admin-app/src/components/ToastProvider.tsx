'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  leaving: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const DURATION: Record<ToastType, number> = { success: 4000, error: 7000 };
const EXIT_MS = 180;

const ICON: Record<ToastType, string> = { success: '✓', error: '!' };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    const existing = timers.current.get(id);
    if (existing !== undefined) window.clearTimeout(existing);
    timers.current.set(id, window.setTimeout(() => remove(id), EXIT_MS) as unknown as number);
  }, [remove]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message, leaving: false }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), DURATION[type]) as unknown as number);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          zIndex: 2000,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              width: '100%',
              maxWidth: 360,
              padding: '12px 14px',
              borderRadius: 'var(--radius)',
              background: t.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: t.type === 'success' ? 'var(--success-fg)' : 'var(--danger-fg)',
              boxShadow: 'var(--shadow-md)',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.45,
              animation: `${t.leaving ? 'toast-out' : 'toast-in'} ${EXIT_MS}ms ease-out forwards`,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'currentColor',
                color: t.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {ICON[t.type]}
            </span>
            <span style={{ flex: 1, paddingTop: 1 }}>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                opacity: 0.55,
                padding: 0,
                fontSize: 15,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
