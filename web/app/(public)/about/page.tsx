import { Container } from '../../../components/layout/container';
import { PageHeader } from '../../../components/layout/page-header';

export default function AboutPage() {
  return (
    <Container width="reading">
      <div className="flex flex-col gap-12 py-16">
        <PageHeader
          eyebrow="About"
          title="An Nahda Academy"
          description="We teach Arabic and Qur'an the way any serious subject deserves to be taught: with structure, patience, and clear expectations — for students, and for the families paying their fees."
        />

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-semibold text-ink">
            What we teach
          </h2>
          <p className="font-body text-body leading-prose text-ink-muted">
            Courses run in structured parts — Basic, Intermediate, Advanced —
            each covering a fixed number of months. A part describes where a
            student is in the curriculum; it doesn&apos;t gate progress or
            change what&apos;s owed. Arabic language and Qur&apos;an
            memorization are taught as ongoing programs, not one-off classes.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-semibold text-ink">
            How enrollment works
          </h2>
          <p className="font-body text-body leading-prose text-ink-muted">
            Each course runs in batches — a cohort with its own start date,
            seats, and enrollment window. Once a batch opens, you can enroll
            until it fills or the window closes, whichever comes first.
            There&apos;s no waitlist: when a batch is full, we open the next
            one.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-semibold text-ink">
            Paying fees
          </h2>
          <p className="font-body text-body leading-prose text-ink-muted">
            Fees are fixed when a batch opens and don&apos;t change for
            students already enrolled in it. You can pay online or in
            person, and every payment is confirmed the same way — whether
            it&apos;s a card, a mobile wallet, or a receipt handed to a
            manager.
          </p>
        </section>
      </div>
    </Container>
  );
}
