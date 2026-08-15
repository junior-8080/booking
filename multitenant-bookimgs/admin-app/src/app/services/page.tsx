'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/ToastProvider';
import { adminApi } from '@/lib/api';
import { uploadToR2 } from '@/lib/upload';
import { Button, FormField, Input, Label, PageHeader, Stack, Textarea } from '@/components/ui';
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [showInactive, setShowInactive] = useState(false);
  const toast = useToast();

  const load = async () => {
    const [s, b, settings] = await Promise.all([adminApi.listServices(), adminApi.listBrands(), adminApi.getTenantSettings()]);
    setServices(s as Service[]);
    const brands = b as Brand[];
    const primary = brands.find(br => br.is_primary) ?? brands[0] ?? null;
    setPrimaryBrand(primary);
    setDefaultCurrency((settings as { default_currency: string }).default_currency);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, brand_id: primaryBrand?.id ?? '', price_currency: defaultCurrency });
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
      deposit_value: svc.deposit_type === 'FIXED' ? svc.deposit_value / 100 : svc.deposit_value,
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
        deposit_value: form.deposit_type === 'FIXED' ? Math.round(form.deposit_value * 100) : form.deposit_value,
      };
      if (editing) await adminApi.updateService(editing, payload);
      else await adminApi.createService(payload);
      setShowForm(false);
      toast.success(editing ? 'Service updated.' : 'Service created.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteService(id);
      setShowForm(false);
      setConfirmDeleteId(null);
      toast.success('Service deleted.');
      load();
    } catch (err) {
      setConfirmDeleteId(null);
      toast.error(err instanceof Error ? err.message : 'Could not delete service. Please try again.');
    }
  };

  const s = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const inactiveCount = services.filter(svc => !svc.is_active).length;
  const visibleServices = services.filter(svc => showInactive || svc.is_active);

  return (
    <DashboardShell>
      {/* Header */}
      <PageHeader
        title="Services"
        subtitle="Manage your bookable services and pricing."
        action={!showForm && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {inactiveCount > 0 && (
              <Button
                onClick={() => setShowInactive(v => !v)}
                aria-pressed={showInactive}
                style={showInactive ? { background: 'var(--bg-subtle)' } : undefined}
              >
                {showInactive ? 'Hide inactive' : `Show inactive (${inactiveCount})`}
              </Button>
            )}
            <Button variant="soft" onClick={openCreate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New service
            </Button>
          </div>
        )}
      />

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Form header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{editing ? 'Edit service' : 'New service'}</div>
              {primaryBrand && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{primaryBrand.name}</div>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
              style={{ background: 'var(--bg-subtle)', padding: 8 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </Button>
          </div>

          <Stack as="form" gap={22} onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>

            {/* Basics */}
            <Stack>
              <FormField label="Service name">
                <Input
                  value={form.name}
                  onChange={e => s('name', e.target.value)}
                  required
                  inset
                  style={{ fontSize: 15, fontWeight: 500 }}
                  placeholder="e.g. Full Set Acrylic"
                />
              </FormField>
              <FormField label="Description" optional>
                <Textarea
                  value={form.description}
                  onChange={e => s('description', e.target.value)}
                  rows={2}
                  inset
                  fixed
                  placeholder="Short description shown to clients"
                />
              </FormField>
              <div>
                <Label optional>Photo</Label>
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
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                {imagePreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setImageFile(null); setImagePreview(''); s('image_url', ''); }}
                    style={{ marginTop: 6, padding: 0, fontSize: 12, color: 'var(--danger-fg)' }}
                  >
                    Remove photo
                  </Button>
                )}
              </div>
            </Stack>

            <Divider />

            {/* Duration & Price */}
            <div className="grid-2">
              <FormField label="Duration">
                <Input
                  type="number"
                  min={1}
                  value={form.duration_minutes || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => s('duration_minutes', +e.target.value)}
                  required
                  inset
                  suffix="min"
                />
              </FormField>
              <div>
                <Label htmlFor="service-price">Price</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    id="service-price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price_amount || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => s('price_amount', +e.target.value)}
                    required
                    inset
                    style={{ flex: 1 }}
                    placeholder="0.00"
                  />
                  <Input
                    value={form.price_currency}
                    onChange={e => s('price_currency', e.target.value.toUpperCase())}
                    maxLength={3}
                    inset
                    aria-label="Currency"
                    style={{ width: 64, textAlign: 'center', fontWeight: 700, fontSize: 13, padding: '10px 8px' }}
                    placeholder="USD"
                  />
                </div>
              </div>
            </div>

            <Divider />

            {/* Deposit */}
            <Stack>
              <div role="group" aria-labelledby="deposit-type-label">
                <Label id="deposit-type-label">Deposit type</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['PERCENTAGE', 'FIXED'] as const).map(type => (
                    <Button
                      key={type}
                      variant={form.deposit_type === type ? 'soft' : 'secondary'}
                      size="sm"
                      aria-pressed={form.deposit_type === type}
                      onClick={() => setForm(p => ({
                        ...p,
                        deposit_type: type,
                        deposit_value: p.deposit_type !== type ? (type === 'PERCENTAGE' ? 30 : 0) : p.deposit_value,
                      }))}
                      style={{ flex: 1, fontWeight: 600, ...(form.deposit_type === type ? {} : { background: 'var(--bg)', color: 'var(--text-2)' }) }}
                    >
                      {type === 'PERCENTAGE' ? '% of price' : 'Fixed amount'}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <FormField label={form.deposit_type === 'PERCENTAGE' ? 'Deposit percentage' : `Deposit amount (${form.price_currency})`}>
                  <Input
                    type="number"
                    min={form.deposit_type === 'PERCENTAGE' ? 1 : 0}
                    max={form.deposit_type === 'PERCENTAGE' ? 100 : undefined}
                    value={form.deposit_value || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => s('deposit_value', +e.target.value)}
                    required
                    inset
                    suffix={form.deposit_type === 'PERCENTAGE' ? '%' : form.price_currency}
                  />
                </FormField>
                {form.price_amount > 0 && form.deposit_value > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                    {'Client pays '}
                    <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                      {form.deposit_type === 'PERCENTAGE'
                        ? formatAmount(Math.round(form.price_amount * 100 * form.deposit_value / 100), form.price_currency)
                        : formatAmount(Math.round(form.deposit_value * 100), form.price_currency)}
                    </span>
                    {' as deposit'}
                  </div>
                )}
              </div>
            </Stack>

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
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              {editing ? (
                <Button variant="danger" onClick={() => setConfirmDeleteId(editing)}>
                  Delete service
                </Button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" variant="soft" disabled={loading}>
                  {loading ? 'Saving…' : editing ? 'Save changes' : 'Create service'}
                </Button>
              </div>
            </div>
          </Stack>
        </div>
      )}

      {/* Service grid */}
      {visibleServices.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-3)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 14px', display: 'block', opacity: 0.35 }}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{services.length === 0 ? 'No services yet' : 'No active services'}</div>
          <div style={{ fontSize: 13 }}>{services.length === 0 ? 'Add your first service to start accepting bookings.' : 'All your services are currently inactive.'}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {visibleServices.map(svc => (
          <button
            key={svc.id}
            onClick={() => openEdit(svc)}
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              position: 'relative',
              height: 210,
              background: svc.image_url
                ? `url(${svc.image_url}) center/cover no-repeat`
                : `linear-gradient(135deg, var(--brand-tint) 0%, var(--brand) 100%)`,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              cursor: 'pointer',
              padding: 0,
              display: 'block',
              width: '100%',
              textAlign: 'left',
            }}
          >
            {/* Gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)' }} />

            {/* Inactive badge */}
            {!svc.is_active && (
              <div style={{ position: 'absolute', top: 10, left: 10 }}>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)', fontWeight: 500, backdropFilter: 'blur(4px)' }}>
                  Inactive
                </span>
              </div>
            )}

            {/* Bottom labels */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 14px 13px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4, letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span>{svc.duration_minutes} min</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{formatAmount(svc.price_amount, svc.price_currency)}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{svc.deposit_type === 'PERCENTAGE' ? `${svc.deposit_value}% deposit` : `${formatAmount(svc.deposit_value, svc.price_currency)} deposit`}</span>
              </div>
              {svc.description && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Delete service?"
        message='This service will be hidden from your booking page and marked inactive. Existing bookings are not affected — you can restore it later from "Show inactive".'
        confirmLabel="Delete service"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </DashboardShell>
  );
}
