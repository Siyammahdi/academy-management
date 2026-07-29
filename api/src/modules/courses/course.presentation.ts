import { HttpStatus } from '@nestjs/common';
import type { Course, Prisma } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';

/** Scalar course fields safe to load on list/nested includes — never Bytes. */
export const COURSE_PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
  billingType: true,
  enrollmentFee: true,
  monthlyFee: true,
  parts: true,
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

export function presentCourse(course: CoursePublicRow): CourseResponse {
  const { thumbnailMimeType, ...rest } = course;
  return {
    ...rest,
    hasThumbnail:
      typeof thumbnailMimeType === 'string' && thumbnailMimeType.length > 0,
  };
}

export function presentCourses(courses: CoursePublicRow[]): CourseResponse[] {
  return courses.map(presentCourse);
}

/** Strip Bytes if a full Course row was loaded; expose hasThumbnail instead. */
export function presentCourseRow(course: Course): CourseResponse {
  const { thumbnail: _thumbnail, thumbnailMimeType, ...rest } = course;
  return {
    ...rest,
    hasThumbnail:
      typeof thumbnailMimeType === 'string' && thumbnailMimeType.length > 0,
  };
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

  // Copy into a fresh ArrayBuffer-backed view for Prisma Bytes typing.
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return { mimeType, bytes: copy };
}
