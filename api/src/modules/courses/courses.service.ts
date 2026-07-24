import { Injectable, NotFoundException } from '@nestjs/common';
import { Batch, Course, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  Paginated,
  PaginationQuery,
  buildPaginatedResult,
  resolvePagination,
} from '../../common/utils/pagination';

export type CourseWithOpenBatches = Course & { batches: Batch[] };

function toAuditSnapshot(course: Course): Prisma.InputJsonObject {
  return {
    title: course.title,
    description: course.description,
    billingType: course.billingType,
    enrollmentFee: course.enrollmentFee.toString(),
    monthlyFee: course.monthlyFee.toString(),
    status: course.status,
  };
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listActive(query: PaginationQuery): Promise<Paginated<Course>> {
    const { page, limit, skip, take } = resolvePagination(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where: { status: 'active' },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where: { status: 'active' } }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async getById(id: string): Promise<CourseWithOpenBatches> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      // "open batches" = enrolling, matching doc 06 §5's ?status=enrolling convention
      include: { batches: { where: { status: 'enrolling' } } },
    });
    if (!course) {
      throw new NotFoundException('Not found');
    }
    return course;
  }

  async create(dto: CreateCourseDto, actor: AuthUser): Promise<Course> {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          title: dto.title,
          description: dto.description,
          billingType: dto.billingType,
          enrollmentFee: dto.enrollmentFee,
          monthlyFee: dto.monthlyFee,
          parts: dto.parts?.map((p) => ({
            name: p.name,
            durationMonths: p.durationMonths,
          })),
        },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'course_created',
          targetType: 'Course',
          targetId: course.id,
          details: { after: toAuditSnapshot(course) },
        },
        tx,
      );

      return course;
    });
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    actor: AuthUser,
  ): Promise<Course> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.course.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('Not found');
      }

      // FEE-03 — this never touches existing batches; they hold their own
      // frozen fee snapshot (doc 05 §2) and are never re-read from Course.
      const after = await tx.course.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          billingType: dto.billingType,
          enrollmentFee: dto.enrollmentFee,
          monthlyFee: dto.monthlyFee,
          parts: dto.parts?.map((p) => ({
            name: p.name,
            durationMonths: p.durationMonths,
          })),
        },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'course_updated',
          targetType: 'Course',
          targetId: id,
          details: {
            before: toAuditSnapshot(before),
            after: toAuditSnapshot(after),
          },
        },
        tx,
      );

      return after;
    });
  }

  async archive(id: string, actor: AuthUser): Promise<Course> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.course.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('Not found');
      }

      const after = await tx.course.update({
        where: { id },
        data: { status: 'archived' },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'course_updated',
          targetType: 'Course',
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
}
