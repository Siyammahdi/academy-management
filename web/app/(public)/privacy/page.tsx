import type { Metadata } from 'next'

import { LegalPageContent } from '@/components/marketing/legal-page-content'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'How An Nahda Academy collects, uses, and protects personal information for students and payers.',
}

export default function PrivacyPage() {
  return <LegalPageContent document="privacy" />
}
