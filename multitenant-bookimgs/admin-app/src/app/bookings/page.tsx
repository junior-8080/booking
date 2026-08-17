'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { useToast } from '@/components/ToastProvider';
import { adminApi } from '@/lib/api';
import { Input } from '@/components/ui';
import type { Booking, BookingStatus } from '@/types';
import { formatAmount } from '@/types';

const TABS: {
  label: string;
  value: BookingStatus | '';
  dot: string;
  activeBg: string;
  activeColor: string;
  activeBorder: string;
}[] = [
  {
    label: 'All',
    value: '',
    dot: 'var(--border-2)',
    activeBg: 'var(--bg)',
    activeColor: 'var(--text-1)',
    activeBorder: 'var(--border-2)',
  },
  {
    label: 'Pending',
    value: 'PENDING',
    dot: 'var(--warning-fg)',
    activeBg: 'var(--warning-bg)',
    activeColor: 'var(--warning-fg)',
    activeBorder: 'var(--warning-fg)',
  },
  {
    label: 'Booked',
    value: 'BOOKED',
    dot: 'var(--success-fg)',
    activeBg: 'var(--success-bg)',
    activeColor: 'var(--success-fg)',
    activeBorder: 'var(--success-fg)',
  },
  {
    label: 'Rejected',
    value: 'REJECTED',
    dot: 'var(--danger-fg)',
    activeBg: 'var(--danger-bg)',
    activeColor: 'var(--danger-fg)',
    activeBorder: 'var(--danger-fg)',
  },
];

const STATUS_STYLE: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  PENDING:  { bg: 'var(--warning-bg)', color: 'var(--warning-fg)', label: 'Pending' },
  BOOKED:   { bg: 'var(--success-bg)', color: 'var(--success-fg)', label: 'Booked' },
  REJECTED: { bg: 'var(--danger-bg)',  color: 'var(--danger-fg)',  label: 'Rejected' },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function tzLabel(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  try {
    const offset = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value;
    return offset ? `${city} (${offset})` : city;
  } catch { return city; }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function BookingRow({ booking, onAction, tenantTimezone, autoExpand }: { booking: Booking; onAction: () => void; tenantTimezone: string; autoExpand?: boolean }) {
  const [expanded, setExpanded] = useState(!!autoExpand);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Deep-linked here from a push notification tap — open and bring into view.
  useEffect(() => {
    if (autoExpand) rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [autoExpand]);

  const latestPayment = booking.payments.at(-1);

  const confirm = async () => {
    if (!latestPayment) return;
    setLoading(true);
    try {
      await adminApi.confirmBooking(booking.id, latestPayment.id);
      toast.success('Booking confirmed.');
      onAction();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not confirm booking.');
    } finally { setLoading(false); setExpanded(false); }
  };

  const reject = async () => {
    if (!latestPayment || !rejectReason.trim()) return;
    setLoading(true);
    try {
      await adminApi.rejectBooking(booking.id, latestPayment.id, rejectReason);
      toast.success('Booking rejected.');
      onAction();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reject booking.');
    } finally { setLoading(false); setExpanded(false); }
  };

  return (
    <div
      ref={rowRef}
      style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        border: autoExpand ? '1.5px solid var(--brand)' : '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{booking.customer.full_name}</span>
            <StatusBadge status={booking.status} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {booking.service?.name}
            <span style={{ margin: '0 6px', color: 'var(--border-2)' }}>·</span>
            {new Date(booking.slot_start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tenantTimezone || undefined })}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{formatAmount(booking.required_amount, booking.required_currency)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{booking.reference_code}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid var(--border)`, padding: '18px 18px 16px', background: 'var(--bg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Field label="Phone" value={booking.customer.phone} />
            <Field label="Email" value={booking.customer.email ?? '—'} />
            <Field label="Time slot" value={`${new Date(booking.slot_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tenantTimezone || undefined })} – ${new Date(booking.slot_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tenantTimezone || undefined })}`} />
            <Field label="Client notes" value={booking.client_notes ?? '—'} />
            {booking.rejection_reason && <Field label="Rejection reason" value={booking.rejection_reason} />}
          </div>

          {latestPayment && (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Payment proof</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <Field label="Amount" value={formatAmount(latestPayment.amount, latestPayment.currency)} />
                <Field label="Reference" value={latestPayment.client_reference ?? '—'} />
                <Field label="Method" value={latestPayment.payment_source?.label ?? '—'} />
                <Field label="Status" value={latestPayment.status} />
              </div>
              {latestPayment.proof_url && (
                <button
                  onClick={() => setProofUrl(latestPayment.proof_url!)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 13, color: 'var(--brand)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  View proof
                </button>
              )}

              {proofUrl && (
                <div
                  onClick={() => setProofUrl(null)}
                  style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                >
                  <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setProofUrl(null)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    <img
                      src={proofUrl}
                      alt="Payment proof"
                      style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 60px)', borderRadius: 12, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {booking.status === 'PENDING' && latestPayment && (
            <div className="booking-actions">
              <Input
                size="sm"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                aria-label="Rejection reason"
                placeholder="Rejection reason (required to reject)"
                maxLength={300}
                style={{ flex: 1 }}
              />
              <button
                onClick={confirm}
                disabled={loading}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--success-bg)', color: 'var(--success-fg)', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Confirm
              </button>
              <button
                onClick={reject}
                disabled={loading || !rejectReason.trim()}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: rejectReason.trim() ? 'var(--danger-bg)' : 'var(--neutral-bg)', color: rejectReason.trim() ? 'var(--danger-fg)' : 'var(--text-3)', fontWeight: 600, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed', fontSize: 13 }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense>
      <BookingsPageInner />
    </Suspense>
  );
}

function BookingsPageInner() {
  const searchParams = useSearchParams();
  const highlightRef = searchParams.get('ref');

  const [bookings, setBookings] = useState<Booking[]>([]);
  // A push notification tap needs to find its booking regardless of status,
  // so land on "All" rather than the default "Pending" filter when deep-linked.
  const [tab, setTab] = useState<BookingStatus | ''>(highlightRef ? '' : 'PENDING');
  const [loading, setLoading] = useState(true);
  const [subdomain, setSubdomain] = useState('');
  const [copied, setCopied] = useState(false);
  const [tenantTimezone, setTenantTimezone] = useState('');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try { setBookings(await adminApi.listBookings(tab || undefined)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not load bookings.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { setSubdomain(localStorage.getItem('subdomain') ?? ''); }, []);
  // Booking times are always shown in the tenant's own configured business
  // timezone, not the viewer's device timezone — otherwise a tenant reviewing
  // her own bookings from a device set to a different zone would see her own
  // 9am appointment appear at some other hour.
  useEffect(() => { adminApi.getTenantSettings().then(s => setTenantTimezone(s.timezone)).catch(() => {}); }, []);

  const publicUrl = `bookaata.app/book/${subdomain}`;
  const copy = () => {
    navigator.clipboard.writeText(`https://${publicUrl}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4, color: 'var(--text-1)' }}>Bookings</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Review payment proofs and manage appointments.
          {tenantTimezone && <> All times shown in <strong>{tzLabel(tenantTimezone)}</strong>.</>}
        </p>
      </div>

      {/* Public booking link */}
      {subdomain && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
          <a href={`https://${publicUrl}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>Open</a>
          <button onClick={copy} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: copied ? 'var(--success-bg)' : 'var(--bg)', color: copied ? 'var(--success-fg)' : 'var(--text-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        className="booking-tabs"
        style={{ marginBottom: 24 }}
      >
        {TABS.map(t => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 9,
                border: `1.5px solid ${active ? t.activeBorder : 'var(--border)'}`,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                background: active ? t.activeBg : 'var(--surface)',
                color: active ? t.activeColor : 'var(--text-2)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                boxShadow: active ? 'var(--shadow)' : 'var(--shadow-sm)',
                letterSpacing: '-0.1px',
              }}
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: active ? t.dot : 'var(--border-2)',
                flexShrink: 0,
                transition: 'background 0.15s',
              }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 14 }}>Loading…</div>
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <div style={{ fontSize: 14 }}>No bookings found</div>
          </div>
        ) : (
          bookings.map(b => <BookingRow key={b.id} booking={b} onAction={load} tenantTimezone={tenantTimezone} autoExpand={!!highlightRef && b.reference_code === highlightRef} />)
        )}
      </div>
    </DashboardShell>
  );
}
