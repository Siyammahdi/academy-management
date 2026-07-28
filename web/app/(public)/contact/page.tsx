import type { Metadata } from 'next'

import { ContactPageContent } from '@/components/marketing/contact-page-content'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach An Nahda Academy admissions about programs, batch dates, fees, or a payment that needs checking.',
}

export default function ContactPage() {
  return <ContactPageContent />
}
