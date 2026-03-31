import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700'],
});

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'Wiki Master',
    template: '%s | Wiki Master',
  },
  description:
    'A minimal reference index of three terms across law, public policy, and urban economics.',
  openGraph: {
    title: 'Wiki Master',
    description:
      'A minimal reference index of three terms across law, public policy, and urban economics.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Wiki Master',
    description:
      'A minimal reference index of three terms across law, public policy, and urban economics.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
