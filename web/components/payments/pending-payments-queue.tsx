'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../layout/page-header';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { LedgerLine } from '../ledger/ledger-line';
import { ApiError } from '../../lib/api';
import { apiErrorMessage } from '../../lib/error-message';
import { formatDate } from '../../lib/format';
import {
  listPendingPayments,
  rejectPayment,
  verifyPayment,
} from '../../lib/admin-api';
import type { PendingPayment } from '../../lib/admin-api';

const LIMIT = 20;

function paymentActionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.body.error === 'PAYMENT_ALREADY_SETTLED') {
      return 'This payment has already been settled.';
    }
    // RBAC-03 — the API is the authority on this; the UI just surfaces its
    // decision in doc 09 §7's voice instead of the raw error code.
    if (err.body.error === 'SELF_APPROVAL_FORBIDDEN') {
      return 'You cannot approve actions on your own enrollment.';
    }
    return apiErrorMessage(err.body, fallback);
  }
  return fallback;
}

export interface PendingPaymentsQueueProps {
  eyebrow: string;
  description: string;
}

// GET /payments/pending is scoped server-side (managers see only their own
// batches, admins see everything) — the same queue, verify, and reject
// logic is identical for both roles, so this is the one shared component
// rather than two near-duplicate pages.
export function PendingPaymentsQueue({
  eyebrow,
  description,
}: PendingPaymentsQueueProps) {
  const [page, setPage] = useState(1);
  const [payments, setPayments] = useState<PendingPayment[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingPayment | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    listPendingPayments(page, LIMIT)
      .then((result) => {
        if (!cancelled) {
          setPayments(result.data);
          setTotalPages(result.meta.totalPages);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('The verification queue could not be loaded. Try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  async function handleVerify(payment: PendingPayment): Promise<void> {
    setActionError(null);
    setBusyId(payment.id);
    try {
      await verifyPayment(payment.id);
      setPayments((prev) => prev?.filter((p) => p.id !== payment.id) ?? null);
    } catch (err) {
      setActionError(
        paymentActionErrorMessage(
          err,
          'Payment could not be verified. Try again or contact an admin.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmReject(): Promise<void> {
    if (!rejectTarget) {
      return;
    }
    setActionError(null);
    setBusyId(rejectTarget.id);
    try {
      await rejectPayment(rejectTarget.id);
      setPayments(
        (prev) => prev?.filter((p) => p.id !== rejectTarget.id) ?? null,
      );
      setRejectTarget(null);
    } catch (err) {
      setActionError(
        paymentActionErrorMessage(
          err,
          'Payment could not be rejected. Try again or contact an admin.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={eyebrow} title="Payments" description={description} />

      {error ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="font-body text-sm text-overdue" role="alert">
          {actionError}
        </p>
      ) : null}

      {!error && !payments ? (
        <p className="font-body text-body text-ink-muted">Loading…</p>
      ) : null}

      {payments && payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-body text-body text-ink-muted">
            No payments awaiting verification.
          </p>
        </div>
      ) : null}

      {payments && payments.length > 0 ? (
        <div className="flex flex-col">
          {payments.map((payment) => {
            const { enrollment } = payment.billingPeriod;
            const detailLabel = `${enrollment.student.fullName} — ${enrollment.batch.course.title} · ${enrollment.batch.name}`;
            const isBusy = busyId === payment.id;
            return (
              <div key={payment.id} className="flex flex-col gap-2 py-1">
                <LedgerLine
                  periodLabel={formatDate(
                    payment.billingPeriod.periodMonth,
                    'month',
                  )}
                  detailLabel={detailLabel}
                  dueLabel={`Due ${formatDate(payment.billingPeriod.dueDate)}`}
                  status="pending"
                  statusLabel="Pending"
                  amount={payment.amount}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                  <p className="font-body text-sm text-ink-muted">
                    Reference {payment.transactionReference ?? '—'}
                    {payment.proofUrl ? (
                      <>
                        {' · '}
                        <a
                          href={payment.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple hover:text-purple-deep"
                        >
                          View proof
                        </a>
                      </>
                    ) : null}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="danger"
                      size="compact"
                      disabled={isBusy}
                      onClick={() => setRejectTarget(payment)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="compact"
                      disabled={isBusy}
                      onClick={() => handleVerify(payment)}
                    >
                      {isBusy ? 'Verifying…' : 'Verify payment'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {payments && totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="compact"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="font-numeric text-sm text-ink-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="compact"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Reject this payment?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              disabled={busyId === rejectTarget?.id}
            >
              {busyId === rejectTarget?.id ? 'Rejecting…' : 'Reject payment'}
            </Button>
          </>
        }
      >
        <p className="font-body text-body text-ink-muted">
          The student will be notified.
        </p>
      </Modal>
    </div>
  );
}
