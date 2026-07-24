import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Batch,
  BillingPeriod,
  Course,
  Enrollment,
  PeriodStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  firstDayOfDhakaMonth,
  derivePeriodDueDate,
} from '../../common/utils/period';
import {
  Paginated,
  PaginationQuery,
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination';

// Roster/capacity's own definition of "still holds a seat" (doc 05 §4.1) —
// billing eligibility uses the same set; only 'withdrawn' is excluded.
const BILLABLE_ENROLLMENT_STATUSES = ['pending', 'active'] as const;

const BATCH_SIZE = 100;

export interface BillingGenerationResult {
  processed: number;
  created: number;
  skipped: number;
  failed: number;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export type BillingPeriodWithContext = BillingPeriod & {
  // Decimal arithmetic stays server-side (doc 07 §6) — the frontend never
  // subtracts amountPaid from amountOwed itself, it just displays this.
  outstanding: Prisma.Decimal;
  enrollment: Enrollment & { batch: Batch & { course: Course } };
};

function isPeriodStatus(value: string): value is PeriodStatus {
  return (Object.values(PeriodStatus) as string[]).includes(value);
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // doc 06 §6 — GET /me/billing-periods, filter ?status=. Scoped to the
  // caller's own Student via the token (doc 04 §6) — never a client id.
  // Status is read straight from the column: payments.service.ts's
  // payGateway/payManual/reject/expire all persist the correct BIL-09
  // status inside the same transaction as the payment change, so this
  // never needs to re-derive or correct it at read time.
  async listMine(
    actor: AuthUser,
    query: PaginationQuery & { status?: string },
  ): Promise<Paginated<BillingPeriodWithContext>> {
    if (actor.studentId === null) {
      return buildPaginatedResult([], 0, 1, 20);
    }
    if (query.status !== undefined && !isPeriodStatus(query.status)) {
      throw new BadRequestException(`Invalid status filter: ${query.status}`);
    }

    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.BillingPeriodWhereInput = {
      enrollment: { studentId: actor.studentId },
      ...(query.status ? { status: query.status } : {}),
    };

    const [periods, total] = await this.prisma.$transaction([
      this.prisma.billingPeriod.findMany({
        where,
        skip,
        take,
        orderBy: { periodMonth: 'desc' },
        include: {
          enrollment: { include: { batch: { include: { course: true } } } },
        },
      }),
      this.prisma.billingPeriod.count({ where }),
    ]);

    const withOutstanding: BillingPeriodWithContext[] = periods.map(
      (period) => ({
        ...period,
        outstanding: period.amountOwed.minus(period.amountPaid),
      }),
    );

    return buildPaginatedResult(withOutstanding, total, page, limit);
  }

  // BIL-04 — the scheduled generation job (doc 07 §5). Creates this
  // calendar month's period for every enrollment still holding a seat on a
  // monthly-billed, non-completed batch whose course has already started.
  // BIL-01/BIL-11 are enforced in the query; BIL-12's idempotency comes
  // from the (enrollmentId, periodMonth) unique constraint, not a
  // pre-check — a duplicate attempt is simply caught and counted as
  // skipped. Paged in chunks of 100 (doc 07 §5); each creation is its own
  // transaction so one failure doesn't roll back the sweep.
  async generateNextPeriods(
    now: Date = new Date(),
  ): Promise<BillingGenerationResult> {
    const periodMonth = firstDayOfDhakaMonth(now);
    const nextMonthBoundary = new Date(
      Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth() + 1, 1),
    );

    let processed = 0;
    let created = 0;
    let skipped = 0;
    let failed = 0;

    this.logger.log(
      `billing-generation: started for ${periodMonth.toISOString().slice(0, 7)}`,
    );

    for (let page = 0; ; page += 1) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          status: { in: [...BILLABLE_ENROLLMENT_STATUSES] },
          batch: {
            status: { not: 'completed' }, // BIL-11
            courseStartDate: { lt: nextMonthBoundary }, // course must have started by this period
            course: { billingType: 'monthly' }, // BIL-01
          },
        },
        select: {
          id: true,
          batch: { select: { monthlyFee: true, dueDayEnd: true } },
        },
        skip: page * BATCH_SIZE,
        take: BATCH_SIZE,
        orderBy: { id: 'asc' },
      });
      if (enrollments.length === 0) {
        break;
      }

      for (const enrollment of enrollments) {
        processed += 1;
        const dueDate = derivePeriodDueDate(
          periodMonth,
          enrollment.batch.dueDayEnd,
        );
        try {
          await this.prisma.$transaction((tx) =>
            tx.billingPeriod.create({
              data: {
                enrollmentId: enrollment.id,
                periodMonth,
                amountOwed: enrollment.batch.monthlyFee, // BIL-04 — no entry component
                dueDate,
              },
            }),
          );
          created += 1;
        } catch (error) {
          if (isUniqueConstraintViolation(error)) {
            skipped += 1; // BIL-12 — already generated for this month
            continue;
          }
          failed += 1;
          this.logger.error(
            `billing-generation: failed for enrollment ${enrollment.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      if (enrollments.length < BATCH_SIZE) {
        break;
      }
    }

    this.logger.log(
      `billing-generation: completed processed=${processed} created=${created} skipped=${skipped} failed=${failed}`,
    );
    return { processed, created, skipped, failed };
  }
}
