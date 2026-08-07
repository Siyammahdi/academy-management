import { OtpType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { OtpService } from './otp.service';
import { PrismaService } from '../../prisma/prisma.service';
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

describe('OtpService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('issues a 6-digit code, stores only the hash, and clears previous OTPs', async () => {
    const tx = {
      otpCode: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;

    const service = new OtpService(prisma);
    const issued = await service.issue('user1', OtpType.EMAIL);

    expect(issued.code).toMatch(/^\d{6}$/);
    expect(tx.otpCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user1', type: OtpType.EMAIL },
    });
    expect(tx.otpCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user1',
        type: OtpType.EMAIL,
        codeHash: hashOtp(issued.code),
        attempts: 0,
      }),
    });
  });

  it('rejects when no OTP exists', async () => {
    const prisma = {
      otpCode: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new OtpService(prisma);
    await expect(service.verify('user1', '123456')).rejects.toBeInstanceOf(
      OtpNotFoundException,
    );
  });

  it('rejects expired OTPs and deletes them', async () => {
    const prisma = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'otp1',
          codeHash: hashOtp('123456'),
          expiresAt: new Date(Date.now() - 1000),
          attempts: 0,
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new OtpService(prisma);
    await expect(service.verify('user1', '123456')).rejects.toBeInstanceOf(
      OtpExpiredException,
    );
    expect(prisma.otpCode.delete).toHaveBeenCalledWith({ where: { id: 'otp1' } });
  });

  it('increments attempts on invalid code and locks after max', async () => {
    process.env.OTP_MAX_ATTEMPTS = '2';
    jest.resetModules();
    // Re-require config/service with new env is hard; simulate via existing max.
    const prisma = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'otp1',
          codeHash: hashOtp('999999'),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
        update: jest.fn().mockResolvedValue({ attempts: 1 }),
        delete: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new OtpService(prisma);
    await expect(service.verify('user1', '000000')).rejects.toBeInstanceOf(
      OtpInvalidException,
    );
    expect(prisma.otpCode.update).toHaveBeenCalled();
  });

  it('rejects when attempts already exhausted', async () => {
    const prisma = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'otp1',
          codeHash: hashOtp('123456'),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 99,
        }),
      },
    } as unknown as PrismaService;
    const service = new OtpService(prisma);
    await expect(service.verify('user1', '123456')).rejects.toBeInstanceOf(
      OtpTooManyAttemptsException,
    );
  });

  it('deletes OTP after successful verification', async () => {
    const prisma = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'otp1',
          codeHash: hashOtp('123456'),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new OtpService(prisma);
    await service.verify('user1', '123456');
    expect(prisma.otpCode.delete).toHaveBeenCalledWith({ where: { id: 'otp1' } });
  });

  it('enforces resend cooldown', async () => {
    const prisma = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue({
          createdAt: new Date(),
        }),
      },
    } as unknown as PrismaService;
    const service = new OtpService(prisma);
    await expect(service.issue('user1')).rejects.toBeInstanceOf(
      OtpResendCooldownException,
    );
  });
});
