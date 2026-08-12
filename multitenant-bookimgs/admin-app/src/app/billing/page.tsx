'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { adminApi } from '@/lib/api';

type BillingStatus = {
  subscription_status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  trial_ends_at: string | null;
  subscription_expires_at: string | null;
  is_trial_expired: boolean;
  needs_payment: boolean;
};

function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const STATUS_META: Record<BillingStatus['subscription_status'], { label: string; color: string; bg: string }> = {
  TRIALING:  { label: 'Free trial',       color: '#1d7afc', bg: 'rgba(29,122,252,0.08)' },
  ACTIVE:    { label: 'Active',           color: '#16a34a', bg: 'rgba(22,163,74,0.08)'  },
  PAST_DUE:  { label: 'Payment overdue',  color: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
  CANCELLED: { label: 'Cancelled',        color: '#dc2626', bg: 'rgba(220,38,38,0.08)'  },
};

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const searchParams = useSearchParams();
  const justSubscribed = searchParams.get('status') === 'success';
  const paystackReference = searchParams.get('reference') ?? searchParams.get('trxref');

  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // If returning from Paystack, verify the payment immediately before showing status
        if (paystackReference) {
          await adminApi.verifyPayment(paystackReference).catch(() => {});
        }
        const s = await adminApi.getBillingStatus();
        setBilling(s);
      } catch {
        setError('Failed to load billing status.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paystackReference]);

  // After returning from Paystack checkout, poll until the webhook updates the status
  useEffect(() => {
    if (!justSubscribed) return;
    let attempts = 0;
    setPolling(true);
    const interval = setInterval(async () => {
      attempts++;
      try {
        const s = await adminApi.getBillingStatus();
        setBilling(s);
        if (s.subscription_status === 'ACTIVE' || attempts >= 10) {
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [justSubscribed]);

  const handleSubscribe = async () => {
    setError('');
    setSubscribing(true);
    try {
      let email = localStorage.getItem('email') ?? '';
      if (!email) {
        const me = await adminApi.getMe();
        email = me.email;
        localStorage.setItem('email', email);
      }
      const { checkout_url } = await adminApi.initializePayment(email);
      window.location.href = checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout. Please try again.');
      setSubscribing(false);
    }
  };

  const meta = billing ? STATUS_META[billing.subscription_status] : null;
  const days = billing?.trial_ends_at ? daysLeft(billing.trial_ends_at) : 0;
  const isActive = billing?.subscription_status === 'ACTIVE';
  const needsAction = billing?.needs_payment ?? false;

  return (
    <DashboardShell>
      <style>{`
        @media (max-width: 600px) {
          .billing-grid { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text-1)', marginBottom: 4 }}>Billing</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Manage your BookImgs subscription.</p>
      </div>

      {/* Success banner — shown after returning from Paystack checkout */}
      {justSubscribed && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 10, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12" /></svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>Payment received</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
              {polling ? 'Activating your subscription…' : 'Payment received. Refresh if the status below hasn\'t updated.'}
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', borderRadius: 8, background: 'var(--danger-bg)', color: 'var(--danger-fg)', fontSize: 13, marginBottom: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
      ) : billing && meta ? (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }} className="billing-grid">

          {/* Status card */}
          <div style={{ flex: '1 1 300px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Current plan</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: meta.bg, fontSize: 12, fontWeight: 600, color: meta.color }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                {meta.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-1px' }}>GHS 40</span>
              <span style={{ fontSize: 14, color: 'var(--text-3)' }}>/month</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Unlimited bookings · Client notifications · Custom booking page
            </p>

            {billing.subscription_status === 'TRIALING' && billing.trial_ends_at && (
              <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 8, background: days <= 5 ? 'rgba(217,119,6,0.08)' : 'var(--bg-subtle)', border: `1px solid ${days <= 5 ? 'rgba(217,119,6,0.2)' : 'var(--border)'}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: days <= 5 ? '#d97706' : 'var(--text-1)' }}>
                  {days === 0 ? 'Trial expired' : `${days} day${days === 1 ? '' : 's'} left in your trial`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                  Trial ends {new Date(billing.trial_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            )}

            {billing.subscription_status === 'PAST_DUE' && (
              <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 8, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>Payment failed</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Your last payment could not be processed. Subscribe below to restore access.</div>
              </div>
            )}

            {billing.subscription_status === 'CANCELLED' && (
              <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Subscription cancelled</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Subscribe again to re-activate your booking page.</div>
              </div>
            )}
          </div>

          {/* Action card */}
          <div style={{ flex: '1 1 260px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
              {isActive ? 'Your subscription' : 'Get started'}
            </div>

            {isActive ? (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Subscription active</span>
                  </div>
                  {billing.subscription_expires_at && (
                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.6 }}>
                      Renews by{' '}
                      <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>
                        {new Date(billing.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.6 }}>
                    Your booking page is live. Pay GHS 40 each month via MoMo or card to keep access.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  {(['Unlimited booking management', 'Client email & SMS notifications', 'Custom subdomain booking page', 'Payment tracking & analytics'] as const).map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  style={{
                    marginTop: 20, width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                    background: subscribing ? 'var(--border-2)' : 'var(--brand)',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: subscribing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {subscribing ? 'Redirecting to Paystack…' : needsAction && billing.subscription_status !== 'TRIALING' ? 'Pay GHS 40 to restore access' : 'Pay GHS 40 — MoMo or card'}
                </button>
                <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                  Secure checkout via Paystack · MoMo, card, or bank transfer
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* What's included section */}
      {!loading && (
        <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>What&apos;s included</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { title: 'Booking management',  desc: 'Confirm, reject, and track all client bookings in one place.' },
              { title: 'Client notifications', desc: 'Automatic email & SMS updates when bookings are confirmed or rejected.' },
              { title: 'Custom booking page',  desc: 'Your own bookimgs.app/book/[your-name] page to share with clients.' },
              { title: 'Payment tracking',     desc: 'Log deposits, upload proof, and confirm payments manually.' },
              { title: 'Analytics',            desc: 'Revenue, booking trends, and top services at a glance.' },
              { title: 'Availability control', desc: 'Set your working hours and block off dates easily.' },
            ].map(f => (
              <div key={f.title} style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
