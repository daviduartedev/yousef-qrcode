import type { Metadata } from 'next';
import Providers from './providers';
import '../index.css';

export const metadata: Metadata = {
  title: { default: 'QRConnect', template: '%s | QRConnect' },
  description: 'Create, customize and track QR codes and digital business cards.',
  icons: { icon: '/icon.svg' },
  openGraph: { title: 'QRConnect', description: 'Create, customize and track QR codes.', type: 'website' },
  twitter: { card: 'summary', title: 'QRConnect' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}
