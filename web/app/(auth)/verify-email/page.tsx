'use client'

import { Suspense, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { resendEmailVerification, verifyEmail } from '@/lib/auth'
import {
  resendVerificationErrorMessage,
  verifyEmailErrorMessage,
} from '@/lib/auth-errors'

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(
    initialEmail
      ? 'We sent a 6-digit code to your email. Enter it below to activate your account.'
      : null,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !/^\d{6}$/.test(code.trim())) {
      setError('Enter your email and the 6-digit code.')
      return
    }

    startTransition(async () => {
      try {
        await verifyEmail(email.trim(), code.trim())
        router.replace('/login?verified=1')
        router.refresh()
      } catch (err) {
        setError(verifyEmailErrorMessage(err))
      }
    })
  }

  function handleResend(): void {
    setError(null)
    if (!email.trim()) {
      setError('Enter your email to resend a code.')
      return
    }
    startTransition(async () => {
      try {
        const result = await resendEmailVerification(email.trim())
        setInfo(result.message)
      } catch (err) {
        setError(resendVerificationErrorMessage(err))
      }
    })
  }

  return (
    <AuthShell
      eyebrow="Almost there"
      title="Verify your email"
      description="Enter the code we sent you. You will sign in after verification."
      footer={
        <>
          Already verified?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5 sm:space-y-6"
        noValidate
      >
        {info ? (
          <p className="rounded-xl bg-primary-wash px-4 py-3 text-sm text-primary-strong">
            {info}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
          >
            {error}
          </p>
        ) : null}

        <FieldGroup className="gap-4 sm:gap-5">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="code">Verification code</FieldLabel>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-11 tracking-[0.3em]"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
            <FieldDescription>
              Codes expire after a few minutes.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" className="min-h-11 flex-1" disabled={isPending}>
            {isPending ? 'Verifying…' : 'Verify email'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isPending}
            onClick={handleResend}
          >
            Resend code
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md space-y-4 p-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  )
}
