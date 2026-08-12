'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { adminApi } from '@/lib/api';
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function BookingRow({ booking, onAction }: { booking: Booking; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const latestPayment = booking.payments.at(-1);

  const confirm = async () => {
    if (!latestPayment) return;
    setLoading(true);
    try { await adminApi.confirmBooking(booking.id, latestPayment.id); onAction(); }
    finally { setLoading(false); setExpanded(false); }
  };

  const reject = async () => {
    if (!latestPayment || !rejectReason.trim()) return;
    setLoading(true);
    try { await adminApi.rejectBooking(booking.id, latestPayment.id, rejectReason); onAction(); }
    finally { setLoading(false); setExpanded(false); }
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
            {new Date(booking.slot_start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
            <Field label="Time slot" value={`${new Date(booking.slot_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(booking.slot_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`} />
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
                <a href={latestPayment.proof_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 13, color: 'var(--brand)', fontWeight: 500 }}>
                  View proof
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              )}
            </div>
          )}

          {booking.status === 'PENDING' && latestPayment && (
            <div className="booking-actions">
              <input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Rejection reason (required to reject)"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)', outline: 'none', color: 'var(--text-1)' }}
              />
              <button
                onClick={confirm}
                disabled={loading}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--success-fg)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Confirm
              </button>
              <button
                onClick={reject}
                disabled={loading || !rejectReason.trim()}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: rejectReason.trim() ? 'var(--danger-fg)' : 'var(--neutral-bg)', color: rejectReason.trim() ? '#fff' : 'var(--text-3)', fontWeight: 600, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed', fontSize: 13 }}
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<BookingStatus | ''>('PENDING');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setBookings(await adminApi.listBookings(tab || undefined)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  return (
    <DashboardShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4, color: 'var(--text-1)' }}>Bookings</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Review payment proofs and manage appointments.</p>
      </div>

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
                padding: '18px 16px',
                borderRadius: 12,
                border: `2px solid ${active ? t.activeBorder : 'var(--border)'}`,
                fontSize: 15,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                background: active ? t.activeBg : 'var(--surface)',
                color: active ? t.activeColor : 'var(--text-2)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                boxShadow: active ? 'var(--shadow)' : 'var(--shadow-sm)',
                letterSpacing: '-0.2px',
              }}
            >
              <span style={{
                width: 10,
                height: 10,
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
          bookings.map(b => <BookingRow key={b.id} booking={b} onAction={load} />)
        )}
      </div>
    </DashboardShell>
  );
}
