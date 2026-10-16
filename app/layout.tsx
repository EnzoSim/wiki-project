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
    default: 'Reference index · Enzo Simier',
    template: '%s | Reference index',
  },
  description:
    'A personal library of concepts, connections and things worth reading, curated by Enzo Simier.',
  authors: [{ name: 'Enzo Simier' }],
  creator: 'Enzo Simier',
  publisher: 'Enzo Simier',
  openGraph: {
    title: 'Reference index · Enzo Simier',
    description: 'A personal library of concepts, connections and things worth reading.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Reference index · Enzo Simier',
    description: 'A personal library of concepts, connections and things worth reading.',
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
