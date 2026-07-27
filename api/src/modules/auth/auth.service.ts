import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EmailAlreadyRegisteredException } from '../../common/exceptions/email-already-registered.exception';
import { InvalidCredentialsException } from '../../common/exceptions/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '../../common/exceptions/invalid-refresh-token.exception';
import { InvalidResetTokenException } from '../../common/exceptions/invalid-reset-token.exception';
import { ResetTokenExpiredException } from '../../common/exceptions/reset-token-expired.exception';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import {
  JWT_ACCESS_EXPIRY,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRY,
  JWT_REFRESH_SECRET,
} from './jwt.config';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
  // Deterministic (unlike argon2) so the DB's unique index on tokenHash
  // can be used for direct lookup — see doc 05 §2's RefreshToken model.
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await argon2.hash(dto.password);

    let created: {
      user: { id: string; email: string };
      student: { studentId: string; fullName: string };
    };

    try {
      created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: dto.email, passwordHash },
        });

        // RBAC-01 — registration always grants the 'student' role
        await tx.userRole.create({
          data: { userId: user.id, role: 'student' },
        });

        // doc 05 §6 — sequential, human-readable studentId, generated
        // atomically inside this same transaction
        const seq = await tx.studentIdSequence.update({
          where: { id: 1 },
          data: { current: { increment: 1 } },
        });
        const studentId = `ANA-${String(seq.current).padStart(4, '0')}`;

        const student = await tx.student.create({
          data: {
            studentId,
            userId: user.id,
            fullName: dto.fullName,
            phone: dto.phone,
          },
        });

        return { user, student };
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

    const tokens = await this.createTokenPair(created.user.id);
    await this.prisma.refreshToken.create({
      data: {
        userId: created.user.id,
        tokenHash: tokens.tokenHash,
        expiresAt: tokens.expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserResponse(created.user, ['student'], created.student),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true, student: true },
    });

    // Deliberately generic — never reveal whether the email or password was wrong
    if (!user || user.status !== 'active') {
      throw new InvalidCredentialsException();
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    const tokens = await this.createTokenPair(user.id);
    await this.prisma.refreshToken.create({
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
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: dto.email.trim(), mode: 'insensitive' },
      },
    });

    if (!user || user.status !== 'active') {
      return;
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await this.mail.enqueue({
        to: user.email,
        subject: 'Reset your An Nahda Academy password',
        text: [
          'You requested a password reset for your An Nahda Academy account.',
          '',
          'Open this link within 30 minutes to choose a new password:',
          resetUrl,
          '',
          'If you did not request this, you can ignore this email.',
        ].join('\n'),
        html: `
          <p>You requested a password reset for your An Nahda Academy account.</p>
          <p><a href="${resetUrl}">Choose a new password</a> — this link expires in 30 minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `.trim(),
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
    user: { id: string; email: string },
    roles: RoleName[],
    student: { studentId: string; fullName: string } | null,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      roles,
      studentId: student?.studentId ?? null,
      fullName: student?.fullName ?? null,
    };
  }
}
