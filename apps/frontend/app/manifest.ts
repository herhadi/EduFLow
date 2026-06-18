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
        src: '/logo_sekolah.png',
        sizes: '500x500',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo_sekolah.png',
        sizes: '500x500',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
