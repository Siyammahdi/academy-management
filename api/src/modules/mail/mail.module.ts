import { Global, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../jobs/queues';
import { MAIL_PROVIDER } from './mail.provider';
import { ConsoleMailProvider } from './console.mail.provider';
import { ResendMailProvider } from './resend.mail.provider';
import { SmtpMailProvider } from './smtp.mail.provider';
import { MailService } from './mail.service';

const DEFAULT_FROM = 'An Nahda Academy <onboarding@resend.dev>';

/**
 * Normalizes MAIL_FROM / SMTP_FROM_* into RFC-style `Name <email@domain>`
 * (or bare email). Rejects angle-bracket-only values like `<email@x>` which
 * Resend returns as HTTP 422 validation_error.
 */
export function resolveFromAddress(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = (env.SMTP_FROM_EMAIL ?? env.MAIL_FROM ?? '').trim();
  const fromName = (
    env.SMTP_FROM_NAME ??
    env.MAIL_FROM_NAME ??
    'An Nahda Academy'
  ).trim();

  if (!raw) {
    return DEFAULT_FROM;
  }

  const angleMatch = raw.match(/<([^<>]+)>/);
  const email = (angleMatch?.[1] ?? raw).trim();
  const angleOnly = /^\s*<[^<>]+>\s*$/.test(raw);

  if (!email.includes('@')) {
    return DEFAULT_FROM;
  }

  // Already a proper "Name <email>" form — keep it.
  if (angleMatch && !angleOnly) {
    return raw;
  }

  return `${fromName} <${email}>`;
}

function createMailProvider() {
  const logger = new Logger('MailModule');
  const from = resolveFromAddress();
  const smtpHost = process.env.SMTP_HOST?.trim();

  if (smtpHost) {
    const port = Number(process.env.SMTP_PORT ?? '587');
    const secure =
      process.env.SMTP_SECURE === 'true' ||
      process.env.SMTP_SECURE === '1' ||
      port === 465;
    logger.log(`Mail provider=smtp host=${smtpHost} from=${from}`);
    return new SmtpMailProvider(from, {
      host: smtpHost,
      port: Number.isFinite(port) ? port : 587,
      secure,
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASSWORD || undefined,
    });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    logger.log(
      `Mail provider=resend from=${from} apiKey=re_…${apiKey.slice(-4)} (len=${apiKey.length})`,
    );
    return new ResendMailProvider(apiKey, from);
  }

  logger.warn(
    `Mail provider=console from=${from} (RESEND_API_KEY / SMTP_HOST unset)`,
  );
  return new ConsoleMailProvider(from);
}

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.emailDispatch })],
  providers: [
    {
      provide: MAIL_PROVIDER,
      useFactory: createMailProvider,
    },
    MailService,
  ],
  exports: [MailService, MAIL_PROVIDER],
})
export class MailModule {}
