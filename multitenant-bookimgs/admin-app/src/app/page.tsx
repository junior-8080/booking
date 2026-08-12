import Link from 'next/link';

const BRAND = '#7c3565';
const BRAND_DARK = '#5e274c';

const FEATURES = [
  {
    title: 'Online booking, 24/7',
    desc: 'Clients book on their phone at any time. No calls, no DMs — your calendar fills itself.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    ),
  },
  {
    title: 'Deposit holds the slot',
    desc: 'Clients pay a required deposit to confirm their slot. No payment, no booking — no-shows drop dramatically.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    ),
  },
  {
    title: 'Direct payments, no fees',
    desc: 'Configure Mobile Money, bank transfer, Zelle, or any channel. Money goes straight to you — zero platform cut.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    ),
  },
  {
    title: 'One-click confirmation',
    desc: 'Clients upload a payment screenshot. You review and confirm from your dashboard in seconds.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    ),
  },
  {
    title: 'SMS + email notifications',
    desc: 'Clients are notified at every step — slot held, confirmed, reminder. Works globally via Twilio and Hubtel.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
  },
  {
    title: 'Multi-brand support',
    desc: 'Run multiple locations or brands under one account. Each gets its own services, schedule, and page.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="9" height="9" rx="1" /><rect x="13" y="3" width="9" height="9" rx="1" /><rect x="2" y="13" width="9" height="9" rx="1" /><rect x="13" y="13" width="9" height="9" rx="1" /></svg>
    ),
  },
];

const STEPS = [
  { title: 'Create your account', desc: 'Add your business name and details. Takes under a minute.' },
  { title: 'Add services and hours', desc: 'Define what you offer, how long each takes, and when you are available.' },
  { title: 'Configure your payment method', desc: 'Enter your MTN MoMo number, Zelle handle, bank details — whatever clients should pay to.' },
  { title: 'Share your booking link', desc: 'Your page is live at bookimgs.app/book/your-name. Drop it in your bio, WhatsApp, or website.' },
  { title: 'Get booked and get paid', desc: 'Clients pick a slot and pay the deposit. You confirm in one click. Done.' },
];

const PAYMENT_METHODS = ['Mobile Money', 'Bank Transfer', 'Zelle', 'Venmo', 'Cash App', 'PayPal', 'Cash', 'Any other method'];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff', color: '#1c1917', WebkitFontSmoothing: 'antialiased' }}>

      {/* Nav */}
      <nav className="lp-nav" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #f0ece8', padding: '0 40px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fdf4fb', fontWeight: 700, fontSize: 13 }}>Bk</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>BookImgs</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="lp-nav-links">
            <a href="#features" style={{ fontSize: 14, color: '#6b6560' }}>Features</a>
            <a href="#how-it-works" style={{ fontSize: 14, color: '#6b6560' }}>How it works</a>
            <Link href="/login" style={{ fontSize: 14, color: '#6b6560' }}>Sign in</Link>
          </div>
          <Link href="/onboarding" style={{ padding: '8px 16px', borderRadius: 7, background: BRAND, color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero lp-pad" style={{ padding: '96px 40px 80px', textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, background: '#fdf4fb', border: '1px solid #f0d5ec', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: BRAND, display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: BRAND_DARK, fontWeight: 500 }}>No payment gateway required</span>
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 58px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-1.5px', margin: '0 0 22px', color: '#1c1917' }}>
          Bookings that work the{' '}
          <span style={{ color: BRAND }}>way your business does</span>
        </h1>
        <p style={{ fontSize: 18, color: '#6b6560', lineHeight: 1.65, maxWidth: 560, margin: '0 auto 40px' }}>
          Clients book online and pay a deposit via mobile money, bank transfer, or Zelle. You confirm and get paid. No gateway. No integrations.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/onboarding" style={{ padding: '13px 26px', borderRadius: 9, background: BRAND, color: '#fff', fontSize: 16, fontWeight: 700 }}>
            Start for free
          </Link>
          <a href="#how-it-works" style={{ padding: '13px 26px', borderRadius: 9, border: '1.5px solid #e4dfd9', color: '#1c1917', fontSize: 16, fontWeight: 600 }}>
            See how it works
          </a>
        </div>
        <p style={{ marginTop: 18, fontSize: 13, color: '#a39d97' }}>Free to start · No credit card required</p>
      </section>

      {/* Social proof */}
      <div className="lp-pad" style={{ background: '#f8f7f5', borderTop: '1px solid #ede9e5', borderBottom: '1px solid #ede9e5', padding: '18px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#a39d97', maxWidth: 640, margin: '0 auto' }}>
          Built for salons, barbershops, spas, consultants, photographers, and every service business that just needs bookings to work.
        </p>
      </div>

      {/* Features */}
      <section id="features" className="lp-pad lp-vert-lg" style={{ padding: '96px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12, color: '#1c1917' }}>
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p style={{ fontSize: 16, color: '#6b6560', maxWidth: 440, margin: '0 auto' }}>
            Purpose-built for service businesses. No bloat, no onboarding calls, no waiting.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ padding: '24px 24px 20px', borderRadius: 14, border: '1px solid #e4dfd9', background: '#fff' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fdf4fb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: BRAND }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1c1917', letterSpacing: '-0.2px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#6b6560', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="lp-pad lp-vert-md" style={{ padding: '80px 40px', background: '#f8f7f5', borderTop: '1px solid #ede9e5' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12, color: '#1c1917' }}>From sign-up to first booking in minutes</h2>
            <p style={{ fontSize: 16, color: '#6b6560' }}>No dev setup, no gateway onboarding, no waiting.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: BRAND, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, zIndex: 1, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div style={{ width: 1.5, flex: 1, background: '#e4dfd9', minHeight: 36, marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 40 : 0, paddingTop: 6 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#1c1917', letterSpacing: '-0.2px' }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#6b6560', lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment methods */}
      <section className="lp-pad lp-vert-md" style={{ padding: '80px 40px', maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 10, color: '#1c1917' }}>Accept payment your way</h2>
        <p style={{ fontSize: 15, color: '#6b6560', marginBottom: 36 }}>Clients pay you directly. Zero platform fees. Zero delays.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {PAYMENT_METHODS.map(m => (
            <span key={m} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #e4dfd9', fontSize: 14, color: '#6b6560', background: '#f8f7f5' }}>{m}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-pad lp-vert-md" style={{ padding: '80px 40px', background: BRAND, textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-1px' }}>Ready to fill your calendar?</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', marginBottom: 36 }}>Set up your booking page in under 10 minutes.</p>
        <Link href="/onboarding" style={{ display: 'inline-block', padding: '14px 30px', borderRadius: 9, background: '#fff', color: BRAND, fontSize: 16, fontWeight: 700 }}>
          Get started — it&apos;s free
        </Link>
      </section>

      {/* Footer */}
      <footer className="lp-footer" style={{ padding: '28px 40px', borderTop: '1px solid #ede9e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fdf4fb', fontWeight: 700, fontSize: 11 }}>Bk</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>BookImgs</span>
        </div>
        <p style={{ fontSize: 13, color: '#a39d97' }}>© {new Date().getFullYear()} BookImgs</p>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/login" style={{ fontSize: 13, color: '#a39d97' }}>Sign in</Link>
          <Link href="/onboarding" style={{ fontSize: 13, color: '#a39d97' }}>Register</Link>
        </div>
      </footer>
    </div>
  );
}
