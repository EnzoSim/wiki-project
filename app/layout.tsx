import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Wiki Master Prototype', description: 'Interactive economics wiki with auto-organized concepts and generated concept art.' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
