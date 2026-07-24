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

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: string[]; studentId: string | null };
}

// doc 06 §1 — switch on the error code, never the message. doc 09 §7 —
// specific, not chatty.
function loginErrorMessage(body: ApiErrorBody): string {
  if (body.error === 'INVALID_CREDENTIALS') {
    return 'Incorrect email or password.';
  }
  if (
    body.error === 'VALIDATION_ERROR' &&
    Array.isArray(body.details) &&
    body.details.length > 0
  ) {
    return body.details.join(' ');
  }
  return 'Login could not be completed. Try again or contact an admin.';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      storeSession(result.accessToken, result.refreshToken, result.user.roles);
      // Admin/manager take priority over student for an account holding
      // multiple roles (RBAC-01) — those are the operational surfaces.
      if (result.user.roles.includes('admin')) {
        router.push('/admin');
      } else if (result.user.roles.includes('manager')) {
        router.push('/manager');
      } else if (result.user.roles.includes('student')) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? loginErrorMessage(err.body)
          : 'Login could not be completed. Try again or contact an admin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-semibold text-ink">Log in</h1>
        <p className="font-body text-body text-ink-muted">
          Enter your email and password to continue.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="font-body text-sm text-overdue" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="font-body text-sm text-ink-muted">
        New here?{' '}
        <Link href="/register" className="text-purple hover:text-purple-deep">
          Create an account
        </Link>
      </p>
    </div>
  );
}
