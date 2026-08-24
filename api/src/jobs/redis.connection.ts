/**
 * Shared Redis connection options for BullMQ (API + worker).
 * Supports `redis://` and `rediss://` (TLS) URLs used by Render / Upstash.
 */
export function parseRedisConnection(url: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
  maxRetriesPerRequest: null;
} {
  const parsed = new URL(url);
  const password = parsed.password
    ? decodeURIComponent(parsed.password)
    : undefined;
  const username = parsed.username
    ? decodeURIComponent(parsed.username)
    : undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}
