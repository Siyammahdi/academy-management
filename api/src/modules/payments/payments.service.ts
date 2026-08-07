import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { PaymentAmountInvalidException } from '../../common/exceptions/payment-amount-invalid.exception';
import { InvalidWebhookSignatureException } from '../../common/exceptions/invalid-webhook-signature.exception';
import { formatMoney } from '../../common/utils/money';
import {
  COURSE_PUBLIC_SELECT,
  type CoursePublicRow,
} from '../courses/course.presentation';
import { derivePeriodStatus } from '../../common/utils/period';
import { GatewayRegistry } from '../gateway/gateway.registry';
import type { SslcommerzWebhookPayload } from '../gateway/sslcommerz.gateway';
import {
  generateGatewayInvoiceNumber,
  type GatewayProviderId,
} from '../gateway/payment-gateway';
import { PayManualDto } from './dto/pay-manual.dto';
import { ConfirmGatewayPaymentDto } from './dto/confirm-gateway-payment.dto';
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
    private readonly gateways: GatewayRegistry,
  ) {}

  async payGateway(
    billingPeriodId: string,
    actor: AuthUser,
    provider?: string | null,
  ): Promise<{ redirectUrl: string; provider: GatewayProviderId }> {
    const studentId = this.requireStudentId(actor);
    const period = await this.loadPeriodForPayment(billingPeriodId, studentId);
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
    });
    const outstanding = period.amountOwed.minus(period.amountPaid);
    const gatewayProvider = this.gateways.resolveId(provider);

    const { redirectUrl, transactionReference } =
      await this.startGatewaySession(
        gatewayProvider,
        outstanding,
        student.fullName,
        student.phone,
        billingPeriodId,
      );

    await this.prisma.$transaction(async (tx) => {
      await this.supersedePendingGatewayPayments(tx, billingPeriodId);
      await this.createPendingPayment(tx, {
        billingPeriodId,
        amount: outstanding,
        method: 'gateway',
        provider: gatewayProvider,
        paidBy: 'student',
        transactionReference,
        actorUserId: actor.id,
      });
    });

    return { redirectUrl, provider: gatewayProvider };
  }

  async payManual(
    billingPeriodId: string,
    dto: PayManualDto,
    actor: AuthUser,
  ): Promise<Payment> {
    const studentId = this.requireStudentId(actor);
    const period = await this.loadPeriodForPayment(billingPeriodId, studentId);
    const amount = this.requireFullOutstandingAmount(period, dto.amount);

    return this.prisma.$transaction((tx) =>
      this.createPendingPayment(tx, {
        billingPeriodId,
        amount,
        method: 'manual',
        provider: 'manual',
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
  ): Promise<{ redirectUrl: string; provider: GatewayProviderId }> {
    const period = await this.loadPeriodForPayment(billingPeriodId);
    const outstanding = period.amountOwed.minus(period.amountPaid);
    const gatewayProvider = this.gateways.resolveId(dto.provider);

    const { redirectUrl, transactionReference } =
      await this.startGatewaySession(
        gatewayProvider,
        outstanding,
        dto.guestName,
        dto.guestPhone,
        billingPeriodId,
      );

    await this.prisma.$transaction(async (tx) => {
      await this.supersedePendingGatewayPayments(tx, billingPeriodId);
      await this.createPendingPayment(tx, {
        billingPeriodId,
        amount: outstanding,
        method: 'gateway',
        provider: gatewayProvider,
        paidBy: 'guest',
        transactionReference,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        actorUserId: null,
      });
    });

    return { redirectUrl, provider: gatewayProvider };
  }

  async guestPayManual(
    billingPeriodId: string,
    dto: GuestPayManualDto,
  ): Promise<Payment> {
    const period = await this.loadPeriodForPayment(billingPeriodId);
    const amount = this.requireFullOutstandingAmount(period, dto.amount);

    return this.prisma.$transaction((tx) =>
      this.createPendingPayment(tx, {
        billingPeriodId,
        amount,
        method: 'manual',
        provider: 'manual',
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
    provider: GatewayProviderId,
    outstanding: Prisma.Decimal,
    customerName: string,
    customerPhone: string,
    billingPeriodId: string,
  ): Promise<{ redirectUrl: string; transactionReference: string }> {
    const gateway = this.gateways.get(provider);
    const transactionReference = generateGatewayInvoiceNumber(provider);
    const { redirectUrl } = await gateway.initiateSession({
      transactionReference,
      amount: formatMoney(outstanding),
      customerName,
      customerPhone,
      reference: billingPeriodId,
      checkoutItems: 'Course fee',
    });
    return { redirectUrl, transactionReference };
  }

  /**
   * A cancelled/abandoned gateway attempt leaves a pending row that would
   * otherwise block retries and keep the period in "pending". Expire those
   * before starting a fresh session on the same period.
   */
  private async supersedePendingGatewayPayments(
    tx: Prisma.TransactionClient,
    billingPeriodId: string,
  ): Promise<void> {
    const result = await tx.payment.updateMany({
      where: {
        billingPeriodId,
        method: 'gateway',
        status: 'pending',
      },
      data: { status: 'expired' },
    });
    if (result.count > 0) {
      await this.recomputePeriodStatus(tx, billingPeriodId);
    }
  }

  /**
   * Payer returned from gateway cancel/fail. Mark the pending gateway
   * payment rejected so the enrollment can be paid again.
   */
  async abandonGatewayPayment(
    transactionReference: string,
  ): Promise<{ status: string }> {
    const ref = transactionReference.trim();
    const existing = await this.prisma.payment.findUnique({
      where: { transactionReference: ref },
    });
    if (!existing || existing.method !== 'gateway') {
      throw new NotFoundException('Not found');
    }
    if (
      existing.status === 'verified' ||
      existing.status === 'rejected' ||
      existing.status === 'expired'
    ) {
      return { status: existing.status };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.settleRejectedPayment(tx, existing.id, null);
      });
    } catch (error) {
      if (!(error instanceof PaymentAlreadySettledException)) {
        throw error;
      }
    }
    return { status: 'rejected' };
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
      provider: 'paystation' | 'sslcommerz' | 'manual';
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
        provider: params.provider,
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
          provider: params.provider,
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
  // teacher's pending-MANUAL-payment queue; gateway payments settle via
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
        enrollment: { batch: { teachers: { some: { userId: actor.id } } } },
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
  // After signature check, successful payments are confirmed via SSLCommerz's
  // Order Validation API (val_id) before we settle — IPN alone is not enough.
  async handleWebhook(
    payload: SslcommerzWebhookPayload,
  ): Promise<{ ok: true }> {
    const sslGateway = this.gateways.get(
      'sslcommerz',
    ) as import('../gateway/sslcommerz.gateway').SslcommerzGatewayService;
    if (!sslGateway.verifyWebhookSignature(payload)) {
      throw new InvalidWebhookSignatureException();
    }

    const tranId = payload.tran_id;
    if (typeof tranId !== 'string' || tranId.length === 0) {
      return { ok: true };
    }

    const existing = await this.prisma.payment.findUnique({
      where: { transactionReference: tranId },
    });
    if (!existing) {
      return { ok: true };
    }
    if (existing.status === 'verified' || existing.status === 'rejected') {
      return { ok: true };
    }

    const ipnLooksSuccessful =
      payload.status === 'VALID' || payload.status === 'VALIDATED';

    if (ipnLooksSuccessful) {
      const valId =
        typeof payload.val_id === 'string' ? payload.val_id.trim() : '';
      if (valId.length === 0) {
        this.logger.warn(
          `SSLCommerz IPN for ${tranId} missing val_id — not settling`,
        );
      } else {
        try {
          await this.settleGatewayFromProvider(existing, {
            providerRef: valId,
          });
        } catch (error) {
          if (
            !(error instanceof PaymentAlreadySettledException) &&
            !(error instanceof BadRequestException)
          ) {
            throw error;
          }
        }
      }
      return { ok: true };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.settleRejectedPayment(tx, existing.id, null);
      });
    } catch (error) {
      if (!(error instanceof PaymentAlreadySettledException)) {
        throw error;
      }
    }

    return { ok: true };
  }

  /**
   * Success-URL confirm (PAY-03 safe): validates with the provider's
   * status API — never trusts the browser alone. Settling activates
   * enrollment (ENR-06).
   */
  async confirmGatewayPayment(
    dto: ConfirmGatewayPaymentDto,
  ): Promise<{
    status: string;
    enrollmentActivated: boolean;
  }> {
    const existing = await this.prisma.payment.findUnique({
      where: { transactionReference: dto.transactionReference.trim() },
      include: { billingPeriod: { include: { enrollment: true } } },
    });
    if (!existing || existing.method !== 'gateway') {
      throw new NotFoundException('Not found');
    }

    if (existing.status === 'verified') {
      const enrollment = existing.billingPeriod.enrollment;
      return {
        status: 'verified',
        enrollmentActivated: enrollment.status === 'active',
      };
    }
    if (existing.status === 'rejected' || existing.status === 'expired') {
      return { status: existing.status, enrollmentActivated: false };
    }

    const provider =
      existing.provider === 'paystation' || existing.provider === 'sslcommerz'
        ? existing.provider
        : this.gateways.resolveId(dto.provider);

    const outcome =
      provider === 'sslcommerz'
        ? await this.settleGatewayFromProvider(existing, {
            providerRef: (() => {
              const valId = dto.valId?.trim();
              if (!valId) {
                throw new BadRequestException(
                  'Payment confirmation is missing the bank validation id.',
                );
              }
              return valId;
            })(),
          })
        : await this.settleGatewayFromProvider(existing, {
            providerRef: dto.trxId?.trim(),
          });

    if (outcome === 'pending') {
      return { status: 'pending', enrollmentActivated: false };
    }
    if (outcome === 'rejected') {
      return { status: 'rejected', enrollmentActivated: false };
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: existing.billingPeriod.enrollmentId },
      select: { status: true },
    });

    return {
      status: 'verified',
      enrollmentActivated: enrollment?.status === 'active',
    };
  }

  /**
   * Shared by IPN and success-return confirm. Asks the concrete gateway
   * to check status, then maps onto verified / rejected / leave pending.
   */
  private async settleGatewayFromProvider(
    payment: Payment,
    opts: { providerRef?: string },
  ): Promise<'verified' | 'rejected' | 'pending'> {
    const provider =
      payment.provider === 'paystation' || payment.provider === 'sslcommerz'
        ? payment.provider
        : 'sslcommerz';
    const gateway = this.gateways.get(provider);
    const invoice = payment.transactionReference;
    if (!invoice) {
      throw new BadRequestException('Payment is missing a transaction reference.');
    }

    const status = await gateway.checkStatus({
      invoiceNumber: invoice,
      providerRef: opts.providerRef,
    });

    if (!status) {
      this.logger.warn(
        `Gateway status check returned nothing for ${invoice} (${provider})`,
      );
      throw new BadRequestException(
        'Payment could not be confirmed with the bank yet. Wait a moment and try again.',
      );
    }

    if (status.invoiceNumber !== invoice) {
      this.logger.warn(
        `Gateway invoice mismatch for ${invoice}: got ${status.invoiceNumber}`,
      );
      throw new BadRequestException(
        'Payment could not be confirmed with the bank yet. Wait a moment and try again.',
      );
    }

    if (status.amount) {
      const expected = formatMoney(payment.amount);
      const reported = formatMoney(new Prisma.Decimal(status.amount));
      if (expected !== reported) {
        this.logger.warn(
          `Gateway amount mismatch for ${invoice}: expected ${expected}, got ${reported}`,
        );
        throw new BadRequestException(
          'Payment could not be confirmed with the bank yet. Wait a moment and try again.',
        );
      }
    }

    if (status.trxStatus === 'success') {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.settleVerifiedPayment(tx, payment.id, null);
        });
      } catch (error) {
        if (error instanceof PaymentAlreadySettledException) {
          return 'verified';
        }
        throw error;
      }
      return 'verified';
    }

    if (status.trxStatus === 'failed' || status.trxStatus === 'canceled') {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.settleRejectedPayment(tx, payment.id, null);
        });
      } catch (error) {
        if (error instanceof PaymentAlreadySettledException) {
          return 'rejected';
        }
        throw error;
      }
      return 'rejected';
    }

    this.logger.log(
      `Gateway status ${status.trxStatus} for ${invoice} — leaving payment pending`,
    );
    return 'pending';
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

  // Manual payments must clear the full outstanding balance. Partial-payment
  // requests (REQ) are not built yet — underpaying would skip that gate.
  private requireFullOutstandingAmount(
    period: BillingPeriod,
    amountRaw: string,
  ): Prisma.Decimal {
    const outstanding = period.amountOwed.minus(period.amountPaid);
    const amount = new Prisma.Decimal(amountRaw);
    if (amount.lessThanOrEqualTo(0)) {
      throw new PaymentAmountInvalidException(
        'Payment amount must be greater than zero.',
      );
    }
    if (!amount.equals(outstanding)) {
      throw new PaymentAmountInvalidException(
        `Pay the full outstanding amount (${formatMoney(outstanding)}). Partial payments need admissions approval.`,
      );
    }
    return amount;
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
