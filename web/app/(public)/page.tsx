import type { Metadata } from 'next'

import { LandingPage } from '@/components/marketing/landing-page'

export const metadata: Metadata = {
  title: 'An Nahda Academy',
  description:
    'Arabic and Qur’an study with structured enrollment, clear fees, live class links, homework, and recordings — for students and families.',
}

export default function HomePage() {
  return <LandingPage />
}
