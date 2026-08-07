export const OTP_EXPIRY_MS = (() => {
  const minutes = Number(process.env.OTP_EXPIRY_MINUTES ?? '10');
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 10) * 60_000;
})();

export const OTP_RESEND_COOLDOWN_MS = (() => {
  const seconds = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? '60');
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000;
})();

export const OTP_MAX_ATTEMPTS = (() => {
  const n = Number(process.env.OTP_MAX_ATTEMPTS ?? '5');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
})();

export const OTP_EXPIRY_MINUTES = Math.round(OTP_EXPIRY_MS / 60_000);
