'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { adminApi } from '@/lib/api';
import { formatAmount } from '@/types';

interface Summary {
  total_bookings: number; booked_bookings: number;
  rejection_rate: number; total_revenue: number; repeat_customer_count: number;
}
interface ServiceRevenue { service_name: string; revenue: number; count: number; }
interface TimePoint { period: string; count: number; }

const STAT_CARDS = (s: Summary, currency: string) => [
  { label: 'Total bookings', value: s.total_bookings.toLocaleString(), sub: 'Last 30 days', positive: true },
  { label: 'Booked', value: s.booked_bookings.toLocaleString(), sub: `of ${s.total_bookings}`, positive: true },
  { label: 'Revenue collected', value: formatAmount(s.total_revenue, currency), sub: 'Confirmed deposits', positive: true },
  { label: 'Repeat customers', value: s.repeat_customer_count.toLocaleString(), sub: 'Booked 2+ times', positive: true },
  { label: 'Rejection rate', value: `${(s.rejection_rate * 100).toFixed(1)}%`, sub: 'of all bookings', positive: false },
];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenue, setRevenue] = useState<ServiceRevenue[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimePoint[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    Promise.all([adminApi.getSummary(), adminApi.getRevenueByService(), adminApi.getTenantSettings()]).then(([s, r, settings]) => {
      setSummary(s as Summary);
      setRevenue((r as ServiceRevenue[]).sort((a, b) => b.revenue - a.revenue));
      setCurrency((settings as { default_currency: string }).default_currency);
    });
  }, []);

  useEffect(() => {
    adminApi.getBookingsOverTime(groupBy).then(d => setTimeSeries(d as TimePoint[]));
  }, [groupBy]);

  const maxCount = Math.max(1, ...timeSeries.map(t => t.count));
  const maxRevenue = revenue[0]?.revenue ?? 1;

  return (
    <DashboardShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Analytics</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Last 30 days performance overview.</p>
      </div>

      {/* Stat cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
          {STAT_CARDS(summary, currency).map(card => (
            <div key={card.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '18px 20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Bookings chart */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Bookings over time</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Number of new bookings per period</div>
            </div>
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', padding: 3, borderRadius: 8 }}>
              {(['day', 'week', 'month'] as const).map(g => (
                <button key={g} onClick={() => setGroupBy(g)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: groupBy === g ? 'var(--surface)' : 'transparent', color: groupBy === g ? 'var(--text-1)' : 'var(--text-2)', fontSize: 12, fontWeight: groupBy === g ? 600 : 400, cursor: 'pointer', boxShadow: groupBy === g ? 'var(--shadow-sm)' : 'none' }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {timeSeries.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No data for this period.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160 }}>
              {timeSeries.map((t, i) => {
                const h = Math.max(3, (t.count / maxCount) * 140);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, cursor: 'default', minWidth: 0 }} title={`${new Date(t.period).toLocaleDateString()}: ${t.count}`}>
                    <div style={{ width: '100%', background: 'var(--brand)', borderRadius: '3px 3px 0 0', height: h, opacity: 0.85 }} />
                    <div style={{ width: '100%', height: 2, background: 'var(--border)' }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue by service */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)', marginBottom: 4 }}>Revenue by service</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Confirmed deposits only</div>
          {revenue.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No confirmed payments yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {revenue.map((r, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{r.service_name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>{formatAmount(r.revenue, currency)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: 'var(--brand)', width: `${(r.revenue / maxRevenue) * 100}%`, opacity: 0.8 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{r.count} booking{r.count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
