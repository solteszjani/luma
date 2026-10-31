import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Luma — kapcsolódj könnyedén',
  description: 'Üzenetek, hanghívások és közös pillanatok egy helyen.',
  applicationName: 'Luma Messenger',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: { capable: true, title: 'Luma', statusBarStyle: 'black-translucent' }
};

export const viewport: Viewport = {
  themeColor: '#6d28d9',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="hu"><body>{children}</body></html>;
}
