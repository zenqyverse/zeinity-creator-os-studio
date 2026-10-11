import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../components/ToastContainer';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeinity.app'),
  title: 'Zeinity Creator Studio — YouTube Shorts Operating System',
  description: 'Pusat komando produksi YouTube Shorts berbasis riset dan standar editorial terverifikasi kanal Zeinity (@ZeinityShorts).',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Zeinity Creator Studio — YouTube Shorts Operating System',
    description: 'Pusat komando produksi YouTube Shorts berbasis riset dan standar editorial terverifikasi kanal Zeinity (@ZeinityShorts).',
    images: [{ url: '/banner.png', width: 1200, height: 630, alt: 'Zeinity Creator Studio Banner' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-zbg text-zink antialiased selection:bg-zcyan/30 selection:text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
