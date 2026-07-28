import type { Metadata } from 'next'

import { AboutPageContent } from '@/components/marketing/about-page-content'

export const metadata: Metadata = {
  title: 'About',
  description:
    'An Nahda Academy teaches Arabic and the Qur’an in small batches, with fixed fees, clear enrollment windows, and live classes on Zoom and Telegram.',
}

export default function AboutPage() {
  return <AboutPageContent />
}
