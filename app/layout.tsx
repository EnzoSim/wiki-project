import type { Metadata } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const display = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700'],
});

const body = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Wiki Master',
    template: '%s | Wiki Master',
  },
  description:
    'A compact encyclopedia pairing three terms with readable essays and procedural 3D studies.',
  openGraph: {
    title: 'Wiki Master',
    description:
      'A compact encyclopedia pairing three terms with readable essays and procedural 3D studies.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Wiki Master',
    description:
      'A compact encyclopedia pairing three terms with readable essays and procedural 3D studies.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
