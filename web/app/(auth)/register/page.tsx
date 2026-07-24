'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { apiFetch, ApiError } from '../../../lib/api';
import type { ApiErrorBody } from '../../../lib/api';
import { storeSession } from '../../../lib/session';

interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: string[]; studentId: string | null };
}

// doc 06 §1 — switch on the error code, never the message.
function registerErrorMessage(body: ApiErrorBody): string {
  if (body.error === 'EMAIL_ALREADY_REGISTERED') {
    return 'This email is already registered. Try logging in instead.';
  }
  if (
    body.error === 'VALIDATION_ERROR' &&
    Array.isArray(body.details) &&
    body.details.length > 0
  ) {
    return body.details.join(' ');
  }
  return 'Registration could not be completed. Try again or contact an admin.';
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, email, password }),
      });
      storeSession(result.accessToken, result.refreshToken, result.user.roles);
      // doc 06 §2 — registration always assigns the student role.
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? registerErrorMessage(err.body)
          : 'Registration could not be completed. Try again or contact an admin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-semibold text-ink">
          Create an account
        </h1>
        <p className="font-body text-body text-ink-muted">
          Register to enroll in a batch and track your dues.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Full name"
          name="fullName"
          autoComplete="name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          name="phone"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="font-body text-sm text-overdue" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="font-body text-sm text-ink-muted">
        Already registered?{' '}
        <Link href="/login" className="text-purple hover:text-purple-deep">
          Log in
        </Link>
      </p>
    </div>
  );
}
