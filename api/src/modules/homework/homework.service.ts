import { Injectable, NotFoundException } from '@nestjs/common';
import { Homework } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { toDhakaDateParts, endOfDhakaDay } from '../../common/utils/dhaka-time';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

export type HomeworkWithContext = Homework & {
  batch: { id: string; name: string; course: { title: string } };
};

/**
 * dueDate is a real point-in-time deadline, not a bare calendar date — the
 * same convention BillingPeriod.dueDate uses (TIME-02/TIME-03): the client
 * sends the calendar day it means in Asia/Dhaka, this resolves it to the end
 * of that Dhaka day, so a later plain instant comparison ("is it past due?")
 * is correct without re-deriving Dhaka time at read time.
 */
function resolveDueDate(dueDate: string): Date {
  const { year, month, day } = toDhakaDateParts(new Date(dueDate));
  return endOfDhakaDay(year, month, day);
}

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    batchId: string,
    dto: CreateHomeworkDto,
    actor: AuthUser,
  ): Promise<Homework> {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        throw new NotFoundException('Not found');
      }

      const homework = await tx.homework.create({
        data: {
          batchId,
          title: dto.title,
          description: dto.description,
          dueDate: resolveDueDate(dto.dueDate),
        },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'homework_created',
          targetType: 'Homework',
          targetId: homework.id,
          details: {
            batchId,
            title: homework.title,
            dueDate: homework.dueDate.toISOString(),
          },
        },
        tx,
      );

      return homework;
    });
  }

  async listForBatch(batchId: string): Promise<Homework[]> {
    return this.prisma.homework.findMany({
      where: { batchId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async update(
    id: string,
    dto: UpdateHomeworkDto,
    actor: AuthUser,
  ): Promise<Homework> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.homework.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('Not found');
      }

      const after = await tx.homework.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          dueDate: dto.dueDate ? resolveDueDate(dto.dueDate) : undefined,
        },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'homework_updated',
          targetType: 'Homework',
          targetId: id,
          details: {
            before: {
              title: before.title,
              description: before.description,
              dueDate: before.dueDate.toISOString(),
            },
            after: {
              title: after.title,
              description: after.description,
              dueDate: after.dueDate.toISOString(),
            },
          },
        },
        tx,
      );

      return after;
    });
  }

  async remove(id: string, actor: AuthUser): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const homework = await tx.homework.findUnique({ where: { id } });
      if (!homework) {
        throw new NotFoundException('Not found');
      }

      await tx.homework.delete({ where: { id } });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'homework_deleted',
          targetType: 'Homework',
          targetId: id,
          details: {
            batchId: homework.batchId,
            title: homework.title,
            dueDate: homework.dueDate.toISOString(),
          },
        },
        tx,
      );
    });
  }

  // Never trust a client-supplied identifier for ownership (doc 04 §6) — the
  // student is derived from the token, and only their ACTIVE enrollments'
  // batches contribute homework.
  async listMine(actor: AuthUser): Promise<HomeworkWithContext[]> {
    if (actor.studentId === null) {
      return [];
    }

    return this.prisma.homework.findMany({
      where: {
        batch: {
          enrollments: {
            some: { studentId: actor.studentId, status: 'active' },
          },
        },
      },
      include: { batch: { include: { course: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }
}
