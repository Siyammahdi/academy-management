'use client'

import { Suspense, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'

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

function isSafeInternalPath(value: string | null): value is string {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

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
        setError(loginErrorMessage(err))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(fieldErrors.email) || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
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
              className="text-xs font-medium text-primary-strong underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
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
          className="rounded-2xl border border-status-paid/20 bg-status-paid-bg px-3.5 py-3 text-sm text-status-paid"
        >
          Password updated. Sign in with your new password.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-status-overdue/20 bg-status-overdue-bg px-3.5 py-3 text-sm text-status-overdue"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
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
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage enrollments, dues, and payments."
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
