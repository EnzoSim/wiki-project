import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';

const display = localFont({
  src: './fonts/source-serif-4-latin.woff2',
  variable: '--font-display',
  weight: '200 900',
  display: 'swap',
});
const body = localFont({
  src: './fonts/source-sans-3-latin.woff2',
  variable: '--font-body',
  weight: '200 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Commonplace · Enzo Simier',
    template: '%s | Commonplace',
  },
  description:
    'Ideas, connections, and things worth keeping. Collected by Enzo Simier.',
  authors: [{ name: 'Enzo Simier' }],
  creator: 'Enzo Simier',
  publisher: 'Enzo Simier',
  openGraph: {
    title: 'Commonplace · Enzo Simier',
    description: 'Ideas, connections, and things worth keeping.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Commonplace · Enzo Simier',
    description: 'Ideas, connections, and things worth keeping.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
