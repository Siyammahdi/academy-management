import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpType, Prisma, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { OtpService } from '../otp/otp.service';
import { OTP_EXPIRY_MINUTES } from '../otp/otp.config';
import { OtpInvalidException } from '../otp/otp.exceptions';
import { EmailAlreadyRegisteredException } from '../../common/exceptions/email-already-registered.exception';
import {
  EmailAlreadyVerifiedException,
  EmailNotVerifiedException,
} from '../../common/exceptions/email-not-verified.exception';
import { InvalidCredentialsException } from '../../common/exceptions/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '../../common/exceptions/invalid-refresh-token.exception';
import { InvalidResetTokenException } from '../../common/exceptions/invalid-reset-token.exception';
import { ResetTokenExpiredException } from '../../common/exceptions/reset-token-expired.exception';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import {
  EmailVerificationSuccessDto,
  RegisterPendingVerificationDto,
} from './dto/email-verification-response.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import {
  JWT_ACCESS_EXPIRY,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRY,
  JWT_REFRESH_SECRET,
} from './jwt.config';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PASSWORD_RESET_EXPIRY_MINUTES = Math.round(PASSWORD_RESET_TTL_MS / 60_000);

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenHash: string;
  expiresAt: Date;
}

interface RefreshTokenPayload {
  sub: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly email: EmailService,
    private readonly otp: OtpService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterPendingVerificationDto> {
    const email = normalizeEmail(dto.email);
    const passwordHash = await argon2.hash(dto.password);

    let created: {
      user: { id: string; email: string; fullName: string | null };
    };

    try {
      created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName: dto.fullName.trim(),
            phone: dto.phone.trim(),
            isEmailVerified: false,
          },
        });

        await tx.userRole.create({
          data: { userId: user.id, role: 'student' },
        });

        const seq = await tx.studentIdSequence.update({
          where: { id: 1 },
          data: { current: { increment: 1 } },
        });
        const studentId = `ANA-${String(seq.current).padStart(4, '0')}`;

        await tx.student.create({
          data: {
            studentId,
            userId: user.id,
            fullName: dto.fullName.trim(),
            phone: dto.phone.trim(),
          },
        });

        return { user };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new EmailAlreadyRegisteredException();
      }
      throw error;
    }

    await this.dispatchEmailVerification(
      created.user.id,
      created.user.email,
      created.user.fullName,
    );

    return {
      email: created.user.email,
      requiresEmailVerification: true,
      message:
        'Account created. Check your email for a verification code before signing in.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<EmailVerificationSuccessDto> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isEmailVerified: true, status: true },
    });

    // Generic failure — do not reveal whether the email is registered.
    if (!user || user.status !== 'active') {
      throw new OtpInvalidException();
    }

    if (user.isEmailVerified) {
      throw new EmailAlreadyVerifiedException();
    }

    await this.otp.verify(user.id, dto.code, OtpType.EMAIL);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    return { message: 'Email verified. You can sign in now.' };
  }

  async resendEmailVerification(
    dto: ResendEmailVerificationDto,
  ): Promise<EmailVerificationSuccessDto> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        isEmailVerified: true,
        status: true,
      },
    });

    // Always succeed when unknown — never reveal registration.
    if (!user || user.status !== 'active') {
      return {
        message:
          'If that email is registered and unverified, a new code has been sent.',
      };
    }

    if (user.isEmailVerified) {
      throw new EmailAlreadyVerifiedException();
    }

    await this.dispatchEmailVerification(user.id, user.email, user.fullName);

    return {
      message:
        'If that email is registered and unverified, a new code has been sent.',
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true, student: true },
    });

    if (!user || user.status !== 'active') {
      throw new InvalidCredentialsException();
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    if (!user.isEmailVerified) {
      throw new EmailNotVerifiedException();
    }

    const tokens = await this.createTokenPair(user.id);
    const lastLoginAt = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: tokens.tokenHash,
          expiresAt: tokens.expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt },
      }),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserResponse(
        { ...user, fullName: user.fullName },
        user.roles.map((r) => r.role),
        user.student,
      ),
    };
  }

  private async dispatchEmailVerification(
    userId: string,
    email: string,
    fullName: string | null,
  ): Promise<void> {
    const issued = await this.otp.issue(userId, OtpType.EMAIL);
    try {
      await this.email.sendVerificationEmail({
        to: email,
        fullName,
        code: issued.code,
        expiryMinutes: OTP_EXPIRY_MINUTES,
      });
    } catch (error) {
      // NTF-04 — account + OTP remain; user can resend.
      this.logger.error(
        `Verification email enqueue failed for user=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async refresh(dto: RefreshDto): Promise<AuthResponseDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        { secret: JWT_REFRESH_SECRET },
      );
    } catch {
      throw new InvalidRefreshTokenException();
    }

    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !stored ||
      stored.userId !== payload.sub ||
      stored.revokedAt !== null ||
      stored.expiresAt < new Date()
    ) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true, student: true },
    });
    if (!user || user.status !== 'active') {
      throw new InvalidRefreshTokenException();
    }

    const tokens = await this.createTokenPair(user.id);

    return this.prisma.$transaction(async (tx) => {
      // Atomic claim: guards against a concurrent replay of the same
      // refresh token racing this rotation (only one caller can win).
      const rotated = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (rotated.count === 0) {
        throw new InvalidRefreshTokenException();
      }

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: tokens.tokenHash,
          expiresAt: tokens.expiresAt,
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.toUserResponse(
          user,
          user.roles.map((r) => r.role),
          user.student,
        ),
      };
    });
  }

  async logout(dto: RefreshDto): Promise<void> {
    const tokenHash = hashToken(dto.refreshToken);
    // Idempotent — revoking an already-revoked or unknown token is a no-op
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: true, student: true },
    });
    return this.toUserResponse(
      user,
      user.roles.map((r) => r.role),
      user.student,
    );
  }

  /**
   * Always succeeds with no body. Never reveals whether the email is
   * registered. When a matching active user exists, stores a hashed
   * single-use token (30 min) and enqueues a reset email (NTF-03).
   * Previous unused tokens for that user are invalidated first.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') {
      return;
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Invalidate any outstanding unused tokens so only the latest link works.
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const webOrigin = (
      process.env.WEB_URL ??
      process.env.APP_URL ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
    const resetUrl = `${webOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.email.sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl,
        expiryMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
      });
    } catch (error) {
      // NTF-04 — a failed enqueue must not fail the endpoint.
      this.logger.error(
        `Failed to enqueue password-reset email for user ${user.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Verifies a single-use, unexpired reset token; hashes the new password
   * with argon2; marks the token used; revokes every refresh token for
   * that user so existing sessions die immediately.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.usedAt !== null) {
      throw new InvalidResetTokenException();
    }

    if (stored.expiresAt < new Date()) {
      throw new ResetTokenExpiredException();
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: stored.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) {
        throw new InvalidResetTokenException();
      }

      await tx.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      });

      await tx.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  }

  private async createTokenPair(userId: string): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      { secret: JWT_ACCESS_SECRET, expiresIn: JWT_ACCESS_EXPIRY },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: randomUUID() },
      {
        secret: JWT_REFRESH_SECRET,
        expiresIn: JWT_REFRESH_EXPIRY,
      },
    );

    return {
      accessToken,
      refreshToken,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    };
  }

  private toUserResponse(
    user: {
      id: string;
      email: string;
      fullName?: string | null;
      avatarMimeType?: string | null;
    },
    roles: RoleName[],
    student: { studentId: string; fullName: string } | null,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      roles,
      studentId: student?.studentId ?? null,
      fullName: user.fullName ?? student?.fullName ?? null,
      hasAvatar:
        typeof user.avatarMimeType === 'string' &&
        user.avatarMimeType.length > 0,
    };
  }
}
