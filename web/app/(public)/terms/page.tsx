import type { Metadata } from 'next'

import { LegalPageContent } from '@/components/marketing/legal-page-content'

export const metadata: Metadata = {
  title: 'Terms & conditions',
  description:
    'Terms governing use of An Nahda Academy’s website, student portal, and paid programs.',
}

export default function TermsPage() {
  return <LegalPageContent document="terms" />
}
