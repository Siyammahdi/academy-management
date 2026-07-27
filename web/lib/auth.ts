import { apiFetch } from './api'
import {
  clearSession,
  getRefreshToken,
  storeSession,
} from './session'
import {
  getStoredActiveRole,
  homePathForRole,
  resolveActiveRole,
  setStoredActiveRole,
} from './active-role'

export type RoleName = 'admin' | 'manager' | 'student'

export interface AuthUser {
  id: string
  email: string
  roles: RoleName[]
  studentId: string | null
  /** Linked Student.fullName when the account has a student profile. */
  fullName: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  fullName: string
  phone: string
}

/**
 * Home for the restored workspace (preferred role) when still permitted.
 * Falls back to admin → manager → student. RBAC-01 — one login, many roles.
 */
export function homePathForRoles(roles: readonly string[]): string {
  const role = resolveActiveRole(roles, getStoredActiveRole())
  if (role) return homePathForRole(role)
  return '/'
}

function persistAuth(result: AuthResponse): AuthResponse {
  storeSession(result.accessToken, result.refreshToken, result.user.roles)
  const active = resolveActiveRole(result.user.roles)
  if (active) setStoredActiveRole(active)
  return result
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return persistAuth(result)
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return persistAuth(result)
}

export async function refreshSession(): Promise<AuthResponse | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const result = await apiFetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
    return persistAuth(result)
  } catch {
    clearSession()
    return null
  }
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    if (refreshToken) {
      await apiFetch<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
    }
  } finally {
    clearSession()
  }
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me')
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<void>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}
