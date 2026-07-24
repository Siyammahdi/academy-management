import { Prisma } from '@prisma/client';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createService(
  prismaOverrides: Record<string, unknown>,
): BillingService {
  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((arg: (tx: unknown) => unknown) => arg(prisma)),
    ...prismaOverrides,
  } as unknown as PrismaService;
  return new BillingService(prisma);
}

describe('BillingService', () => {
  describe('BIL-12: running billing generation twice creates no duplicate periods', () => {
    it('counts a unique-constraint collision as skipped, not failed, and does not throw', async () => {
      const enrollment = {
        id: 'enr1',
        batch: { monthlyFee: decimal('500.00'), dueDayEnd: 5 },
      };
      const service = createService({
        enrollment: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([enrollment])
            .mockResolvedValueOnce([]),
        },
        billingPeriod: {
          // Simulates the real unique (enrollmentId, periodMonth)
          // constraint rejecting the second run's attempt.
          create: jest.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('duplicate', {
              code: 'P2002',
              clientVersion: '7.9.0',
            }),
          ),
        },
      });

      const result = await service.generateNextPeriods(
        new Date('2026-09-15T00:00:00.000Z'),
      );

      expect(result).toEqual({
        processed: 1,
        created: 0,
        skipped: 1,
        failed: 0,
      });
    });

    it('creates the period on a first run when none exists yet', async () => {
      const enrollment = {
        id: 'enr1',
        batch: { monthlyFee: decimal('500.00'), dueDayEnd: 5 },
      };
      const service = createService({
        enrollment: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([enrollment])
            .mockResolvedValueOnce([]),
        },
        billingPeriod: {
          create: jest.fn().mockResolvedValue({ id: 'period1' }),
        },
      });

      const result = await service.generateNextPeriods(
        new Date('2026-09-15T00:00:00.000Z'),
      );

      expect(result).toEqual({
        processed: 1,
        created: 1,
        skipped: 0,
        failed: 0,
      });
    });
  });
});
