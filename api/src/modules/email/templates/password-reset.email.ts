export interface PasswordResetEmailContent {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Builds the password-reset email body. Transport is handled elsewhere.
 * The raw reset URL is included once for the recipient; tokens are never
 * logged by this builder.
 */
export function buildPasswordResetEmail(input: {
  to: string;
  fullName: string | null;
  resetUrl: string;
  expiryMinutes: number;
  academyName?: string;
}): PasswordResetEmailContent {
  const academy = input.academyName ?? 'An Nahda Academy';
  const greetingName = input.fullName?.trim() || 'there';
  const subject = `${academy} — reset your password`;
  const expiryMinutes = input.expiryMinutes;

  const text = [
    `Assalamu Alaikum ${greetingName},`,
    '',
    `We received a request to reset the password for your ${academy} account.`,
    '',
    'Open this link to choose a new password:',
    input.resetUrl,
    '',
    `This link expires in ${expiryMinutes} minutes and can only be used once.`,
    '',
    'If you did not request a password reset, you can safely ignore this email. Your password will stay the same.',
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
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#2a2433;">Reset your password</h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#5c5666;">Assalamu Alaikum ${escapeHtml(greetingName)},</p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#5c5666;">We received a request to reset the password for your account. Use the button below to choose a new one.</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;padding:14px 28px;background:#a372da;color:#ffffff;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">Choose a new password</a>
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#5c5666;">This link expires in <strong>${expiryMinutes} minutes</strong> and can only be used once.</p>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#8a8494;word-break:break-all;">If the button does not work, copy and paste this URL into your browser:<br /><span style="color:#4c2a72;">${escapeHtml(input.resetUrl)}</span></p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8494;">If you did not request this, you can safely ignore this email. Your password will stay the same.</p>
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
