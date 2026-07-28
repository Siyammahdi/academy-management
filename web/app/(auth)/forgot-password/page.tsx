'use client'

import { useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'

import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { forgotPassword } from '@/lib/auth'
import { forgotPasswordErrorMessage } from '@/lib/auth-errors'

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function validate(): boolean {
    if (!email.trim()) {
      setFieldError('Enter your email.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter a valid email address.')
      return false
    }
    setFieldError(null)
    return true
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    if (!validate()) return

    startTransition(async () => {
      try {
        await forgotPassword(email.trim())
        setSubmitted(true)
      } catch (err) {
        setError(forgotPasswordErrorMessage(err))
      }
    })
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the email on your account. If it is registered, we will send a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {submitted ? (
        <div
          role="status"
          className="rounded-xl bg-primary-wash px-4 py-4 text-sm leading-relaxed text-primary-strong"
        >
          If that email is registered, a reset link has been sent.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6" noValidate>
          <FieldGroup className="gap-4 sm:gap-5">
            <Field data-invalid={Boolean(fieldError) || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                className="h-11"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldError) setFieldError(null)
                }}
                aria-invalid={Boolean(fieldError) || undefined}
                disabled={isPending}
              />
              {fieldError ? (
                <FieldError>{fieldError}</FieldError>
              ) : (
                <FieldDescription>
                  We never confirm whether an email is registered.
                </FieldDescription>
              )}
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

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base"
            loading={isPending}
          >
            {isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
