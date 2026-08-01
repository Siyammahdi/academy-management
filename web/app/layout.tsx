import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter, Geist_Mono, Noto_Sans_Bengali } from 'next/font/google'

import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'
import 'lenis/dist/lenis.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'An Nahda Academy',
    template: '%s · An Nahda Academy',
  },
  description:
    'Enrollment and subscription billing for An Nahda Academy.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'An Nahda',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F1EBF8',
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${notoBengali.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-svh font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
