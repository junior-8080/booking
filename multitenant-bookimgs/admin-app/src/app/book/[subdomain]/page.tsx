'use client';

import { useEffect, useState, use, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { bookingApi } from '@/lib/bookingApi';
import { uploadToR2 } from '@/lib/upload';
import type { Brand, Service, Slot, PaymentSource, Booking } from '@/types';
import { formatAmount } from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const A = 'oklch(46% 0.14 320)';
const A_TINT = 'oklch(98% 0.02 320)';
const A_DARK = 'oklch(38% 0.13 320)';
const MUTED = 'oklch(48% 0.02 50)';
const DANGER_FG = 'oklch(45% 0.14 25)';
const DANGER_BG = 'oklch(93% 0.05 25)';

const glass: CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(18px) saturate(160%)',
  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
};

// ── Step config ───────────────────────────────────────────────────────────────
type Step = 'landing' | 'slot' | 'details' | 'payment' | 'proof' | 'confirm';
const ORDER: Step[] = ['landing', 'slot', 'details', 'payment', 'proof', 'confirm'];
const STEP_LABELS = ['Services', 'Time', 'Details', 'Pay', 'Proof'];

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function nextDates(n = 14) {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { key: d.toISOString().slice(0, 10), dow: DOW[d.getDay()]!, dayNum: d.getDate() };
  });
}

// ── Loader ────────────────────────────────────────────────────────────────────
function BookingPageLoader() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -250% 0; }
          100% { background-position: 250% 0; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(1.05); }
        }
        @keyframes loaderOrb1 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(18px,-14px) scale(1.04);} }
        @keyframes loaderOrb2 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-14px,18px) scale(1.03);} }
        .sk {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.28) 0%,
            rgba(255,255,255,0.65) 50%,
            rgba(255,255,255,0.28) 100%);
          background-size: 250% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(148deg, oklch(93% 0.045 300) 0%, oklch(97% 0.012 60) 55%, oklch(95% 0.032 195) 100%)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', background: 'oklch(84% 0.11 310)', filter: 'blur(90px)', opacity: 0.38, top: -130, right: -90, animation: 'loaderOrb1 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'oklch(87% 0.09 195)', filter: 'blur(75px)', opacity: 0.32, bottom: 30, left: -90, animation: 'loaderOrb2 11s ease-in-out infinite' }} />

        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 20px 0', maxWidth: 440, margin: '0 auto' }}>

          {/* Brand avatar pulse */}
          <div style={{ width: 76, height: 76, borderRadius: 22, background: A, marginBottom: 16, animation: 'breathe 2.2s ease-in-out infinite' }} />

          {/* Name + tagline */}
          <div className="sk" style={{ width: 140, height: 16, borderRadius: 8, marginBottom: 10 }} />
          <div className="sk" style={{ width: 100, height: 12, borderRadius: 6, marginBottom: 44, animationDelay: '0.2s' }} />

          {/* Service card skeletons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[180, 100, 100].map((h, i) => (
              <div
                key={i}
                className="sk"
                style={{ width: '100%', height: h, borderRadius: 20, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function BrandBadge({ brand, large }: { brand: Brand | undefined; large?: boolean }) {
  if (!brand) return null;
  const size = large ? 76 : 26;
  const radius = large ? 22 : 7;
  const fontSize = large ? 28 : 10;
  return (
    <div style={{ display: 'flex', flexDirection: large ? 'column' : 'row', alignItems: 'center', gap: large ? 16 : 8, justifyContent: 'center' }}>
      <div style={{ width: size, height: size, borderRadius: radius, background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', ...(large ? { boxShadow: `0 8px 32px ${A}55` } : {}) }}>
        {brand.logo_url
          ? <img src={brand.logo_url} alt={brand.name} style={{ width: size, height: size, objectFit: 'cover' }} />
          : <span style={{ color: 'white', fontSize, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{brand.name.slice(0, 2).toUpperCase()}</span>
        }
      </div>
      {large ? (
        <>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, margin: 0 }}>{brand.name}</h1>
          {brand.description && (
            <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.5, maxWidth: 300, textAlign: 'center' }}>{brand.description}</p>
          )}
        </>
      ) : (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'oklch(30% 0.015 50)' }}>{brand.name}</span>
      )}
    </div>
  );
}

function StepBar({ currentIdx, maxIdx, onJumpTo }: { currentIdx: number; maxIdx: number; onJumpTo: (i: number) => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0' }}>
      {STEP_LABELS.map((label, i) => {
        const reachable = i <= maxIdx;
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <button
            key={i}
            onClick={() => reachable && onJumpTo(i)}
            disabled={!reachable}
            style={{
              flexShrink: 0,
              minWidth: 76,
              border: 'none',
              cursor: reachable ? 'pointer' : 'default',
              padding: '10px 14px',
              borderRadius: 13,
              transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
              background: active ? A : done ? `${A}12` : 'rgba(255,255,255,0.55)',
              color: active ? '#fff' : done ? A_DARK : 'rgba(0,0,0,0.35)',
              boxShadow: active ? `0 4px 16px ${A}40` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              whiteSpace: 'nowrap' as const,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: 0.5,
            }}
          >
            {done && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-10" stroke={A_DARK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicBookingPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<Step>('landing');
  const [stepKey, setStepKey] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [maxReached, setMaxReached] = useState(0);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const dates = nextDates();
  const [selectedDate, setSelectedDate] = useState(dates[0]!.key);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });
  const [booking, setBooking] = useState<Booking | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [proof, setProof] = useState({ txRef: '', fileName: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [bookingsBlocked, setBookingsBlocked] = useState(false);
  const [showTc, setShowTc] = useState(false);

  useEffect(() => {
    const storageKey = `bookimgs_pending_${subdomain}`;
    const qs = new URLSearchParams(window.location.search);
    const urlRef = qs.get('ref');
    const urlServiceId = qs.get('service');
    const savedRef = urlRef ?? (() => {
      try { return (JSON.parse(localStorage.getItem(storageKey) ?? 'null') as { referenceCode: string } | null)?.referenceCode ?? null; }
      catch { return null; }
    })();

    Promise.all([
      bookingApi.getTenantStatus(subdomain),
      bookingApi.getBrands(subdomain),
      bookingApi.getServices(subdomain),
      bookingApi.getPaymentSources(subdomain),
      savedRef ? bookingApi.getBookingByRef(subdomain, savedRef).catch(() => null) : Promise.resolve(null),
    ])
      .then(([status, b, s, ps, resumed]) => {
        setBrands(b);
        if (!status.is_accepting_bookings) { setBookingsBlocked(true); return; }
        setServices(s); setPaymentSources(ps); setSelectedSourceId(ps[0]?.id ?? null);
        if (!resumed && urlServiceId) {
          const svc = s.find(sv => sv.id === urlServiceId);
          if (svc) {
            setSelectedService(svc);
            setStep('slot');
            setMaxReached(ORDER.indexOf('slot'));
          }
        }

        if (resumed) {
          if (resumed.status === 'PENDING') {
            setBooking(resumed);
            const resumeStep: Step = resumed.hold_expires_at ? 'payment' : 'confirm';
            setStep(resumeStep);
            setMaxReached(ORDER.indexOf(resumeStep));
          } else if (resumed.status === 'BOOKED') {
            setBooking(resumed);
            setStep('confirm');
            setMaxReached(ORDER.indexOf('confirm'));
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      })
      .catch(() => setPageError('This booking page could not be loaded. Please check the link and try again.'))
      .finally(() => setPageLoading(false));
  }, [subdomain]);

  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    bookingApi.getSlots(subdomain, selectedService.id, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [selectedService, selectedDate, subdomain]);

  useEffect(() => {
    if (!booking?.hold_expires_at) return;
    const update = () => setSecondsLeft(Math.max(0, Math.floor((new Date(booking.hold_expires_at!).getTime() - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [booking?.hold_expires_at]);

  const goTo = (s: Step) => {
    const newIdx = ORDER.indexOf(s);
    const curIdx = ORDER.indexOf(step);
    setDirection(newIdx >= curIdx ? 'forward' : 'back');
    setMaxReached(prev => Math.max(prev, newIdx));
    setError(null);
    setStep(s);
    setStepKey(k => k + 1);
  };

  const jumpTo = (i: number) => goTo(ORDER[i] as Step);

  const stepIdx = ORDER.indexOf(step);
  const canGoBack = stepIdx > 0 && step !== 'confirm';

  const handleSelectService = (svc: Service) => { router.push(`/book/${subdomain}/${svc.id}`); };
  const handleSelectSlot = (slot: Slot) => { setSelectedSlot(slot); goTo('details'); };

  const handleCreateBooking = async () => {
    if (!selectedService || !selectedSlot) return;
    setLoading(true);
    try {
      const result = await bookingApi.createBooking(subdomain, {
        service_id: selectedService.id,
        slot_start: selectedSlot.start,
        customer: { full_name: form.name, phone: form.phone, email: form.email || undefined },
        client_notes: form.note || undefined,
      });
      setBooking(result.booking);
      localStorage.setItem(`bookimgs_pending_${subdomain}`, JSON.stringify({ referenceCode: result.booking.reference_code }));
      const holdMs = result.booking.hold_expires_at
        ? new Date(result.booking.hold_expires_at).getTime() - Date.now()
        : 1200000;
      setSecondsLeft(Math.max(0, Math.floor(holdMs / 1000)));
      goTo('payment');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSource = paymentSources.find(ps => ps.id === selectedSourceId) ?? paymentSources[0];

  const handleSubmitProof = async () => {
    if (!booking || !selectedSource) return;
    setLoading(true);
    try {
      let proof_url: string | undefined;
      if (proofFile) proof_url = await uploadToR2(proofFile, 'proofs');
      await bookingApi.submitProof(subdomain, booking.id, {
        payment_source_id: selectedSource.id,
        amount: booking.required_amount,
        currency: booking.required_currency,
        client_reference: proof.txRef || undefined,
        proof_url,
      });
      const updated = await bookingApi.getBookingByRef(subdomain, booking.reference_code);
      setBooking(updated);
      localStorage.removeItem(`bookimgs_pending_${subdomain}`);
      goTo('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit proof. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePaymentDetails = async () => {
    if (!booking || !selectedSource) return;
    const lines = [
      ...(primaryBrand ? [`${primaryBrand.name} — Payment`] : ['Booking Payment']),
      `Amount: ${depositLabel}`,
      `Reference: ${booking.reference_code}`,
      '',
      `Pay via ${selectedSource.label}:`,
      ...Object.entries(selectedSource.details).map(([k, v]) => `${k}: ${v}`),
      '',
      `Use ${booking.reference_code} as your payment reference/narration.`,
    ];
    const text = lines.join('\n');
    try {
      if (navigator.share) { await navigator.share({ text }); }
      else { await navigator.clipboard.writeText(text); setCopied('share'); setTimeout(() => setCopied(null), 2000); }
    } catch {}
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const primaryBrand = brands.find(b => b.is_primary) ?? brands[0];
  const serviceName = selectedService?.name ?? booking?.service?.name;
  const depositLabel = booking
    ? formatAmount(booking.required_amount, booking.required_currency)
    : selectedService
    ? formatAmount(
        selectedService.deposit_type === 'PERCENTAGE'
          ? Math.round(selectedService.price_amount * selectedService.deposit_value / 100)
          : selectedService.deposit_value,
        selectedService.price_currency,
      )
    : '';

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const countdownDisplay = `${mm}:${String(ss).padStart(2, '0')}`;
  const isDanger = secondsLeft > 0 && secondsLeft <= 120;
  const formValid = form.name.trim().length > 0 && form.phone.trim().length > 0;
  const animClass = direction === 'forward' ? 'slide-forward' : 'slide-back';

  if (pageLoading) return <BookingPageLoader />;

  if (pageError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'oklch(97% 0.008 60)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Page not found</h2>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{pageError}</p>
        </div>
      </div>
    );
  }

  if (bookingsBlocked) {
    const brand = brands.find(b => b.is_primary) ?? brands[0];
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Work+Sans:wght@400;500&display=swap');
          @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(18px,-14px) scale(1.04);} }
          @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-14px,18px) scale(1.03);} }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { -webkit-font-smoothing: antialiased; }
        `}</style>
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(148deg, oklch(93% 0.045 300) 0%, oklch(97% 0.012 60) 55%, oklch(95% 0.032 195) 100%)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', background: 'oklch(84% 0.11 310)', filter: 'blur(90px)', opacity: 0.38, top: -130, right: -90, animation: 'orb1 9s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'oklch(87% 0.09 195)', filter: 'blur(75px)', opacity: 0.32, bottom: 30, left: -90, animation: 'orb2 11s ease-in-out infinite' }} />
          <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Work Sans', sans-serif", padding: 24 }}>
            <div style={{ textAlign: 'center', maxWidth: 340 }}>
              {brand && (
                <div style={{ width: 72, height: 72, borderRadius: 20, background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', overflow: 'hidden', boxShadow: `0 8px 32px ${A}55` }}>
                  {brand.logo_url
                    ? <img src={brand.logo_url} alt={brand.name} style={{ width: 72, height: 72, objectFit: 'cover' }} />
                    : <span style={{ color: 'white', fontSize: 26, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{brand.name.slice(0, 2).toUpperCase()}</span>
                  }
                </div>
              )}
              {brand && <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 24, color: 'oklch(22% 0.015 50)' }}>{brand.name}</div>}

              <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)', border: '1px solid rgba(255,255,255,0.88)', borderRadius: 20, padding: '28px 24px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'oklch(94% 0.03 60)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'oklch(22% 0.015 50)' }}>Bookings unavailable</h2>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                  This booking page is temporarily unavailable. Please contact the business directly to make an appointment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap');
        @keyframes slideForward { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideBack    { from { opacity:0; transform:translateX(-22px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp       { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes orb1 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(18px,-14px) scale(1.04); } }
        @keyframes orb2 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(-14px,18px) scale(1.03); } }
        .slide-forward { animation: slideForward 0.26s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .slide-back    { animation: slideBack    0.26s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .fade-up       { animation: fadeUp 0.3s ease both; }
        .orb1 { animation: orb1 9s ease-in-out infinite; }
        .orb2 { animation: orb2 11s ease-in-out infinite; }
        * { box-sizing: border-box; }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
        input[type="file"] { display: none; }
        .tap:active { transform: scale(0.96) !important; }
      `}</style>

      {/* Frosted background orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', background: 'linear-gradient(148deg, oklch(93% 0.045 300) 0%, oklch(97% 0.012 60) 55%, oklch(95% 0.032 195) 100%)' }}>
        <div className="orb1" style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', background: 'oklch(84% 0.11 310)', filter: 'blur(90px)', opacity: 0.38, top: -130, right: -90 }} />
        <div className="orb2" style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'oklch(87% 0.09 195)', filter: 'blur(75px)', opacity: 0.32, bottom: 30, left: -90 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', justifyContent: 'center', fontFamily: "'Work Sans', sans-serif", color: 'oklch(22% 0.015 50)' }}>
        <div style={{ width: '100%', maxWidth: 440, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header bar */}
          {step !== 'confirm' && (
            <div style={{ padding: '16px 20px 10px' }}>
              {step !== 'landing' && (
                <div style={{ marginBottom: 10 }}>
                  <BrandBadge brand={primaryBrand} />
                </div>
              )}
              {canGoBack && (
                <button
                  className="tap"
                  onClick={() => goTo(ORDER[Math.max(0, stepIdx - 1)] as Step)}
                  style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'transform 0.1s', ...glass }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="oklch(30% 0.02 50)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              )}
            </div>
          )}

          <div style={{ flex: 1, padding: '4px 20px 120px', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <div style={{ margin: '0 0 12px', padding: '12px 14px', borderRadius: 12, background: DANGER_BG, color: DANGER_FG, fontSize: 14 }}>
                {error}
              </div>
            )}

            <div key={stepKey} className={step === 'landing' ? 'fade-up' : animClass}>

              {/* ── Landing ── */}
              {step === 'landing' && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 0 22px' }}>
                    <BrandBadge brand={primaryBrand} large />
                    {!primaryBrand && (
                      <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.5 }}>Book your appointment online.</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {services.map(svc => {
                      const hasImage = !!svc.image_url;
                      return (
                        <button
                          key={svc.id}
                          className="tap"
                          onClick={() => handleSelectService(svc)}
                          style={{
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                            gap: 12, textAlign: 'left', width: '100%', padding: '20px 20px 18px', borderRadius: 20,
                            cursor: 'pointer', transition: 'transform 0.12s', overflow: 'hidden',
                            minHeight: hasImage ? 180 : 100,
                            ...(hasImage
                              ? {
                                  border: '1px solid rgba(255,255,255,0.5)',
                                  background: `linear-gradient(to top, rgba(12,8,16,0.82) 0%, rgba(12,8,16,0.32) 50%, rgba(12,8,16,0.05) 100%), url(${svc.image_url}) center/cover no-repeat`,
                                  boxShadow: '0 6px 28px rgba(0,0,0,0.18)',
                                }
                              : glass),
                          }}
                        >
                          <div>
                            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: hasImage ? 18 : 16, marginBottom: 5, color: hasImage ? '#fff' : undefined, textShadow: hasImage ? '0 1px 8px rgba(0,0,0,0.5)' : undefined }}>{svc.name}</div>
                            <div style={{ fontSize: 13, color: hasImage ? 'rgba(255,255,255,0.8)' : MUTED }}>{svc.duration_minutes} min</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: hasImage ? 18 : 16, color: hasImage ? '#fff' : undefined, textShadow: hasImage ? '0 1px 8px rgba(0,0,0,0.5)' : undefined }}>
                              {formatAmount(svc.price_amount, svc.price_currency)}
                            </div>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: hasImage ? 'rgba(255,255,255,0.2)' : A, backdropFilter: hasImage ? 'blur(8px)' : undefined, border: hasImage ? '1px solid rgba(255,255,255,0.3)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 12, color: 'oklch(58% 0.02 50)', margin: '18px 0 0' }}>
                    Prices shown are final — no hidden fees.
                  </p>
                </div>
              )}

              {/* ── Slot picker ── */}
              {step === 'slot' && (
                <div>
                  <div style={{ padding: '2px 0 4px' }}>
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{selectedService?.name}</div>
                    <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, margin: 0 }}>Pick a time</h2>
                  </div>

                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 0 4px', margin: '0 -4px' }}>
                    {dates.map(d => {
                      const sel = d.key === selectedDate;
                      return (
                        <button
                          key={d.key}
                          className="tap"
                          onClick={() => setSelectedDate(d.key)}
                          style={{ flexShrink: 0, width: 52, padding: '9px 0', borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'transform 0.12s', ...(sel ? { background: A, border: `1px solid ${A}`, color: 'oklch(98% 0.01 320)', boxShadow: `0 4px 14px ${A}44` } : { ...glass, color: 'oklch(22% 0.015 50)' }) }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', opacity: 0.8 }}>{d.dow}</span>
                          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700 }}>{d.dayNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
                    {slots.length === 0 && (
                      <p style={{ gridColumn: '1/-1', textAlign: 'center', color: MUTED, fontSize: 14, padding: '24px 0' }}>
                        No available slots for this day.
                      </p>
                    )}
                    {slots.map((slot, i) => {
                      const time = new Date(slot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      const sel = selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={i}
                          className={slot.available ? 'tap' : ''}
                          onClick={() => slot.available && handleSelectSlot(slot)}
                          disabled={!slot.available}
                          style={{
                            padding: '12px 4px', borderRadius: 12, fontSize: 14, fontWeight: 500, transition: 'transform 0.12s',
                            cursor: slot.available ? 'pointer' : 'default',
                            ...(!slot.available
                              ? { background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.06)', color: 'oklch(72% 0.01 60)' }
                              : sel
                              ? { background: A, border: `1px solid ${A}`, color: 'oklch(98% 0.01 320)', boxShadow: `0 4px 16px ${A}44` }
                              : { ...glass, color: 'oklch(22% 0.015 50)' }
                            ),
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Details form ── */}
              {step === 'details' && (
                <div>
                  <div style={{ padding: '2px 0 4px' }}>
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>
                      {selectedService?.name} · {selectedSlot ? new Date(selectedSlot.start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                    </div>
                    <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, margin: 0 }}>Your details</h2>
                  </div>

                  {booking && (
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.07)', fontSize: 13, color: MUTED }}>
                      Booking already created —{' '}
                      <button onClick={() => goTo('payment')} style={{ border: 'none', background: 'none', color: A, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 13 }}>
                        go to payment
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                    {[
                      { label: 'Name', key: 'name', type: 'text', placeholder: 'Full name' },
                      { label: 'Phone', key: 'phone', type: 'tel', placeholder: 'For booking updates' },
                      { label: 'Email (optional)', key: 'email', type: 'email', placeholder: 'you@example.com' },
                      { label: 'Note (optional)', key: 'note', type: 'text', placeholder: 'Anything we should know' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
                        <input
                          type={f.type}
                          value={form[f.key as keyof typeof form]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          disabled={!!booking}
                          style={{ width: '100%', padding: 14, borderRadius: 12, fontSize: 16, outline: 'none', transition: 'border-color 0.15s', opacity: booking ? 0.65 : 1, ...glass }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Payment instructions ── */}
              {step === 'payment' && booking && (
                <div>
                  <div style={{ padding: '2px 0 4px' }}>
                    {serviceName && <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{serviceName}</div>}
                    <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Hold your slot</h2>
                    <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Send your deposit and submit proof before time runs out.</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: '13px 16px', marginTop: 14, ...(isDanger ? { background: DANGER_BG, border: '1px solid rgba(200,50,50,0.12)' } : { ...glass }) }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: isDanger ? DANGER_FG : A_DARK }}>Slot held for</span>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: isDanger ? DANGER_FG : A_DARK }}>{countdownDisplay}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: 16, borderRadius: 14, background: A, boxShadow: `0 6px 24px ${A}44` }}>
                    <span style={{ fontSize: 14, color: 'oklch(96% 0.02 320)' }}>Deposit due</span>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, color: 'oklch(99% 0.01 320)' }}>{depositLabel}</span>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Include this reference in your transfer</div>
                    <button
                      className="tap"
                      onClick={() => copyText(booking.reference_code, 'ref')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 12, border: `1.5px dashed ${A}`, background: A_TINT, cursor: 'pointer', transition: 'transform 0.12s' }}
                    >
                      <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 0.5, color: A_DARK }}>{booking.reference_code}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: A }}>{copied === 'ref' ? '✓ Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <button
                    className="tap"
                    onClick={handleSharePaymentDetails}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 12, marginTop: 16, border: `1px solid ${A}`, background: A_TINT, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: A, transition: 'transform 0.12s' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={A} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {copied === 'share' ? '✓ Copied to clipboard' : 'Share payment details'}
                  </button>

                  {paymentSources.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 22, padding: '0 0 4px' }}>
                      {paymentSources.map(ps => {
                        const sel = ps.id === selectedSource?.id;
                        return (
                          <button
                            key={ps.id}
                            className="tap"
                            onClick={() => setSelectedSourceId(ps.id)}
                            style={{
                              flexShrink: 0, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                              cursor: 'pointer', transition: 'transform 0.12s',
                              ...(sel
                                ? { background: A, border: `1px solid ${A}`, color: 'oklch(98% 0.01 320)', boxShadow: `0 4px 14px ${A}44` }
                                : { ...glass, color: 'oklch(30% 0.015 50)' }
                              ),
                            }}
                          >
                            {ps.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedSource && (
                    <div key={selectedSource.id} className="fade-up" style={{ marginTop: paymentSources.length > 1 ? 12 : 22 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 10 }}>Pay via {selectedSource.label}</div>
                      {Object.entries(selectedSource.details).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderRadius: 12, marginBottom: 8, ...glass }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'oklch(52% 0.02 50)', marginBottom: 2 }}>{k}</div>
                            <div style={{ fontSize: 15, fontWeight: 600 }}>{String(v)}</div>
                          </div>
                          <button className="tap" onClick={() => copyText(String(v), k)} style={{ border: 'none', background: 'none', padding: '6px 10px', cursor: 'pointer', color: A, fontSize: 12, fontWeight: 600, borderRadius: 8, transition: 'transform 0.12s' }}>
                            {copied === k ? '✓' : 'Copy'}
                          </button>
                        </div>
                      ))}
                      {selectedSource.instructions && <p style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>{selectedSource.instructions}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ── Proof upload ── */}
              {step === 'proof' && (
                <div>
                  <div style={{ padding: '2px 0 4px' }}>
                    {serviceName && <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{serviceName}</div>}
                    <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Send proof of payment</h2>
                    <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>A screenshot or receipt photo works fine.</p>
                  </div>

                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: '28px 16px', borderRadius: 16, border: `2px dashed ${proofFile ? A : 'rgba(0,0,0,0.12)'}`, cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.2s', ...glass }}>
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setProofFile(f); setProof(p => ({ ...p, fileName: f.name })); } }} />
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4l-4 4M12 4l4 4M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke={proofFile ? A : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span style={{ fontSize: 14, fontWeight: 600, color: proofFile ? A : 'oklch(30% 0.015 50)' }}>{proof.fileName || 'Attach a photo'}</span>
                    <span style={{ fontSize: 12, color: 'oklch(56% 0.02 50)' }}>{proofFile ? 'Tap to change photo' : 'Tap to choose a photo'}</span>
                  </label>

                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Transaction reference <span style={{ color: 'oklch(58% 0.02 50)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      value={proof.txRef}
                      onChange={e => setProof(p => ({ ...p, txRef: e.target.value }))}
                      placeholder="e.g. code from your transfer"
                      style={{ width: '100%', padding: 14, borderRadius: 12, fontSize: 16, outline: 'none', ...glass }}
                    />
                  </div>
                </div>
              )}

              {/* ── Confirmation ── */}
              {step === 'confirm' && booking && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 32 }}>
                  <BrandBadge brand={primaryBrand} />

                  <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '18px 0', ...(booking.status === 'BOOKED' ? { background: 'oklch(92% 0.06 145)', boxShadow: '0 6px 24px rgba(50,180,100,0.2)' } : { background: 'oklch(93% 0.05 70)', boxShadow: '0 6px 24px rgba(180,120,50,0.2)' }) }}>
                    {booking.status === 'BOOKED'
                      ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="oklch(50% 0.11 145)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      : <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3 2" stroke="oklch(45% 0.1 70)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" stroke="oklch(45% 0.1 70)" strokeWidth="2" /></svg>
                    }
                  </div>

                  <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 21, fontWeight: 700, margin: '0 0 6px' }}>
                    {booking.status === 'BOOKED' ? "You're booked!" : 'Payment under review'}
                  </h2>
                  <p style={{ fontSize: 14, color: MUTED, margin: '0 0 22px', maxWidth: 300, lineHeight: 1.5 }}>
                    {booking.status === 'BOOKED'
                      ? 'Your deposit has been confirmed. See you at your appointment!'
                      : "We'll check your payment and confirm your slot. You'll be notified by SMS and email."}
                  </p>

                  <div style={{ width: '100%', padding: 16, borderRadius: 16, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, ...glass }}>
                    {[
                      { label: 'Service', value: booking.service?.name },
                      { label: 'Time', value: booking.slot_start ? new Date(booking.slot_start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '' },
                      { label: 'Deposit', value: formatAmount(booking.required_amount, booking.required_currency) },
                      { label: 'Reference', value: booking.reference_code },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: 'oklch(52% 0.02 50)' }}>{row.label}</span>
                        <span style={{ fontWeight: 600 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* T&C button — always visible once brand loads */}
          {primaryBrand && (
            <button
              onClick={() => setShowTc(true)}
              style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 50,
                padding: '7px 13px', borderRadius: 20,
                border: '1px solid rgba(0,0,0,0.12)',
                background: 'rgba(0,0,0,0.28)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                fontSize: 12, fontWeight: 600, color: '#fff',
                cursor: 'pointer', letterSpacing: 0.2,
              }}
            >
              T&amp;C
            </button>
          )}

          {/* T&C modal */}
          {showTc && (
            <div
              onClick={() => setShowTc(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 440, maxHeight: '80vh', borderRadius: '20px 20px 0 0', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: 'oklch(22% 0.015 50)' }}>Terms & Conditions</div>
                  <button onClick={() => setShowTc(false)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="oklch(40% 0.01 50)" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <div style={{ overflowY: 'auto', padding: '18px 20px 32px', fontSize: 14, color: 'oklch(30% 0.015 50)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {primaryBrand?.terms_conditions || (
                    <span style={{ color: 'oklch(58% 0.02 50)', fontStyle: 'italic' }}>No terms & conditions have been set for this business.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sticky CTA */}
          {(['details', 'payment', 'proof'] as Step[]).includes(step) && !(step === 'details' && booking) && (
            <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(440px, 100%)', padding: '14px 20px 26px', background: 'linear-gradient(to top, rgba(225,215,248,0.97) 55%, transparent)' }}>
              <button
                className="tap"
                onClick={
                  step === 'details' ? handleCreateBooking
                    : step === 'payment' ? () => goTo('proof')
                    : handleSubmitProof
                }
                disabled={loading || (step === 'details' && !formValid)}
                style={{
                  width: '100%', padding: 16, borderRadius: 14, border: 'none',
                  fontSize: 16, fontWeight: 600, fontFamily: "'Sora', sans-serif",
                  cursor: loading || (step === 'details' && !formValid) ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.12s, box-shadow 0.15s',
                  background: loading || (step === 'details' && !formValid) ? 'rgba(0,0,0,0.1)' : A,
                  color: loading || (step === 'details' && !formValid) ? 'oklch(60% 0.01 60)' : 'oklch(98% 0.01 320)',
                  boxShadow: loading || (step === 'details' && !formValid) ? 'none' : `0 6px 24px ${A}55`,
                }}
              >
                {loading ? 'Please wait…'
                  : step === 'details' ? 'Continue to payment'
                  : step === 'payment' ? "I've sent the deposit"
                  : 'Submit for review'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
