import { JwtSignOptions } from '@nestjs/jwt';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// doc 07 §9 lists these as required config; validated here (fail fast) since
// this module doesn't set up the full @nestjs/config schema.
export const JWT_ACCESS_SECRET = requireEnv('JWT_ACCESS_SECRET');
export const JWT_REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');

// Cast is safe: these are always a plain duration string ("15m", "7d"), just
// not one TypeScript can narrow from an env var read at runtime.
export const JWT_ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY ??
  '7d') as NonNullable<JwtSignOptions['expiresIn']>;
export const JWT_REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY ??
  '30d') as NonNullable<JwtSignOptions['expiresIn']>;
