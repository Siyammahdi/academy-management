import { HttpStatus } from '@nestjs/common';
import type { Course, Prisma } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';

/** Scalar course fields safe to load on list/nested includes — never Bytes. */
export const COURSE_PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  billingType: true,
  enrollmentFee: true,
  monthlyFee: true,
  parts: true,
  featured: true,
  featuredOrder: true,
  tagline: true,
  category: true,
  emphasis: true,
  focus: true,
  highlights: true,
  audience: true,
  outcomes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  thumbnailMimeType: true,
} satisfies Prisma.CourseSelect;

export type CoursePublicRow = Prisma.CourseGetPayload<{
  select: typeof COURSE_PUBLIC_SELECT;
}>;

export type CourseResponse = Omit<CoursePublicRow, 'thumbnailMimeType'> & {
  hasThumbnail: boolean;
  highlights: string[] | null;
  outcomes: string[] | null;
};

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Max decoded thumbnail size — keeps Postgres rows and request bodies bounded. */
export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

export class ThumbnailInvalidException extends DomainException {
  constructor(message: string) {
    super('THUMBNAIL_INVALID', message, HttpStatus.BAD_REQUEST);
  }
}

export class CourseSlugTakenException extends DomainException {
  constructor() {
    super(
      'COURSE_SLUG_TAKEN',
      'That course URL is already in use. Choose a different slug.',
      HttpStatus.CONFLICT,
    );
  }
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : null;
}

export function presentCourse(course: CoursePublicRow): CourseResponse {
  const { thumbnailMimeType, highlights, outcomes, ...rest } = course;
  return {
    ...rest,
    highlights: asStringList(highlights),
    outcomes: asStringList(outcomes),
    hasThumbnail:
      typeof thumbnailMimeType === 'string' && thumbnailMimeType.length > 0,
  };
}

export function presentCourses(courses: CoursePublicRow[]): CourseResponse[] {
  return courses.map(presentCourse);
}

/** Strip Bytes if a full Course row was loaded; expose hasThumbnail instead. */
export function presentCourseRow(course: Course): CourseResponse {
  const { thumbnail: _thumbnail, thumbnailMimeType, highlights, outcomes, ...rest } =
    course;
  return {
    ...rest,
    highlights: asStringList(highlights),
    outcomes: asStringList(outcomes),
    hasThumbnail:
      typeof thumbnailMimeType === 'string' && thumbnailMimeType.length > 0,
  };
}

/** Lowercase hyphenated slug from a title (or explicit slug input). */
export function slugifyCourse(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug.length > 0 ? slug : 'course';
}

export function normalizeStringList(
  values: string[] | undefined,
): string[] | undefined {
  if (values === undefined) return undefined;
  const cleaned = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 20);
  return cleaned;
}

export function decodeThumbnailPayload(input: {
  mimeType: string;
  data: string;
}): { mimeType: string; bytes: Uint8Array<ArrayBuffer> } {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new ThumbnailInvalidException(
      'Use a JPEG, PNG, WebP, or GIF image for the course cover.',
    );
  }

  let raw = input.data.trim();
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(raw);
  if (dataUrl) {
    const embeddedMime = dataUrl[1]!.trim().toLowerCase();
    if (embeddedMime !== mimeType) {
      throw new ThumbnailInvalidException(
        'Thumbnail mime type does not match the image data.',
      );
    }
    raw = dataUrl[2]!;
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(raw, 'base64');
  } catch {
    throw new ThumbnailInvalidException('Thumbnail image data is invalid.');
  }

  if (bytes.length === 0) {
    throw new ThumbnailInvalidException('Thumbnail image data is empty.');
  }
  if (bytes.length > THUMBNAIL_MAX_BYTES) {
    throw new ThumbnailInvalidException(
      'Course cover must be 2 MB or smaller.',
    );
  }

  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return { mimeType, bytes: copy };
}
