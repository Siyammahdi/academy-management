import Link from 'next/link';
import { Container } from '../../../components/layout/container';
import { PageHeader } from '../../../components/layout/page-header';

const CONTACT_EMAIL = 'admissions@annahda.academy';
const CONTACT_PHONE = '+880 1700-000000';

export default function ContactPage() {
  return (
    <Container width="reading">
      <div className="flex flex-col gap-12 py-16">
        <PageHeader
          eyebrow="Contact"
          title="Get in touch"
          description="Questions about enrollment, fees, or a payment — reach us directly. We typically reply within one working day."
        />

        <div className="flex flex-col">
          <div className="flex items-center justify-between border-t border-rule py-4">
            <span className="font-body text-body text-ink-muted">Email</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-body text-body text-purple hover:text-purple-deep"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="flex items-center justify-between border-t border-b border-rule py-4">
            <span className="font-body text-body text-ink-muted">Phone</span>
            <a
              href={`tel:${CONTACT_PHONE.replace(/[^+\d]/g, '')}`}
              className="font-body text-body text-purple hover:text-purple-deep"
            >
              {CONTACT_PHONE}
            </a>
          </div>
        </div>

        <p className="font-body text-body text-ink-muted">
          Already a student?{' '}
          <Link href="/login" className="text-purple hover:text-purple-deep">
            Log in
          </Link>{' '}
          to view your dues and payment history directly.
        </p>
      </div>
    </Container>
  );
}
