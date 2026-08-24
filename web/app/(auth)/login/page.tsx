'use client'

import { Suspense, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { AuthShell } from '@/components/auth/auth-shell'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { homePathForRoles, login } from '@/lib/auth'
import { loginErrorMessage } from '@/lib/auth-errors'
import { ApiError } from '@/lib/api'

function isSafeInternalPath(value: string | null): value is string {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

/** Temporary quick-fill presets for local / staging sign-in. Remove before production. */
const QUICK_LOGINS = [
  {
    label: 'Admin',
    email: 'admin@nahda.local',
    password: 'ChangeMe123!',
  },
  {
    label: 'Teacher',
    email: 'siyamteacher@gmail.com',
    password: 'siyamteacher',
  },
  {
    label: 'Student',
    email: 'siyamstu@gmail.com',
    password: 'siyamstu',
  },
] as const

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const verifiedBanner = searchParams.get('verified') === '1'

  function fillQuickLogin(preset: (typeof QUICK_LOGINS)[number]): void {
    setEmail(preset.email)
    setPassword(preset.password)
    setError(null)
    setFieldErrors({})
  }

  function validate(): boolean {
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) next.email = 'Enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    if (!password) next.password = 'Enter your password.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    if (!validate()) return

    startTransition(async () => {
      try {
        const result = await login({
          email: email.trim(),
          password,
        })
        const from = searchParams.get('from')
        const destination = isSafeInternalPath(from)
          ? from
          : homePathForRoles(result.user.roles)
        router.replace(destination)
        router.refresh()
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.body.error === 'EMAIL_NOT_VERIFIED'
        ) {
          router.replace(
            `/verify-email?email=${encodeURIComponent(email.trim())}`,
          )
          return
        }
        setError(loginErrorMessage(err))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6" noValidate>
      {verifiedBanner ? (
        <p className="rounded-xl bg-status-paid-bg px-4 py-3 text-sm text-status-paid">
          Email verified. You can sign in now.
        </p>
      ) : null}
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary-wash/60 p-3 sm:p-4 hidden">
        <p className="text-xs font-medium tracking-wide text-primary-strong uppercase">
          Temporary · quick fill
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fills email and password only — then press Sign in.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {QUICK_LOGINS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 bg-background"
              disabled={isPending}
              onClick={() => fillQuickLogin(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <FieldGroup className="gap-4 sm:gap-5">
        <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
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
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }
            }}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            disabled={isPending}
          />
          {fieldErrors.email ? (
            <FieldError>{fieldErrors.email}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center text-xs font-medium text-primary-strong underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
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
            <FieldDescription>
              Use the password you registered with.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {searchParams.get('reset') === '1' && !error ? (
        <div
          role="status"
          className="rounded-xl bg-status-paid-bg px-4 py-3 text-sm text-status-paid"
        >
          Password updated. Sign in with your new password.
        </div>
      ) : null}

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
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

function LoginFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your portal"
      description="Pick up dues, class links, and homework — the same calm view on phone or desktop."
      footer={
        <>
          New here?{' '}
          <Link
            href="/register"
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
