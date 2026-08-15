'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/ToastProvider';
import { adminApi } from '@/lib/api';
import { Badge, Button, Card, EmptyState, FormField, Input, PageHeader, Select, Stack, Textarea } from '@/components/ui';
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

export default function PaymentSourcesPage() {
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const toast = useToast();

  const load = async () => {
    try { setSources(await adminApi.listPaymentSources()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not load payment sources.'); }
  };
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
      setShowForm(false);
      toast.success(editing ? 'Payment source updated.' : 'Payment source added.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleToggle = async (ps: PaymentSource) => {
    try {
      await adminApi.togglePaymentSource(ps.id);
      toast.success(ps.is_active ? 'Payment source disabled.' : 'Payment source enabled.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update payment source.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deletePaymentSource(id);
      toast.success('Payment source deleted.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete payment source.');
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Payment Sources"
        subtitle="Configure how clients pay their deposit."
        action={
          <Button variant="soft" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add source
          </Button>
        }
      />

      {showForm && (
        <Card raised style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{editing ? 'Edit payment source' : 'New payment source'}</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} aria-label="Close form" style={{ padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </Button>
          </div>
          <Stack as="form" onSubmit={handleSubmit}>
            <div className="grid-2">
              <FormField label="Type">
                <Select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, details: {} }))}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
                </Select>
              </FormField>
              <FormField label="Label">
                <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} required placeholder="e.g. MTN MoMo — Main" />
              </FormField>
            </div>

            {detailFields.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Details shown to client</div>
                <div className="grid-2">
                  {detailFields.map(f => (
                    <FormField key={f} label={f.replace(/_/g, ' ')}>
                      <Input value={form.details[f] ?? ''} onChange={e => setForm(p => ({ ...p, details: { ...p.details, [f]: e.target.value } }))} placeholder={f} />
                    </FormField>
                  ))}
                </div>
              </div>
            )}

            <FormField label="Client instructions" optional>
              <Textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} rows={2} fixed placeholder="e.g. Include your booking code in the transfer note" />
            </FormField>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <Button onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving…' : editing ? 'Save changes' : 'Add source'}
              </Button>
            </div>
          </Stack>
        </Card>
      )}

      <Stack gap={6}>
        {sources.length === 0 && !showForm && (
          <EmptyState
            icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
            message="No payment sources configured yet."
          />
        )}
        {sources.map(ps => (
          <Card key={ps.id} tight style={{ display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{ps.label}</span>
                <Badge>{TYPE_LABELS[ps.type] ?? ps.type}</Badge>
                {!ps.is_active && <Badge tone="danger">Inactive</Badge>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {Object.entries(ps.details).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ') || 'No details'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" onClick={() => handleToggle(ps)}>{ps.is_active ? 'Disable' : 'Enable'}</Button>
              <Button size="sm" onClick={() => openEdit(ps)}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(ps.id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </Stack>

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Delete payment source?"
        message="This payment source will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteId) handleDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </DashboardShell>
  );
}
