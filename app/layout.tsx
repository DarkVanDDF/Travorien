import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'Travorien — Drive China your way',
  description: 'AI-first China self-drive journeys, shaped around you.',
  openGraph: {
    title: 'Travorien — Drive China your way.',
    description: 'AI-first China self-drive journeys, shaped around you.',
    images: [{ url: '/og.png', width: 1674, height: 943, alt: 'Travorien — Drive China your way.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Travorien — Drive China your way.',
    description: 'AI-first China self-drive journeys, shaped around you.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
