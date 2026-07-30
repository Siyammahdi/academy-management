import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { toDhakaDateParts, endOfDhakaDay } from '../../common/utils/dhaka-time';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import {
  decodeHomeworkPdf,
  HOMEWORK_PUBLIC_SELECT,
  presentHomework,
  presentHomeworkRow,
  sanitizeHomeworkHtml,
  type HomeworkResponse,
} from './homework.presentation';

export type HomeworkWithContext = HomeworkResponse & {
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
  ): Promise<HomeworkResponse> {
    const pdf = dto.pdf ? decodeHomeworkPdf(dto.pdf) : null;

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        throw new NotFoundException('Not found');
      }

      const created = await tx.homework.create({
        data: {
          batchId,
          title: dto.title,
          description: sanitizeHomeworkHtml(dto.description),
          dueDate: resolveDueDate(dto.dueDate),
          ...(pdf
            ? { pdf: pdf.bytes, pdfMimeType: pdf.mimeType }
            : {}),
        },
        select: HOMEWORK_PUBLIC_SELECT,
      });

      const homework = presentHomework(created);

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
            hasPdf: homework.hasPdf,
          },
        },
        tx,
      );

      return homework;
    });
  }

  async listForBatch(batchId: string): Promise<HomeworkResponse[]> {
    const rows = await this.prisma.homework.findMany({
      where: { batchId },
      select: HOMEWORK_PUBLIC_SELECT,
      orderBy: { dueDate: 'asc' },
    });
    return rows.map(presentHomework);
  }

  async update(
    id: string,
    dto: UpdateHomeworkDto,
    actor: AuthUser,
  ): Promise<HomeworkResponse> {
    const pdf = dto.pdf ? decodeHomeworkPdf(dto.pdf) : null;

    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.homework.findUnique({
        where: { id },
        select: HOMEWORK_PUBLIC_SELECT,
      });
      if (!beforeRow) {
        throw new NotFoundException('Not found');
      }
      const before = presentHomework(beforeRow);

      const afterRow = await tx.homework.update({
        where: { id },
        data: {
          title: dto.title,
          description:
            dto.description !== undefined
              ? sanitizeHomeworkHtml(dto.description)
              : undefined,
          dueDate: dto.dueDate ? resolveDueDate(dto.dueDate) : undefined,
          ...(pdf
            ? { pdf: pdf.bytes, pdfMimeType: pdf.mimeType }
            : dto.clearPdf
              ? { pdf: null, pdfMimeType: null }
              : {}),
        },
        select: HOMEWORK_PUBLIC_SELECT,
      });
      const after = presentHomework(afterRow);

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'homework_updated',
          targetType: 'Homework',
          targetId: id,
          details: {
            before: {
              title: before.title,
              dueDate: before.dueDate.toISOString(),
              hasPdf: before.hasPdf,
            },
            after: {
              title: after.title,
              dueDate: after.dueDate.toISOString(),
              hasPdf: after.hasPdf,
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

  async getPdf(
    id: string,
  ): Promise<{ mimeType: string; body: Uint8Array } | null> {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      select: { pdf: true, pdfMimeType: true },
    });
    if (
      !homework ||
      !homework.pdf ||
      !homework.pdfMimeType ||
      homework.pdf.length === 0
    ) {
      return null;
    }
    return { mimeType: homework.pdfMimeType, body: homework.pdf };
  }

  /** Managers of the batch, admins, or students with an active enrollment. */
  async canAccessPdf(id: string, actor: AuthUser): Promise<boolean> {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      select: { batchId: true },
    });
    if (!homework) return false;
    if (actor.roles.includes('admin')) return true;
    if (actor.roles.includes('manager')) {
      const assigned = await this.prisma.batchManager.findFirst({
        where: { batchId: homework.batchId, userId: actor.id },
        select: { id: true },
      });
      return Boolean(assigned);
    }
    if (actor.studentId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          batchId: homework.batchId,
          studentId: actor.studentId,
          status: 'active',
        },
        select: { id: true },
      });
      return Boolean(enrollment);
    }
    return false;
  }

  // Never trust a client-supplied identifier for ownership (doc 04 §6) — the
  // student is derived from the token, and only their ACTIVE enrollments'
  // batches contribute homework.
  async listMine(actor: AuthUser): Promise<HomeworkWithContext[]> {
    if (actor.studentId === null) {
      return [];
    }

    const rows = await this.prisma.homework.findMany({
      where: {
        batch: {
          enrollments: {
            some: { studentId: actor.studentId, status: 'active' },
          },
        },
      },
      select: {
        ...HOMEWORK_PUBLIC_SELECT,
        batch: {
          select: {
            id: true,
            name: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return rows.map((row) => {
      const { batch, ...rest } = row;
      return { ...presentHomework(rest), batch };
    });
  }
}
