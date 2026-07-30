'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeftIcon,
  LockIcon,
  SearchIcon,
  ShieldCheckIcon,
  WalletIcon,
} from 'lucide-react'

import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { Container } from '@/components/layout/container'
import { AmountCell } from '@/components/money/amount-cell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { payErrorMessage } from '@/lib/error-message'
import { formatDate, formatMoney } from '@/lib/format'
import {
  guestLookup,
  guestPayGateway,
  guestPayManual,
} from '@/lib/guest-api'
import type {
  GuestLookupResult,
  GuestOutstandingDue,
} from '@/lib/guest-api'

type Step = 'identifier' | 'dues' | 'pay'
type PayMode = 'choose' | 'manual' | 'submitted'

function lookupErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.body.error === 'STUDENT_NOT_FOUND') {
    return 'No student found with that ID, phone, or email.'
  }
  return 'This could not be looked up right now. Try again.'
}

export default function GuestPayPage() {
  const [step, setStep] = useState<Step>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [result, setResult] = useState<GuestLookupResult | null>(null)
  const [selectedDue, setSelectedDue] = useState<GuestOutstandingDue | null>(
    null,
  )
  const [payMode, setPayMode] = useState<PayMode>('choose')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [transactionReference, setTransactionReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [payError, setPayError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLookup(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setLookupError(null)
    if (!identifier.trim()) {
      setLookupError('Enter a student ID, phone number, or email.')
      return
    }
    setIsLookingUp(true)
    try {
      const found = await guestLookup(identifier.trim())
      setResult(found)
      setStep('dues')
    } catch (err) {
      setLookupError(lookupErrorMessage(err))
    } finally {
      setIsLookingUp(false)
    }
  }

  function selectDue(due: GuestOutstandingDue): void {
    setSelectedDue(due)
    setGuestName('')
    setGuestPhone('')
    setTransactionReference('')
    setProofUrl('')
    setPayMode('choose')
    setPayError(null)
    setStep('pay')
  }

  async function handlePayOnline(): Promise<void> {
    if (!selectedDue) return
    if (!guestName.trim() || !guestPhone.trim()) {
      setPayError('Enter your name and phone number.')
      return
    }
    setPayError(null)
    setIsSubmitting(true)
    try {
      const { redirectUrl } = await guestPayGateway({
        billingPeriodId: selectedDue.billingPeriodId,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
      })
      window.location.href = redirectUrl
    } catch (err) {
      setPayError(
        payErrorMessage(err, 'Payment could not be started. Try again.'),
      )
      setIsSubmitting(false)
    }
  }

  async function handleManualSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    if (!selectedDue) return
    setPayError(null)
    if (!guestName.trim() || !guestPhone.trim()) {
      setPayError('Enter your name and phone number.')
      return
    }
    if (!transactionReference.trim()) {
      setPayError('Enter the transaction reference from your payment.')
      return
    }
    if (!/^https:\/\/.+/i.test(proofUrl.trim())) {
      setPayError('Proof must be an https link to your receipt or screenshot.')
      return
    }
    setIsSubmitting(true)
    try {
      await guestPayManual({
        billingPeriodId: selectedDue.billingPeriodId,
        amount: selectedDue.amountOutstanding,
        transactionReference: transactionReference.trim(),
        proofUrl: proofUrl.trim(),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
      })
      setPayMode('submitted')
    } catch (err) {
      setPayError(
        payErrorMessage(err, 'Payment could not be submitted. Try again.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative overflow-hidden bg-background py-14 sm:py-20">
      <LandingAtmosphere tone="wash" density="sparse" />
      <Container width="marketing" className="relative z-10">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
            Guest payment
          </p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Pay a student due
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Look up by student ID, phone, or email. Amounts are fixed by the
            academy — you cannot change what is owed here.
          </p>

          <ol className="mt-8 flex gap-2 text-xs font-medium">
            {(
              [
                ['identifier', '1 · Find'],
                ['dues', '2 · Choose'],
                ['pay', '3 · Pay'],
              ] as const
            ).map(([key, label]) => (
              <li
                key={key}
                className={
                  step === key
                    ? 'rounded-md bg-primary-wash px-2.5 py-1 text-primary-strong'
                    : 'rounded-md px-2.5 py-1 text-muted-foreground'
                }
              >
                {label}
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-xl bg-muted/50 p-5 sm:p-7">
            {step === 'identifier' ? (
              <form
                onSubmit={handleLookup}
                className="flex flex-col gap-4"
                noValidate
              >
                <Input
                  label="Student ID, phone, or email"
                  required
                  autoComplete="off"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ANA-0001 or 01XXXXXXXXX"
                />
                {lookupError ? (
                  <p className="text-sm text-status-overdue" role="alert">
                    {lookupError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="min-h-11"
                  loading={isLookingUp}
                >
                  <SearchIcon />
                  {isLookingUp ? 'Looking up…' : 'Find dues'}
                </Button>
              </form>
            ) : null}

            {step === 'dues' && result ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Paying for</p>
                  <p className="font-heading text-lg font-semibold text-foreground">
                    {result.student.fullName}
                  </p>
                </div>
                {result.outstandingDues.length === 0 ? (
                  <p className="rounded-lg bg-status-paid-bg px-4 py-3 text-sm text-status-paid">
                    No open dues for this student.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {result.outstandingDues.map((due) => (
                      <li key={due.billingPeriodId}>
                        <button
                          type="button"
                          onClick={() => selectDue(due)}
                          className="flex w-full flex-col gap-1 rounded-xl bg-background/80 px-4 py-4 text-left transition-colors hover:bg-primary-wash"
                        >
                          <span className="font-medium text-foreground">
                            {due.courseTitle} · {due.batchName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(due.periodMonth, 'month')}
                          </span>
                          <AmountCell
                            amount={due.amountOutstanding}
                            className="mt-1 text-base font-semibold"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="ghost"
                  className="min-h-11 self-start"
                  onClick={() => {
                    setStep('identifier')
                    setResult(null)
                  }}
                >
                  <ArrowLeftIcon />
                  Look up someone else
                </Button>
              </div>
            ) : null}

            {step === 'pay' && selectedDue ? (
              <div className="flex flex-col gap-5">
                <div className="rounded-xl bg-primary-wash px-4 py-4">
                  <p className="text-sm text-primary-strong/80">
                    {selectedDue.courseTitle} · {selectedDue.batchName} ·{' '}
                    {formatDate(selectedDue.periodMonth, 'month')}
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
                    {formatMoney(selectedDue.amountOutstanding)}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LockIcon className="size-3.5" />
                    Amount locked to the outstanding balance
                  </p>
                </div>

                {payMode !== 'submitted' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
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
                    <button
                      type="button"
                      onClick={() => {
                        void handlePayOnline()
                      }}
                      disabled={isSubmitting}
                      className="flex min-h-14 items-start gap-3 rounded-xl bg-primary px-4 py-3 text-left text-primary-foreground"
                    >
                      <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
                        <ShieldCheckIcon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium">
                          {isSubmitting
                            ? 'Opening checkout…'
                            : 'Pay online'}
                        </span>
                        <span className="mt-0.5 block text-xs text-primary-foreground/80">
                          SSLCommerz · unlocks after bank confirm
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMode('manual')}
                      disabled={isSubmitting}
                      className="flex min-h-14 items-start gap-3 rounded-xl bg-background/80 px-4 py-3 text-left"
                    >
                      <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-status-pending/15 text-status-pending">
                        <WalletIcon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          Pay manually
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Reference + https proof · manager verifies
                        </span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      className="min-h-11 self-start"
                      onClick={() => {
                        setSelectedDue(null)
                        setStep('dues')
                      }}
                    >
                      <ArrowLeftIcon />
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
                      label="Transaction reference"
                      required
                      autoComplete="off"
                      value={transactionReference}
                      onChange={(e) =>
                        setTransactionReference(e.target.value)
                      }
                    />
                    <Input
                      label="Proof link (https)"
                      type="url"
                      required
                      autoComplete="off"
                      placeholder="https://…"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11"
                        onClick={() => setPayMode('choose')}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="min-h-11"
                        loading={isSubmitting}
                      >
                        Submit for verification
                      </Button>
                    </div>
                  </form>
                ) : null}

                {payMode === 'submitted' ? (
                  <div className="rounded-xl bg-status-pending-bg px-4 py-4">
                    <p className="font-heading font-semibold text-foreground">
                      Payment submitted
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A manager will verify the proof. The student sees the
                      update on their dashboard when it clears.
                    </p>
                  </div>
                ) : null}

                {payError ? (
                  <p className="text-sm text-status-overdue" role="alert">
                    {payError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </div>
  )
}
