import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduFlow',
  description: 'School academic monitoring system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
