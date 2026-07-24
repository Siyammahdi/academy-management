'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ApiError } from '../../lib/api';
import { apiErrorMessage } from '../../lib/error-message';
import { formatMoney } from '../../lib/format';
import { payGateway, payManual } from '../../lib/admin-api';

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

function payErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    // BIL-10 — advance payment refused while earlier periods are unpaid.
    if (err.body.error === 'ARREARS_EXIST') {
      return 'Pay your earlier dues first — this period is next in line after that.';
    }
    if (err.body.error === 'PERIOD_ALREADY_PAID') {
      return 'This period is already fully paid.';
    }
    return apiErrorMessage(err.body, fallback);
  }
  return fallback;
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingPeriodId: string;
  periodLabel: string;
  outstanding: string;
  onSubmitted: () => void;
}

type Mode = 'choose' | 'manual' | 'submitted';

// PAY-03 — this only ever creates a pending payment or starts a gateway
// session. It never settles anything: the webhook is the sole source of
// truth for that, both for gateway (async) and manual (verified later by a
// manager/admin).
export function PaymentModal({
  isOpen,
  onClose,
  billingPeriodId,
  periodLabel,
  outstanding,
  onSubmitted,
}: PaymentModalProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [amount, setAmount] = useState(outstanding);
  const [transactionReference, setTransactionReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset(): void {
    setMode('choose');
    setAmount(outstanding);
    setTransactionReference('');
    setProofUrl('');
    setError(null);
  }

  function handleClose(): void {
    reset();
    onClose();
  }

  async function handlePayOnline(): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      const { redirectUrl } = await payGateway(billingPeriodId);
      window.location.href = redirectUrl;
    } catch (err) {
      setError(
        payErrorMessage(
          err,
          'Payment could not be started. Try again or contact an admin.',
        ),
      );
      setIsSubmitting(false);
    }
  }

  async function handleManualSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!DECIMAL_PATTERN.test(amount)) {
      setError('Enter an amount like 500.00.');
      return;
    }
    if (!transactionReference.trim()) {
      setError('Enter the transaction reference from your payment.');
      return;
    }
    if (!proofUrl.trim()) {
      setError('Add a link to your payment proof.');
      return;
    }

    setIsSubmitting(true);
    try {
      await payManual(billingPeriodId, { amount, transactionReference, proofUrl });
      setMode('submitted');
    } catch (err) {
      setError(
        payErrorMessage(
          err,
          'Payment could not be submitted. Try again or contact an admin.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDone(): void {
    reset();
    onSubmitted();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pay this due">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-body text-body text-ink">{periodLabel}</span>
          <span className="font-numeric text-h3 font-semibold text-ink">
            {formatMoney(outstanding)}
          </span>
        </div>

        {mode === 'choose' ? (
          <div className="flex flex-col gap-3">
            <Button onClick={handlePayOnline} disabled={isSubmitting}>
              {isSubmitting ? 'Starting…' : 'Pay online'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMode('manual')}
              disabled={isSubmitting}
            >
              Pay manually
            </Button>
          </div>
        ) : null}

        {mode === 'manual' ? (
          <form
            onSubmit={handleManualSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              label="Amount (৳)"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              label="Transaction reference"
              required
              placeholder="e.g. bKash TrxID"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
            <Input
              label="Proof URL"
              type="url"
              required
              placeholder="Link to a screenshot or receipt"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode('choose')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit payment'}
              </Button>
            </div>
          </form>
        ) : null}

        {mode === 'submitted' ? (
          <div className="flex flex-col gap-4">
            <p className="font-body text-body text-ink">
              Payment submitted — awaiting verification.
            </p>
            <Button onClick={handleDone} className="self-start">
              Done
            </Button>
          </div>
        ) : null}

        {error ? (
          <p className="font-body text-sm text-overdue" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
