import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';
import {
  AccountDeleteConfirmationException,
  CurrentPasswordIncorrectException,
  EmailTakenException,
  LastAdminDeleteException,
  PasswordConfirmationMismatchException,
  PhoneTakenException,
  ProfileNotFoundException,
} from './profile.exceptions';
import {
  decodeAvatarPayload,
  emptyToNull,
  presentProfile,
  type ProfileResponse,
  type ProfileUserRow,
} from './profile.presentation';

const PROFILE_INCLUDE = {
  roles: { select: { role: true as const } },
  teacherProfile: true,
  student: {
    select: {
      id: true,
      studentId: true,
      fullName: true,
      phone: true,
      status: true,
      guardianName: true,
      guardianPhone: true,
      emergencyContact: true,
      createdAt: true,
      enrollments: {
        where: { status: 'active' as const },
        select: {
          enrolledAt: true,
          batch: {
            select: {
              id: true,
              name: true,
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      },
    },
  },
  taughtBatches: {
    select: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

const PROFILE_SELECT = {
  id: true,
  email: true,
  status: true,
  fullName: true,
  phone: true,
  gender: true,
  dateOfBirth: true,
  bloodGroup: true,
  nationality: true,
  nationalId: true,
  addressLine: true,
  city: true,
  district: true,
  postalCode: true,
  country: true,
  avatarMimeType: true,
  isEmailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  ...PROFILE_INCLUDE,
} satisfies Prisma.UserSelect;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.loadProfile(userId);
    return presentProfile(user);
  }

  async getAvatar(
    userId: string,
  ): Promise<{ mimeType: string; body: Buffer } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarMimeType: true },
    });
    if (
      !user?.avatar ||
      !user.avatarMimeType ||
      user.avatar.length === 0
    ) {
      return null;
    }
    return { mimeType: user.avatarMimeType, body: Buffer.from(user.avatar) };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        student: true,
        teacherProfile: true,
      },
    });
    if (!existing) {
      throw new ProfileNotFoundException();
    }

    const roles = existing.roles.map((r) => r.role);
    const email =
      dto.email !== undefined ? dto.email.trim().toLowerCase() : undefined;
    const phone =
      dto.phone !== undefined ? emptyToNull(dto.phone) : undefined;
    const fullName =
      dto.fullName !== undefined ? dto.fullName.trim() : undefined;

    if (email !== undefined && email !== existing.email.toLowerCase()) {
      const clash = await this.prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          NOT: { id: userId },
        },
        select: { id: true },
      });
      if (clash) throw new EmailTakenException();
    }

    if (phone !== undefined && phone !== null) {
      await this.assertPhoneAvailable(userId, phone, existing.student?.id);
    }

    const avatar =
      dto.avatar !== undefined ? decodeAvatarPayload(dto.avatar) : undefined;

    const userData: Prisma.UserUpdateInput = {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.dateOfBirth !== undefined
        ? {
            dateOfBirth:
              dto.dateOfBirth === null ? null : new Date(dto.dateOfBirth),
          }
        : {}),
      ...(dto.bloodGroup !== undefined
        ? { bloodGroup: emptyToNull(dto.bloodGroup) ?? null }
        : {}),
      ...(dto.nationality !== undefined
        ? { nationality: emptyToNull(dto.nationality) ?? null }
        : {}),
      ...(dto.nationalId !== undefined
        ? { nationalId: emptyToNull(dto.nationalId) ?? null }
        : {}),
      ...(dto.addressLine !== undefined
        ? { addressLine: emptyToNull(dto.addressLine) ?? null }
        : {}),
      ...(dto.city !== undefined ? { city: emptyToNull(dto.city) ?? null } : {}),
      ...(dto.district !== undefined
        ? { district: emptyToNull(dto.district) ?? null }
        : {}),
      ...(dto.postalCode !== undefined
        ? { postalCode: emptyToNull(dto.postalCode) ?? null }
        : {}),
      ...(dto.country !== undefined
        ? { country: emptyToNull(dto.country) ?? null }
        : {}),
      ...(avatar
        ? { avatar: avatar.bytes, avatarMimeType: avatar.mimeType }
        : dto.clearAvatar
          ? { avatar: null, avatarMimeType: null }
          : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: userData,
      });

      // Keep Student.fullName / phone in sync for guest lookup (GST).
      if (existing.student) {
        const studentPatch: Prisma.StudentUpdateInput = {};
        if (fullName !== undefined) studentPatch.fullName = fullName;
        if (phone !== undefined && phone !== null) studentPatch.phone = phone;
        if (dto.student) {
          if (dto.student.guardianName !== undefined) {
            studentPatch.guardianName =
              emptyToNull(dto.student.guardianName) ?? null;
          }
          if (dto.student.guardianPhone !== undefined) {
            studentPatch.guardianPhone =
              emptyToNull(dto.student.guardianPhone) ?? null;
          }
          if (dto.student.emergencyContact !== undefined) {
            studentPatch.emergencyContact =
              emptyToNull(dto.student.emergencyContact) ?? null;
          }
        }
        if (Object.keys(studentPatch).length > 0) {
          await tx.student.update({
            where: { id: existing.student.id },
            data: studentPatch,
          });
        }
      }

      if (roles.includes('teacher') && dto.teacher) {
        const t = dto.teacher;
        const teacherData = {
          employeeId:
            t.employeeId !== undefined
              ? (emptyToNull(t.employeeId) ?? null)
              : undefined,
          designation:
            t.designation !== undefined
              ? (emptyToNull(t.designation) ?? null)
              : undefined,
          department:
            t.department !== undefined
              ? (emptyToNull(t.department) ?? null)
              : undefined,
          bio: t.bio !== undefined ? (emptyToNull(t.bio) ?? null) : undefined,
          qualifications:
            t.qualifications !== undefined
              ? (emptyToNull(t.qualifications) ?? null)
              : undefined,
          experience:
            t.experience !== undefined
              ? (emptyToNull(t.experience) ?? null)
              : undefined,
          joiningDate:
            t.joiningDate !== undefined
              ? t.joiningDate === null
                ? null
                : new Date(t.joiningDate)
              : undefined,
        };

        const cleaned = Object.fromEntries(
          Object.entries(teacherData).filter(([, v]) => v !== undefined),
        );

        if (Object.keys(cleaned).length > 0) {
          await tx.teacherProfile.upsert({
            where: { userId },
            create: { userId, ...cleaned },
            update: cleaned,
          });
        }
      }
    });

    return this.getProfile(userId);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new PasswordConfirmationMismatchException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new ProfileNotFoundException();

    const ok = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!ok) throw new CurrentPasswordIncorrectException();

    const passwordHash = await argon2.hash(dto.newPassword);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      // Invalidate other sessions after a password change.
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  }

  /**
   * Closes the account permanently for login: disables the user, scrubs PII,
   * revokes sessions. Student/payment history is retained (userId unlinked).
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user || user.status !== 'active') {
      throw new ProfileNotFoundException();
    }

    if (
      dto.confirmation.trim().toLowerCase() !== user.email.trim().toLowerCase()
    ) {
      throw new AccountDeleteConfirmationException();
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new CurrentPasswordIncorrectException();

    const isAdmin = user.roles.some((r) => r.role === 'admin');
    if (isAdmin) {
      const otherAdmins = await this.prisma.userRole.count({
        where: {
          role: 'admin',
          userId: { not: userId },
          user: { status: 'active' },
        },
      });
      if (otherAdmins === 0) {
        throw new LastAdminDeleteException();
      }
    }

    const now = new Date();
    const tombstoneEmail = `deleted_${userId}@deleted.local`;
    const passwordHash = await argon2.hash(randomBytes(32).toString('hex'));

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.batchTeacher.deleteMany({ where: { userId } });
      await tx.teacherProfile.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { recipientUserId: userId } });
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.student.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'disabled',
          email: tombstoneEmail,
          passwordHash,
          fullName: null,
          phone: null,
          gender: null,
          dateOfBirth: null,
          bloodGroup: null,
          nationality: null,
          nationalId: null,
          addressLine: null,
          city: null,
          district: null,
          postalCode: null,
          country: null,
          avatar: null,
          avatarMimeType: null,
          lastLoginAt: null,
        },
      });
    });
  }

  private async loadProfile(userId: string): Promise<ProfileUserRow> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new ProfileNotFoundException();
    return user as ProfileUserRow;
  }

  private async assertPhoneAvailable(
    userId: string,
    phone: string,
    studentId: string | undefined,
  ): Promise<void> {
    const userClash = await this.prisma.user.findFirst({
      where: {
        phone,
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (userClash) throw new PhoneTakenException();

    const studentClash = await this.prisma.student.findFirst({
      where: {
        phone,
        ...(studentId ? { NOT: { id: studentId } } : {}),
        OR: [{ userId: null }, { userId: { not: userId } }],
      },
      select: { id: true },
    });
    if (studentClash) throw new PhoneTakenException();
  }
}
