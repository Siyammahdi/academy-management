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
  CourseSlugTakenException,
  decodeThumbnailPayload,
  normalizeStringList,
  presentCourse,
  presentCourses,
  slugifyCourse,
  type CourseResponse,
} from './course.presentation';
import { openEnrollmentWindowWhere } from '../batches/batches.service';

export type CourseWithOpenBatches = CourseResponse & { batches: Batch[] };

export interface ListCoursesParams extends PaginationQuery {
  featured?: string;
}

function toAuditSnapshot(course: CourseResponse): Prisma.InputJsonObject {
  return {
    title: course.title,
    slug: course.slug,
    description: course.description,
    billingType: course.billingType,
    enrollmentFee: course.enrollmentFee.toString(),
    monthlyFee: course.monthlyFee.toString(),
    status: course.status,
    featured: course.featured,
    featuredOrder: course.featuredOrder,
    hasThumbnail: course.hasThumbnail,
  };
}

function marketingData(dto: CreateCourseDto | UpdateCourseDto) {
  return {
    ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
    ...(dto.featuredOrder !== undefined
      ? { featuredOrder: dto.featuredOrder }
      : {}),
    ...(dto.tagline !== undefined ? { tagline: dto.tagline || null } : {}),
    ...(dto.category !== undefined ? { category: dto.category || null } : {}),
    ...(dto.emphasis !== undefined ? { emphasis: dto.emphasis || null } : {}),
    ...(dto.focus !== undefined ? { focus: dto.focus || null } : {}),
    ...(dto.audience !== undefined ? { audience: dto.audience || null } : {}),
    ...(dto.highlights !== undefined
      ? { highlights: normalizeStringList(dto.highlights) ?? [] }
      : {}),
    ...(dto.outcomes !== undefined
      ? { outcomes: normalizeStringList(dto.outcomes) ?? [] }
      : {}),
  };
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listActive(
    query: ListCoursesParams,
  ): Promise<Paginated<CourseResponse>> {
    const { page, limit, skip, take } = resolvePagination(query);
    const featuredOnly = query.featured === 'true' || query.featured === '1';
    const where: Prisma.CourseWhereInput = {
      status: 'active',
      ...(featuredOnly ? { featured: true } : {}),
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput[] = featuredOnly
      ? [{ featuredOrder: 'asc' }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        select: COURSE_PUBLIC_SELECT,
        skip,
        take,
        orderBy,
      }),
      this.prisma.course.count({ where }),
    ]);
    return buildPaginatedResult(presentCourses(data), total, page, limit);
  }

  /** Resolves by cuid id or public slug. */
  async getByIdOrSlug(idOrSlug: string): Promise<CourseWithOpenBatches> {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: 'active',
      },
      select: {
        ...COURSE_PUBLIC_SELECT,
        batches: {
          where: openEnrollmentWindowWhere(),
          orderBy: { enrollmentClosesAt: 'asc' },
        },
      },
    });
    if (!course) {
      // Admins editing archived courses still need GET by id — try without status filter for id match.
      const byId = await this.prisma.course.findUnique({
        where: { id: idOrSlug },
        select: {
          ...COURSE_PUBLIC_SELECT,
          batches: {
            where: openEnrollmentWindowWhere(),
            orderBy: { enrollmentClosesAt: 'asc' },
          },
        },
      });
      if (!byId) {
        throw new NotFoundException('Not found');
      }
      const { batches, ...rest } = byId;
      return { ...presentCourse(rest), batches };
    }
    const { batches, ...rest } = course;
    return { ...presentCourse(rest), batches };
  }

  async getThumbnail(
    id: string,
  ): Promise<{ mimeType: string; body: Uint8Array } | null> {
    const course = await this.prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { thumbnail: true, thumbnailMimeType: true },
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

  private async allocateSlug(
    tx: Prisma.TransactionClient,
    desired: string,
    excludeId?: string,
  ): Promise<string> {
    const base = slugifyCourse(desired);
    let candidate = base;
    let n = 2;
    for (;;) {
      const existing = await tx.course.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${base}-${n}`;
      n += 1;
      if (n > 50) {
        throw new CourseSlugTakenException();
      }
    }
  }

  async create(
    dto: CreateCourseDto,
    actor: AuthUser,
  ): Promise<CourseResponse> {
    const thumbnail = dto.thumbnail
      ? decodeThumbnailPayload(dto.thumbnail)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const slug = await this.allocateSlug(tx, dto.slug?.trim() || dto.title);

      const created = await tx.course.create({
        data: {
          slug,
          title: dto.title,
          description: dto.description,
          billingType: dto.billingType,
          enrollmentFee: dto.enrollmentFee,
          monthlyFee: dto.monthlyFee,
          parts: dto.parts?.map((p) => ({
            name: p.name,
            durationMonths: p.durationMonths,
          })),
          featured: dto.featured ?? false,
          featuredOrder: dto.featuredOrder ?? 0,
          tagline: dto.tagline || null,
          category: dto.category || null,
          emphasis: dto.emphasis || null,
          focus: dto.focus || null,
          audience: dto.audience || null,
          highlights: normalizeStringList(dto.highlights) ?? [],
          outcomes: normalizeStringList(dto.outcomes) ?? [],
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

      let slug: string | undefined;
      if (dto.slug !== undefined) {
        slug = await this.allocateSlug(tx, dto.slug || dto.title || before.title, id);
      } else if (dto.title !== undefined && dto.title !== before.title) {
        // Keep existing slug when title changes unless admin sends a new slug.
      }

      // FEE-03 — this never touches existing batches; they hold their own
      // frozen fee snapshot (doc 05 §2) and are never re-read from Course.
      const afterRow = await tx.course.update({
        where: { id },
        data: {
          ...(slug !== undefined ? { slug } : {}),
          title: dto.title,
          description: dto.description,
          billingType: dto.billingType,
          enrollmentFee: dto.enrollmentFee,
          monthlyFee: dto.monthlyFee,
          parts: dto.parts?.map((p) => ({
            name: p.name,
            durationMonths: p.durationMonths,
          })),
          ...marketingData(dto),
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
        data: { status: 'archived', featured: false },
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
            before: { status: before.status, featured: before.featured },
            after: { status: after.status, featured: after.featured },
          },
        },
        tx,
      );

      return after;
    });
  }
}
