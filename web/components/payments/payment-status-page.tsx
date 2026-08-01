'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PaymentReceipt } from '@/components/payments/payment-receipt'
import { Modal } from '@/components/ui/modal'
import {
  confirmGatewayPayment,
  abandonGatewayPayment,
  listMyPayments,
  type PaymentWithContext,
} from '@/lib/api-client'
import { getAccessToken } from '@/lib/session'
import { useStudentEnrollment } from '@/components/student/student-enrollment-provider'

export type PaymentRedirectIntent = 'success' | 'fail' | 'cancel'

interface PaymentStatusContentProps {
  intent: PaymentRedirectIntent
}

/**
 * PAY-03 — settlement is never "trusted from the browser alone".
 * On success we call /payments/gateway/confirm which validates with
 * SSLCommerz and activates enrollment (ENR-06). IPN does the same.
 */
function PaymentStatusContent({ intent }: PaymentStatusContentProps) {
  const searchParams = useSearchParams()
  const providerParam = searchParams.get('provider')
  const provider =
    providerParam === 'paystation' || providerParam === 'sslcommerz'
      ? providerParam
      : searchParams.get('val_id')
        ? 'sslcommerz'
        : 'paystation'
  const tranId = searchParams.get('tran_id')
  const valId = searchParams.get('val_id')
  const trxId = searchParams.get('trx_id')
  const signedIn = Boolean(getAccessToken())
  const { reload: reloadEnrollment } = useStudentEnrollment()
  const [payment, setPayment] = useState<
    PaymentWithContext | null | undefined
  >(signedIn ? undefined : null)
  const [confirmStatus, setConfirmStatus] = useState<
    'idle' | 'confirming' | 'verified' | 'failed' | 'pending'
  >('idle')
  const [enrollmentActivated, setEnrollmentActivated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    if (intent !== 'success' || !tranId) return
    if (provider === 'sslcommerz' && !valId) return
    let cancelled = false

    async function confirm(): Promise<void> {
      setConfirmStatus('confirming')
      try {
        const result = await confirmGatewayPayment({
          transactionReference: tranId!,
          provider,
          ...(provider === 'sslcommerz'
            ? { valId: valId! }
            : { trxId: trxId ?? undefined }),
        })
        if (cancelled) return
        if (result.status === 'verified') {
          setConfirmStatus('verified')
          setEnrollmentActivated(result.enrollmentActivated)
          if (signedIn) {
            await reloadEnrollment()
          }
        } else if (result.status === 'pending') {
          setConfirmStatus('pending')
        } else {
          setConfirmStatus('failed')
        }
      } catch {
        if (!cancelled) {
          setConfirmStatus('failed')
        }
      }
    }

    void confirm()
    return () => {
      cancelled = true
    }
  }, [intent, tranId, valId, trxId, provider, signedIn, reloadEnrollment])

  useEffect(() => {
    if ((intent !== 'cancel' && intent !== 'fail') || !tranId) return
    let cancelled = false

    async function abandon(): Promise<void> {
      try {
        await abandonGatewayPayment(tranId!)
        if (!cancelled && signedIn) {
          await reloadEnrollment()
        }
      } catch {
        // Best-effort — PAY-05 expiry still cleans up if this fails.
      }
    }

    void abandon()
    return () => {
      cancelled = true
    }
  }, [intent, tranId, signedIn, reloadEnrollment])

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    listMyPayments(1, 20)
      .then((result) => {
        if (cancelled) return
        const match = tranId
          ? result.data.find((p) => p.transactionReference === tranId)
          : result.data[0]
        setPayment(match ?? null)
        if (match?.status === 'verified') {
          setConfirmStatus('verified')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Your payment status could not be checked.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [tranId, refreshKey, signedIn, confirmStatus])

  const isVerified =
    confirmStatus === 'verified' || payment?.status === 'verified'

  let heading: string
  let body: string
  let showRefresh = false

  if (intent === 'cancel') {
    heading = 'Payment cancelled'
    body =
      'You cancelled before completing the payment. No charge was made — you can enroll again and pay when ready.'
  } else if (intent === 'fail') {
    heading = 'Payment did not complete'
    body = signedIn
      ? 'The online payment was not completed. Go back to enroll or applications and try again.'
      : 'The online payment was not completed. Try again from the guest pay page.'
  } else if (!signedIn && confirmStatus === 'confirming') {
    heading = 'Confirming payment…'
    body = 'Checking with the bank. This usually takes a few seconds.'
  } else if (!signedIn && isVerified) {
    heading = 'Payment successful'
    body =
      'The fee is settled. The student can sign in — classroom access is unlocked without manager verification.'
  } else if (!signedIn) {
    heading = 'Payment submitted'
    body =
      'If the charge succeeded, confirmation usually finishes within a minute. The student will see unlocked access on their dashboard.'
  } else if (error) {
    heading = 'Could not check payment status'
    body = error
  } else if (confirmStatus === 'pending') {
    heading = 'Payment is processing'
    body =
      'The bank has not finished confirming yet. Wait a moment, then refresh — or check your dues shortly.'
    showRefresh = true
  } else if (
    payment === undefined ||
    confirmStatus === 'confirming' ||
    (confirmStatus === 'idle' &&
      tranId &&
      (provider === 'paystation' || Boolean(valId)))
  ) {
    heading = 'Confirming your payment…'
    body =
      'Validating with the bank. Online payments unlock your course automatically — no manager verification.'
  } else if (isVerified) {
    heading = enrollmentActivated
      ? 'You are enrolled'
      : 'Payment successful'
    body = enrollmentActivated
      ? 'Your online payment is confirmed. Classroom, homework, and courses are unlocked — no manager verification needed.'
      : 'Your dues have been updated. Open your dashboard to continue.'
  } else if (payment === null) {
    heading = 'Payment status unknown'
    body =
      'We could not find a matching payment. Check your dues page for the current balance.'
  } else if (payment.status === 'rejected') {
    heading = 'Payment rejected'
    body =
      'This payment could not be verified. Contact an admin or try again from your dues page.'
  } else if (payment.status === 'expired') {
    heading = 'Payment session expired'
    body =
      'This payment was not completed in time. Try again from your dues page.'
  } else {
    heading = 'Still confirming'
    body =
      'The bank has not finished confirming yet. Online payments do not need manager review — check again in a moment.'
    showRefresh = true
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary-strong">Payment</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h1>
        <p className="text-sm text-muted-foreground">{body}</p>
        {tranId ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            Reference {tranId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {showRefresh ? (
          <Button
            variant="secondary"
            className="min-h-11"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Check again
          </Button>
        ) : null}
        {signedIn ? (
          <>
            <Button
              className="min-h-11"
              render={
                <Link
                  href={
                    isVerified && enrollmentActivated
                      ? '/dashboard'
                      : '/dashboard/dues'
                  }
                />
              }
            >
              {isVerified && enrollmentActivated
                ? 'Go to dashboard'
                : 'Go to dues'}
            </Button>
            {isVerified && enrollmentActivated ? (
              <Button
                variant="secondary"
                className="min-h-11"
                render={<Link href="/dashboard/classroom" />}
              >
                Open classroom
              </Button>
            ) : null}
            {isVerified && payment ? (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setShowReceipt(true)}
              >
                View receipt
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button className="min-h-11" render={<Link href="/pay" />}>
              Guest pay
            </Button>
            <Button
              variant="secondary"
              className="min-h-11"
              render={<Link href="/login" />}
            >
              Student login
            </Button>
          </>
        )}
      </div>

      {showReceipt && payment ? (
        <Modal
          isOpen
          onClose={() => setShowReceipt(false)}
          title="Payment receipt"
        >
          <PaymentReceipt payment={payment} />
        </Modal>
      ) : null}
    </div>
  )
}

export function PaymentStatusPage(props: PaymentStatusContentProps) {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-10 text-sm text-muted-foreground">Loading…</p>
      }
    >
      <PaymentStatusContent {...props} />
    </Suspense>
  )
}
