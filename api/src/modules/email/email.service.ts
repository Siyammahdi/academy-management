import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { buildVerificationEmail } from './templates/verification.email';

/**
 * Application email composition. Provider transport lives in MailModule
 * (SMTP / Resend / console via BullMQ). This service never generates OTPs.
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
    try {
      await this.mail.enqueue(message);
      this.logger.debug(`Verification email enqueued to=${input.to}`);
    } catch (error) {
      // NTF-04 — a failed enqueue must not fail registration/resend callers
      // that already committed the OTP. Log and rethrow so auth can decide.
      this.logger.error(
        `Failed to enqueue verification email to=${input.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
