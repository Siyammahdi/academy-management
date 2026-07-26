import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { MailMessage, MailProvider } from './mail.provider';

function serializeUnknown(error: unknown): string {
  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
      // Resend / fetch errors sometimes attach a response body here.
      ...Object.fromEntries(
        Object.entries(error).filter(([key]) => key !== 'stack'),
      ),
    });
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export class ResendMailProvider implements MailProvider {
  readonly providerName = 'resend' as const;
  readonly fromAddress: string;

  private readonly logger = new Logger(ResendMailProvider.name);
  private readonly client: Resend;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.fromAddress = from;
  }

  async send(message: MailMessage): Promise<void> {
    try {
      const { data, error } = await this.client.emails.send({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      if (error) {
        this.logger.error(
          `Resend API error to=${message.to} body=${JSON.stringify(error)}`,
        );
        throw new Error(
          `Resend send failed: ${error.message ?? JSON.stringify(error)}`,
        );
      }

      this.logger.log(
        `Resend success to=${message.to} id=${data?.id ?? 'unknown'}`,
      );
    } catch (error) {
      // Already logged the structured Resend error response above.
      if (
        error instanceof Error &&
        error.message.startsWith('Resend send failed:')
      ) {
        throw error;
      }

      this.logger.error(
        `Resend request failed to=${message.to} body=${serializeUnknown(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
