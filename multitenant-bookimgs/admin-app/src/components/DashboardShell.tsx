'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { adminApi } from '@/lib/api';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace('/login'); return; }
    // Redirect to /billing if trial has expired and user is not already there
    if (pathname === '/billing') return;
    adminApi.getBillingStatus().then(s => {
      if (s.needs_payment) router.replace('/billing');
    }).catch(() => {});
  }, [router, pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Mobile top bar */}
      <div className="mobile-header">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fdf4fb', fontWeight: 700, fontSize: 12 }}>Bk</span>
          </div>
          <span style={{ color: '#f5f4f2', fontWeight: 600, fontSize: 14 }}>BookImgs</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Backdrop overlay */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar — normal flow on desktop, fixed drawer on mobile */}
        <div className={`sidebar-drawer${sidebarOpen ? ' open' : ''}`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="dash-main" style={{ flex: 1, minWidth: 0, padding: '36px 40px', overflow: 'auto' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
