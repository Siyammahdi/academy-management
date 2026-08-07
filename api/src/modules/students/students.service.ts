import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, StudentStatus } from '@prisma/client'

import { PrismaService } from '../../prisma/prisma.service'
import {
  buildPaginatedResult,
  resolvePagination,
  type Paginated,
  type PaginationQuery,
} from '../../common/utils/pagination'
import {
  money,
  presentAuditRows,
  presentUserBase,
  type AdminAuditEntry,
  type AdminUserDetailBase,
} from '../users/user-detail.presentation'

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

export interface StudentDetailResponse {
  student: {
    id: string
    studentId: string
    fullName: string
    phone: string
    status: StudentStatus
    guardianName: string | null
    guardianPhone: string | null
    emergencyContact: string | null
    createdAt: string
    updatedAt: string
    enrollmentDate: string | null
    currentCourses: Array<{ id: string; title: string; slug: string }>
    currentBatches: Array<{
      id: string
      name: string
      course: { id: string; title: string; slug: string }
    }>
    attendanceSummary: string | null
    progress: string | null
  }
  user: AdminUserDetailBase | null
  billing: {
    outstandingBalance: string
    paymentStatus: string
    currentBillingPeriod: {
      id: string
      periodMonth: string
      status: string
      amountOwed: string
      amountPaid: string
      outstanding: string
      dueDate: string
      batchName: string
      courseTitle: string
    } | null
    billingHistory: Array<{
      id: string
      periodMonth: string
      status: string
      amountOwed: string
      amountPaid: string
      outstanding: string
      dueDate: string
      batchName: string
      courseTitle: string
      inPenalty: boolean
    }>
    paymentHistory: Array<{
      id: string
      amount: string
      status: string
      method: string
      provider: string
      createdAt: string
      verifiedAt: string | null
      periodMonth: string
      batchName: string
    }>
    outstandingInvoices: Array<{
      id: string
      periodMonth: string
      status: string
      outstanding: string
      dueDate: string
      batchName: string
    }>
    penalties: Array<{
      enrollmentId: string
      batchName: string
      inPenalty: boolean
    }>
    lastPaymentDate: string | null
  }
  recentActivity: AdminAuditEntry[]
  auditLogs: AdminAuditEntry[]
  warnings: string[]
}

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async count(): Promise<{ count: number }> {
    const count = await this.prisma.student.count()
    return { count }
  }

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

  async getDetail(studentId: string): Promise<StudentDetailResponse> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          include: { roles: true },
        },
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, title: true, slug: true } },
              },
            },
            billingPeriods: {
              orderBy: { periodMonth: 'desc' },
              include: {
                payments: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    })
    if (!student) {
      throw new NotFoundException('Not found')
    }

    const activeEnrollments = student.enrollments.filter(
      (e) => e.status === 'active' || e.status === 'pending',
    )
    const currentBatches = activeEnrollments.map((e) => ({
      id: e.batch.id,
      name: e.batch.name,
      course: e.batch.course,
    }))
    const courseMap = new Map<string, { id: string; title: string; slug: string }>()
    for (const b of currentBatches) {
      courseMap.set(b.course.id, b.course)
    }

    const earliestEnrollment = [...student.enrollments]
      .map((e) => e.enrolledAt)
      .sort((a, b) => a.getTime() - b.getTime())[0]

    const allPeriods = student.enrollments.flatMap((e) =>
      e.billingPeriods.map((p) => ({
        ...p,
        batchName: e.batch.name,
        courseTitle: e.batch.course.title,
        inPenalty: e.inPenalty,
        enrollmentId: e.id,
      })),
    )

    const billingHistory = allPeriods.map((p) => {
      const outstanding = p.amountOwed.minus(p.amountPaid)
      return {
        id: p.id,
        periodMonth: p.periodMonth.toISOString().slice(0, 7),
        status: p.status,
        amountOwed: money(p.amountOwed),
        amountPaid: money(p.amountPaid),
        outstanding: money(outstanding),
        dueDate: p.dueDate.toISOString(),
        batchName: p.batchName,
        courseTitle: p.courseTitle,
        inPenalty: p.inPenalty,
      }
    })

    const outstandingInvoices = billingHistory.filter(
      (p) =>
        p.status === 'unpaid' ||
        p.status === 'pending' ||
        p.status === 'partially_paid',
    )

    let outstandingTotal = new Prisma.Decimal(0)
    for (const p of allPeriods) {
      if (
        p.status === 'unpaid' ||
        p.status === 'pending' ||
        p.status === 'partially_paid'
      ) {
        outstandingTotal = outstandingTotal.plus(
          p.amountOwed.minus(p.amountPaid),
        )
      }
    }

    const paymentHistory = allPeriods.flatMap((p) =>
      p.payments.map((pay) => ({
        id: pay.id,
        amount: money(pay.amount),
        status: pay.status,
        method: pay.method,
        provider: pay.provider,
        createdAt: pay.createdAt.toISOString(),
        verifiedAt: pay.verifiedAt?.toISOString() ?? null,
        periodMonth: p.periodMonth.toISOString().slice(0, 7),
        batchName: p.batchName,
      })),
    )
    paymentHistory.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    const verifiedPayments = paymentHistory.filter((p) => p.status === 'verified')
    const lastPaymentDate = verifiedPayments[0]?.createdAt ?? null

    const currentBillingPeriod =
      outstandingInvoices[0] != null
        ? (() => {
            const row = allPeriods.find((p) => p.id === outstandingInvoices[0]!.id)!
            const outstanding = row.amountOwed.minus(row.amountPaid)
            return {
              id: row.id,
              periodMonth: row.periodMonth.toISOString().slice(0, 7),
              status: row.status,
              amountOwed: money(row.amountOwed),
              amountPaid: money(row.amountPaid),
              outstanding: money(outstanding),
              dueDate: row.dueDate.toISOString(),
              batchName: row.batchName,
              courseTitle: row.courseTitle,
            }
          })()
        : billingHistory[0]
          ? {
              id: billingHistory[0].id,
              periodMonth: billingHistory[0].periodMonth,
              status: billingHistory[0].status,
              amountOwed: billingHistory[0].amountOwed,
              amountPaid: billingHistory[0].amountPaid,
              outstanding: billingHistory[0].outstanding,
              dueDate: billingHistory[0].dueDate,
              batchName: billingHistory[0].batchName,
              courseTitle: billingHistory[0].courseTitle,
            }
          : null

    const paymentStatus =
      outstandingTotal.gt(0)
        ? outstandingInvoices.some((p) => p.status === 'partially_paid')
          ? 'partially_paid'
          : 'outstanding'
        : billingHistory.length > 0
          ? 'paid_up'
          : 'no_billing'

    const penalties = student.enrollments
      .filter((e) => e.inPenalty)
      .map((e) => ({
        enrollmentId: e.id,
        batchName: e.batch.name,
        inPenalty: true,
      }))

    const warnings: string[] = []
    if (!student.userId) {
      warnings.push(
        'This student has no linked login account. Role management is unavailable until an account is linked.',
      )
    }

    const [auditLogs, recentActivity] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { targetType: 'Student', targetId: student.id },
            ...(student.userId
              ? [{ targetType: 'User' as const, targetId: student.userId }]
              : []),
            {
              targetType: 'Enrollment',
              targetId: { in: student.enrollments.map((e) => e.id) },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      student.userId
        ? this.prisma.auditLog.findMany({
            where: { actorUserId: student.userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
    ])

    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        phone: student.phone,
        status: student.status,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        emergencyContact: student.emergencyContact,
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
        enrollmentDate: earliestEnrollment?.toISOString() ?? null,
        currentCourses: [...courseMap.values()],
        currentBatches,
        attendanceSummary: null,
        progress: null,
      },
      user: student.user
        ? presentUserBase({
            ...student.user,
            student: {
              fullName: student.fullName,
              phone: student.phone,
            },
          })
        : null,
      billing: {
        outstandingBalance: money(outstandingTotal),
        paymentStatus,
        currentBillingPeriod,
        billingHistory,
        paymentHistory: paymentHistory.slice(0, 50),
        outstandingInvoices: outstandingInvoices.map((p) => ({
          id: p.id,
          periodMonth: p.periodMonth,
          status: p.status,
          outstanding: p.outstanding,
          dueDate: p.dueDate,
          batchName: p.batchName,
        })),
        penalties,
        lastPaymentDate,
      },
      recentActivity: presentAuditRows(recentActivity),
      auditLogs: presentAuditRows(auditLogs),
      warnings,
    }
  }
}
