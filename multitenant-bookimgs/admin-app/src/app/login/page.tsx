'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { Button, FormField, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Verify the token is still valid before redirecting
    adminApi.getMe()
      .then(() => router.replace('/bookings'))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('subdomain');
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminApi.login(form.email, form.password);
      if (!res.success) throw new Error(res.error ?? 'Invalid credentials');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('subdomain', res.data.subdomain);
      localStorage.setItem('email', form.email);
      router.push('/bookings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left panel */}
      <div className="login-left" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fdf4fb', fontWeight: 700, fontSize: 14 }}>Bk</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', letterSpacing: '-0.3px' }}>Bookaata</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'color-mix(in srgb, var(--brand) 10%, transparent)', marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>Booking management for service businesses</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6, color: 'var(--text-1)' }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>
            Bookaata lets clients book and pay a deposit online — you confirm from your dashboard in one click.
          </p>

          {error && (
            <div role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-bg)', color: 'var(--danger-fg)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {([
              { label: 'Email address', key: 'email', type: 'email', placeholder: 'you@example.com' },
              { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
            ] as const).map(f => (
              <FormField key={f.key} label={f.label}>
                <Input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  autoComplete={f.key === 'email' ? 'email' : 'current-password'}
                  required
                />
              </FormField>
            ))}

            <Button type="submit" variant="soft" size="lg" block disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link href="/onboarding" style={{ color: 'var(--brand)', fontWeight: 500 }}>Create one free</Link>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 420, background: 'var(--brand)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 48 }} className="login-panel">
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 24 }}>Built for service businesses</div>
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: 32 }}>
          Bookings, deposits, and confirmations — all in one place.
        </h2>
        {[
          'Clients book online 24/7 from your link',
          'Deposit holds the slot automatically',
          'Review payment proof and confirm in one click',
          'SMS + email notifications handled for you',
        ].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.5 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
