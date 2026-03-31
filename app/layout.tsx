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
  applicationName: 'Wiki Master',
  description:
    'Editorial economics wiki prototype with searchable concepts, category mapping, and generated concept art.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Wiki Master',
    description:
      'Explore economics concepts through a visually led, searchable wiki seeded from markdown.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wiki Master',
    description:
      'Explore economics concepts through a visually led, searchable wiki seeded from markdown.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} appBody`}>
        <div className="siteBackground" aria-hidden="true">
          <div className="siteAura siteAuraLeft" />
          <div className="siteAura siteAuraRight" />
          <div className="siteGrid" />
        </div>
        <div className="siteFrame">{children}</div>
      </body>
    </html>
  );
}
