import { ApiError } from './api'
import type { ApiErrorBody } from './api'
import { apiErrorMessage } from './error-message'

export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return mapAuthError(err.body, {
      INVALID_CREDENTIALS: 'Incorrect email or password.',
      fallback: 'Login could not be completed. Try again or contact an admin.',
    })
  }
  return 'Login could not be completed. Try again or contact an admin.'
}

export function registerErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return mapAuthError(err.body, {
      EMAIL_ALREADY_REGISTERED:
        'This email is already registered. Try logging in instead.',
      fallback:
        'Registration could not be completed. Try again or contact an admin.',
    })
  }
  return 'Registration could not be completed. Try again or contact an admin.'
}

export function forgotPasswordErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return mapAuthError(err.body, {
      TOO_MANY_REQUESTS:
        'Too many reset attempts. Wait a minute and try again.',
      fallback: 'The reset email could not be requested. Try again.',
    })
  }
  return 'The reset email could not be requested. Try again.'
}

export function resetPasswordErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return mapAuthError(err.body, {
      INVALID_RESET_TOKEN:
        'This password reset link is invalid or has already been used.',
      RESET_TOKEN_EXPIRED:
        'This password reset link has expired. Request a new one.',
      fallback: 'Password could not be reset. Try again or request a new link.',
    })
  }
  return 'Password could not be reset. Try again or request a new link.'
}

function mapAuthError(
  body: ApiErrorBody,
  messages: Record<string, string> & { fallback: string },
): string {
  const specific = messages[body.error]
  if (specific) return specific
  return apiErrorMessage(body, messages.fallback)
}
