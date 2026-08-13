'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { useToast } from '@/components/ToastProvider';
import { adminApi } from '@/lib/api';
import { uploadToR2 } from '@/lib/upload';
import type { TenantSettings, CountryOption, Brand } from '@/types';

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 14,
  background: 'var(--surface)', outline: 'none',
  color: 'var(--text-1)',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)',
};

const section: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24,
};

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
  const [profileForm, setProfileForm] = useState({ name: '', description: '', terms_conditions: '' });
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
        setProfileForm({ name: primary?.name ?? s.name, description: primary?.description ?? '', terms_conditions: primary?.terms_conditions ?? '' });
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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Manage your profile, location, and booking rules.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
      ) : settings && (
        <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Profile ─────────────────────────────────────────── */}
          <section style={section}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Profile</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              Shown to customers on your public booking page.
            </p>

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
                  <button onClick={() => logoInputRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-1)' }}>
                    {logoPreview ? 'Change' : 'Upload'}
                  </button>
                  {logoPreview && (
                    <button onClick={handleRemoveLogo} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--danger-fg)' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Display name</label>
                <input
                  value={profileForm.name}
                  onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Glow Spa"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Tagline <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
                <textarea
                  value={profileForm.description}
                  onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="A short line about your business that customers see when they book"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
              <div>
                <label style={lbl}>Terms & Conditions <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
                <textarea
                  value={profileForm.terms_conditions}
                  onChange={e => setProfileForm(p => ({ ...p, terms_conditions: e.target.value }))}
                  placeholder="Enter your booking terms, cancellation policy, or anything customers should agree to before booking."
                  rows={6}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                />
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>Shown as a "T&C" button on your public booking page.</p>
              </div>
              <div>
                <label style={lbl}>Booking link</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ ...inp, flex: 1, color: 'var(--text-2)', background: 'var(--surface-2, var(--surface))', cursor: 'default', userSelect: 'all' }}>
                    bookaata.app/book/{settings.subdomain}
                  </div>
                  <button
                    onClick={copyLink}
                    style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: copied ? 'var(--brand)' : 'var(--text-1)', whiteSpace: 'nowrap' }}
                  >
                    {copied ? '✓ Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Location & currency ──────────────────────────────── */}
          <section style={section}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Location & currency</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 18 }}>
              Your timezone controls when booking slots appear. Currency follows your country.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Country</label>
                <select value={settingsForm.country} onChange={e => handleCountryChange(e.target.value)} style={inp}>
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Timezone</label>
                <select
                  value={settingsForm.timezone}
                  onChange={e => setSettingsForm(p => ({ ...p, timezone: e.target.value }))}
                  disabled={(selectedCountry?.timezones.length ?? 0) <= 1}
                  style={{ ...inp, opacity: (selectedCountry?.timezones.length ?? 0) <= 1 ? 0.7 : 1 }}
                >
                  {(selectedCountry?.timezones ?? [settingsForm.timezone]).map(tz => (
                    <option key={tz} value={tz}>{tzLabel(tz)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Currency</label>
                <input value={selectedCountry?.currency ?? settings.default_currency} disabled style={{ ...inp, opacity: 0.7, cursor: 'not-allowed', width: 120 }} />
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>Set automatically from your country.</p>
              </div>
            </div>
          </section>

          {/* ── Booking rules ────────────────────────────────────── */}
          <section style={section}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Booking rules</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 18 }}>
              How long clients have to pay, and how long you have to confirm.
            </p>
            <div className="settings-rules-row">
              <div style={{ flex: 1 }}>
                <label style={lbl}>Slot hold time</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min={5} max={240}
                    value={settingsForm.slot_hold_minutes || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => setSettingsForm(p => ({ ...p, slot_hold_minutes: +e.target.value }))}
                    style={{ ...inp, paddingRight: 44 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-3)', pointerEvents: 'none' }}>min</span>
                </div>
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>Time clients get to send their deposit.</p>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Confirmation SLA</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min={1} max={168}
                    value={settingsForm.booking_confirmation_sla_hours || ''}
                    onFocus={e => e.target.select()}
                    onChange={e => setSettingsForm(p => ({ ...p, booking_confirmation_sla_hours: +e.target.value }))}
                    style={{ ...inp, paddingRight: 44 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-3)', pointerEvents: 'none' }}>hrs</span>
                </div>
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>Your target for reviewing payments.</p>
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSave}
              disabled={saving || profileForm.name.trim().length < 2}
              style={{
                padding: '11px 28px', borderRadius: 8, border: 'none',
                background: saving || profileForm.name.trim().length < 2 ? 'var(--border-2, #e5e7eb)' : 'var(--brand)',
                color: saving || profileForm.name.trim().length < 2 ? 'var(--text-3)' : '#fff',
                fontSize: 14, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

        </div>
      )}
    </DashboardShell>
  );
}
