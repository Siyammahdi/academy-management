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

export interface UserSummary {
  id: string
  email: string
  /** Linked Student.fullName when the user also has a student profile. */
  fullName: string | null
  roles: RoleName[]
  createdAt: Date
  hasStudentProfile: boolean
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

  // Admin directory + manager picker. Optional `role` narrows to holders of
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

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.student?.fullName ?? null,
      roles: user.roles.map((r) => r.role),
      createdAt: user.createdAt,
      hasStudentProfile: user.student !== null,
    }))
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
    return {
      id: user.id,
      email: user.email,
      fullName: user.student?.fullName ?? null,
      roles: user.roles.map((r) => r.role),
      createdAt: user.createdAt,
      hasStudentProfile: user.student !== null,
    }
  }
}
