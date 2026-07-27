'use client'

import { Suspense, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'

import { AuthShell } from '@/components/auth/auth-shell'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { resetPassword } from '@/lib/auth'
import { resetPasswordErrorMessage } from '@/lib/auth-errors'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string
    confirm?: string
  }>({})
  const [error, setError] = useState<string | null>(
    token ? null : 'This password reset link is missing a token.',
  )

  function validate(): boolean {
    const next: { password?: string; confirm?: string } = {}
    if (!password) next.password = 'Choose a new password.'
    else if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (!confirm) next.confirm = 'Confirm your new password.'
    else if (confirm !== password) next.confirm = 'Passwords do not match.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    if (!token) {
      setError('This password reset link is missing a token.')
      return
    }
    if (!validate()) return

    startTransition(async () => {
      try {
        await resetPassword(token, password)
        router.replace('/login?reset=1')
        router.refresh()
      } catch (err) {
        setError(resetPasswordErrorMessage(err))
      }
    })
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          This password reset link is invalid. Request a new one.
        </div>
        <Button size="lg" className="h-12 w-full text-base" render={<Link href="/forgot-password" />}>
          Request a new link
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="h-11"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }))
              }
            }}
            invalid={Boolean(fieldErrors.password)}
            disabled={isPending}
          />
          {fieldErrors.password ? (
            <FieldError>{fieldErrors.password}</FieldError>
          ) : (
            <FieldDescription>Minimum 8 characters.</FieldDescription>
          )}
        </Field>

        <Field data-invalid={Boolean(fieldErrors.confirm) || undefined}>
          <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            placeholder="Repeat the new password"
            className="h-11"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              if (fieldErrors.confirm) {
                setFieldErrors((prev) => ({ ...prev, confirm: undefined }))
              }
            }}
            invalid={Boolean(fieldErrors.confirm)}
            disabled={isPending}
          />
          {fieldErrors.confirm ? (
            <FieldError>{fieldErrors.confirm}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Saving…
          </>
        ) : (
          'Set new password'
        )}
      </Button>
    </form>
  )
}

function ResetFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Almost done"
      title="Choose a new password"
      description="Pick a password you have not used here before. This link works once and expires in 30 minutes."
      footer={
        <>
          Back to{' '}
          <Link
            href="/login"
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<ResetFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
