import { Logger } from '@nestjs/common';
import type { MailMessage, MailProvider } from './mail.provider';

/**
 * Dev/test fallback when RESEND_API_KEY is unset. Logs the message and
 * resolves — never throws, so a missing key cannot fail a password-reset
 * or notification enqueue path (NTF-04).
 */
export class ConsoleMailProvider implements MailProvider {
  readonly providerName = 'console' as const;
  readonly fromAddress: string;

  private readonly logger = new Logger(ConsoleMailProvider.name);

  constructor(fromAddress: string) {
    this.fromAddress = fromAddress;
  }

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `mail (console): to=${message.to} subject=${JSON.stringify(message.subject)}`,
    );
    if (message.text) {
      this.logger.debug(message.text);
    }
  }
}
