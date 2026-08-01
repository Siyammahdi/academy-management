import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { AuditService } from '../audit/audit.service';
import { GatewayRegistry } from '../gateway/gateway.registry';
import type { GatewayService } from '../gateway/gateway.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ArrearsExistException } from '../../common/exceptions/arrears-exist.exception';
import { PeriodAlreadyPaidException } from '../../common/exceptions/period-already-paid.exception';
import { PaymentAlreadySettledException } from '../../common/exceptions/payment-already-settled.exception';
import { PaymentAmountInvalidException } from '../../common/exceptions/payment-amount-invalid.exception';

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function studentActor(studentId: string): AuthUser {
  return {
    id: 'user-student',
    email: 's@x.com',
    roles: ['student'],
    studentId,
  };
}

function staffActor(
  id: string,
  roles: AuthUser['roles'] = ['admin'],
): AuthUser {
  return { id, email: 'staff@x.com', roles, studentId: null };
}

function createGatewayMock(): GatewayService {
  return {
    provider: 'sslcommerz',
    initiateSession: jest.fn().mockResolvedValue({
      redirectUrl: 'https://sandbox.sslcommerz.com/pay/abc',
    }),
    checkStatus: jest.fn().mockResolvedValue({
      invoiceNumber: 'GW-1',
      trxStatus: 'success',
      amount: '500.00',
    }),
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  } as unknown as GatewayService;
}

function createGatewayRegistryMock(gateway: GatewayService): GatewayRegistry {
  return {
    get: jest.fn().mockReturnValue(gateway),
    resolveId: jest.fn((provider?: string | null) => provider ?? 'paystation'),
    requireConfigured: jest.fn().mockReturnValue(gateway),
  } as unknown as GatewayRegistry;
}

function createAuditMock(): { record: jest.Mock } {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

/** A tx mock covering exactly what settleVerifiedPayment/settleRejectedPayment
 * /recomputePeriodStatus/maybeClearPenaltyFlag/applyPenaltyIfDue touch. */
function createTxMock(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    payment: {
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    billingPeriod: {
      update: jest
        .fn()
        .mockImplementation((args: { data: unknown }) =>
          Promise.resolve(args.data),
        ),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    enrollment: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ id: 'enr1', inPenalty: false }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    request: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    refund: {
      create: jest.fn(),
    },
    ...overrides,
  };
}

function createService(
  tx: Record<string, unknown>,
  prismaOverrides: Record<string, unknown> = {},
): {
  service: PaymentsService;
  audit: { record: jest.Mock };
  gateway: GatewayService;
} {
  const audit = createAuditMock();
  const gateway = createGatewayMock();
  const gateways = createGatewayRegistryMock(gateway);
  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((arg: unknown) =>
        Array.isArray(arg)
          ? Promise.all(arg)
          : (arg as (tx: unknown) => unknown)(tx),
      ),
    ...prismaOverrides,
  } as unknown as PrismaService;
  const service = new PaymentsService(
    prisma,
    audit as unknown as AuditService,
    gateways,
  );
  return { service, audit, gateway };
}

describe('PaymentsService', () => {
  describe('PAY-08: verifying a payment settles atomically', () => {
    it('increments amountPaid by the payment amount and recomputes status', async () => {
      const tx = createTxMock({
        payment: {
          update: jest.fn().mockResolvedValue({
            id: 'pay1',
            billingPeriodId: 'period1',
            amount: decimal('500.00'),
            status: 'verified',
          }),
          count: jest.fn().mockResolvedValue(0),
        },
        billingPeriod: {
          update: jest
            .fn()
            .mockImplementation((args: { data: unknown }) =>
              Promise.resolve(args.data),
            ),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            amountOwed: decimal('500.00'),
            amountPaid: decimal('500.00'),
          }),
          count: jest.fn().mockResolvedValue(0),
        },
      });
      const { service, audit } = createService(tx);

      const result = await service.verify('pay1', staffActor('admin1'));

      expect(result.status).toBe('verified');
      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      expect(billingPeriodDelegate.update).toHaveBeenCalledWith({
        where: { id: 'period1' },
        data: { amountPaid: { increment: decimal('500.00') } },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment_verified',
          targetId: 'pay1',
        }),
        tx,
      );
    });

    it('throws PaymentAlreadySettledException on double-verification', async () => {
      const tx = createTxMock({
        payment: {
          update: jest.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('not found', {
              code: 'P2025',
              clientVersion: '7.9.0',
            }),
          ),
          count: jest.fn().mockResolvedValue(0),
        },
      });
      const { service } = createService(tx);

      await expect(
        service.verify('pay1', staffActor('admin1')),
      ).rejects.toThrow(PaymentAlreadySettledException);
    });
  });

  describe('ENR-06/07: a verified payment activates the enrollment', () => {
    it('sets a pending enrollment to active when its payment is verified', async () => {
      const tx = createTxMock({
        payment: {
          update: jest.fn().mockResolvedValue({
            id: 'pay1',
            billingPeriodId: 'period1',
            amount: decimal('500.00'),
            status: 'verified',
          }),
          count: jest.fn().mockResolvedValue(0),
        },
        billingPeriod: {
          update: jest
            .fn()
            .mockImplementation((args: { data: Record<string, unknown> }) =>
              Promise.resolve({
                id: 'period1',
                enrollmentId: 'enr1',
                ...args.data,
              }),
            ),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            amountOwed: decimal('500.00'),
            amountPaid: decimal('500.00'),
          }),
          count: jest.fn().mockResolvedValue(0),
        },
      });
      const { service } = createService(tx);

      await service.verify('pay1', staffActor('admin1'));

      const enrollmentDelegate = tx.enrollment as { updateMany: jest.Mock };
      expect(enrollmentDelegate.updateMany).toHaveBeenCalledWith({
        where: { id: 'enr1', status: 'pending' },
        data: { status: 'active' },
      });
    });
  });

  describe('BIL-08: a pending payment does not increase amountPaid', () => {
    it('rejecting a payment never touches amountPaid', async () => {
      const tx = createTxMock({
        payment: {
          update: jest.fn().mockResolvedValue({
            id: 'pay1',
            billingPeriodId: 'period1',
            amount: decimal('500.00'),
            status: 'rejected',
          }),
          count: jest.fn().mockResolvedValue(0),
        },
        billingPeriod: {
          update: jest
            .fn()
            .mockImplementation((args: { data: unknown }) =>
              Promise.resolve(args.data),
            ),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            amountOwed: decimal('500.00'),
            amountPaid: decimal('0'),
            status: 'unpaid',
            enrollment: { batch: { enrollmentFee: decimal('100.00') } },
          }),
          count: jest.fn().mockResolvedValue(0),
        },
      });
      const { service } = createService(tx);

      await service.reject('pay1', staffActor('admin1'));

      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      for (const call of billingPeriodDelegate.update.mock.calls as Array<
        [{ data: Record<string, unknown> }]
      >) {
        expect(call[0].data).not.toHaveProperty('amountPaid');
      }
    });
  });

  describe('BIL-10: advance payment refused while arrears exist', () => {
    it('throws ArrearsExistException when an earlier period is unpaid', async () => {
      const prisma = {
        billingPeriod: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'period2',
            enrollmentId: 'enr1',
            status: 'unpaid',
            periodMonth: new Date('2026-03-01'),
            amountOwed: decimal('500'),
            amountPaid: decimal('0'),
            enrollment: { studentId: 'student1' },
          }),
          count: jest.fn().mockResolvedValue(1), // one earlier unpaid period
        },
      };
      const { service } = createService({}, prisma);

      await expect(
        service.payManual(
          'period2',
          {
            amount: '500.00',
            transactionReference: 'ref1',
            proofUrl: 'https://x.com/p.jpg',
          },
          studentActor('student1'),
        ),
      ).rejects.toThrow(ArrearsExistException);
    });

    it('rejects a manual amount that does not match outstanding', async () => {
      const prisma = {
        billingPeriod: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            status: 'unpaid',
            periodMonth: new Date('2026-01-01'),
            amountOwed: decimal('500'),
            amountPaid: decimal('0'),
            enrollment: { studentId: 'student1' },
          }),
          count: jest.fn().mockResolvedValue(0),
        },
      };
      const { service } = createService({}, prisma);

      await expect(
        service.payManual(
          'period1',
          {
            amount: '100.00',
            transactionReference: 'ref1',
            proofUrl: 'https://x.com/p.jpg',
          },
          studentActor('student1'),
        ),
      ).rejects.toThrow(PaymentAmountInvalidException);
    });

    it('does not block payment when there are no arrears', async () => {
      const tx = createTxMock({
        payment: {
          create: jest.fn().mockResolvedValue({
            id: 'pay1',
            billingPeriodId: 'period1',
            status: 'pending',
          }),
          count: jest.fn().mockResolvedValue(1), // the payment just created
        },
        billingPeriod: {
          update: jest
            .fn()
            .mockImplementation((args: { data: unknown }) =>
              Promise.resolve(args.data),
            ),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            amountOwed: decimal('500'),
            amountPaid: decimal('0'),
          }),
        },
      });
      const prisma = {
        billingPeriod: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            status: 'unpaid',
            periodMonth: new Date('2026-01-01'),
            amountOwed: decimal('500'),
            amountPaid: decimal('0'),
            enrollment: { studentId: 'student1' },
          }),
          count: jest.fn().mockResolvedValue(0),
        },
      };
      const { service } = createService(tx, prisma);

      const result = await service.payManual(
        'period1',
        {
          amount: '500.00',
          transactionReference: 'ref1',
          proofUrl: 'https://x.com/p.jpg',
        },
        studentActor('student1'),
      );
      expect(result.status).toBe('pending');

      // BIL-09/PEN-05 — the period's persisted status must flip to
      // 'pending' inside the same transaction, not just on a later read.
      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      expect(billingPeriodDelegate.update).toHaveBeenCalledWith({
        where: { id: 'period1' },
        data: { status: 'pending' },
      });
    });
  });

  describe('PERIOD_ALREADY_PAID guard', () => {
    it('refuses a new payment attempt on an already-paid period', async () => {
      const prisma = {
        billingPeriod: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            status: 'paid',
            periodMonth: new Date('2026-01-01'),
            amountOwed: decimal('500'),
            amountPaid: decimal('500'),
            enrollment: { studentId: 'student1' },
          }),
        },
      };
      const { service } = createService({}, prisma);

      await expect(
        service.payManual(
          'period1',
          {
            amount: '500.00',
            transactionReference: 'ref1',
            proofUrl: 'https://x.com/p.jpg',
          },
          studentActor('student1'),
        ),
      ).rejects.toThrow(PeriodAlreadyPaidException);
    });
  });

  describe('RFD-04: a refund reopens the balance', () => {
    it('decreases the period amountPaid by the refund amount', async () => {
      const tx = createTxMock({
        payment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pay1',
            billingPeriodId: 'period1',
            amount: decimal('500.00'),
            status: 'verified',
          }),
          count: jest.fn().mockResolvedValue(0),
        },
        billingPeriod: {
          update: jest
            .fn()
            .mockImplementation((args: { data: unknown }) =>
              Promise.resolve(args.data),
            ),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            amountOwed: decimal('500.00'),
            amountPaid: decimal('300.00'),
          }),
          count: jest.fn().mockResolvedValue(0),
        },
        refund: {
          create: jest
            .fn()
            .mockResolvedValue({ id: 'refund1', amount: decimal('200.00') }),
        },
      });
      const { service, audit } = createService(tx);

      const result = await service.refund(
        'pay1',
        { amount: '200.00', reason: 'Overcharged' },
        staffActor('admin1'),
      );

      expect(result.id).toBe('refund1');
      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      expect(billingPeriodDelegate.update).toHaveBeenCalledWith({
        where: { id: 'period1' },
        data: { amountPaid: { decrement: decimal('200.00') } },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'refund_issued',
          targetId: 'refund1',
        }),
        tx,
      );
    });

    it('refuses a refund larger than the original payment', async () => {
      const tx = createTxMock({
        payment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pay1',
            billingPeriodId: 'period1',
            amount: decimal('200.00'),
            status: 'verified',
          }),
        },
      });
      const { service } = createService(tx);

      await expect(
        service.refund(
          'pay1',
          { amount: '500.00', reason: 'x' },
          staffActor('admin1'),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses to refund a payment that was never verified', async () => {
      const tx = createTxMock({
        payment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pay1',
            billingPeriodId: 'period1',
            amount: decimal('200.00'),
            status: 'pending',
          }),
        },
      });
      const { service } = createService(tx);

      await expect(
        service.refund(
          'pay1',
          { amount: '100.00', reason: 'x' },
          staffActor('admin1'),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PEN-04: the penalty applies only when the period is unpaid, no pending payment, and no approved grace', () => {
    it('applies the penalty when all three conditions hold', async () => {
      const tx = createTxMock({
        billingPeriod: {
          update: jest
            .fn()
            .mockImplementation((args: { data: unknown }) =>
              Promise.resolve(args.data),
            ),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            status: 'unpaid',
            enrollment: { batch: { enrollmentFee: decimal('1000.00') } },
          }),
        },
      });
      const prisma = {
        billingPeriod: {
          findMany: jest.fn().mockResolvedValue([{ id: 'period1' }]),
        },
      };
      const { service, audit } = createService(tx, prisma);

      const result = await service.runPenaltySweep();

      expect(result).toEqual({
        processed: 1,
        penalized: 1,
        skipped: 0,
        failed: 0,
      });
      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      expect(billingPeriodDelegate.update).toHaveBeenCalledWith({
        where: { id: 'period1' },
        data: { amountOwed: { increment: decimal('1000.00') } },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'penalty_applied',
          targetId: 'enr1',
        }),
        tx,
      );
    });

    it('skips a period that is not unpaid, even if selected for the sweep', async () => {
      const tx = createTxMock({
        billingPeriod: {
          update: jest.fn(),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            status: 'partially_paid', // e.g. a race between selection and this read
            enrollment: { batch: { enrollmentFee: decimal('1000.00') } },
          }),
        },
      });
      const prisma = {
        billingPeriod: {
          findMany: jest.fn().mockResolvedValue([{ id: 'period1' }]),
        },
      };
      const { service } = createService(tx, prisma);

      const result = await service.runPenaltySweep();

      expect(result).toEqual({
        processed: 1,
        penalized: 0,
        skipped: 1,
        failed: 0,
      });
      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      expect(billingPeriodDelegate.update).not.toHaveBeenCalled();
    });
  });

  describe('PEN-05: a pending payment protects the enrollment from the penalty', () => {
    it('does not penalize a period that has a pending payment', async () => {
      const tx = createTxMock({
        payment: {
          update: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          count: jest.fn().mockResolvedValue(1),
        },
        billingPeriod: {
          update: jest.fn(),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            status: 'unpaid',
            enrollment: { batch: { enrollmentFee: decimal('1000.00') } },
          }),
        },
      });
      const prisma = {
        billingPeriod: {
          findMany: jest.fn().mockResolvedValue([{ id: 'period1' }]),
        },
      };
      const { service } = createService(tx, prisma);

      const result = await service.runPenaltySweep();

      expect(result).toEqual({
        processed: 1,
        penalized: 0,
        skipped: 1,
        failed: 0,
      });
      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      expect(billingPeriodDelegate.update).not.toHaveBeenCalled();
    });
  });

  describe('PEN-06: the penalty must not stack', () => {
    it('does not apply a second penalty to an enrollment already in penalty', async () => {
      const tx = createTxMock({
        enrollment: {
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValue({ id: 'enr1', inPenalty: true }),
          // where: { inPenalty: false } matches nothing — already claimed.
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        billingPeriod: {
          update: jest.fn(),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'period1',
            enrollmentId: 'enr1',
            status: 'unpaid',
            enrollment: { batch: { enrollmentFee: decimal('1000.00') } },
          }),
        },
      });
      const prisma = {
        billingPeriod: {
          findMany: jest.fn().mockResolvedValue([{ id: 'period1' }]),
        },
      };
      const { service } = createService(tx, prisma);

      const result = await service.runPenaltySweep();

      expect(result).toEqual({
        processed: 1,
        penalized: 0,
        skipped: 1,
        failed: 0,
      });
      const billingPeriodDelegate = tx.billingPeriod as { update: jest.Mock };
      expect(billingPeriodDelegate.update).not.toHaveBeenCalled();
    });
  });
});
