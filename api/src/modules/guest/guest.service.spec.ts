import { Prisma } from '@prisma/client';
import { GuestService } from './guest.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentNotFoundException } from '../../common/exceptions/student-not-found.exception';

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createService(prismaOverrides: Record<string, unknown>): GuestService {
  const prisma = { ...prismaOverrides } as unknown as PrismaService;
  return new GuestService(prisma);
}

function period(overrides: Record<string, unknown>) {
  return {
    id: 'period-default',
    amountOwed: decimal('500.00'),
    amountPaid: decimal('0.00'),
    periodMonth: new Date('2026-03-01T00:00:00.000Z'),
    enrollment: {
      batch: {
        name: 'Batch 8',
        course: { title: 'Learning Arabic Language' },
      },
    },
    ...overrides,
  };
}

describe('GuestService', () => {
  describe('GST-02: dues are listed separately, never merged, across multiple enrollments', () => {
    it('returns one entry per outstanding period, each with its own amount', async () => {
      const service = createService({
        student: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'student1', fullName: 'Abdullah Rahman' }),
        },
        billingPeriod: {
          findMany: jest.fn().mockResolvedValue([
            period({
              id: 'period1',
              amountOwed: decimal('500.00'),
              amountPaid: decimal('0.00'),
              periodMonth: new Date('2026-03-01T00:00:00.000Z'),
              enrollment: {
                batch: {
                  name: 'Batch 8',
                  course: { title: 'Learning Arabic Language' },
                },
              },
            }),
            period({
              id: 'period2',
              amountOwed: decimal('400.00'),
              amountPaid: decimal('0.00'),
              periodMonth: new Date('2026-03-01T00:00:00.000Z'),
              enrollment: {
                batch: {
                  name: 'Batch 3',
                  course: { title: 'Quran Memorization' },
                },
              },
            }),
          ]),
        },
      });

      const result = await service.lookup('ANA-0042');

      expect(result.outstandingDues).toHaveLength(2);
      expect(result.outstandingDues[0]).toMatchObject({
        billingPeriodId: 'period1',
        courseTitle: 'Learning Arabic Language',
        batchName: 'Batch 8',
        periodMonth: '2026-03',
      });
      expect(result.outstandingDues[0].amountOutstanding.toFixed(2)).toBe(
        '500.00',
      );
      expect(result.outstandingDues[1]).toMatchObject({
        billingPeriodId: 'period2',
        courseTitle: 'Quran Memorization',
        batchName: 'Batch 3',
      });
      expect(result.outstandingDues[1].amountOutstanding.toFixed(2)).toBe(
        '400.00',
      );
      // Never merged into one combined total (GST-03).
      const total = result.outstandingDues.reduce(
        (sum, due) => sum.plus(due.amountOutstanding),
        decimal('0'),
      );
      expect(total.toFixed(2)).toBe('900.00');
      expect(
        result.outstandingDues.map((d) => d.amountOutstanding),
      ).toHaveLength(2);
    });
  });

  describe('GST-04: an unmatched identifier returns no result', () => {
    it('throws StudentNotFoundException (404 STUDENT_NOT_FOUND)', async () => {
      const service = createService({
        student: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.lookup('no-such-identifier')).rejects.toThrow(
        StudentNotFoundException,
      );
    });
  });

  describe('GST-05: the response exposes only name and amounts', () => {
    it('contains no fields beyond fullName and the due fields', async () => {
      const service = createService({
        student: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'student1',
            studentId: 'ANA-0042',
            fullName: 'Abdullah Rahman',
            phone: '01700000000',
          }),
        },
        billingPeriod: {
          findMany: jest.fn().mockResolvedValue([period({ id: 'period1' })]),
        },
      });

      const result = await service.lookup('ANA-0042');

      expect(Object.keys(result).sort()).toEqual(
        ['student', 'outstandingDues'].sort(),
      );
      expect(Object.keys(result.student)).toEqual(['fullName']);
      for (const due of result.outstandingDues) {
        expect(Object.keys(due).sort()).toEqual(
          [
            'billingPeriodId',
            'courseTitle',
            'batchName',
            'periodMonth',
            'amountOutstanding',
          ].sort(),
        );
      }
      // No phone, email, address, or the human studentId anywhere.
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('01700000000');
      expect(serialized).not.toContain('ANA-0042');
    });
  });
});
