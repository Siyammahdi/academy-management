export interface VerificationEmailContent {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Builds the verification email body. Transport is handled elsewhere.
 * Expiry minutes are passed in by the caller so this template never
 * imports OTP module internals.
 */
export function buildVerificationEmail(input: {
  to: string;
  fullName: string | null;
  code: string;
  expiryMinutes: number;
  academyName?: string;
}): VerificationEmailContent {
  const academy = input.academyName ?? 'An Nahda Academy';
  const greetingName = input.fullName?.trim() || 'there';
  const subject = `${academy} — your verification code`;
  const expiryMinutes = input.expiryMinutes;

  const text = [
    `Assalamu Alaikum ${greetingName},`,
    '',
    `Your ${academy} email verification code is: ${input.code}`,
    '',
    `This code expires in ${expiryMinutes} minutes.`,
    '',
    'If you did not create an account or request this code, you can ignore this email.',
    '',
    `— ${academy}`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f4f8;font-family:Georgia,'Times New Roman',serif;color:#2a2433;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;background:#f1ebf8;">
              <!-- Academy logo placeholder -->
              <div style="width:48px;height:48px;border-radius:12px;background:#a372da;color:#fff;font-family:system-ui,sans-serif;font-weight:700;font-size:18px;line-height:48px;text-align:center;">AN</div>
              <p style="margin:16px 0 0;font-family:system-ui,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#4c2a72;">${escapeHtml(academy)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#2a2433;">Verify your email</h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#5c5666;">Assalamu Alaikum ${escapeHtml(greetingName)},</p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#5c5666;">Use this code to verify your email address:</p>
              <p style="margin:0 0 24px;padding:16px 20px;background:#f1ebf8;border-radius:12px;font-family:ui-monospace,Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:0.35em;text-align:center;color:#4c2a72;">${escapeHtml(input.code)}</p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#5c5666;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8494;">If you did not request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { to: input.to, subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
