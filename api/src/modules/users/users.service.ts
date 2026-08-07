import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, RoleName } from '@prisma/client'
import * as argon2 from 'argon2'

import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { EmailAlreadyRegisteredException } from '../../common/exceptions/email-already-registered.exception'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import {
  CannotStripOwnAdminException,
  LastAdminException,
} from './exceptions/role-management.exception'
import {
  dateOnly,
  presentAuditRows,
  presentUserBase,
  type AdminAuditEntry,
} from './user-detail.presentation'

export interface UserSummary {
  id: string
  email: string
  fullName: string | null
  roles: RoleName[]
  status: 'active' | 'disabled'
  createdAt: Date
  hasStudentProfile: boolean
}

export interface TeacherDetailResponse {
  user: ReturnType<typeof presentUserBase>
  teacher: {
    employeeId: string | null
    designation: string | null
    department: string | null
    bio: string | null
    qualifications: string | null
    experience: string | null
    joiningDate: string | null
    assignedCourses: Array<{ id: string; title: string; slug: string }>
    assignedBatches: Array<{
      id: string
      name: string
      course: { id: string; title: string; slug: string }
      studentCount: number
    }>
    totalStudents: number
  } | null
  recentActivity: AdminAuditEntry[]
  auditLogs: AdminAuditEntry[]
  warnings: string[]
}

export interface SetRoleResult {
  user: UserSummary
  warnings: string[]
}

function isRoleName(value: string): value is RoleName {
  return (Object.values(RoleName) as string[]).includes(value)
}

function uniqueRoles(roles: RoleName[]): RoleName[] {
  return Array.from(new Set(roles))
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Admin directory + teacher picker. Optional `role` narrows to holders of
  // that role; optional `q` matches email or linked student full name
  // (case-insensitive).
  async list(query: { role?: string; q?: string } = {}): Promise<UserSummary[]> {
    if (query.role !== undefined && !isRoleName(query.role)) {
      throw new BadRequestException(`Invalid role filter: ${query.role}`)
    }

    const q = query.q?.trim()

    const users = await this.prisma.user.findMany({
      where: {
        ...(query.role ? { roles: { some: { role: query.role } } } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                {
                  fullName: {
                    contains: q,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  student: {
                    fullName: { contains: q, mode: 'insensitive' as const },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        roles: true,
        student: { select: { id: true, fullName: true } },
      },
      orderBy: { email: 'asc' },
    })

    return users.map((user) => this.toSummary(user))
  }

  async getDetail(userId: string): Promise<TeacherDetailResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        student: { select: { fullName: true, phone: true } },
        teacherProfile: true,
        taughtBatches: {
          select: {
            batch: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, title: true, slug: true } },
                enrollments: {
                  where: { status: { in: ['pending', 'active'] } },
                  select: { studentId: true },
                },
              },
            },
          },
        },
      },
    })
    if (!user) {
      throw new NotFoundException('Not found')
    }

    const roles = user.roles.map((r) => r.role)
    if (!roles.includes('teacher') && !roles.includes('admin')) {
      // Teachers module detail is for staff; students use /students/:id.
      // Still allow admin viewing any user who holds teacher.
    }

    const assignedBatches = user.taughtBatches.map((tb) => {
      const studentIds = new Set(tb.batch.enrollments.map((e) => e.studentId))
      return {
        id: tb.batch.id,
        name: tb.batch.name,
        course: tb.batch.course,
        studentCount: studentIds.size,
      }
    })
    const courseMap = new Map<string, { id: string; title: string; slug: string }>()
    for (const b of assignedBatches) {
      courseMap.set(b.course.id, b.course)
    }
    const allStudentIds = new Set<string>()
    for (const b of assignedBatches) {
      const tb = user.taughtBatches.find((t) => t.batch.id === b.id)
      tb?.batch.enrollments.forEach((e) => allStudentIds.add(e.studentId))
    }

    const tp = user.teacherProfile
    const warnings: string[] = []
    if (roles.includes('teacher') && !tp) {
      warnings.push(
        'Teacher profile fields (employee ID, designation, etc.) have not been filled in yet.',
      )
    }

    const [auditLogs, recentAsActor] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { targetType: 'User', targetId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        where: { actorUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    return {
      user: presentUserBase(user),
      teacher: roles.includes('teacher')
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
            totalStudents: allStudentIds.size,
          }
        : null,
      recentActivity: presentAuditRows(recentAsActor),
      auditLogs: presentAuditRows(auditLogs),
      warnings,
    }
  }

  async getAvatar(
    userId: string,
  ): Promise<{ mimeType: string; body: Buffer } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarMimeType: true },
    })
    if (!user?.avatar || !user.avatarMimeType || user.avatar.length === 0) {
      return null
    }
    return { mimeType: user.avatarMimeType, body: Buffer.from(user.avatar) }
  }

  /**
   * Replaces the user's role set with exactly one role (admin UI).
   * Preserves credentials, profile PII, and student/teacher profile rows.
   */
  async setRole(
    userId: string,
    role: RoleName,
    actor: AuthUser,
  ): Promise<SetRoleResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        student: { select: { id: true } },
        teacherProfile: { select: { id: true } },
        _count: { select: { taughtBatches: true } },
      },
    })
    if (!user) {
      throw new NotFoundException('Not found')
    }

    const before = user.roles.map((r) => r.role)
    const after = [role]
    if (before.length === 1 && before[0] === role) {
      return { user: await this.requireUser(userId), warnings: [] }
    }

    const removingAdmin = before.includes('admin') && role !== 'admin'
    if (removingAdmin) {
      if (actor.id === userId) {
        throw new CannotStripOwnAdminException()
      }
      const adminCount = await this.prisma.userRole.count({
        where: { role: 'admin' },
      })
      if (adminCount <= 1) {
        throw new LastAdminException()
      }
    }

    const warnings: string[] = []
    if (role === 'student' && !user.student) {
      warnings.push(
        'Student role granted without a Student profile. Create or link a student profile afterward (full name + phone required for guest lookup).',
      )
    }
    if (role === 'teacher' && !user.teacherProfile) {
      warnings.push(
        'Teacher role granted. Teacher profile fields can be completed from the teacher’s own Profile page.',
      )
    }
    if (before.includes('teacher') && role !== 'teacher' && user._count.taughtBatches > 0) {
      warnings.push(
        `This user is still assigned to ${user._count.taughtBatches} batch(es). Remove batch assignments if they should no longer teach.`,
      )
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } })
      await tx.userRole.create({ data: { userId, role } })
      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'user_role_changed',
          targetType: 'User',
          targetId: userId,
          details: {
            change: 'replaced',
            role,
            before,
            after,
            warnings,
          },
        },
        tx,
      )
    })

    return { user: await this.requireUser(userId), warnings }
  }

  // Admin-provisioned account. Public /auth/register always creates a
  // student; this path can create staff without a student profile.
  async create(dto: CreateUserDto, actor: AuthUser): Promise<UserSummary> {
    const roles = uniqueRoles(dto.roles)
    if (roles.length === 0) {
      throw new BadRequestException('Select at least one role')
    }

    const wantsStudent = roles.includes('student')
    if (wantsStudent && (!dto.fullName?.trim() || !dto.phone?.trim())) {
      throw new BadRequestException(
        'fullName and phone are required when granting the student role',
      )
    }

    const passwordHash = await argon2.hash(dto.password)

    try {
      const userId = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email.trim().toLowerCase(),
            passwordHash,
            isEmailVerified: true,
            ...(dto.fullName?.trim()
              ? { fullName: dto.fullName.trim() }
              : {}),
            ...(dto.phone?.trim() ? { phone: dto.phone.trim() } : {}),
          },
        })

        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: user.id, role })),
        })

        if (wantsStudent) {
          const seq = await tx.studentIdSequence.update({
            where: { id: 1 },
            data: { current: { increment: 1 } },
          })
          const studentId = `ANA-${String(seq.current).padStart(4, '0')}`
          await tx.student.create({
            data: {
              studentId,
              userId: user.id,
              fullName: dto.fullName!.trim(),
              phone: dto.phone!.trim(),
            },
          })
        }

        await this.audit.record(
          {
            actorUserId: actor.id,
            action: 'user_role_changed',
            targetType: 'User',
            targetId: user.id,
            details: {
              change: 'user_created',
              roles,
              hasStudentProfile: wantsStudent,
            },
          },
          tx,
        )

        return user.id
      })

      return this.requireUser(userId)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new EmailAlreadyRegisteredException()
      }
      throw error
    }
  }

  // R-04 — admin grants a role. RBAC-01: roles are a set; adding is additive.
  async assignRole(
    userId: string,
    role: RoleName,
    actor: AuthUser,
  ): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, student: { select: { id: true } } },
    })
    if (!user) {
      throw new NotFoundException('Not found')
    }

    if (user.roles.some((r) => r.role === role)) {
      throw new ConflictException('User already holds this role')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.create({
        data: { userId, role },
      })
      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'user_role_changed',
          targetType: 'User',
          targetId: userId,
          details: {
            change: 'assigned',
            role,
            before: user.roles.map((r) => r.role),
            after: [...user.roles.map((r) => r.role), role],
          },
        },
        tx,
      )
    })

    return this.requireUser(userId)
  }

  // R-04 — admin removes a role. Guards against self-lockout and last-admin.
  async removeRole(
    userId: string,
    role: string,
    actor: AuthUser,
  ): Promise<UserSummary> {
    if (!isRoleName(role)) {
      throw new BadRequestException(`Invalid role: ${role}`)
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, student: { select: { id: true } } },
    })
    if (!user) {
      throw new NotFoundException('Not found')
    }

    if (!user.roles.some((r) => r.role === role)) {
      throw new NotFoundException('Role not found on user')
    }

    if (role === 'admin') {
      if (actor.id === userId) {
        throw new CannotStripOwnAdminException()
      }
      const adminCount = await this.prisma.userRole.count({
        where: { role: 'admin' },
      })
      if (adminCount <= 1) {
        throw new LastAdminException()
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.delete({
        where: { userId_role: { userId, role } },
      })
      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'user_role_changed',
          targetType: 'User',
          targetId: userId,
          details: {
            change: 'removed',
            role,
            before: user.roles.map((r) => r.role),
            after: user.roles.map((r) => r.role).filter((r) => r !== role),
          },
        },
        tx,
      )
    })

    return this.requireUser(userId)
  }

  private async requireUser(userId: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        student: { select: { id: true, fullName: true } },
      },
    })
    if (!user) {
      throw new NotFoundException('Not found')
    }
    return this.toSummary(user)
  }

  private toSummary(user: {
    id: string
    email: string
    status: 'active' | 'disabled'
    fullName?: string | null
    createdAt: Date
    roles: Array<{ role: RoleName }>
    student: { id: string; fullName: string } | null
  }): UserSummary {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? user.student?.fullName ?? null,
      roles: user.roles.map((r) => r.role),
      status: user.status,
      createdAt: user.createdAt,
      hasStudentProfile: user.student !== null,
    }
  }
}
