import type { Metadata, Viewport } from 'next';
import { MobileAppShell } from '../components/mobile-app-shell';
import { PwaRegister } from '../components/pwa-register';
import { ToastProvider } from '../components/ui/toast';
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#07111f' },
  ],
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
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('eduflow-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ToastProvider>
          <MobileAppShell>{children}</MobileAppShell>
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
