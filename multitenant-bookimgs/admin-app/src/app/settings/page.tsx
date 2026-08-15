'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { useToast } from '@/components/ToastProvider';
import { adminApi } from '@/lib/api';
import { uploadToR2 } from '@/lib/upload';
import { Button, Card, FormField, Input, PageHeader, Select, Stack, Textarea } from '@/components/ui';
import type { TenantSettings, CountryOption, Brand } from '@/types';

function tzLabel(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  try {
    const offset = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value;
    return offset ? `${city} (${offset})` : city;
  } catch { return city; }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);

  // Profile form (brand)
  const [profileForm, setProfileForm] = useState({ name: '', description: '', terms_conditions: '', whatsapp_number: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Settings form (tenant)
  const [settingsForm, setSettingsForm] = useState({
    country: '', timezone: '',
    slot_hold_minutes: 20, booking_confirmation_sla_hours: 48,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([adminApi.getTenantSettings(), adminApi.listCountries(), adminApi.listBrands()])
      .then(([s, c, b]) => {
        setSettings(s);
        setCountries(c);
        const primary = b.find(br => br.is_primary) ?? b[0] ?? null;
        setBrand(primary);
        setLogoPreview(primary?.logo_url ?? null);
        setProfileForm({ name: primary?.name ?? s.name, description: primary?.description ?? '', terms_conditions: primary?.terms_conditions ?? '', whatsapp_number: primary?.whatsapp_number ?? '' });
        setSettingsForm({
          country: s.country_code,
          timezone: s.timezone,
          slot_hold_minutes: s.slot_hold_minutes,
          booking_confirmation_sla_hours: s.booking_confirmation_sla_hours,
        });
      })
      .catch(e => toast.error(e instanceof Error ? e.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const selectedCountry = countries.find(c => c.code === settingsForm.country);

  const handleCountryChange = (code: string) => {
    const country = countries.find(c => c.code === code);
    setSettingsForm(p => ({
      ...p,
      country: code,
      timezone: country && !country.timezones.includes(p.timezone) ? country.default_timezone : p.timezone,
    }));
  };

  const handlePickLogo = (file: File) => {
    setLogoFile(file);
    setLogoRemoved(false);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoRemoved(true);
    setLogoPreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Resolve logo URL
      let logo_url: string | null | undefined = undefined;
      if (logoFile) logo_url = await uploadToR2(logoFile, 'logos');
      else if (logoRemoved) logo_url = null;

      const brandData = {
        name: profileForm.name,
        description: profileForm.description || undefined,
        terms_conditions: profileForm.terms_conditions || undefined,
        whatsapp_number: profileForm.whatsapp_number.trim() || null,
        ...(logo_url !== undefined ? { logo_url } : {}),
      };

      const savedBrand = brand
        ? await adminApi.updateBrand(brand.id, brandData)
        : await adminApi.createBrand({ ...brandData, is_primary: true });
      setBrand(savedBrand);
      setLogoPreview(savedBrand.logo_url);
      setLogoFile(null);
      setLogoRemoved(false);

      const updated = await adminApi.updateTenantSettings({
        name: profileForm.name,
        country: settingsForm.country,
        timezone: settingsForm.timezone,
        slot_hold_minutes: settingsForm.slot_hold_minutes,
        booking_confirmation_sla_hours: settingsForm.booking_confirmation_sla_hours,
      });
      setSettings(updated);
      toast.success('Settings saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!settings) return;
    navigator.clipboard.writeText(`bookaata.app/book/${settings.subdomain}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = (profileForm.name || '?').slice(0, 2).toUpperCase();

  return (
    <DashboardShell>
      <PageHeader title="Settings" subtitle="Manage your profile, location, and booking rules." />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
      ) : settings && (
        <Stack gap={28} style={{ maxWidth: 560 }}>

          {/* ── Profile ─────────────────────────────────────────── */}
          <Card as="section" title="Profile" subtitle="Shown to customers on your public booking page.">

            {/* Logo avatar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
              <div
                onClick={() => logoInputRef.current?.click()}
                style={{ position: 'relative', width: 80, height: 80, borderRadius: 18, overflow: 'hidden', flexShrink: 0, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{initials}</span>}
                {/* hover overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePickLogo(f); e.target.value = ''; }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-1)' }}>Business logo</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>JPG, PNG or WebP. <br />Recommended 400×400px.</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Button size="sm" onClick={() => logoInputRef.current?.click()}>
                    {logoPreview ? 'Change' : 'Upload'}
                  </Button>
                  {logoPreview && (
                    <Button size="sm" variant="ghost" onClick={handleRemoveLogo} style={{ color: 'var(--danger-fg)' }}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Stack gap={16}>
              <FormField label="Display name">
                <Input
                  value={profileForm.name}
                  onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Glow Spa"
                />
              </FormField>
              <FormField label="Tagline" optional>
                <Textarea
                  value={profileForm.description}
                  onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="A short line about your business that customers see when they book"
                  rows={2}
                />
              </FormField>
              <FormField
                label="WhatsApp number"
                optional
                hint={'Include your country code. Shown as a “Message us” button on your public booking page.'}
              >
                <Input
                  type="tel"
                  value={profileForm.whatsapp_number}
                  onChange={e => setProfileForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                  placeholder="e.g. +1 555 000 0000"
                />
              </FormField>
              <FormField
                label="Terms & Conditions"
                optional
                hint={'Shown as a “T&C” button on your public booking page.'}
              >
                <Textarea
                  value={profileForm.terms_conditions}
                  onChange={e => setProfileForm(p => ({ ...p, terms_conditions: e.target.value }))}
                  placeholder="Enter your booking terms, cancellation policy, or anything customers should agree to before booking."
                  rows={6}
                  style={{ lineHeight: 1.6 }}
                />
              </FormField>
              <FormField label="Booking link">
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="ui-field" style={{ flex: 1, color: 'var(--text-2)', cursor: 'default', userSelect: 'all' }}>
                    bookaata.app/book/{settings.subdomain}
                  </div>
                  <Button size="sm" onClick={copyLink} style={{ color: copied ? 'var(--brand)' : undefined }}>
                    {copied ? '✓ Copied' : 'Copy link'}
                  </Button>
                </div>
              </FormField>
            </Stack>
          </Card>

          {/* ── Location & currency ──────────────────────────────── */}
          <Card as="section" title="Location & currency" subtitle="Your timezone controls when booking slots appear. Currency follows your country.">
            <Stack gap={16}>
              <FormField label="Country">
                <Select value={settingsForm.country} onChange={e => handleCountryChange(e.target.value)}>
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Timezone">
                <Select
                  value={settingsForm.timezone}
                  onChange={e => setSettingsForm(p => ({ ...p, timezone: e.target.value }))}
                  disabled={(selectedCountry?.timezones.length ?? 0) <= 1}
                >
                  {(selectedCountry?.timezones ?? [settingsForm.timezone]).map(tz => (
                    <option key={tz} value={tz}>{tzLabel(tz)}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Currency" hint="Set automatically from your country.">
                <Input value={selectedCountry?.currency ?? settings.default_currency} disabled style={{ width: 120 }} />
              </FormField>
            </Stack>
          </Card>

          {/* ── Booking rules ────────────────────────────────────── */}
          <Card as="section" title="Booking rules" subtitle="How long clients have to pay, and how long you have to confirm.">
            <div className="settings-rules-row">
              <FormField label="Slot hold time" hint="Time clients get to send their deposit." style={{ flex: 1 }}>
                <Input
                  type="number" min={5} max={240}
                  value={settingsForm.slot_hold_minutes || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => setSettingsForm(p => ({ ...p, slot_hold_minutes: +e.target.value }))}
                  suffix="min"
                />
              </FormField>
              <FormField label="Confirmation SLA" hint="Your target for reviewing payments." style={{ flex: 1 }}>
                <Input
                  type="number" min={1} max={168}
                  value={settingsForm.booking_confirmation_sla_hours || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => setSettingsForm(p => ({ ...p, booking_confirmation_sla_hours: +e.target.value }))}
                  suffix="hrs"
                />
              </FormField>
            </div>
          </Card>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={saving || profileForm.name.trim().length < 2}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>

        </Stack>
      )}
    </DashboardShell>
  );
}
