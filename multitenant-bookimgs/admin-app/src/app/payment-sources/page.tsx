'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { adminApi } from '@/lib/api';
import type { PaymentSource } from '@/types';

const TYPES = ['MOBILE_MONEY', 'BANK_TRANSFER', 'ZELLE', 'VENMO', 'CASH_APP', 'PAYPAL', 'CASH', 'OTHER'];
const TYPE_LABELS: Record<string, string> = {
  MOBILE_MONEY: 'Mobile Money', BANK_TRANSFER: 'Bank Transfer', ZELLE: 'Zelle',
  VENMO: 'Venmo', CASH_APP: 'Cash App', PAYPAL: 'PayPal', CASH: 'Cash', OTHER: 'Other',
};
const TYPE_DETAIL_FIELDS: Record<string, string[]> = {
  MOBILE_MONEY: ['network', 'number', 'account_name'],
  BANK_TRANSFER: ['bank_name', 'account_name', 'account_number', 'routing_number'],
  ZELLE: ['email_or_phone', 'account_name'],
  VENMO: ['handle'], CASH_APP: ['cashtag'], PAYPAL: ['email'], CASH: [], OTHER: ['description'],
};

const EMPTY_FORM = { type: 'MOBILE_MONEY', label: '', instructions: '', details: {} as Record<string, string> };

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', outline: 'none', color: 'var(--text-1)' };

export default function PaymentSourcesPage() {
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => setSources(await adminApi.listPaymentSources());
  useEffect(() => { load(); }, []);

  const detailFields = TYPE_DETAIL_FIELDS[form.type] ?? [];

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };
  const openEdit = (ps: PaymentSource) => {
    setForm({ type: ps.type, label: ps.label, instructions: ps.instructions ?? '', details: Object.fromEntries(Object.entries(ps.details).map(([k, v]) => [k, String(v)])) });
    setEditing(ps.id); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editing) await adminApi.updatePaymentSource(editing, form);
      else await adminApi.createPaymentSource(form);
      setShowForm(false); load();
    } finally { setLoading(false); }
  };

  return (
    <DashboardShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Payment Sources</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Configure how clients pay their deposit.</p>
        </div>
        <button
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add source
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border)', marginBottom: 20, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{editing ? 'Edit payment source' : 'New payment source'}</h2>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, details: {} }))} style={inp}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Label</label>
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} required placeholder="e.g. MTN MoMo — Main" style={inp} />
              </div>
            </div>

            {detailFields.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Details shown to client</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {detailFields.map(f => (
                    <div key={f}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5, color: 'var(--text-1)' }}>{f.replace(/_/g, ' ')}</label>
                      <input value={form.details[f] ?? ''} onChange={e => setForm(p => ({ ...p, details: { ...p.details, [f]: e.target.value } }))} style={inp} placeholder={f} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>
                Client instructions <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} rows={2} style={{ ...inp, resize: 'none' }} placeholder="e.g. Include your booking code in the transfer note" />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Cancel</button>
              <button type="submit" disabled={loading} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                {loading ? 'Saving…' : editing ? 'Save changes' : 'Add source'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sources.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            <div style={{ fontSize: 14 }}>No payment sources configured yet.</div>
          </div>
        )}
        {sources.map(ps => (
          <div key={ps.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{ps.label}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--neutral-bg)', color: 'var(--neutral-fg)', fontWeight: 500 }}>{TYPE_LABELS[ps.type] ?? ps.type}</span>
                {!ps.is_active && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--danger-bg)', color: 'var(--danger-fg)', fontWeight: 500 }}>Inactive</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {Object.entries(ps.details).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ') || 'No details'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => adminApi.togglePaymentSource(ps.id).then(load)} style={{ padding: '7px 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                {ps.is_active ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => openEdit(ps)} style={{ padding: '7px 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Edit</button>
              <button onClick={() => { if (confirm('Delete this payment source?')) adminApi.deletePaymentSource(ps.id).then(load); }} style={{ padding: '7px 13px', borderRadius: 7, border: 'none', background: 'var(--danger-bg)', color: 'var(--danger-fg)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
