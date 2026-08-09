import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { EmailAlreadyRegisteredException } from '../../common/exceptions/email-already-registered.exception';
import { EmailNotVerifiedException } from '../../common/exceptions/email-not-verified.exception';
import { InvalidCredentialsException } from '../../common/exceptions/invalid-credentials.exception';
import { InvalidResetTokenException } from '../../common/exceptions/invalid-reset-token.exception';
import { ResetTokenExpiredException } from '../../common/exceptions/reset-token-expired.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { OtpService } from '../otp/otp.service';

function createJwtServiceMock(): JwtService {
  return {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
}

function createEmailMock(): EmailService {
  return {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailService;
}

function createOtpMock(): OtpService {
  return {
    issue: jest.fn().mockResolvedValue({
      code: '123456',
      expiresAt: new Date(Date.now() + 600_000),
    }),
    verify: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  } as unknown as OtpService;
}

function createService(
  prisma: PrismaService,
  email: EmailService = createEmailMock(),
  otp: OtpService = createOtpMock(),
): AuthService {
  return new AuthService(prisma, createJwtServiceMock(), email, otp);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('AuthService', () => {
  describe('register', () => {
    it('creates User + Student + student role and requires email verification (no session)', async () => {
      const tx = {
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'user1',
            email: 'a@x.com',
            fullName: 'Ana Rahman',
          }),
        },
        userRole: { create: jest.fn().mockResolvedValue({}) },
        studentIdSequence: {
          update: jest.fn().mockResolvedValue({ current: 7 }),
        },
        student: {
          create: jest
            .fn()
            .mockResolvedValue({ id: 'student1', studentId: 'ANA-0007' }),
        },
      };
      const prisma = {
        $transaction: jest
          .fn()
          .mockImplementation((cb: (tx: unknown) => unknown) => cb(tx)),
      } as unknown as PrismaService;

      const email = createEmailMock();
      const otp = createOtpMock();
      const service = createService(prisma, email, otp);
      const result = await service.register({
        email: 'a@x.com',
        password: 'password123',
        fullName: 'Ana Rahman',
        phone: '01700000000',
      });

      expect(tx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'a@x.com',
          isEmailVerified: false,
        }),
      });
      expect(tx.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user1', role: 'student' },
      });
      expect(otp.issue).toHaveBeenCalled();
      expect(email.sendVerificationEmail).toHaveBeenCalledWith({
        to: 'a@x.com',
        fullName: 'Ana Rahman',
        code: '123456',
        expiryMinutes: expect.any(Number),
      });
      expect(result.requiresEmailVerification).toBe(true);
      expect(result.email).toBe('a@x.com');
      expect(result).not.toHaveProperty('accessToken');
    });

    it('rejects a duplicate email registration', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.9.0' },
      );
      const prisma = {
        $transaction: jest.fn().mockRejectedValue(prismaError),
      } as unknown as PrismaService;

      const service = createService(prisma);
      await expect(
        service.register({
          email: 'dupe@x.com',
          password: 'password123',
          fullName: 'X',
          phone: '01700000000',
        }),
      ).rejects.toThrow(EmailAlreadyRegisteredException);
    });
  });

  describe('login', () => {
    it('rejects an incorrect password without revealing which field was wrong', async () => {
      const passwordHash = await argon2.hash('correct-password');
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user1',
            email: 'a@x.com',
            status: 'active',
            isEmailVerified: true,
            passwordHash,
            roles: [],
            student: null,
          }),
        },
      } as unknown as PrismaService;

      const service = createService(prisma);
      await expect(
        service.login({ email: 'a@x.com', password: 'wrong-password' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('rejects unverified email after a correct password', async () => {
      const passwordHash = await argon2.hash('correct-password');
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user1',
            email: 'a@x.com',
            status: 'active',
            isEmailVerified: false,
            passwordHash,
            roles: [],
            student: null,
          }),
        },
      } as unknown as PrismaService;

      const service = createService(prisma);
      await expect(
        service.login({ email: 'a@x.com', password: 'correct-password' }),
      ).rejects.toThrow(EmailNotVerifiedException);
    });

    it('rejects login for an unknown email the same way as a wrong password', async () => {
      const prisma = {
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService;

      const service = createService(prisma);
      await expect(
        service.login({ email: 'missing@x.com', password: 'whatever123' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('returns a session for a correct password', async () => {
      const passwordHash = await argon2.hash('correct-password');
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user1',
            email: 'a@x.com',
            status: 'active',
            isEmailVerified: true,
            fullName: 'Ana Rahman',
            passwordHash,
            roles: [{ role: 'student' }],
            student: { studentId: 'ANA-0001', fullName: 'Ana Rahman' },
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        refreshToken: { create: jest.fn().mockResolvedValue({}) },
        $transaction: jest
          .fn()
          .mockImplementation((ops: unknown) =>
            Promise.all(ops as Promise<unknown>[]),
          ),
      } as unknown as PrismaService;

      const service = createService(prisma);
      const result = await service.login({
        email: 'a@x.com',
        password: 'correct-password',
      });

      expect(result.user).toEqual({
        id: 'user1',
        email: 'a@x.com',
        roles: ['student'],
        studentId: 'ANA-0001',
        fullName: 'Ana Rahman',
      });
    });
  });

  describe('forgotPassword: never reveals whether an email exists', () => {
    it('returns without error and without enqueueing when the email is unknown', async () => {
      const email = createEmailMock();
      const prisma = {
        user: { findFirst: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService;

      const service = createService(prisma, email);
      await expect(
        service.forgotPassword({ email: 'nobody@example.com' }),
      ).resolves.toBeUndefined();
      expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('stores a hashed token and enqueues email when the user exists', async () => {
      const email = createEmailMock();
      const tx = {
        passwordResetToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({}),
        },
      };
      const prisma = {
        user: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'user1',
            email: 'a@x.com',
            fullName: 'Ana Rahman',
            status: 'active',
          }),
        },
        $transaction: jest
          .fn()
          .mockImplementation((cb: (tx: unknown) => unknown) => cb(tx)),
      } as unknown as PrismaService;

      const service = createService(prisma, email);
      await service.forgotPassword({ email: 'a@x.com' });

      expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', usedAt: null },
        data: { usedAt: expect.any(Date) as Date },
      });
      expect(tx.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user1',
            tokenHash: expect.any(String) as string,
            expiresAt: expect.any(Date) as Date,
          }),
        }),
      );
      expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'a@x.com',
          fullName: 'Ana Rahman',
          resetUrl: expect.stringContaining('/reset-password?token=') as string,
          expiryMinutes: 30,
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('rejects an expired token with RESET_TOKEN_EXPIRED', async () => {
      const raw = 'expired-token-value';
      const prisma = {
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'prt1',
            userId: 'user1',
            tokenHash: hashToken(raw),
            expiresAt: new Date(Date.now() - 60_000),
            usedAt: null,
          }),
        },
      } as unknown as PrismaService;

      const service = createService(prisma);
      await expect(
        service.resetPassword({ token: raw, newPassword: 'newpassword1' }),
      ).rejects.toThrow(ResetTokenExpiredException);
    });

    it('rejects an already-used token with INVALID_RESET_TOKEN', async () => {
      const raw = 'used-token-value';
      const prisma = {
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'prt1',
            userId: 'user1',
            tokenHash: hashToken(raw),
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: new Date(),
          }),
        },
      } as unknown as PrismaService;

      const service = createService(prisma);
      await expect(
        service.resetPassword({ token: raw, newPassword: 'newpassword1' }),
      ).rejects.toThrow(InvalidResetTokenException);
    });

    it('rejects an unknown token with INVALID_RESET_TOKEN', async () => {
      const prisma = {
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as unknown as PrismaService;

      const service = createService(prisma);
      await expect(
        service.resetPassword({
          token: 'missing',
          newPassword: 'newpassword1',
        }),
      ).rejects.toThrow(InvalidResetTokenException);
    });

    it('updates the password, marks the token used, and revokes all refresh tokens', async () => {
      const raw = 'valid-reset-token';
      const tx = {
        passwordResetToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: { update: jest.fn().mockResolvedValue({}) },
        refreshToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      const prisma = {
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'prt1',
            userId: 'user1',
            tokenHash: hashToken(raw),
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
          }),
        },
        $transaction: jest
          .fn()
          .mockImplementation((cb: (tx: unknown) => unknown) => cb(tx)),
      } as unknown as PrismaService;

      const service = createService(prisma);
      await service.resetPassword({
        token: raw,
        newPassword: 'brand-new-password',
      });

      expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'prt1', usedAt: null },
        data: { usedAt: expect.any(Date) as Date },
      });
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { passwordHash: expect.any(String) as string },
      });
      expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });

      const updatedHash = (
        tx.user.update.mock.calls[0] as [
          { data: { passwordHash: string } },
        ]
      )[0].data.passwordHash;
      expect(await argon2.verify(updatedHash, 'brand-new-password')).toBe(
        true,
      );
    });
  });
});
