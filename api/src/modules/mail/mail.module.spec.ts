import { resolveFromAddress } from './mail.module';

describe('resolveFromAddress', () => {
  it('normalizes angle-bracket-only MAIL_FROM that Resend rejects', () => {
    expect(
      resolveFromAddress({
        MAIL_FROM: '<onboarding@resend.dev>',
      } as NodeJS.ProcessEnv),
    ).toBe('An Nahda Academy <onboarding@resend.dev>');
  });

  it('keeps a proper Name <email> value', () => {
    expect(
      resolveFromAddress({
        MAIL_FROM: 'Nahda <noreply@annahda.academy>',
      } as NodeJS.ProcessEnv),
    ).toBe('Nahda <noreply@annahda.academy>');
  });

  it('wraps a bare email with the display name', () => {
    expect(
      resolveFromAddress({
        MAIL_FROM: 'noreply@annahda.academy',
        MAIL_FROM_NAME: 'Academy',
      } as NodeJS.ProcessEnv),
    ).toBe('Academy <noreply@annahda.academy>');
  });

  it('falls back when MAIL_FROM is missing', () => {
    expect(resolveFromAddress({} as NodeJS.ProcessEnv)).toBe(
      'An Nahda Academy <onboarding@resend.dev>',
    );
  });
});
