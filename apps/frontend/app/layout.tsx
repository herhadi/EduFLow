import type { Metadata, Viewport } from 'next';
import { MobileAppShell } from '../components/mobile-app-shell';
import { PwaRegister } from '../components/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduFlow',
  description: 'School academic monitoring system',
  applicationName: 'EduFlow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EduFlow',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <MobileAppShell>{children}</MobileAppShell>
        <PwaRegister />
      </body>
    </html>
  );
}
