'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { adminApi } from '@/lib/api';
import { uploadToR2 } from '@/lib/upload';
import type { Service, Brand } from '@/types';
import { formatAmount } from '@/types';

const EMPTY_FORM = {
  brand_id: '',
  name: '',
  description: '',
  image_url: '',
  duration_minutes: 30,
  price_amount: 0,
  price_currency: 'USD',
  deposit_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  deposit_value: 30,
  is_active: true,
};

const inp: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  fontSize: 14,
  background: 'var(--bg)',
  outline: 'none',
  color: 'var(--text-1)',
  boxSizing: 'border-box',
};

function Label({ children, opt }: { children: React.ReactNode; opt?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}
      {opt && <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', marginLeft: 4 }}>optional</span>}
    </label>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>;
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [primaryBrand, setPrimaryBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const load = async () => {
    const [s, b] = await Promise.all([adminApi.listServices(), adminApi.listBrands()]);
    setServices(s as Service[]);
    const brands = b as Brand[];
    const primary = brands.find(br => br.is_primary) ?? brands[0] ?? null;
    setPrimaryBrand(primary);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, brand_id: primaryBrand?.id ?? '' });
    setEditing(null);
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (svc: Service) => {
    setForm({
      brand_id: svc.brand_id,
      name: svc.name,
      description: svc.description ?? '',
      image_url: svc.image_url ?? '',
      duration_minutes: svc.duration_minutes,
      price_amount: svc.price_amount / 100,
      price_currency: svc.price_currency,
      deposit_type: svc.deposit_type,
      deposit_value: svc.deposit_value,
      is_active: svc.is_active,
    });
    setEditing(svc.id);
    setImageFile(null);
    setImagePreview(svc.image_url ?? '');
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let image_url = form.image_url;
      if (imageFile) {
        image_url = await uploadToR2(imageFile, 'services');
      }
      const payload = {
        ...form,
        image_url: image_url || null,
        price_amount: Math.round(form.price_amount * 100),
      };
      if (editing) await adminApi.updateService(editing, payload);
      else await adminApi.createService(payload);
      setShowForm(false);
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this service?')) return;
    await adminApi.deleteService(id);
    load();
  };

  const s = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <DashboardShell>
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4, color: 'var(--text-1)' }}>Services</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Manage your bookable services and pricing.</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New service
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Form header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{editing ? 'Edit service' : 'New service'}</div>
              {primaryBrand && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{primaryBrand.name}</div>}
            </div>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Basics */}
            <Section>
              <div>
                <Label>Service name</Label>
                <input
                  value={form.name}
                  onChange={e => s('name', e.target.value)}
                  required
                  style={{ ...inp, fontSize: 15, fontWeight: 500 }}
                  placeholder="e.g. Full Set Acrylic"
                />
              </div>
              <div>
                <Label opt>Description</Label>
                <textarea
                  value={form.description}
                  onChange={e => s('description', e.target.value)}
                  rows={2}
                  style={{ ...inp, resize: 'none', lineHeight: 1.5 }}
                  placeholder="Short description shown to clients"
                />
              </div>
              <div>
                <Label opt>Photo</Label>
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <div style={{
                    height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative',
                    border: imagePreview ? '1px solid var(--border)' : '1.5px dashed var(--border-2)',
                    background: imagePreview ? `url(${imagePreview}) center/cover no-repeat` : 'var(--bg-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {imagePreview ? (
                      <span style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
                        Change photo
                      </span>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 5px', display: 'block' }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>Add a photo — shown on your booking page</div>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(''); s('image_url', ''); }}
                    style={{ marginTop: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--danger-fg)', fontWeight: 500, padding: 0 }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </Section>

            <Divider />

            {/* Duration & Price */}
            <div className="grid-2">
              <div>
                <Label>Duration</Label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onFocus={e => e.target.select()}
                    onChange={e => s('duration_minutes', +e.target.value)}
                    required
                    style={{ ...inp, paddingRight: 48 }}
                  />
                  <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-3)', pointerEvents: 'none', fontWeight: 500 }}>min</span>
                </div>
              </div>
              <div>
                <Label>Price</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price_amount}
                    onFocus={e => e.target.select()}
                    onChange={e => s('price_amount', +e.target.value)}
                    required
                    style={{ ...inp, flex: 1 }}
                    placeholder="0.00"
                  />
                  <input
                    value={form.price_currency}
                    onChange={e => s('price_currency', e.target.value.toUpperCase())}
                    maxLength={3}
                    style={{ ...inp, width: 64, textAlign: 'center', fontWeight: 700, fontSize: 13, padding: '10px 8px' }}
                    placeholder="USD"
                  />
                </div>
              </div>
            </div>

            <Divider />

            {/* Deposit */}
            <Section>
              <div>
                <Label>Deposit type</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['PERCENTAGE', 'FIXED'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => s('deposit_type', type)}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 9,
                        border: `1.5px solid ${form.deposit_type === type ? 'var(--brand)' : 'var(--border)'}`,
                        background: form.deposit_type === type ? 'var(--brand-subtle, color-mix(in srgb, var(--brand) 10%, transparent))' : 'var(--bg)',
                        color: form.deposit_type === type ? 'var(--brand)' : 'var(--text-2)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {type === 'PERCENTAGE' ? '% of price' : 'Fixed amount'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>{form.deposit_type === 'PERCENTAGE' ? 'Deposit percentage' : `Deposit amount (${form.price_currency})`}</Label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={form.deposit_type === 'PERCENTAGE' ? 1 : 0}
                    max={form.deposit_type === 'PERCENTAGE' ? 100 : undefined}
                    value={form.deposit_value}
                    onFocus={e => e.target.select()}
                    onChange={e => s('deposit_value', +e.target.value)}
                    required
                    style={{ ...inp, paddingRight: 44 }}
                  />
                  <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-3)', pointerEvents: 'none', fontWeight: 600 }}>
                    {form.deposit_type === 'PERCENTAGE' ? '%' : form.price_currency}
                  </span>
                </div>
              </div>
            </Section>

            {/* Active toggle (edit only) */}
            {editing && (
              <>
                <Divider />
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div
                    onClick={() => s('is_active', !form.is_active)}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: form.is_active ? 'var(--brand)' : 'var(--border)',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 3,
                      left: form.is_active ? 21 : 3,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>
                    {form.is_active ? 'Active — visible to clients' : 'Inactive — hidden from booking'}
                  </span>
                </label>
              </>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Saving…' : editing ? 'Save changes' : 'Create service'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Service list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {services.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-3)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 14px', display: 'block', opacity: 0.35 }}>
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No services yet</div>
            <div style={{ fontSize: 13 }}>Add your first service to start accepting bookings.</div>
          </div>
        )}

        {services.map(svc => (
          <div
            key={svc.id}
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              borderLeft: `3px solid ${svc.is_active ? 'var(--brand)' : 'var(--border)'}`,
            }}
            className="service-item"
          >
            {svc.image_url && (
              <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: `url(${svc.image_url}) center/cover no-repeat`, border: '1px solid var(--border)' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>{svc.name}</span>
                {!svc.is_active && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--neutral-bg)', color: 'var(--neutral-fg)', fontWeight: 500 }}>Inactive</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{svc.duration_minutes} min</span>
                <span style={{ color: 'var(--border-2)' }}>·</span>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{formatAmount(svc.price_amount, svc.price_currency)}</span>
                <span style={{ color: 'var(--border-2)' }}>·</span>
                <span>Deposit: {svc.deposit_type === 'PERCENTAGE' ? `${svc.deposit_value}%` : formatAmount(svc.deposit_value, svc.price_currency)}</span>
              </div>
              {svc.description && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.description}</div>
              )}
            </div>
            <div className="service-item-actions">
              <button
                onClick={() => openEdit(svc)}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(svc.id)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--danger-bg)', color: 'var(--danger-fg)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
