import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { EmailAlreadyRegisteredException } from '../../common/exceptions/email-already-registered.exception';
import { InvalidCredentialsException } from '../../common/exceptions/invalid-credentials.exception';
import { PrismaService } from '../../prisma/prisma.service';

function createJwtServiceMock(): JwtService {
  return {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
}

describe('AuthService', () => {
  describe('register', () => {
    it('creates User + Student + student role in one transaction, with a sequential studentId (doc 05 §6)', async () => {
      const tx = {
        user: {
          create: jest
            .fn()
            .mockResolvedValue({ id: 'user1', email: 'a@x.com' }),
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
        refreshToken: { create: jest.fn().mockResolvedValue({}) },
      } as unknown as PrismaService;

      const service = new AuthService(prisma, createJwtServiceMock());
      const result = await service.register({
        email: 'a@x.com',
        password: 'password123',
        fullName: 'Ana Rahman',
        phone: '01700000000',
      });

      expect(tx.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user1', role: 'student' },
      });
      expect(tx.studentIdSequence.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { current: { increment: 1 } },
      });
      expect(tx.student.create).toHaveBeenCalledWith({
        data: {
          studentId: 'ANA-0007',
          userId: 'user1',
          fullName: 'Ana Rahman',
          phone: '01700000000',
        },
      });
      expect(result.user.studentId).toBe('ANA-0007');
      expect(result.user.roles).toEqual(['student']);
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });

    it('rejects a duplicate email registration', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.9.0' },
      );
      const prisma = {
        $transaction: jest.fn().mockRejectedValue(prismaError),
      } as unknown as PrismaService;

      const service = new AuthService(prisma, createJwtServiceMock());
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
            passwordHash,
            roles: [],
            student: null,
          }),
        },
      } as unknown as PrismaService;

      const service = new AuthService(prisma, createJwtServiceMock());
      await expect(
        service.login({ email: 'a@x.com', password: 'wrong-password' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('rejects login for an unknown email the same way as a wrong password', async () => {
      const prisma = {
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService;

      const service = new AuthService(prisma, createJwtServiceMock());
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
            passwordHash,
            roles: [{ role: 'student' }],
            student: { studentId: 'ANA-0001' },
          }),
        },
        refreshToken: { create: jest.fn().mockResolvedValue({}) },
      } as unknown as PrismaService;

      const service = new AuthService(prisma, createJwtServiceMock());
      const result = await service.login({
        email: 'a@x.com',
        password: 'correct-password',
      });

      expect(result.user).toEqual({
        id: 'user1',
        email: 'a@x.com',
        roles: ['student'],
        studentId: 'ANA-0001',
      });
    });
  });
});
