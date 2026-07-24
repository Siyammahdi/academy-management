import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// doc 09 §3 — the three roles: Display (Fraunces), Body/UI (Inter),
// Numeric (IBM Plex Mono). Variable names match the doc's own
// --font-display / --font-body / --font-numeric exactly.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'], // doc 09 §3 — never 700+
  variable: '--font-body',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-numeric',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'An Nahda Academy',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
