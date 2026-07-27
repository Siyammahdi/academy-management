import { Injectable } from '@nestjs/common'
import { Prisma, StudentStatus } from '@prisma/client'

import { PrismaService } from '../../prisma/prisma.service'
import {
  buildPaginatedResult,
  resolvePagination,
  type Paginated,
  type PaginationQuery,
} from '../../common/utils/pagination'

export interface StudentListItem {
  id: string
  studentId: string
  fullName: string
  phone: string
  status: StudentStatus
  email: string | null
  activeEnrollments: number
  createdAt: Date
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async count(): Promise<{ count: number }> {
    const count = await this.prisma.student.count()
    return { count }
  }

  // Admin directory — not in the original doc 06 table, but required for the
  // owner console. Search matches ANA id, name, phone, or linked email.
  async list(
    query: PaginationQuery & { q?: string; status?: string },
  ): Promise<Paginated<StudentListItem>> {
    const { page, limit, skip, take } = resolvePagination(query)
    const q = query.q?.trim()

    const statusFilter =
      query.status === 'active' || query.status === 'inactive'
        ? (query.status as StudentStatus)
        : undefined

    const where: Prisma.StudentWhereInput = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q
        ? {
            OR: [
              { studentId: { contains: q, mode: 'insensitive' } },
              { fullName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              {
                user: {
                  email: { contains: q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true } },
          _count: {
            select: {
              enrollments: {
                where: { status: { in: ['pending', 'active'] } },
              },
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ])

    const data: StudentListItem[] = rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      fullName: row.fullName,
      phone: row.phone,
      status: row.status,
      email: row.user?.email ?? null,
      activeEnrollments: row._count.enrollments,
      createdAt: row.createdAt,
    }))

    return buildPaginatedResult(data, total, page, limit)
  }
}
