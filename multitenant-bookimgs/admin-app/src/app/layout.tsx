import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BookImgs — Booking management',
  description: 'Professional booking management for service businesses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
