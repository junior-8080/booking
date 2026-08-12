'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { uploadToR2 } from '@/lib/upload';
import type { CountryOption } from '@/types';

function tzLabel(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  try {
    const offset = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return city;
  }
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 48);
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 14,
  background: 'var(--surface)', outline: 'none',
  color: 'var(--text-1)',
};

const STEPS = [
  { title: 'Business', desc: 'Tell us about your business' },
  { title: 'Owner', desc: 'Your contact details' },
  { title: 'Access', desc: 'Create your account' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    business_name: '', description: '', logo_url: '',
    country: 'US', timezone: 'America/New_York',
    owner_name: '', owner_phone: '',
    email: '', password: '',
  });
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const subdomain = slugify(form.business_name);

  useEffect(() => {
    adminApi.listCountries().then(setCountries).catch(() => {});
  }, []);

  const selectedCountry = countries.find(c => c.code === form.country);

  const handleCountryChange = (code: string) => {
    const country = countries.find(c => c.code === code);
    setForm(p => ({
      ...p,
      country: code,
      timezone: country?.default_timezone ?? p.timezone,
    }));
  };

  const nextStep = (e: React.FormEvent) => { e.preventDefault(); setError(''); setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let logo_url = form.logo_url;
      if (logoFile) {
        logo_url = await uploadToR2(logoFile, 'logos');
      }
      const res = await adminApi.register({
        business_name: form.business_name,
        owner_name: form.owner_name,
        owner_phone: form.owner_phone,
        email: form.email,
        password: form.password,
        country: form.country,
        timezone: form.timezone,
        ...(form.description ? { description: form.description } : {}),
        ...(logo_url ? { logo_url } : {}),
      });
      if (!res.success) throw new Error(res.error ?? 'Registration failed');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('subdomain', res.data.subdomain);
      localStorage.setItem('email', form.email);
      router.push('/bookings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <style>{`
        @media (max-width: 860px) { .ob-panel { display: none !important; } }
        @media (max-width: 860px) { .ob-mobile-header { display: flex !important; } }
        @media (max-width: 640px) { .ob-form-wrap { padding: 24px 16px !important; } }
        @media (max-width: 520px) { .ob-tz-row { flex-direction: column !important; } }
      `}</style>
      {/* Left info panel */}
      <div style={{ width: 380, background: 'var(--brand)', padding: '48px 40px', display: 'flex', flexDirection: 'column' }} className="ob-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }} className="ob-logo">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Bk</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>BookImgs</span>
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: 16 }}>
            Your booking page, live in minutes.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.7, marginBottom: 40 }}>
            No payment gateway. No technical setup. Clients pay you directly — you confirm.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i === step ? '#fff' : i < step ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                }}>
                  {i < step
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    : <span style={{ fontSize: 12, fontWeight: 700, color: i === step ? 'var(--brand)' : 'rgba(255,255,255,0.5)' }}>{i + 1}</span>
                  }
                </div>
                <div>
                  <div style={{ color: i <= step ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }} className="ob-form-wrap">
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile-only brand + step indicator */}
          <div className="ob-mobile-header" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>Bk</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>BookImgs</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: 24, height: 4, borderRadius: 2, background: i <= step ? 'var(--brand)' : 'var(--border-2)' }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-1)', marginBottom: 4 }}>{STEPS[step]!.title}</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>{STEPS[step]!.desc}</p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-bg)', color: 'var(--danger-fg)', fontSize: 13, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={step < 2 ? nextStep : handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {step === 0 && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Business name <span style={{ color: 'var(--danger-fg)' }}>*</span></label>
                  <input value={form.business_name} onChange={e => set('business_name', e.target.value)} required minLength={2} placeholder="e.g. Glow Spa" style={inp} />
                  {subdomain && (
                    <p style={{ marginTop: 7, fontSize: 12, color: 'var(--text-3)' }}>
                      Booking link:{' '}
                      <span style={{ color: 'var(--brand)', fontWeight: 600 }}>bookaata.app/book/{subdomain}</span>
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }} className="ob-tz-row">
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Country <span style={{ color: 'var(--danger-fg)' }}>*</span></label>
                    <select value={form.country} onChange={e => handleCountryChange(e.target.value)} required style={inp}>
                      {countries.length === 0 && <option value="US">United States</option>}
                      {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Timezone</label>
                    <select
                      value={form.timezone}
                      onChange={e => set('timezone', e.target.value)}
                      disabled={(selectedCountry?.timezones.length ?? 0) <= 1}
                      style={{ ...inp, opacity: (selectedCountry?.timezones.length ?? 0) <= 1 ? 0.7 : 1 }}
                    >
                      {(selectedCountry?.timezones ?? [form.timezone]).map(tz => (
                        <option key={tz} value={tz}>{tzLabel(tz)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedCountry && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -8 }}>
                    Prices will be in <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{selectedCountry.currency}</span>. You can change country later in Settings.
                  </p>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Description <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What services do you offer?" rows={3} style={{ ...inp, resize: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>
                    Logo <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, border: '1.5px dashed var(--border-2)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>
                        {logoFile ? logoFile.name : 'Upload logo'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>JPEG, PNG, or WebP · max 5 MB</div>
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleLogoChange} style={{ display: 'none' }} />
                  </label>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Your full name <span style={{ color: 'var(--danger-fg)' }}>*</span></label>
                  <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} required minLength={2} placeholder="Your name" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Phone number <span style={{ color: 'var(--danger-fg)' }}>*</span></label>
                  <input type="tel" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} required minLength={6} placeholder="+1 555 000 0000" style={inp} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Email address <span style={{ color: 'var(--danger-fg)' }}>*</span></label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="you@example.com" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-1)' }}>Password <span style={{ color: 'var(--danger-fg)' }}>*</span></label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} placeholder="Min. 8 characters" style={inp} />
                  <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>Use at least 8 characters.</p>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: 'var(--text-1)' }}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, padding: '11px', borderRadius: 8, border: 'none',
                  background: loading ? 'var(--border-2)' : 'var(--brand)',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Creating your page…' : step < 2 ? 'Continue' : 'Create booking page'}
              </button>
            </div>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
