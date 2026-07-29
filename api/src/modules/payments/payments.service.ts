import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Batch,
  BillingPeriod,
  Enrollment,
  Payment,
  Prisma,
  Refund,
  Student,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { ArrearsExistException } from '../../common/exceptions/arrears-exist.exception';
import { PeriodAlreadyPaidException } from '../../common/exceptions/period-already-paid.exception';
import { PaymentAlreadySettledException } from '../../common/exceptions/payment-already-settled.exception';
import { InvalidWebhookSignatureException } from '../../common/exceptions/invalid-webhook-signature.exception';
import { formatMoney } from '../../common/utils/money';
import {
  COURSE_PUBLIC_SELECT,
  type CoursePublicRow,
} from '../courses/course.presentation';
import { derivePeriodStatus } from '../../common/utils/period';
import { GatewayService } from '../gateway/gateway.service';
import type { SslcommerzWebhookPayload } from '../gateway/gateway.service';
import { PayManualDto } from './dto/pay-manual.dto';
import { RefundDto } from './dto/refund.dto';
import { GuestPayGatewayDto } from './dto/guest-pay-gateway.dto';
import { GuestPayManualDto } from './dto/guest-pay-manual.dto';
import {
  Paginated,
  PaginationQuery,
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination';

export type PaymentWithBillingPeriod = Payment & {
  billingPeriod: BillingPeriod & {
    enrollment: Enrollment & {
      student: Student;
      batch: Batch & { course: CoursePublicRow };
    };
  };
};

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

// PEN-04 gate outcome, surfaced so the scheduled sweep (runPenaltySweep)
// can count applied vs skipped without re-deriving the same conditions.
type PenaltyOutcome = 'applied' | 'skipped';

export interface PenaltySweepResult {
  processed: number;
  penalized: number;
  skipped: number;
  failed: number;
}

const JOB_BATCH_SIZE = 100;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateway: GatewayService,
  ) {}

  async payGateway(
    billingPeriodId: string,
    actor: AuthUser,
  ): Promise<{ redirectUrl: string }> {
    const studentId = this.requireStudentId(actor);
    const period = await this.loadPeriodForPayment(billingPeriodId, studentId);
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
    });
    const outstanding = period.amountOwed.minus(period.amountPaid);

    const { redirectUrl, transactionReference } =
      await this.startGatewaySession(
        outstanding,
        student.fullName,
        student.phone,
      );

    await this.prisma.$transaction((tx) =>
      this.createPendingPayment(tx, {
        billingPeriodId,
        amount: outstanding,
        method: 'gateway',
        paidBy: 'student',
        transactionReference,
        actorUserId: actor.id,
      }),
    );

    return { redirectUrl };
  }

  async payManual(
    billingPeriodId: string,
    dto: PayManualDto,
    actor: AuthUser,
  ): Promise<Payment> {
    const studentId = this.requireStudentId(actor);
    await this.loadPeriodForPayment(billingPeriodId, studentId);

    return this.prisma.$transaction((tx) =>
      this.createPendingPayment(tx, {
        billingPeriodId,
        amount: new Prisma.Decimal(dto.amount),
        method: 'manual',
        paidBy: 'student',
        transactionReference: dto.transactionReference,
        proofUrl: dto.proofUrl,
        actorUserId: actor.id,
      }),
    );
  }

  // GST-01/PAY-11 — the same payment logic authenticated students use,
  // just without a token: no ownership check (the billingPeriodId is only
  // ever discoverable via a prior /guest/lookup response), paidBy 'guest',
  // and guestName/guestPhone recorded on the Payment. BIL-10, BIL-08, and
  // the BIL-09 persisted-status fix apply identically — same helpers.
  async guestPayGateway(
    billingPeriodId: string,
    dto: GuestPayGatewayDto,
  ): Promise<{ redirectUrl: string }> {
    const period = await this.loadPeriodForPayment(billingPeriodId);
    const outstanding = period.amountOwed.minus(period.amountPaid);

    const { redirectUrl, transactionReference } =
      await this.startGatewaySession(
        outstanding,
        dto.guestName,
        dto.guestPhone,
      );

    await this.prisma.$transaction((tx) =>
      this.createPendingPayment(tx, {
        billingPeriodId,
        amount: outstanding,
        method: 'gateway',
        paidBy: 'guest',
        transactionReference,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        actorUserId: null,
      }),
    );

    return { redirectUrl };
  }

  async guestPayManual(
    billingPeriodId: string,
    dto: GuestPayManualDto,
  ): Promise<Payment> {
    await this.loadPeriodForPayment(billingPeriodId);

    return this.prisma.$transaction((tx) =>
      this.createPendingPayment(tx, {
        billingPeriodId,
        amount: new Prisma.Decimal(dto.amount),
        method: 'manual',
        paidBy: 'guest',
        transactionReference: dto.transactionReference,
        proofUrl: dto.proofUrl,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        actorUserId: null,
      }),
    );
  }

  // PAY-02 — the Payment row is created only once the gateway session
  // actually succeeds; if it fails, the payer was never redirected.
  private async startGatewaySession(
    outstanding: Prisma.Decimal,
    customerName: string,
    customerPhone: string,
  ): Promise<{ redirectUrl: string; transactionReference: string }> {
    const transactionReference = `GW-${randomUUID()}`;
    const { redirectUrl } = await this.gateway.initiateSession({
      transactionReference,
      amount: formatMoney(outstanding),
      customerName,
      customerPhone,
    });
    return { redirectUrl, transactionReference };
  }

  // BIL-09/PEN-05 — a pending payment must flip the period's persisted
  // status immediately (not just on read), since the penalty job queries
  // the database directly. Shared by every payment-creation path —
  // authenticated student and guest, gateway and manual.
  private async createPendingPayment(
    tx: Prisma.TransactionClient,
    params: {
      billingPeriodId: string;
      amount: Prisma.Decimal;
      method: 'gateway' | 'manual';
      paidBy: 'student' | 'guest';
      transactionReference: string;
      proofUrl?: string;
      guestName?: string;
      guestPhone?: string;
      actorUserId: string | null;
    },
  ): Promise<Payment> {
    const payment = await tx.payment.create({
      data: {
        billingPeriodId: params.billingPeriodId,
        amount: params.amount,
        method: params.method,
        status: 'pending',
        paidBy: params.paidBy,
        transactionReference: params.transactionReference,
        proofUrl: params.proofUrl,
        guestName: params.guestName,
        guestPhone: params.guestPhone,
      },
    });
    await this.recomputePeriodStatus(tx, params.billingPeriodId);
    await this.audit.record(
      {
        actorUserId: params.actorUserId,
        action: 'payment_submitted',
        targetType: 'Payment',
        targetId: payment.id,
        details: {
          method: params.method,
          paidBy: params.paidBy,
          amount: formatMoney(params.amount),
          billingPeriodId: params.billingPeriodId,
        },
      },
      tx,
    );
    return payment;
  }

  // doc 05 index rationale — payments (status, method) is specifically the
  // manager's pending-MANUAL-payment queue; gateway payments settle via
  // the webhook, never a human review.
  async listPending(
    actor: AuthUser,
    query: PaginationQuery,
  ): Promise<Paginated<PaymentWithBillingPeriod>> {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.PaymentWhereInput = {
      status: 'pending',
      method: 'manual',
    };
    if (!actor.roles.includes('admin')) {
      where.billingPeriod = {
        enrollment: { batch: { managers: { some: { userId: actor.id } } } },
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          billingPeriod: {
            include: {
              enrollment: {
                include: {
                  student: true,
                  batch: {
                    include: {
                      course: { select: COURSE_PUBLIC_SELECT },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async verify(paymentId: string, actor: AuthUser): Promise<Payment> {
    return this.prisma.$transaction((tx) =>
      this.settleVerifiedPayment(tx, paymentId, actor.id),
    );
  }

  async reject(paymentId: string, actor: AuthUser): Promise<Payment> {
    return this.prisma.$transaction((tx) =>
      this.settleRejectedPayment(tx, paymentId, actor.id),
    );
  }

  async refund(
    paymentId: string,
    dto: RefundDto,
    actor: AuthUser,
  ): Promise<Refund> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        throw new NotFoundException('Not found');
      }
      if (payment.status !== 'verified') {
        throw new BadRequestException(
          'Only a verified payment can be refunded.',
        );
      }

      const refundAmount = new Prisma.Decimal(dto.amount);
      if (refundAmount.greaterThan(payment.amount)) {
        throw new BadRequestException(
          'Refund amount cannot exceed the original payment amount.',
        );
      }

      const refund = await tx.refund.create({
        data: {
          paymentId,
          amount: dto.amount,
          reason: dto.reason,
          refundedById: actor.id,
        },
      });

      // RFD-04 — decrease the period's amountPaid, reopening the balance.
      await tx.billingPeriod.update({
        where: { id: payment.billingPeriodId },
        data: { amountPaid: { decrement: refundAmount } },
      });
      await this.recomputePeriodStatus(tx, payment.billingPeriodId);

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'refund_issued',
          targetType: 'Refund',
          targetId: refund.id,
          details: {
            paymentId,
            amount: formatMoney(refundAmount),
            reason: dto.reason,
          },
        },
        tx,
      );

      return refund;
    });
  }

  async listMine(
    actor: AuthUser,
    query: PaginationQuery,
  ): Promise<Paginated<PaymentWithBillingPeriod>> {
    const studentId = this.requireStudentId(actor);
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.PaymentWhereInput = {
      billingPeriod: { enrollment: { studentId } },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          billingPeriod: {
            include: {
              enrollment: {
                include: {
                  student: true,
                  batch: {
                    include: {
                      course: { select: COURSE_PUBLIC_SELECT },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  // doc 06 §10 — signature-verified, never token-authed.
  async handleWebhook(
    payload: SslcommerzWebhookPayload,
  ): Promise<{ ok: true }> {
    if (!this.gateway.verifyWebhookSignature(payload)) {
      throw new InvalidWebhookSignatureException();
    }

    const tranId = payload.tran_id;
    if (typeof tranId !== 'string' || tranId.length === 0) {
      return { ok: true }; // nothing to act on; ack so it isn't retried forever
    }

    const existing = await this.prisma.payment.findUnique({
      where: { transactionReference: tranId },
    });
    if (!existing) {
      return { ok: true }; // unmatched reference — nothing to settle
    }
    if (existing.status === 'verified' || existing.status === 'rejected') {
      return { ok: true }; // PAY-04 — already handled
    }

    const isSuccess =
      payload.status === 'VALID' || payload.status === 'VALIDATED';

    try {
      await this.prisma.$transaction(async (tx) => {
        if (isSuccess) {
          await this.settleVerifiedPayment(tx, existing.id, null);
        } else {
          await this.settleRejectedPayment(tx, existing.id, null);
        }
      });
    } catch (error) {
      // PAY-04 — a concurrent duplicate delivery lost the race; that's
      // success from the webhook's point of view, not an error to report.
      if (!(error instanceof PaymentAlreadySettledException)) {
        throw error;
      }
    }

    return { ok: true };
  }

  // PAY-05 — a gateway payment still pending past 60 minutes expires.
  // Paged in chunks of 100 (doc 07 §5) — never loads every stale payment
  // into memory. Each one settles in its own transaction so one failure
  // doesn't roll back the whole sweep.
  async expireStalePendingGatewayPayments(): Promise<number> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    let expiredCount = 0;
    let processed = 0;
    let failed = 0;
    // A failed payment stays 'pending' and would otherwise be refetched by
    // every subsequent page in this same run (unlike a success, which
    // naturally leaves the filter) — excluded here so the loop still
    // terminates; it's retried on the next scheduled run instead.
    const attemptedIds: string[] = [];

    this.logger.log('gateway-expiry: started');

    for (;;) {
      const stale = await this.prisma.payment.findMany({
        where: {
          method: 'gateway',
          status: 'pending',
          createdAt: { lt: cutoff },
          id: attemptedIds.length > 0 ? { notIn: attemptedIds } : undefined,
        },
        select: { id: true, billingPeriodId: true },
        take: JOB_BATCH_SIZE,
      });
      if (stale.length === 0) {
        break;
      }

      for (const { id, billingPeriodId } of stale) {
        processed += 1;
        attemptedIds.push(id);
        try {
          await this.prisma.$transaction(async (tx) => {
            const updated = await tx.payment.updateMany({
              where: { id, status: 'pending' },
              data: { status: 'expired' },
            });
            if (updated.count > 0) {
              expiredCount += 1;
              // BIL-09 — the pending payment that was keeping this period
              // 'pending' is gone; it returns to its amount-derived status.
              await this.recomputePeriodStatus(tx, billingPeriodId);
              // Not in doc 02 AUD-04's enumerated list (a real gap —
              // PAY-05 is an explicit requirement and every money action
              // needs a trail); named to accurately reflect the
              // transition, not reused from "payment_rejected".
              await this.audit.record(
                {
                  actorUserId: null,
                  action: 'payment_expired',
                  targetType: 'Payment',
                  targetId: id,
                },
                tx,
              );
            }
          });
        } catch (error) {
          failed += 1;
          this.logger.error(
            `gateway-expiry: failed to process payment ${id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      if (stale.length < JOB_BATCH_SIZE) {
        break;
      }
    }

    this.logger.log(
      `gateway-expiry: completed processed=${processed} expired=${expiredCount} failed=${failed}`,
    );
    return expiredCount;
  }

  private requireStudentId(actor: AuthUser): string {
    if (actor.studentId === null) {
      throw new BadRequestException(
        'Your account has no linked student profile.',
      );
    }
    return actor.studentId;
  }

  // Shared by the authenticated student flow (studentId provided — must
  // own the period, doc 04 §4.3 leaks "not found" rather than "forbidden")
  // and the guest flow (studentId omitted — a guest has no token to own
  // anything against; the billingPeriodId itself is only ever discoverable
  // via a prior successful /guest/lookup response). BIL-10 and
  // PeriodAlreadyPaid apply identically either way.
  private async loadPeriodForPayment(
    billingPeriodId: string,
    studentId?: string,
  ): Promise<BillingPeriod & { enrollment: Enrollment }> {
    const period = await this.prisma.billingPeriod.findUnique({
      where: { id: billingPeriodId },
      include: { enrollment: true },
    });
    if (
      !period ||
      (studentId !== undefined && period.enrollment.studentId !== studentId)
    ) {
      throw new NotFoundException('Not found');
    }
    if (period.status === 'paid') {
      throw new PeriodAlreadyPaidException();
    }

    // BIL-10 — every earlier period on this enrollment must already be paid.
    const earlierUnpaid = await this.prisma.billingPeriod.count({
      where: {
        enrollmentId: period.enrollmentId,
        periodMonth: { lt: period.periodMonth },
        status: { not: 'paid' },
      },
    });
    if (earlierUnpaid > 0) {
      throw new ArrearsExistException();
    }

    return period;
  }

  // doc 05 §4.2 (PAY-08), reproduced exactly: status + amountPaid + period
  // status + penalty flag, all in one transaction. Shared by the
  // authenticated verify endpoint and the webhook's success path —
  // verifiedById is null for the latter (no human verifier).
  private async settleVerifiedPayment(
    tx: Prisma.TransactionClient,
    paymentId: string,
    verifiedById: string | null,
  ): Promise<Payment> {
    let payment: Payment;
    try {
      payment = await tx.payment.update({
        where: { id: paymentId, status: 'pending' }, // guards double-verification
        data: { status: 'verified', verifiedById, verifiedAt: new Date() },
      });
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new PaymentAlreadySettledException();
      }
      throw error;
    }

    await tx.billingPeriod.update({
      where: { id: payment.billingPeriodId },
      data: { amountPaid: { increment: payment.amount } }, // BIL-08
    });
    const period = await this.recomputePeriodStatus(
      tx,
      payment.billingPeriodId,
    );
    await this.maybeClearPenaltyFlag(tx, period.enrollmentId);
    // ENR-06/07 — a verified payment (gateway webhook or manual verify,
    // both settle through here) activates the enrollment. The `pending`
    // guard makes this a no-op if it's already active or was withdrawn.
    await tx.enrollment.updateMany({
      where: { id: period.enrollmentId, status: 'pending' },
      data: { status: 'active' },
    });

    await this.audit.record(
      {
        actorUserId: verifiedById,
        action: 'payment_verified',
        targetType: 'Payment',
        targetId: payment.id,
        details: {
          amount: formatMoney(payment.amount),
          billingPeriodId: payment.billingPeriodId,
        },
      },
      tx,
    );

    return payment;
  }

  // PAY-09 — rejecting never touches amountPaid. PEN-05 — the pending
  // payment was protecting the enrollment from penalty; once rejected,
  // apply the penalty immediately if still due. Shared by the
  // authenticated reject endpoint and the webhook's failure path.
  private async settleRejectedPayment(
    tx: Prisma.TransactionClient,
    paymentId: string,
    actorUserId: string | null,
  ): Promise<Payment> {
    let payment: Payment;
    try {
      payment = await tx.payment.update({
        where: { id: paymentId, status: 'pending' },
        data: { status: 'rejected' },
      });
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new PaymentAlreadySettledException();
      }
      throw error;
    }

    // BIL-09 — amountPaid is untouched, but the pending payment that may
    // have been keeping this period 'pending' is now gone.
    await this.recomputePeriodStatus(tx, payment.billingPeriodId);

    await this.audit.record(
      {
        actorUserId,
        action: 'payment_rejected',
        targetType: 'Payment',
        targetId: payment.id,
        details: {
          amount: formatMoney(payment.amount),
          billingPeriodId: payment.billingPeriodId,
        },
      },
      tx,
    );

    await this.applyPenaltyIfDue(tx, payment.billingPeriodId);

    return payment;
  }

  // BIL-09 — never assigned manually; always re-derived from amounts plus
  // whether a pending payment still exists on this period.
  private async recomputePeriodStatus(
    tx: Prisma.TransactionClient,
    periodId: string,
  ): Promise<BillingPeriod> {
    const period = await tx.billingPeriod.findUniqueOrThrow({
      where: { id: periodId },
    });
    const pendingCount = await tx.payment.count({
      where: { billingPeriodId: periodId, status: 'pending' },
    });
    const status = derivePeriodStatus(
      period.amountOwed,
      period.amountPaid,
      pendingCount > 0,
    );
    return tx.billingPeriod.update({
      where: { id: periodId },
      data: { status },
    });
  }

  // PEN-07 — clears once every period on the enrollment is paid.
  private async maybeClearPenaltyFlag(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
  ): Promise<void> {
    const enrollment = await tx.enrollment.findUniqueOrThrow({
      where: { id: enrollmentId },
    });
    if (!enrollment.inPenalty) {
      return;
    }
    const unpaidCount = await tx.billingPeriod.count({
      where: { enrollmentId, status: { not: 'paid' } },
    });
    if (unpaidCount === 0) {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { inPenalty: false },
      });
    }
  }

  // PEN-04/05/06 — the single gate shared by two call sites: a payment
  // rejection removing the protection it was giving a period (PEN-05), and
  // the scheduled sweep (runPenaltySweep, PEN-01) checking every unpaid
  // period. Returns the outcome so the sweep can count applied vs skipped
  // without re-deriving these conditions itself.
  private async applyPenaltyIfDue(
    tx: Prisma.TransactionClient,
    periodId: string,
  ): Promise<PenaltyOutcome> {
    const period = await tx.billingPeriod.findUniqueOrThrow({
      where: { id: periodId },
      include: { enrollment: { include: { batch: true } } },
    });

    if (period.status !== 'unpaid') {
      return 'skipped'; // PEN-04 condition 1
    }

    const pendingPaymentCount = await tx.payment.count({
      where: { billingPeriodId: periodId, status: 'pending' },
    });
    if (pendingPaymentCount > 0) {
      return 'skipped'; // PEN-04 condition 2
    }

    const pendingRequestCount = await tx.request.count({
      where: { billingPeriodId: periodId, status: 'pending' },
    });
    if (pendingRequestCount > 0) {
      return 'skipped'; // PEN-05 — a pending request protects it too
    }

    const approvedGrace = await tx.request.findFirst({
      where: { billingPeriodId: periodId, type: 'grace', status: 'approved' },
    });
    if (approvedGrace) {
      return 'skipped'; // PEN-04 condition 3
    }

    const claimed = await tx.enrollment.updateMany({
      where: { id: period.enrollmentId, inPenalty: false }, // PEN-06 — no stacking
      data: { inPenalty: true },
    });
    if (claimed.count === 0) {
      return 'skipped';
    }

    await tx.billingPeriod.update({
      where: { id: periodId },
      data: {
        amountOwed: { increment: period.enrollment.batch.enrollmentFee },
      }, // PEN-03, undiscounted
    });

    await this.audit.record(
      {
        actorUserId: null, // PEN-10 — system actor
        action: 'penalty_applied',
        targetType: 'Enrollment',
        targetId: period.enrollmentId,
        details: {
          billingPeriodId: periodId,
          amount: formatMoney(period.enrollment.batch.enrollmentFee),
        },
      },
      tx,
    );

    return 'applied';
  }

  // PEN-01 — the scheduled sweep (doc 07 §5). Pages through every unpaid
  // period in chunks of 100; each period's PEN-04 check + apply happens in
  // its own transaction via the same applyPenaltyIfDue used by rejection,
  // so one failure doesn't roll back the whole sweep, and running it twice
  // is safe (PEN-06's inPenalty guard plus the status re-check inside
  // applyPenaltyIfDue).
  async runPenaltySweep(): Promise<PenaltySweepResult> {
    let processed = 0;
    let penalized = 0;
    let skipped = 0;
    let failed = 0;

    this.logger.log('penalty-sweep: started');

    for (let page = 0; ; page += 1) {
      const periods = await this.prisma.billingPeriod.findMany({
        where: { status: 'unpaid' },
        select: { id: true },
        skip: page * JOB_BATCH_SIZE,
        take: JOB_BATCH_SIZE,
        orderBy: { id: 'asc' },
      });
      if (periods.length === 0) {
        break;
      }

      for (const { id } of periods) {
        processed += 1;
        try {
          const outcome = await this.prisma.$transaction((tx) =>
            this.applyPenaltyIfDue(tx, id),
          );
          if (outcome === 'applied') {
            penalized += 1;
          } else {
            skipped += 1;
          }
        } catch (error) {
          failed += 1;
          this.logger.error(
            `penalty-sweep: failed to process period ${id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      if (periods.length < JOB_BATCH_SIZE) {
        break;
      }
    }

    this.logger.log(
      `penalty-sweep: completed processed=${processed} penalized=${penalized} skipped=${skipped} failed=${failed}`,
    );
    return { processed, penalized, skipped, failed };
  }
}
