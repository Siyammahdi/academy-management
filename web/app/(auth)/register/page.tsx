'use client'

import { useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { register } from '@/lib/auth'
import { registerErrorMessage } from '@/lib/auth-errors'

interface FieldErrors {
  fullName?: string
  phone?: string
  email?: string
  password?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function clearField(key: keyof FieldErrors): void {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!fullName.trim()) next.fullName = 'Enter your full name.'
    if (!phone.trim()) next.phone = 'Enter a phone number.'
    if (!email.trim()) next.email = 'Enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    if (!password) next.password = 'Choose a password.'
    else if (password.length < 8) {
      next.password = 'Use at least 8 characters.'
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    if (!validate()) return

    startTransition(async () => {
      try {
        await register({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
        })
        // Registration always assigns the student role (doc 06 §2).
        // persistAuth already stores the preferred workspace as student.
        router.replace('/dashboard')
        router.refresh()
      } catch (err) {
        setError(registerErrorMessage(err))
      }
    })
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your student account"
      description="Register once, then enroll in batches and track each course’s dues on their own."
      footer={
        <>
          Already registered?{' '}
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
        <FieldGroup className="gap-4 sm:gap-5">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <Field data-invalid={Boolean(fieldErrors.fullName) || undefined}>
              <FieldLabel htmlFor="fullName">Full name</FieldLabel>
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Abdullah Rahman"
                className="h-11"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  clearField('fullName')
                }}
                aria-invalid={Boolean(fieldErrors.fullName) || undefined}
                disabled={isPending}
              />
              {fieldErrors.fullName ? (
                <FieldError>{fieldErrors.fullName}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={Boolean(fieldErrors.phone) || undefined}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                className="h-11"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  clearField('phone')
                }}
                aria-invalid={Boolean(fieldErrors.phone) || undefined}
                disabled={isPending}
              />
              {fieldErrors.phone ? (
                <FieldError>{fieldErrors.phone}</FieldError>
              ) : (
                <FieldDescription>
                  For guest pay lookup and recovery.
                </FieldDescription>
              )}
            </Field>
          </div>

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
                clearField('email')
              }}
              aria-invalid={Boolean(fieldErrors.email) || undefined}
              disabled={isPending}
            />
            {fieldErrors.email ? (
              <FieldError>{fieldErrors.email}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={Boolean(fieldErrors.password) || undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearField('password')
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
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </AuthShell>
  )
}
