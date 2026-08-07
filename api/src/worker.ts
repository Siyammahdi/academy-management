import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './jobs/worker.module';
import {
  MAIL_PROVIDER,
  type MailProvider,
} from './modules/mail/mail.provider';

// doc 07 §5 — a second bootstrap, no HTTP listener, sharing the same
// modules and Prisma client as main.ts. Runs the job processors
// (penalty-sweep, billing-generation, gateway-expiry, email-dispatch);
// main.ts only enqueues/schedules via JobsModule, it never consumes.
async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  const mail = app.get<MailProvider>(MAIL_PROVIDER);
  const resendKey = process.env.RESEND_API_KEY?.trim();
  logger.log(
    `Mail provider active: ${mail.providerName}; from=${mail.fromAddress}`,
  );
  logger.log(
    `Mail env: RESEND_API_KEY=${resendKey ? `set(len=${resendKey.length})` : 'unset'} MAIL_FROM=${process.env.MAIL_FROM ?? '(unset)'} SMTP_HOST=${process.env.SMTP_HOST ?? '(unset)'}`,
  );
  if (mail.providerName === 'resend') {
    logger.log(
      'Resend test-mode note: with onboarding@resend.dev you can only send to the Resend account email until a domain is verified.',
    );
  }
  logger.log(
    'Worker started — processing penalty-sweep, billing-generation, gateway-expiry, email-dispatch.',
  );
}
void bootstrap();
