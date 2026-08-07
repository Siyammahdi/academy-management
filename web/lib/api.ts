// Talks to the NestJS API (doc 06). Every error response uses the envelope
// in doc 06 §1 — callers switch on `error.body.error` (a stable code),
// never on `error.body.message` (human copy, not a machine-checkable
// contract).

import { getAccessToken } from './session';

// Prefer a same-origin path (`/api/v1`) so the browser never talks to
// `localhost` on a phone, and CORS is not required. Pair with
// `API_PROXY_TARGET` in next.config.ts (rewrites → Nest). Absolute URLs
// still work when you intentionally call the API cross-origin.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details: unknown;
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  readonly body: ApiErrorBody;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.body = body;
  }
}

export class NetworkApiError extends Error {
  constructor(message = 'Could not reach the API.') {
    super(message);
    this.name = 'NetworkApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new NetworkApiError(
      'Could not reach the API. On a phone, do not use localhost — use the same-origin /api/v1 proxy or your public API URL.',
    );
  }

  // A handful of admin routes (assign/remove teacher) return no body at
  // all — response.json() would throw on an empty string.
  const text = await response.text();
  const body: unknown = text.length > 0 ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(body as ApiErrorBody);
  }

  return body as T;
}
