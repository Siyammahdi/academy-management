import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

/** Private LAN / loopback — needed when testing the web app from a phone on Wi‑Fi. */
function isDevLanOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

function allowedOrigins(): string[] {
  const extras = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    process.env.WEB_URL ?? 'http://localhost:3001',
    'https://annahda.net',
    'https://www.annahda.net',
    'https://annahdanet.vercel.app',
    ...extras,
  ];
}

async function bootstrap() {
  // Course cover thumbnails travel as base64 in JSON (up to ~2 MB decoded).
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '3mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '3mb' });
  app.setGlobalPrefix('api/v1');

  // Tokens travel in JSON / Authorization — not API-set cookies. Still lock
  // Origin. In development, also allow phone-on-LAN origins (http://192.168.x.x).
  const staticOrigins = allowedOrigins();
  const allowLanInDev = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser clients (curl, server-to-server) send no Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (staticOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (allowLanInDev && isDevLanOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
