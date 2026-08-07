-- Enforce one active OTP row per user+type (matches OtpService.issue semantics).

DROP INDEX IF EXISTS "otp_codes_user_id_type_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "otp_codes_user_id_type_key"
  ON "otp_codes"("user_id", "type");
