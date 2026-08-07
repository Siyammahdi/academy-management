import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { MailMessage, MailProvider } from './mail.provider';

/**
 * SMTP transport (nodemailer). Selected when SMTP_HOST is set.
 */
export class SmtpMailProvider implements MailProvider {
  readonly providerName = 'smtp' as const;
  readonly fromAddress: string;

  private readonly logger = new Logger(SmtpMailProvider.name);
  private readonly transporter: Transporter;

  constructor(
    from: string,
    config: {
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
    },
  ) {
    this.fromAddress = from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.pass
          ? { user: config.user, pass: config.pass }
          : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    this.logger.debug(`SMTP sent to=${message.to} subject=${message.subject}`);
  }
}
