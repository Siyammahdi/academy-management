'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Container } from '../../../components/layout/container';
import { PageHeader } from '../../../components/layout/page-header';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { LedgerLine } from '../../../components/ledger/ledger-line';
import { ApiError } from '../../../lib/api';
import { payErrorMessage } from '../../../lib/error-message';
import { formatDate, formatMoney } from '../../../lib/format';
import {
  guestLookup,
  guestPayGateway,
  guestPayManual,
} from '../../../lib/guest-api';
import type {
  GuestLookupResult,
  GuestOutstandingDue,
} from '../../../lib/guest-api';

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

type Step = 'identifier' | 'dues' | 'pay';
type PayMode = 'choose' | 'manual' | 'submitted';

function lookupErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.body.error === 'STUDENT_NOT_FOUND') {
    return 'No student found with that ID, phone, or email.';
  }
  return 'This could not be looked up right now. Try again.';
}

export default function GuestPayPage() {
  const [step, setStep] = useState<Step>('identifier');

  // Step 1
  const [identifier, setIdentifier] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestLookupResult | null>(null);

  // Step 2 → 3
  const [selectedDue, setSelectedDue] = useState<GuestOutstandingDue | null>(
    null,
  );

  // Step 3
  const [payMode, setPayMode] = useState<PayMode>('choose');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLookup(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLookupError(null);
    if (!identifier.trim()) {
      setLookupError('Enter a student ID, phone number, or email.');
      return;
    }
    setIsLookingUp(true);
    try {
      const found = await guestLookup(identifier.trim());
      setResult(found);
      setStep('dues');
    } catch (err) {
      setLookupError(lookupErrorMessage(err));
    } finally {
      setIsLookingUp(false);
    }
  }

  function selectDue(due: GuestOutstandingDue): void {
    setSelectedDue(due);
    setAmount(due.amountOutstanding);
    setGuestName('');
    setGuestPhone('');
    setTransactionReference('');
    setProofUrl('');
    setPayMode('choose');
    setPayError(null);
    setStep('pay');
  }

  function backToDues(): void {
    setSelectedDue(null);
    setStep('dues');
  }

  async function handlePayOnline(): Promise<void> {
    if (!selectedDue) {
      return;
    }
    if (!guestName.trim() || !guestPhone.trim()) {
      setPayError('Enter your name and phone number.');
      return;
    }
    setPayError(null);
    setIsSubmitting(true);
    try {
      const { redirectUrl } = await guestPayGateway({
        billingPeriodId: selectedDue.billingPeriodId,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
      });
      window.location.href = redirectUrl;
    } catch (err) {
      setPayError(
        payErrorMessage(err, 'Payment could not be started. Try again.'),
      );
      setIsSubmitting(false);
    }
  }

  async function handleManualSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!selectedDue) {
      return;
    }
    setPayError(null);

    if (!guestName.trim() || !guestPhone.trim()) {
      setPayError('Enter your name and phone number.');
      return;
    }
    if (!DECIMAL_PATTERN.test(amount)) {
      setPayError('Enter an amount like 500.00.');
      return;
    }
    if (!transactionReference.trim()) {
      setPayError('Enter the transaction reference from your payment.');
      return;
    }
    if (!proofUrl.trim()) {
      setPayError('Add a link to your payment proof.');
      return;
    }

    setIsSubmitting(true);
    try {
      await guestPayManual({
        billingPeriodId: selectedDue.billingPeriodId,
        amount,
        transactionReference: transactionReference.trim(),
        proofUrl: proofUrl.trim(),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
      });
      setPayMode('submitted');
    } catch (err) {
      setPayError(
        payErrorMessage(err, 'Payment could not be submitted. Try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container width="marketing" className="py-16">
      <div className="mx-auto flex w-full max-w-narrow flex-col gap-8">
        <PageHeader
          eyebrow="Guest payment"
          title="Pay a student's dues"
          description="Look up a student to see what they owe, then pay one due at a time."
        />

        {step === 'identifier' ? (
          <form onSubmit={handleLookup} className="flex flex-col gap-4" noValidate>
            <Input
              label="Student ID, phone, or email"
              placeholder="ANA-0042"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            {lookupError ? (
              <p className="font-body text-sm text-overdue" role="alert">
                {lookupError}
              </p>
            ) : null}
            <Button type="submit" disabled={isLookingUp}>
              {isLookingUp ? 'Looking up…' : 'Find dues'}
            </Button>
          </form>
        ) : null}

        {step === 'dues' && result ? (
          <div className="flex flex-col gap-6">
            <p className="font-body text-body text-ink">
              Dues for <span className="font-medium">{result.student.fullName}</span>
            </p>

            {result.outstandingDues.length === 0 ? (
              <p className="font-body text-body text-ink-muted">
                No outstanding dues — everything is paid up.
              </p>
            ) : (
              <div className="flex flex-col">
                {result.outstandingDues.map((due) => (
                  <button
                    key={due.billingPeriodId}
                    type="button"
                    onClick={() => selectDue(due)}
                    className="w-full text-left transition-colors hover:bg-paper-sunken"
                  >
                    <LedgerLine
                      periodLabel={formatDate(due.periodMonth, 'month')}
                      detailLabel={`${due.courseTitle} · ${due.batchName}`}
                      dueLabel=""
                      status="unpaid"
                      statusLabel="Outstanding"
                      amount={due.amountOutstanding}
                    />
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setStep('identifier');
              }}
              className="self-start"
            >
              Look up someone else
            </Button>
          </div>
        ) : null}

        {step === 'pay' && selectedDue ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-body text-body text-ink">
                {selectedDue.courseTitle} · {selectedDue.batchName} ·{' '}
                {formatDate(selectedDue.periodMonth, 'month')}
              </span>
              <span className="font-numeric text-h2 font-semibold text-ink">
                {formatMoney(selectedDue.amountOutstanding)}
              </span>
            </div>

            {payMode !== 'submitted' ? (
              <div className="flex flex-col gap-4">
                <Input
                  label="Your name"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
                <Input
                  label="Your phone"
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
            ) : null}

            {payMode === 'choose' ? (
              <div className="flex flex-col gap-3">
                <Button onClick={handlePayOnline} disabled={isSubmitting}>
                  {isSubmitting ? 'Starting…' : 'Pay online'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPayMode('manual')}
                  disabled={isSubmitting}
                >
                  Pay manually
                </Button>
                <Button
                  variant="ghost"
                  onClick={backToDues}
                  disabled={isSubmitting}
                >
                  Back to dues
                </Button>
              </div>
            ) : null}

            {payMode === 'manual' ? (
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
                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting…' : 'Submit payment'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPayMode('choose')}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                </div>
              </form>
            ) : null}

            {payMode === 'submitted' ? (
              <div className="flex flex-col gap-4">
                <p className="font-body text-body text-ink">
                  Payment submitted — awaiting verification.
                </p>
                <Button onClick={backToDues} className="self-start">
                  Pay another due
                </Button>
              </div>
            ) : null}

            {payError ? (
              <p className="font-body text-sm text-overdue" role="alert">
                {payError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Container>
  );
}
