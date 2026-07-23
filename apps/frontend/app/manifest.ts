import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EduFlow',
    short_name: 'EduFlow',
    description: 'Monitoring operasional KBM sekolah.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#eff6ff',
    theme_color: '#2563eb',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
