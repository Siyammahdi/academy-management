import { Injectable, Logger } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
} from './otp.config';
import {
  OtpExpiredException,
  OtpInvalidException,
  OtpNotFoundException,
  OtpResendCooldownException,
  OtpTooManyAttemptsException,
} from './otp.exceptions';

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateSixDigitCode(): string {
  // Cryptographically strong 000000–999999 (always 6 digits).
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export interface IssuedOtp {
  /** Plain OTP — returned once for the caller to deliver; never persisted. */
  code: string;
  expiresAt: Date;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deletes any previous OTP for this user+type, then stores a hashed code.
   * Returns the plain code once. Does not send email.
   */
  async issue(userId: string, type: OtpType = OtpType.EMAIL): Promise<IssuedOtp> {
    await this.assertResendAllowed(userId, type);

    const code = generateSixDigitCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.otpCode.deleteMany({ where: { userId, type } });
      await tx.otpCode.create({
        data: { userId, type, codeHash, expiresAt, attempts: 0 },
      });
    });

    this.logger.debug(`Issued ${type} OTP for user=${userId}`);
    return { code, expiresAt };
  }

  /**
   * Validates the plain code against the active hashed OTP.
   * On success deletes the OTP row. On failure increments attempts.
   */
  async verify(
    userId: string,
    code: string,
    type: OtpType = OtpType.EMAIL,
  ): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new OtpNotFoundException();
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new OtpTooManyAttemptsException();
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      await this.prisma.otpCode.delete({ where: { id: otp.id } });
      throw new OtpExpiredException();
    }

    const incoming = hashOtp(code.trim());
    if (incoming !== otp.codeHash) {
      const updated = await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      if (updated.attempts >= OTP_MAX_ATTEMPTS) {
        throw new OtpTooManyAttemptsException();
      }
      throw new OtpInvalidException();
    }

    await this.prisma.otpCode.delete({ where: { id: otp.id } });
  }

  /** Removes all OTPs of a type for the user (e.g. before re-issue). */
  async clear(userId: string, type: OtpType = OtpType.EMAIL): Promise<void> {
    await this.prisma.otpCode.deleteMany({ where: { userId, type } });
  }

  private async assertResendAllowed(
    userId: string,
    type: OtpType,
  ): Promise<void> {
    const latest = await this.prisma.otpCode.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (!latest) return;

    const elapsed = Date.now() - latest.createdAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - elapsed) / 1000,
      );
      throw new OtpResendCooldownException(retryAfterSeconds);
    }
  }
}
