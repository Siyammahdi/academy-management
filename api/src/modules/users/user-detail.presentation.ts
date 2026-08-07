import type {
  Gender,
  Prisma,
  RoleName,
  StudentStatus,
  UserStatus,
} from '@prisma/client';

function money(value: Prisma.Decimal | null | undefined): string {
  if (!value) return '0.00';
  return value.toFixed(2);
}

function dateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

export interface AdminAuditEntry {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  details: unknown;
}

export interface AdminUserDetailBase {
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
  roles: RoleName[];
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export function presentUserBase(user: {
  id: string;
  email: string;
  status: UserStatus;
  fullName: string | null;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  bloodGroup: string | null;
  nationality: string | null;
  nationalId: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  country: string | null;
  avatarMimeType: string | null;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{ role: RoleName }>;
  student?: { fullName: string; phone: string } | null;
}): AdminUserDetailBase {
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
    roles: user.roles.map((r) => r.role),
    emailVerified: user.isEmailVerified,
    phoneVerified: false,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: iso(user.lastLoginAt),
    createdBy: null,
    updatedBy: null,
  };
}

export function presentAuditRows(
  rows: Array<{
    id: string;
    actorUserId: string | null;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: Date;
    details: unknown;
  }>,
): AdminAuditEntry[] {
  return rows.map((r) => ({
    id: r.id,
    actorUserId: r.actorUserId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    createdAt: r.createdAt.toISOString(),
    details: r.details,
  }));
}

export { money, dateOnly, iso };
export type { StudentStatus };
