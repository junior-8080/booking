'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { adminApi } from '@/lib/api';
import type { Customer, Booking } from '@/types';
import { formatAmount } from '@/types';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:  { bg: 'var(--warning-bg)', color: 'var(--warning-fg)', label: 'Pending' },
  BOOKED:   { bg: 'var(--success-bg)', color: 'var(--success-fg)', label: 'Booked' },
  REJECTED: { bg: 'var(--danger-bg)',  color: 'var(--danger-fg)',  label: 'Rejected' },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Booking[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const load = async (q?: string) => setCustomers(await adminApi.listCustomers(q));
  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => load(e.target.value), 380);
  };

  const viewHistory = async (c: Customer) => {
    setSelected(c); setHistLoading(true);
    try { setHistory(await adminApi.getCustomerHistory(c.id) as Booking[]); }
    finally { setHistLoading(false); }
  };

  const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <DashboardShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Customers</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Search and view booking history per customer.</p>
      </div>

      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search by name, phone, or email…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', outline: 'none', color: 'var(--text-1)' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: 16 }}>
        {/* Customer list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {customers.length === 0 && (
            <p style={{ color: 'var(--text-3)', fontSize: 14, padding: '32px 0', textAlign: 'center' }}>No customers found.</p>
          )}
          {customers.map(c => (
            <button
              key={c.id}
              onClick={() => viewHistory(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                width: '100%', padding: '12px 14px', borderRadius: 'var(--radius)',
                border: `1px solid ${selected?.id === c.id ? 'var(--brand)' : 'var(--border)'}`,
                background: selected?.id === c.id ? 'var(--brand-light)' : 'var(--surface)',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: selected?.id === c.id ? 'var(--brand)' : 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: selected?.id === c.id ? '#fff' : 'var(--text-2)' }}>{initials(c.full_name)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)', marginBottom: 2 }}>{c.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.phone}{c.email ? ` · ${c.email}` : ''}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          ))}
        </div>

        {/* History panel */}
        {selected && (
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{selected.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{selected.phone}{selected.email ? ` · ${selected.email}` : ''}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
            {histLoading ? (
              <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading…</p>
            ) : history.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No bookings yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(b => {
                  const st = STATUS_STYLE[b.status] ?? STATUS_STYLE['REJECTED']!;
                  return (
                    <div key={b.id} style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{b.service?.name}</div>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 500 }}>{st.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                        {new Date(b.slot_start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)' }}>{b.reference_code}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>{formatAmount(b.required_amount, b.required_currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
