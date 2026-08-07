export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Provider-agnostic mail transport (NTF-03/05). Notifications and password
 * reset both send through this interface so swapping Resend for another
 * vendor never touches callers.
 */
export interface MailProvider {
  /** Active transport — logged at worker boot so misconfig is obvious. */
  readonly providerName: 'smtp' | 'resend' | 'console';
  /** Resolved From: address this provider will use (or would use). */
  readonly fromAddress: string;
  send(message: MailMessage): Promise<void>;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');
