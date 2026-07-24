import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Batch, BatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { ChangeBatchStatusDto } from './dto/change-batch-status.dto';
import { AssignManagerDto } from './dto/assign-manager.dto';
import { UpdateClassLinkDto } from './dto/update-class-link.dto';
import {
  Paginated,
  PaginationQuery,
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination';

export interface BatchManagerSummary {
  userId: string;
  email: string;
}

export type BatchWithSeats = Batch & {
  seatsRemaining: number;
  managers: BatchManagerSummary[];
};

export interface BatchListQuery extends PaginationQuery {
  status?: string;
  courseId?: string;
}

export interface RosterEntry {
  studentId: string;
  fullName: string;
  phone: string;
  enrollmentStatus: string;
  enrolledAt: Date;
}

// Roster/capacity count both count a seat as "taken" the same way (doc 05 §4.1)
const ACTIVE_ENROLLMENT_STATUSES = ['pending', 'active'] as const;

function isBatchStatus(value: string): value is BatchStatus {
  return (Object.values(BatchStatus) as string[]).includes(value);
}

function toAuditSnapshot(batch: Batch): Prisma.InputJsonObject {
  return {
    name: batch.name,
    capacity: batch.capacity,
    entryDiscountPercent: batch.entryDiscountPercent,
    enrollmentFee: batch.enrollmentFee.toString(),
    monthlyFee: batch.monthlyFee.toString(),
    courseStartDate: batch.courseStartDate,
    enrollmentOpensAt: batch.enrollmentOpensAt,
    enrollmentClosesAt: batch.enrollmentClosesAt,
    dueDayStart: batch.dueDayStart,
    dueDayEnd: batch.dueDayEnd,
    status: batch.status,
  };
}

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: BatchListQuery): Promise<Paginated<Batch>> {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.BatchWhereInput = {};

    if (query.status !== undefined) {
      if (!isBatchStatus(query.status)) {
        throw new BadRequestException(`Invalid status filter: ${query.status}`);
      }
      where.status = query.status;
    }
    if (query.courseId !== undefined) {
      where.courseId = query.courseId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.batch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.batch.count({ where }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async getById(id: string): Promise<BatchWithSeats> {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { managers: { include: { user: true } } },
    });
    if (!batch) {
      throw new NotFoundException('Not found');
    }

    const activeCount = await this.prisma.enrollment.count({
      where: { batchId: id, status: { in: [...ACTIVE_ENROLLMENT_STATUSES] } },
    });

    const { managers, ...rest } = batch;
    return {
      ...rest,
      seatsRemaining: Math.max(0, batch.capacity - activeCount),
      managers: managers.map((m) => ({
        userId: m.userId,
        email: m.user.email,
      })),
    };
  }

  // doc 06 §1 — self-scoped read; not in doc 06's own endpoint table, but
  // there was previously no way for a manager to discover which batches
  // they're assigned to at all (GET /batches is public/unscoped).
  async listMine(userId: string): Promise<BatchWithSeats[]> {
    const batches = await this.prisma.batch.findMany({
      where: { managers: { some: { userId } } },
      include: { managers: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (batches.length === 0) {
      return [];
    }

    const counts = await this.prisma.enrollment.groupBy({
      by: ['batchId'],
      where: {
        batchId: { in: batches.map((b) => b.id) },
        status: { in: [...ACTIVE_ENROLLMENT_STATUSES] },
      },
      _count: true,
    });
    const countByBatch = new Map(counts.map((c) => [c.batchId, c._count]));

    return batches.map(({ managers, ...batch }) => ({
      ...batch,
      seatsRemaining: Math.max(
        0,
        batch.capacity - (countByBatch.get(batch.id) ?? 0),
      ),
      managers: managers.map((m) => ({
        userId: m.userId,
        email: m.user.email,
      })),
    }));
  }

  // "Students at risk" on the manager overview — defined as PEN-06's
  // inPenalty flag, the one real, already-tracked concept this maps to;
  // "overdue but not yet penalized" isn't computable anywhere yet (the
  // billing-periods module is an unbuilt stub).
  async countAtRisk(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.enrollment.count({
      where: {
        inPenalty: true,
        batch: { managers: { some: { userId } } },
      },
    });
    return { count };
  }

  async create(dto: CreateBatchDto, actor: AuthUser): Promise<Batch> {
    this.assertWindowOrdering(dto.enrollmentOpensAt, dto.enrollmentClosesAt);
    this.assertDueDayOrdering(dto.dueDayStart ?? 1, dto.dueDayEnd ?? 5);

    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) {
        throw new NotFoundException('Not found');
      }

      const batch = await tx.batch.create({
        data: {
          courseId: dto.courseId,
          name: dto.name,
          // FEE-02 — snapshot, never re-read from Course after this point
          enrollmentFee: course.enrollmentFee,
          monthlyFee: course.monthlyFee,
          entryDiscountPercent: dto.entryDiscountPercent,
          capacity: dto.capacity,
          courseStartDate: new Date(dto.courseStartDate),
          enrollmentOpensAt: new Date(dto.enrollmentOpensAt),
          enrollmentClosesAt: new Date(dto.enrollmentClosesAt),
          dueDayStart: dto.dueDayStart,
          dueDayEnd: dto.dueDayEnd,
        },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'batch_created',
          targetType: 'Batch',
          targetId: batch.id,
          details: { after: toAuditSnapshot(batch) },
        },
        tx,
      );

      return batch;
    });
  }

  async update(id: string, dto: UpdateBatchDto): Promise<Batch> {
    const existing = await this.prisma.batch.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Not found');
    }

    const opensAt = dto.enrollmentOpensAt
      ? new Date(dto.enrollmentOpensAt)
      : existing.enrollmentOpensAt;
    const closesAt = dto.enrollmentClosesAt
      ? new Date(dto.enrollmentClosesAt)
      : existing.enrollmentClosesAt;
    this.assertWindowOrdering(opensAt, closesAt);

    const dueDayStart = dto.dueDayStart ?? existing.dueDayStart;
    const dueDayEnd = dto.dueDayEnd ?? existing.dueDayEnd;
    this.assertDueDayOrdering(dueDayStart, dueDayEnd);

    return this.prisma.batch.update({
      where: { id },
      data: {
        name: dto.name,
        capacity: dto.capacity,
        entryDiscountPercent: dto.entryDiscountPercent,
        courseStartDate: dto.courseStartDate
          ? new Date(dto.courseStartDate)
          : undefined,
        enrollmentOpensAt: dto.enrollmentOpensAt ? opensAt : undefined,
        enrollmentClosesAt: dto.enrollmentClosesAt ? closesAt : undefined,
        dueDayStart: dto.dueDayStart,
        dueDayEnd: dto.dueDayEnd,
      },
    });
  }

  async changeStatus(
    id: string,
    dto: ChangeBatchStatusDto,
    actor: AuthUser,
  ): Promise<Batch> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.batch.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('Not found');
      }

      // BIL-11 — 'completed' stops future billing-period generation; that's
      // enforced by the generation job reading this status, not here.
      const after = await tx.batch.update({
        where: { id },
        data: { status: dto.status },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'batch_status_changed',
          targetType: 'Batch',
          targetId: id,
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

  // Class links (Telegram/Zoom) — the first deferred course-management
  // feature (doc 07 §12's extensibility principle): attaches to Batch,
  // touches nothing else. Manager (own batch, via BatchScopeGuard at the
  // controller) or admin.
  async updateClassLink(
    id: string,
    dto: UpdateClassLinkDto,
    actor: AuthUser,
  ): Promise<Batch> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.batch.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('Not found');
      }

      const after = await tx.batch.update({
        where: { id },
        data: { classLink: dto.classLink },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'class_link_updated',
          targetType: 'Batch',
          targetId: id,
          details: {
            before: { classLink: before.classLink },
            after: { classLink: after.classLink },
          },
        },
        tx,
      );

      return after;
    });
  }

  async assignManager(batchId: string, dto: AssignManagerDto): Promise<void> {
    const [batch, user] = await Promise.all([
      this.prisma.batch.findUnique({ where: { id: batchId } }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
    ]);
    if (!batch || !user) {
      throw new NotFoundException('Not found');
    }

    try {
      await this.prisma.batchManager.create({
        data: { batchId, userId: dto.userId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Manager is already assigned to this batch',
        );
      }
      throw error;
    }
  }

  async removeManager(batchId: string, userId: string): Promise<void> {
    const existing = await this.prisma.batchManager.findUnique({
      where: { batchId_userId: { batchId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Not found');
    }
    await this.prisma.batchManager.delete({ where: { id: existing.id } });
  }

  async getRoster(batchId: string): Promise<RosterEntry[]> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException('Not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { batchId },
      include: { student: true },
      orderBy: { enrolledAt: 'asc' },
    });

    return enrollments.map((enrollment) => ({
      studentId: enrollment.student.studentId,
      fullName: enrollment.student.fullName,
      phone: enrollment.student.phone,
      enrollmentStatus: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
    }));
  }

  private assertWindowOrdering(
    opensAt: Date | string,
    closesAt: Date | string,
  ): void {
    const opens = opensAt instanceof Date ? opensAt : new Date(opensAt);
    const closes = closesAt instanceof Date ? closesAt : new Date(closesAt);
    if (!(opens < closes)) {
      throw new BadRequestException(
        'enrollmentOpensAt must be before enrollmentClosesAt',
      );
    }
  }

  private assertDueDayOrdering(dueDayStart: number, dueDayEnd: number): void {
    if (dueDayStart > dueDayEnd) {
      throw new BadRequestException(
        'dueDayStart must be less than or equal to dueDayEnd',
      );
    }
  }
}
