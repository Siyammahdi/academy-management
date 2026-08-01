'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ChevronDownIcon,
  LockIcon,
  ShieldCheckIcon,
  WalletIcon,
} from 'lucide-react'

import { PolicyAcceptance } from '@/components/payments/policy-acceptance'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { payErrorMessage } from '@/lib/error-message'
import { formatMoney } from '@/lib/format'
import { en } from '@/lib/marketing/en'
import {
  payGateway,
  payManual,
  type GatewayProvider,
} from '@/lib/api-client'
import { cn } from '@/lib/utils'

const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/
const HTTPS_URL_PATTERN = /^https:\/\/.+/i

export interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  billingPeriodId: string
  periodLabel: string
  /** Server-computed outstanding — never edited client-side for money math. */
  outstanding: string
  onSubmitted: () => void
  /** Emphasize enrollment activation after payment. */
  purpose?: 'enrollment' | 'due'
}

type Mode = 'choose' | 'manual' | 'submitted'
type OnlineChoice = 'paystation' | 'sslcommerz'

/**
 * PAY-03 — creates a pending payment or starts a gateway session only.
 * Gateway webhook / confirm is the sole settlement path.
 * PayStation is the primary online option; SSLCommerz + manual are secondary.
 */
export function PaymentModal({
  isOpen,
  onClose,
  billingPeriodId,
  periodLabel,
  outstanding,
  onSubmitted,
  purpose = 'due',
}: PaymentModalProps) {
  const [mode, setMode] = useState<Mode>('choose')
  const [onlineChoice, setOnlineChoice] = useState<OnlineChoice>('paystation')
  const [showOtherOptions, setShowOtherOptions] = useState(false)
  const [transactionReference, setTransactionReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [policiesAccepted, setPoliciesAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setMode('choose')
    setOnlineChoice('paystation')
    setShowOtherOptions(false)
    setTransactionReference('')
    setProofUrl('')
    setPoliciesAccepted(false)
    setError(null)
    setIsSubmitting(false)
  }, [isOpen, billingPeriodId, outstanding])

  function handleClose(): void {
    onClose()
  }

  function requirePolicies(): boolean {
    if (policiesAccepted) return true
    setError(en.checkoutAcceptance.required)
    return false
  }

  async function startOnline(provider: GatewayProvider): Promise<void> {
    if (!requirePolicies()) return
    setError(null)
    setIsSubmitting(true)
    try {
      const { redirectUrl } = await payGateway(billingPeriodId, provider)
      window.location.href = redirectUrl
    } catch (err) {
      setError(
        payErrorMessage(
          err,
          'Payment could not be started. Try again or contact an admin.',
        ),
      )
      setIsSubmitting(false)
    }
  }

  async function handleManualSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setError(null)

    if (!requirePolicies()) return

    if (!DECIMAL_PATTERN.test(outstanding)) {
      setError('This due amount looks invalid. Refresh and try again.')
      return
    }
    if (!transactionReference.trim()) {
      setError('Enter the transaction reference from your payment.')
      return
    }
    if (!HTTPS_URL_PATTERN.test(proofUrl.trim())) {
      setError('Proof must be an https link to your receipt or screenshot.')
      return
    }

    setIsSubmitting(true)
    try {
      await payManual(billingPeriodId, {
        amount: outstanding,
        transactionReference: transactionReference.trim(),
        proofUrl: proofUrl.trim(),
      })
      setMode('submitted')
    } catch (err) {
      setError(
        payErrorMessage(
          err,
          'Payment could not be submitted. Try again or contact an admin.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDone(): void {
    onSubmitted()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={purpose === 'enrollment' ? 'Complete enrollment payment' : 'Pay this due'}
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-xl bg-primary-wash px-4 py-4">
          <p className="text-sm text-primary-strong/80">{periodLabel}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground">
            {formatMoney(outstanding)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockIcon className="size-3.5 shrink-0" />
            Amount is fixed to what you owe — it cannot be changed here.
          </p>
        </div>

        {purpose === 'enrollment' && mode === 'choose' ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pay now to activate your seat. Online payment unlocks class as soon
            as the bank confirms — no manager verification. Manual payment stays
            pending until a manager verifies your proof.
          </p>
        ) : null}

        {mode !== 'submitted' ? (
          <PolicyAcceptance
            checked={policiesAccepted}
            onCheckedChange={(next) => {
              setPoliciesAccepted(next)
              if (next) setError(null)
            }}
            copy={en.checkoutAcceptance}
            invalid={Boolean(error && !policiesAccepted)}
          />
        ) : null}

        {mode === 'choose' ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setOnlineChoice('paystation')
                void startOnline('paystation')
              }}
              disabled={isSubmitting}
              className={cn(
                'flex min-h-16 items-start gap-3 rounded-xl bg-primary px-4 py-3.5 text-left text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background transition-opacity',
                isSubmitting && onlineChoice === 'paystation' && 'opacity-70',
              )}
            >
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                <ShieldCheckIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="block text-sm font-semibold">
                    {isSubmitting && onlineChoice === 'paystation'
                      ? 'Opening PayStation…'
                      : 'Pay with PayStation'}
                  </span>
                  <span className="rounded-md bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                    Recommended
                  </span>
                </span>
                <span className="mt-1 block text-xs text-primary-foreground/80">
                  Card &amp; mobile banking · unlocks after bank confirm
                </span>
              </span>
            </button>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowOtherOptions((open) => !open)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>Other payment options</span>
                <ChevronDownIcon
                  className={cn(
                    'size-4 transition-transform',
                    showOtherOptions && 'rotate-180',
                  )}
                />
              </button>

              {showOtherOptions ? (
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOnlineChoice('sslcommerz')
                      void startOnline('sslcommerz')
                    }}
                    disabled={isSubmitting}
                    className="flex min-h-12 items-start gap-3 rounded-xl bg-muted/60 px-3.5 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary-strong">
                      <ShieldCheckIcon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {isSubmitting && onlineChoice === 'sslcommerz'
                          ? 'Opening SSLCommerz…'
                          : 'Pay with SSLCommerz'}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Alternate online checkout
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    disabled={isSubmitting}
                    className="flex min-h-12 items-start gap-3 rounded-xl bg-muted/60 px-3.5 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-pending/15 text-status-pending">
                      <WalletIcon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        Pay manually
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        bKash / bank transfer · needs reference + proof
                      </span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {mode === 'manual' ? (
          <form
            onSubmit={handleManualSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Amount due
              </p>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
                {formatMoney(outstanding)}
              </p>
            </div>
            <Input
              label="Transaction reference"
              required
              autoComplete="off"
              placeholder="e.g. bKash TrxID"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              Upload your receipt to Drive, Dropbox, or similar and paste the
              share link. Only https links are accepted. A manager verifies
              before your enrollment or period updates.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={() => {
                  setMode('choose')
                  setError(null)
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="min-h-11"
                loading={isSubmitting}
              >
                {isSubmitting ? 'Submitting…' : 'Submit for verification'}
              </Button>
            </div>
          </form>
        ) : null}

        {mode === 'submitted' ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-status-pending-bg px-4 py-4">
              <p className="font-heading text-base font-semibold text-foreground">
                Payment submitted
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {purpose === 'enrollment'
                  ? 'Your seat is reserved. Classroom tools unlock after a manager verifies this payment — or pay online next time for instant activation.'
                  : 'This due stays pending until a manager verifies your proof.'}
              </p>
            </div>
            <Button className="min-h-11 self-start" onClick={handleDone}>
              Done
            </Button>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-status-overdue" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
