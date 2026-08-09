import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { buildPasswordResetEmail } from './templates/password-reset.email';
import { buildVerificationEmail } from './templates/verification.email';

/**
 * Application email composition. Provider transport lives in MailModule
 * (SMTP / Resend / console via BullMQ). This service never generates OTPs
 * or reset tokens — callers pass delivery payloads only.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mail: MailService) {}

  async sendVerificationEmail(input: {
    to: string;
    fullName: string | null;
    code: string;
    expiryMinutes: number;
  }): Promise<void> {
    const message = buildVerificationEmail(input);
    await this.enqueueOrThrow(message, 'verification');
  }

  async sendPasswordResetEmail(input: {
    to: string;
    fullName: string | null;
    resetUrl: string;
    expiryMinutes: number;
  }): Promise<void> {
    const message = buildPasswordResetEmail(input);
    await this.enqueueOrThrow(message, 'password-reset');
  }

  private async enqueueOrThrow(
    message: { to: string; subject: string; html: string; text: string },
    kind: string,
  ): Promise<void> {
    try {
      await this.mail.enqueue(message);
      this.logger.debug(`${kind} email enqueued to=${message.to}`);
    } catch (error) {
      // NTF-04 — callers decide whether to swallow; we always log.
      this.logger.error(
        `Failed to enqueue ${kind} email to=${message.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
