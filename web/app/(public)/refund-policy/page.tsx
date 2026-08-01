import type { Metadata } from 'next'

import { LegalPageContent } from '@/components/marketing/legal-page-content'

export const metadata: Metadata = {
  title: 'Return & refund policy',
  description:
    'When An Nahda Academy may refund fees for live educational services and portal access.',
}

export default function RefundPolicyPage() {
  return <LegalPageContent document="refund" />
}
