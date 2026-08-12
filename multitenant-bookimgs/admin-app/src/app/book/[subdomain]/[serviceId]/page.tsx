'use client';

import { useEffect, useState, use, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { bookingApi } from '@/lib/bookingApi';
import { formatAmount } from '@/types';
import type { Brand, Service } from '@/types';

const A = 'oklch(46% 0.14 320)';
const A_TINT = 'oklch(98% 0.02 320)';
const MUTED = 'oklch(48% 0.02 50)';

const glass: CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(18px) saturate(160%)',
  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
};

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ subdomain: string; serviceId: string }>;
}) {
  const { subdomain, serviceId } = use(params);
  const router = useRouter();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      bookingApi.getBrands(subdomain),
      bookingApi.getService(subdomain, serviceId),
    ])
      .then(([brands, svc]) => {
        setBrand(brands.find(b => b.is_primary) ?? brands[0] ?? null);
        setService(svc);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [subdomain, serviceId]);

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes shimmer { 0%{background-position:-250% 0;} 100%{background-position:250% 0;} }
          @keyframes breathe { 0%,100%{opacity:0.55;transform:scale(1);} 50%{opacity:0.85;transform:scale(1.05);} }
          @keyframes loaderOrb1 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(18px,-14px) scale(1.04);} }
          @keyframes loaderOrb2 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-14px,18px) scale(1.03);} }
          .sk {
            background: linear-gradient(90deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.28) 100%);
            background-size: 250% 100%;
            animation: shimmer 1.8s ease-in-out infinite;
          }
        `}</style>
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(148deg, oklch(93% 0.045 300) 0%, oklch(97% 0.012 60) 55%, oklch(95% 0.032 195) 100%)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', background: 'oklch(84% 0.11 310)', filter: 'blur(90px)', opacity: 0.38, top: -130, right: -90, animation: 'loaderOrb1 9s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'oklch(87% 0.09 195)', filter: 'blur(75px)', opacity: 0.32, bottom: 30, left: -90, animation: 'loaderOrb2 11s ease-in-out infinite' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 440, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Hero skeleton */}
            <div className="sk" style={{ width: '100%', height: 300, flexShrink: 0, animationDuration: '2s' }} />
            <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Price card */}
              <div className="sk" style={{ width: '100%', height: 90, borderRadius: 18, animationDelay: '0.1s' }} />
              {/* Description */}
              <div className="sk" style={{ width: '100%', height: 120, borderRadius: 18, animationDelay: '0.2s' }} />
              {/* Chips */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="sk" style={{ width: 130, height: 36, borderRadius: 20, animationDelay: '0.3s' }} />
                <div className="sk" style={{ width: 140, height: 36, borderRadius: 20, animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (notFound || !service) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'oklch(97% 0.008 60)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Service not found</h2>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>This service may no longer be available.</p>
          <button
            onClick={() => router.push(`/book/${subdomain}`)}
            style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: A, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            View all services
          </button>
        </div>
      </div>
    );
  }

  const depositAmount =
    service.deposit_type === 'PERCENTAGE'
      ? Math.round((service.price_amount * service.deposit_value) / 100)
      : service.deposit_value;

  const hasImage = !!service.image_url;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
        .tap:active { transform: scale(0.96) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(148deg, oklch(93% 0.045 300) 0%, oklch(97% 0.012 60) 55%, oklch(95% 0.032 195) 100%)', fontFamily: "'Work Sans', sans-serif", color: 'oklch(22% 0.015 50)' }}>
        <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div style={{ position: 'relative', width: '100%', height: 300, flexShrink: 0, overflow: 'hidden', ...(!hasImage ? { background: `linear-gradient(140deg, ${A} 0%, oklch(36% 0.12 280) 100%)` } : {}) }}>
            {hasImage && (
              <img src={service.image_url!} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: hasImage ? 'linear-gradient(to top, rgba(10,6,18,0.84) 0%, rgba(10,6,18,0.2) 55%, transparent 100%)' : 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.42) 100%)' }} />

            {/* Back */}
            <button
              className="tap"
              onClick={() => router.push(`/book/${subdomain}`)}
              style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.12s', ...glass }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="oklch(22% 0.015 50)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Brand pill */}
            {brand && (
              <div style={{ position: 'absolute', top: 18, right: 16, display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px 5px 6px', borderRadius: 20, ...glass }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: A, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {brand.logo_url
                    ? <img src={brand.logo_url} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{brand.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'oklch(22% 0.015 50)' }}>{brand.name}</span>
              </div>
            )}

            {/* Title block */}
            <div style={{ position: 'absolute', bottom: 22, left: 20, right: 20 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>{service.duration_minutes} min</span>
              </div>
              <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, margin: 0, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 14px rgba(0,0,0,0.35)' }}>
                {service.name}
              </h1>
            </div>
          </div>

          {/* ── Content ──────────────────────────────────────────── */}
          <div style={{ flex: 1, padding: '22px 20px 120px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.28s ease both' }}>

            {/* Price card */}
            <div style={{ ...glass, borderRadius: 18, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>Full price</div>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700 }}>
                  {formatAmount(service.price_amount, service.price_currency)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>To book, pay</div>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: A }}>
                  {formatAmount(depositAmount, service.price_currency)}
                </div>
                {service.deposit_type === 'PERCENTAGE' && (
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{service.deposit_value}% deposit</div>
                )}
              </div>
            </div>

            {/* Description */}
            {service.description && (
              <div style={{ ...glass, borderRadius: 18, padding: '18px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, marginBottom: 10 }}>About</div>
                <p style={{ fontSize: 14, color: 'oklch(30% 0.015 50)', lineHeight: 1.7, margin: 0 }}>
                  {service.description}
                </p>
              </div>
            )}

            {/* Info chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { icon: '⏱', text: `${service.duration_minutes} min session` },
                { icon: '💳', text: `${formatAmount(depositAmount, service.price_currency)} deposit` },
                { icon: '✅', text: 'No hidden fees' },
              ].map(chip => (
                <div
                  key={chip.text}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, color: A, background: A_TINT, border: `1px solid ${A}22` }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sticky CTA ───────────────────────────────────────── */}
          <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(440px, 100%)', padding: '14px 20px 28px', background: 'linear-gradient(to top, rgba(225,215,248,0.97) 60%, transparent)' }}>
            <button
              className="tap"
              onClick={() => router.push(`/book/${subdomain}?service=${serviceId}`)}
              style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: A, color: 'oklch(98% 0.01 320)', fontSize: 16, fontWeight: 600, fontFamily: "'Sora', sans-serif", cursor: 'pointer', transition: 'transform 0.12s, box-shadow 0.15s', boxShadow: `0 6px 24px ${A}55` }}
            >
              Book Now · {formatAmount(depositAmount, service.price_currency)} deposit
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
