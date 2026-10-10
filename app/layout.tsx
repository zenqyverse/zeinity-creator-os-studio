import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../components/ToastContainer';

export const metadata: Metadata = {
  title: 'Zeinity Creator Studio — YouTube Shorts Operating System',
  description: 'Pusat komando produksi YouTube Shorts berbasis riset dan standar editorial terverifikasi kanal Zeinity (@ZeinityShorts).',
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
