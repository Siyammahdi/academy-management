import type { Gender, Prisma, RoleName, UserStatus } from '@prisma/client';
import {
  AvatarInvalidException,
} from './profile.exceptions';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export type ProfileUserRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    status: true;
    fullName: true;
    phone: true;
    gender: true;
    dateOfBirth: true;
    bloodGroup: true;
    nationality: true;
    nationalId: true;
    addressLine: true;
    city: true;
    district: true;
    postalCode: true;
    country: true;
    avatarMimeType: true;
    isEmailVerified: true;
    lastLoginAt: true;
    createdAt: true;
    updatedAt: true;
    roles: { select: { role: true } };
    teacherProfile: true;
    student: {
      select: {
        id: true;
        studentId: true;
        fullName: true;
        phone: true;
        status: true;
        guardianName: true;
        guardianPhone: true;
        emergencyContact: true;
        createdAt: true;
        enrollments: {
          where: { status: 'active' };
          select: {
            enrolledAt: true;
            batch: {
              select: {
                id: true;
                name: true;
                course: { select: { id: true; title: true; slug: true } };
              };
            };
          };
        };
      };
    };
    taughtBatches: {
      select: {
        batch: {
          select: {
            id: true;
            name: true;
            course: { select: { id: true; title: true; slug: true } };
          };
        };
      };
    };
  };
}>;

export interface ProfileResponse {
  id: string;
  email: string;
  status: UserStatus;
  fullName: string | null;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  nationality: string | null;
  nationalId: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  country: string | null;
  hasAvatar: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: RoleName[];
  /** Product does not yet verify email/phone — always false. */
  emailVerified: boolean;
  phoneVerified: boolean;
  teacher: {
    employeeId: string | null;
    designation: string | null;
    department: string | null;
    bio: string | null;
    qualifications: string | null;
    experience: string | null;
    joiningDate: string | null;
    assignedCourses: Array<{ id: string; title: string; slug: string }>;
    assignedBatches: Array<{
      id: string;
      name: string;
      course: { id: string; title: string; slug: string };
    }>;
  } | null;
  student: {
    studentId: string;
    guardianName: string | null;
    guardianPhone: string | null;
    emergencyContact: string | null;
    enrollmentDate: string | null;
    currentCourses: Array<{ id: string; title: string; slug: string }>;
    currentBatches: Array<{
      id: string;
      name: string;
      course: { id: string; title: string; slug: string };
    }>;
  } | null;
  admin: {
    permissionsSummary: string[];
  } | null;
}

function dateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

export function presentProfile(user: ProfileUserRow): ProfileResponse {
  const roles = user.roles.map((r) => r.role);
  const hasTeacher = roles.includes('teacher');
  const hasAdmin = roles.includes('admin');

  const assignedBatches =
    user.taughtBatches?.map((tb) => ({
      id: tb.batch.id,
      name: tb.batch.name,
      course: tb.batch.course,
    })) ?? [];

  const courseMap = new Map<string, { id: string; title: string; slug: string }>();
  for (const b of assignedBatches) {
    courseMap.set(b.course.id, b.course);
  }

  const studentEnrollments = user.student?.enrollments ?? [];
  const currentBatches = studentEnrollments.map((e) => ({
    id: e.batch.id,
    name: e.batch.name,
    course: e.batch.course,
  }));
  const studentCourses = new Map<
    string,
    { id: string; title: string; slug: string }
  >();
  for (const b of currentBatches) {
    studentCourses.set(b.course.id, b.course);
  }
  const earliestEnrollment = studentEnrollments
    .map((e) => e.enrolledAt)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const tp = user.teacherProfile;

  return {
    id: user.id,
    email: user.email,
    status: user.status,
    fullName: user.fullName ?? user.student?.fullName ?? null,
    phone: user.phone ?? user.student?.phone ?? null,
    gender: user.gender,
    dateOfBirth: dateOnly(user.dateOfBirth),
    bloodGroup: user.bloodGroup,
    nationality: user.nationality,
    nationalId: user.nationalId,
    addressLine: user.addressLine,
    city: user.city,
    district: user.district,
    postalCode: user.postalCode,
    country: user.country,
    hasAvatar:
      typeof user.avatarMimeType === 'string' && user.avatarMimeType.length > 0,
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    roles,
    emailVerified: user.isEmailVerified,
    phoneVerified: false,
    teacher: hasTeacher
      ? {
          employeeId: tp?.employeeId ?? null,
          designation: tp?.designation ?? null,
          department: tp?.department ?? null,
          bio: tp?.bio ?? null,
          qualifications: tp?.qualifications ?? null,
          experience: tp?.experience ?? null,
          joiningDate: dateOnly(tp?.joiningDate ?? null),
          assignedCourses: [...courseMap.values()],
          assignedBatches,
        }
      : null,
    student: user.student
      ? {
          studentId: user.student.studentId,
          guardianName: user.student.guardianName,
          guardianPhone: user.student.guardianPhone,
          emergencyContact: user.student.emergencyContact,
          enrollmentDate: iso(earliestEnrollment ?? user.student.createdAt),
          currentCourses: [...studentCourses.values()],
          currentBatches,
        }
      : null,
    admin: hasAdmin
      ? {
          permissionsSummary: [
            'Full administrative access',
            'Manage users, courses, batches, and payments',
            'Verify payments and issue refunds',
            'View reports and trigger billing jobs',
          ],
        }
      : null,
  };
}

export function decodeAvatarPayload(input: {
  mimeType: string;
  data: string;
}): { mimeType: string; bytes: Uint8Array<ArrayBuffer> } {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new AvatarInvalidException(
      'Use a JPEG, PNG, WebP, or GIF image for your profile photo.',
    );
  }

  let raw = input.data.trim();
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(raw);
  if (dataUrl) {
    const declared = dataUrl[1].trim().toLowerCase();
    if (declared !== mimeType) {
      throw new AvatarInvalidException(
        'Avatar mime type does not match the data URL.',
      );
    }
    raw = dataUrl[2];
  }

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    const buf = Buffer.from(raw, 'base64');
    bytes = new Uint8Array(buf);
  } catch {
    throw new AvatarInvalidException('Avatar image data is not valid base64.');
  }

  if (bytes.length === 0) {
    throw new AvatarInvalidException('Avatar image is empty.');
  }
  if (bytes.length > AVATAR_MAX_BYTES) {
    throw new AvatarInvalidException(
      'Avatar must be 2 MB or smaller.',
    );
  }

  return { mimeType, bytes };
}

export function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
