import type { Metadata, Viewport } from 'next';
import { Baloo_2, Mulish, Noto_Sans_Devanagari } from 'next/font/google';
import { ServiceWorker } from './ServiceWorker';
import '@sachmuch/ui/tokens.css';
import './globals.css';

/**
 * Baloo 2 covers Latin AND Devanagari in one family, which is the reason the
 * English and Hindi cards read as one product rather than two apps stapled
 * together. It carries display and hooks in both scripts.
 */
const baloo = Baloo_2({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-baloo',
  display: 'swap',
});
const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-mulish',
  display: 'swap',
});
const notoDev = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sachmuch',
  description: 'A never-ending feed of true things, in English and Hindi.',
  applicationName: 'Sachmuch',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Sachmuch', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E9E4F0' },
    { media: '(prefers-color-scheme: dark)', color: '#161320' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${mulish.variable} ${notoDev.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
