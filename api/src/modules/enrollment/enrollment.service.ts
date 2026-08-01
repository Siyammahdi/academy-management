import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Batch,
  Enrollment,
  EnrollmentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { BatchFullException } from '../../common/exceptions/batch-full.exception';
import { EnrollmentWindowClosedException } from '../../common/exceptions/enrollment-window-closed.exception';
import { AlreadyEnrolledException } from '../../common/exceptions/already-enrolled.exception';
import { StudentNotFoundException } from '../../common/exceptions/student-not-found.exception';
import { formatMoney } from '../../common/utils/money';
import {
  firstDayOfDhakaMonth,
  derivePeriodDueDate,
} from '../../common/utils/period';
import { LateJoinerDto } from './dto/late-joiner.dto';
import {
  COURSE_PUBLIC_SELECT,
  type CoursePublicRow,
} from '../courses/course.presentation';
import {
  Paginated,
  PaginationQuery,
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination';

// Seats counted as "taken" for capacity purposes — matches doc 05 §4.1.
const ACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = ['pending', 'active'];

// Under Serializable isolation, Postgres can abort one of two genuinely
// concurrent transactions with a write-conflict error (P2034) even though
// both took the FOR UPDATE lock correctly — this is SSI detecting a
// dependency cycle, not a bug, and the standard response is to retry. The
// retry re-reads the now-committed state and correctly resolves to either
// success or BatchFullException.
const MAX_SERIALIZATION_RETRIES = 3;

export interface EnrollResult {
  enrollment: { id: string; status: EnrollmentStatus };
  firstPeriod: {
    id: string;
    periodMonth: string; // "YYYY-MM" (doc 06 §5)
    amountOwed: Prisma.Decimal;
    dueDate: Date;
  };
}

export type EnrollmentWithBatch = Enrollment & {
  batch: Batch & { course: CoursePublicRow };
};

interface CreateEnrollmentParams {
  studentId: string;
  batchId: string;
  skipWindowCheck: boolean;
}

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async selfEnroll(batchId: string, actor: AuthUser): Promise<EnrollResult> {
    if (actor.studentId === null) {
      throw new BadRequestException(
        'Your account has no linked student profile.',
      );
    }
    return this.createEnrollment(
      { studentId: actor.studentId, batchId, skipWindowCheck: false },
      actor.id,
    );
  }

  // ENR-08 — admin-only, bypasses the enrollment window. Everything else
  // (capacity, first billing period, duplicate check) is identical.
  async addLateJoiner(
    batchId: string,
    dto: LateJoinerDto,
    actor: AuthUser,
  ): Promise<EnrollResult> {
    return this.createEnrollment(
      { studentId: dto.studentId, batchId, skipWindowCheck: true },
      actor.id,
    );
  }

  async withdraw(enrollmentId: string, actor: AuthUser): Promise<Enrollment> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.enrollment.findUnique({
        where: { id: enrollmentId },
      });
      if (!before) {
        throw new NotFoundException('Not found');
      }
      if (before.status === 'withdrawn') {
        throw new BadRequestException('Enrollment is already withdrawn');
      }

      const after = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'withdrawn' },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'enrollment_status_changed',
          targetType: 'Enrollment',
          targetId: enrollmentId,
          details: {
            before: { status: before.status },
            after: { status: after.status },
          },
        },
        tx,
      );

      return after;
    });
  }

  /**
   * Admin re-includes a withdrawn student on the same enrollment row
   * (ENR-10 unique on student+batch prevents a second insert). Capacity
   * is re-checked; status returns to `active`.
   */
  async reinstate(enrollmentId: string, actor: AuthUser): Promise<Enrollment> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT id FROM enrollments WHERE id = ${enrollmentId} FOR UPDATE`;
        const before = await tx.enrollment.findUnique({
          where: { id: enrollmentId },
        });
        if (!before) {
          throw new NotFoundException('Not found');
        }
        if (before.status !== 'withdrawn') {
          throw new BadRequestException(
            'Only withdrawn enrollments can be reinstated',
          );
        }

        await tx.$executeRaw`SELECT id FROM batches WHERE id = ${before.batchId} FOR UPDATE`;
        const batch = await tx.batch.findUniqueOrThrow({
          where: { id: before.batchId },
        });
        const activeCount = await tx.enrollment.count({
          where: {
            batchId: before.batchId,
            status: { in: ACTIVE_ENROLLMENT_STATUSES },
          },
        });
        if (activeCount >= batch.capacity) {
          throw new BatchFullException();
        }

        const after = await tx.enrollment.update({
          where: { id: enrollmentId },
          data: { status: 'active' },
        });

        await this.audit.record(
          {
            actorUserId: actor.id,
            action: 'enrollment_status_changed',
            targetType: 'Enrollment',
            targetId: enrollmentId,
            details: {
              change: 'reinstated',
              before: { status: before.status },
              after: { status: after.status },
            },
          },
          tx,
        );

        return after;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listMine(
    actor: AuthUser,
    query: PaginationQuery,
  ): Promise<Paginated<EnrollmentWithBatch>> {
    if (actor.studentId === null) {
      return buildPaginatedResult([], 0, 1, 20);
    }

    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.EnrollmentWhereInput = { studentId: actor.studentId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take,
        orderBy: { enrolledAt: 'desc' },
        include: {
          batch: {
            include: {
              course: { select: COURSE_PUBLIC_SELECT },
            },
          },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  private async createEnrollment(
    params: CreateEnrollmentParams,
    actorUserId: string,
  ): Promise<EnrollResult> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: params.batchId },
    });
    if (!batch) {
      throw new NotFoundException('Not found');
    }

    // ENR-02 — self-enrollment only inside the window. Not locked: the
    // window itself isn't a capacity-style race, only ENR-04's count is.
    if (!params.skipWindowCheck) {
      const now = new Date();
      if (now < batch.enrollmentOpensAt || now > batch.enrollmentClosesAt) {
        throw new EnrollmentWindowClosedException();
      }
    }

    return this.runEnrollmentTransaction(params, actorUserId);
  }

  private async runEnrollmentTransaction(
    params: CreateEnrollmentParams,
    actorUserId: string,
    attempt = 1,
  ): Promise<EnrollResult> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // ENR-04 — lock the batch row for the duration of the capacity
          // check (doc 05 §4.1). Re-read capacity/fees/dates from this
          // locked row, not the pre-transaction fetch above, so a
          // concurrent batch edit can't race the calculation either.
          await tx.$executeRaw`SELECT id FROM batches WHERE id = ${params.batchId} FOR UPDATE`;
          const locked = await tx.batch.findUniqueOrThrow({
            where: { id: params.batchId },
          });

          const activeCount = await tx.enrollment.count({
            where: {
              batchId: params.batchId,
              status: { in: ACTIVE_ENROLLMENT_STATUSES },
            },
          });
          if (activeCount >= locked.capacity) {
            throw new BatchFullException();
          }

          const existing = await tx.enrollment.findUnique({
            where: {
              studentId_batchId: {
                studentId: params.studentId,
                batchId: params.batchId,
              },
            },
            include: {
              billingPeriods: {
                orderBy: { periodMonth: 'asc' },
                take: 1,
              },
            },
          });

          if (existing) {
            // ENR-10 — active seat already held. Pending means they enrolled
            // but never finished paying (e.g. cancelled gateway) — resume
            // that seat so they can pay again instead of a dead-end error.
            if (existing.status === 'active') {
              throw new AlreadyEnrolledException();
            }
            if (existing.status === 'pending') {
              const firstPeriod = existing.billingPeriods[0];
              if (!firstPeriod) {
                throw new BadRequestException(
                  'Enrollment is incomplete. Contact admissions.',
                );
              }
              return {
                enrollment: {
                  id: existing.id,
                  status: existing.status,
                },
                firstPeriod: {
                  id: firstPeriod.id,
                  periodMonth: firstPeriod.periodMonth
                    .toISOString()
                    .slice(0, 7),
                  amountOwed: firstPeriod.amountOwed.minus(
                    firstPeriod.amountPaid,
                  ),
                  dueDate: firstPeriod.dueDate,
                },
              };
            }
            throw new AlreadyEnrolledException();
          }

          let enrollment: Enrollment;
          try {
            enrollment = await tx.enrollment.create({
              data: {
                studentId: params.studentId,
                batchId: params.batchId,
                status: 'pending', // ENR-06/07 — payments module settles this later
              },
            });
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
              if (error.code === 'P2002') {
                throw new AlreadyEnrolledException(); // ENR-10 race
              }
              if (error.code === 'P2003') {
                throw new StudentNotFoundException();
              }
            }
            throw error;
          }

          // ENR-05 / BIL-03 — first billing period, same transaction.
          const periodMonth = firstDayOfDhakaMonth(locked.courseStartDate);
          const dueDate = derivePeriodDueDate(periodMonth, locked.dueDayEnd);

          // FEE-05 — entry amount = enrollmentFee × (1 − discount / 100).
          // Decimal arithmetic throughout; never a JS number.
          const discountFraction = new Prisma.Decimal(1).minus(
            new Prisma.Decimal(locked.entryDiscountPercent).dividedBy(100),
          );
          const entryAmount = locked.enrollmentFee
            .times(discountFraction)
            .toDecimalPlaces(2);
          const amountOwed = entryAmount
            .plus(locked.monthlyFee)
            .toDecimalPlaces(2);

          const firstPeriod = await tx.billingPeriod.create({
            data: {
              enrollmentId: enrollment.id,
              periodMonth,
              amountOwed,
              dueDate,
            },
          });

          await this.audit.record(
            {
              actorUserId,
              action: 'enrollment_created',
              targetType: 'Enrollment',
              targetId: enrollment.id,
              details: {
                studentId: params.studentId,
                batchId: params.batchId,
                lateJoiner: params.skipWindowCheck,
                firstPeriodAmountOwed: formatMoney(amountOwed),
              },
            },
            tx,
          );

          return {
            enrollment: { id: enrollment.id, status: enrollment.status },
            firstPeriod: {
              id: firstPeriod.id,
              periodMonth: periodMonth.toISOString().slice(0, 7),
              amountOwed: firstPeriod.amountOwed,
              dueDate: firstPeriod.dueDate,
            },
          };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < MAX_SERIALIZATION_RETRIES
      ) {
        return this.runEnrollmentTransaction(params, actorUserId, attempt + 1);
      }
      throw error;
    }
  }
}
