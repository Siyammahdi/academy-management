import { Injectable, NotFoundException } from '@nestjs/common';
import { Batch, Prisma } from '@prisma/client';
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
import {
  COURSE_PUBLIC_SELECT,
  decodeThumbnailPayload,
  presentCourse,
  presentCourses,
  type CourseResponse,
} from './course.presentation';

export type CourseWithOpenBatches = CourseResponse & { batches: Batch[] };

function toAuditSnapshot(course: CourseResponse): Prisma.InputJsonObject {
  return {
    title: course.title,
    description: course.description,
    billingType: course.billingType,
    enrollmentFee: course.enrollmentFee.toString(),
    monthlyFee: course.monthlyFee.toString(),
    status: course.status,
    hasThumbnail: course.hasThumbnail,
  };
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listActive(query: PaginationQuery): Promise<Paginated<CourseResponse>> {
    const { page, limit, skip, take } = resolvePagination(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where: { status: 'active' },
        select: COURSE_PUBLIC_SELECT,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where: { status: 'active' } }),
    ]);
    return buildPaginatedResult(presentCourses(data), total, page, limit);
  }

  async getById(id: string): Promise<CourseWithOpenBatches> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: {
        ...COURSE_PUBLIC_SELECT,
        // "open batches" = enrolling, matching doc 06 §5's ?status=enrolling convention
        batches: { where: { status: 'enrolling' } },
      },
    });
    if (!course) {
      throw new NotFoundException('Not found');
    }
    const { batches, ...rest } = course;
    return { ...presentCourse(rest), batches };
  }

  async getThumbnail(
    id: string,
  ): Promise<{ mimeType: string; body: Uint8Array } | null> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { thumbnail: true, thumbnailMimeType: true, status: true },
    });
    if (
      !course ||
      !course.thumbnail ||
      !course.thumbnailMimeType ||
      course.thumbnail.length === 0
    ) {
      return null;
    }
    return { mimeType: course.thumbnailMimeType, body: course.thumbnail };
  }

  async create(
    dto: CreateCourseDto,
    actor: AuthUser,
  ): Promise<CourseResponse> {
    const thumbnail = dto.thumbnail
      ? decodeThumbnailPayload(dto.thumbnail)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.course.create({
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
          ...(thumbnail
            ? {
                thumbnail: thumbnail.bytes,
                thumbnailMimeType: thumbnail.mimeType,
              }
            : {}),
        },
        select: COURSE_PUBLIC_SELECT,
      });

      const course = presentCourse(created);

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
  ): Promise<CourseResponse> {
    const thumbnail = dto.thumbnail
      ? decodeThumbnailPayload(dto.thumbnail)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.course.findUnique({
        where: { id },
        select: COURSE_PUBLIC_SELECT,
      });
      if (!beforeRow) {
        throw new NotFoundException('Not found');
      }
      const before = presentCourse(beforeRow);

      // FEE-03 — this never touches existing batches; they hold their own
      // frozen fee snapshot (doc 05 §2) and are never re-read from Course.
      const afterRow = await tx.course.update({
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
          ...(thumbnail
            ? {
                thumbnail: thumbnail.bytes,
                thumbnailMimeType: thumbnail.mimeType,
              }
            : dto.clearThumbnail
              ? { thumbnail: null, thumbnailMimeType: null }
              : {}),
        },
        select: COURSE_PUBLIC_SELECT,
      });

      const after = presentCourse(afterRow);

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

  async archive(id: string, actor: AuthUser): Promise<CourseResponse> {
    return this.prisma.$transaction(async (tx) => {
      const beforeRow = await tx.course.findUnique({
        where: { id },
        select: COURSE_PUBLIC_SELECT,
      });
      if (!beforeRow) {
        throw new NotFoundException('Not found');
      }
      const before = presentCourse(beforeRow);

      const afterRow = await tx.course.update({
        where: { id },
        data: { status: 'archived' },
        select: COURSE_PUBLIC_SELECT,
      });
      const after = presentCourse(afterRow);

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
