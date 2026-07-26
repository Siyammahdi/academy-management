'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '../layout/page-header';
import { Button } from '../ui/button';
import { listMyPayments } from '../../lib/api-client';
import type { PaymentWithContext } from '../../lib/api-client';

export type PaymentRedirectIntent = 'success' | 'fail' | 'cancel';

interface PaymentStatusContentProps {
  intent: PaymentRedirectIntent;
}

// PAY-03 — the webhook settles the payment, never this redirect. This page
// only displays whatever the API's real, current status says; it never
// claims success on the strength of the browser landing here, even on
// /payments/success.
function PaymentStatusContent({ intent }: PaymentStatusContentProps) {
  const searchParams = useSearchParams();
  const tranId = searchParams.get('tran_id');
  const [payment, setPayment] = useState<PaymentWithContext | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listMyPayments(1, 20)
      .then((result) => {
        if (cancelled) {
          return;
        }
        const match = tranId
          ? result.data.find((p) => p.transactionReference === tranId)
          : result.data[0];
        setPayment(match ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your payment status could not be checked.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tranId, refreshKey]);

  let heading: string;
  let body: string;
  let showRefresh = false;

  if (error) {
    heading = 'Could not check payment status';
    body = error;
  } else if (payment === undefined) {
    heading = 'Checking your payment…';
    body = 'One moment.';
  } else if (payment === null) {
    heading = intent === 'cancel' ? 'Payment cancelled' : 'Payment status unknown';
    body =
      intent === 'cancel'
        ? 'You cancelled before completing the payment. No charge was made.'
        : 'We could not find a matching payment. Check your dues page for the current balance.';
  } else if (payment.status === 'verified') {
    heading = 'Payment verified';
    body = 'Your dues have been updated.';
  } else if (payment.status === 'rejected') {
    heading = 'Payment rejected';
    body =
      'This payment could not be verified. Contact an admin or try again from your dues page.';
  } else if (payment.status === 'expired') {
    heading = 'Payment session expired';
    body = 'This payment was not completed in time. Try again from your dues page.';
  } else {
    heading = 'Processing';
    body = 'Your payment is awaiting confirmation. This can take a minute.';
    showRefresh = true;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Dashboard" title={heading} />
      <p className="font-body text-body text-ink-muted">{body}</p>
      <div className="flex gap-3">
        {showRefresh ? (
          <Button
            variant="secondary"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Check again
          </Button>
        ) : null}
        <Link href="/dashboard/dues">
          <Button>Go to dues</Button>
        </Link>
      </div>
    </div>
  );
}

export function PaymentStatusPage(props: PaymentStatusContentProps) {
  return (
    <Suspense
      fallback={
        <p className="font-body text-body text-ink-muted">Loading…</p>
      }
    >
      <PaymentStatusContent {...props} />
    </Suspense>
  );
}
