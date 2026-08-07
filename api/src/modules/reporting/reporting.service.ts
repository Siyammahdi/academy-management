import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { firstDayOfDhakaMonth } from '../../common/utils/period'
import {
  buildPaginatedResult,
  resolvePagination,
  type Paginated,
  type PaginationQuery,
} from '../../common/utils/pagination'
import { PrismaService } from '../../prisma/prisma.service'

export interface RevenueByMonth {
  periodMonth: Date
  revenue: Prisma.Decimal
}

export interface RevenueReport {
  totalRevenue: Prisma.Decimal
  byMonth: RevenueByMonth[]
}

export interface OutstandingItem {
  billingPeriodId: string
  periodMonth: Date
  courseTitle: string
  batchName: string
  amountOutstanding: Prisma.Decimal
}

export interface OutstandingReport {
  totalOutstanding: Prisma.Decimal
  dueCount: number
  items: OutstandingItem[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface EnrollmentBatchReport {
  batchId: string
  batchName: string
  courseTitle: string
  capacity: number
  filled: number
  pendingCount: number
  seatRemaining: number
  status: string
}

export interface EnrollmentReport {
  batches: EnrollmentBatchReport[]
  totals: { filled: number; pending: number; fullBatches: number }
}

export type LedgerEntryKind = 'payment' | 'refund'

export interface LedgerEntry {
  kind: LedgerEntryKind
  id: string
  createdAt: Date
  periodMonth: Date
  courseTitle: string
  batchName: string
  amount: Prisma.Decimal
  status?: string
  method?: string
  transactionReference?: string | null
  refundReason?: string
}

export interface LedgerReport {
  entries: LedgerEntry[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface AuditLogEntry {
  id: string
  actorUserId: string | null
  action: string
  targetType: string
  targetId: string
  createdAt: Date
  details: Prisma.InputJsonValue | null
}

function parseMonthToUtcFirstDay(input: string): Date {
  const monthMatch = input.match(/^(\d{4})-(\d{2})$/)
  if (monthMatch) {
    const year = Number(monthMatch[1])
    const month = Number(monthMatch[2])
    return new Date(Date.UTC(year, month - 1, 1))
  }

  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid month parameter')
  }
  return firstDayOfDhakaMonth(parsed)
}

function addMonthsUtcFirstDay(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  )
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  private async getTaughtBatchIds(actor: AuthUser): Promise<string[] | null> {
    if (actor.roles.includes('admin')) return null
    if (!actor.roles.includes('teacher')) return []

    const batches = await this.prisma.batch.findMany({
      where: { teachers: { some: { userId: actor.id } } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })
    return batches.map((b) => b.id)
  }

  private resolveMonthRange(query: {
    from?: string
    to?: string
  }): { from: Date; toExclusive: Date } {
    const now = new Date()
    const currentMonthStart = firstDayOfDhakaMonth(now)
    const from = query.from ? parseMonthToUtcFirstDay(query.from) : currentMonthStart
    const toStart = query.to ? parseMonthToUtcFirstDay(query.to) : currentMonthStart

    if (toStart.getTime() < from.getTime()) {
      throw new BadRequestException('Invalid month range')
    }

    return {
      from,
      toExclusive: addMonthsUtcFirstDay(toStart, 1),
    }
  }

  async revenue(
    actor: AuthUser,
    query: { from?: string; to?: string; batchId?: string },
  ): Promise<RevenueReport> {
    const scopeBatchIds = await this.getTaughtBatchIds(actor)
    const { from, toExclusive } = this.resolveMonthRange(query)

    const batchIds =
      scopeBatchIds === null
        ? query.batchId
          ? [query.batchId]
          : null
        : query.batchId
          ? scopeBatchIds.includes(query.batchId)
            ? [query.batchId]
            : []
          : scopeBatchIds

    if (batchIds?.length === 0) {
      return { totalRevenue: new Prisma.Decimal(0), byMonth: [] }
    }

    const paymentWhere: Prisma.PaymentWhereInput = {
      status: 'verified',
      billingPeriod: {
        periodMonth: { gte: from, lt: toExclusive },
        ...(batchIds ? { enrollment: { batchId: { in: batchIds } } } : {}),
      },
    }

    const refundWhere: Prisma.RefundWhereInput = {
      payment: {
        billingPeriod: {
          periodMonth: { gte: from, lt: toExclusive },
          ...(batchIds ? { enrollment: { batchId: { in: batchIds } } } : {}),
        },
      },
    }

    const [payments, refunds] = await Promise.all([
      this.prisma.payment.findMany({
        where: paymentWhere,
        select: {
          amount: true,
          billingPeriod: { select: { periodMonth: true } },
        },
      }),
      this.prisma.refund.findMany({
        where: refundWhere,
        select: {
          amount: true,
          refundedAt: true,
          payment: { select: { billingPeriod: { select: { periodMonth: true } } } },
        },
      }),
    ])

    const byMonth = new Map<string, { periodMonth: Date; revenue: Prisma.Decimal }>()

    const getBucket = (periodMonth: Date) => {
      const key = periodMonth.toISOString()
      const existing = byMonth.get(key)
      if (existing) return existing
      const created = { periodMonth, revenue: new Prisma.Decimal(0) }
      byMonth.set(key, created)
      return created
    }

    for (const p of payments) {
      const bucket = getBucket(p.billingPeriod.periodMonth)
      bucket.revenue = bucket.revenue.plus(p.amount)
    }

    for (const r of refunds) {
      const periodMonth = r.payment.billingPeriod.periodMonth
      const bucket = getBucket(periodMonth)
      bucket.revenue = bucket.revenue.minus(r.amount)
    }

    const byMonthList = Array.from(byMonth.values()).sort(
      (a, b) => b.periodMonth.getTime() - a.periodMonth.getTime(),
    )

    const totalRevenue = byMonthList.reduce(
      (acc, cur) => acc.plus(cur.revenue),
      new Prisma.Decimal(0),
    )

    return { totalRevenue, byMonth: byMonthList }
  }

  async outstanding(
    actor: AuthUser,
    query: {
      from?: string
      to?: string
      batchId?: string
      page?: string
      limit?: string
    },
  ): Promise<OutstandingReport> {
    const scopeBatchIds = await this.getTaughtBatchIds(actor)
    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
    })

    const batchIds =
      scopeBatchIds === null
        ? query.batchId
          ? [query.batchId]
          : null
        : query.batchId
          ? scopeBatchIds.includes(query.batchId)
            ? [query.batchId]
            : []
          : scopeBatchIds

    if (batchIds?.length === 0) {
      return {
        totalOutstanding: new Prisma.Decimal(0),
        dueCount: 0,
        items: [],
        meta: { page, limit, total: 0, totalPages: 1 },
      }
    }

    // Month filter is optional for outstanding. Owners care about open dues
    // now; when from/to are omitted we return every unpaid/pending/partial
    // period. When provided, filter by billing periodMonth (same as revenue).
    const monthRange =
      query.from || query.to ? this.resolveMonthRange(query) : null

    const where: Prisma.BillingPeriodWhereInput = {
      status: { in: ['unpaid', 'pending', 'partially_paid'] },
      ...(monthRange
        ? {
            periodMonth: {
              gte: monthRange.from,
              lt: monthRange.toExclusive,
            },
          }
        : {}),
      ...(batchIds ? { enrollment: { batchId: { in: batchIds } } } : {}),
    }

    const [count, agg, items] = await Promise.all([
      this.prisma.billingPeriod.count({ where }),
      this.prisma.billingPeriod.aggregate({
        _sum: { amountOwed: true, amountPaid: true },
        where,
      }),
      this.prisma.billingPeriod.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          periodMonth: true,
          amountOwed: true,
          amountPaid: true,
          enrollment: {
            select: {
              batch: {
                select: {
                  name: true,
                  course: { select: { title: true } },
                },
              },
            },
          },
        },
      }),
    ])

    const sumOwed = agg._sum.amountOwed ?? new Prisma.Decimal(0)
    const sumPaid = agg._sum.amountPaid ?? new Prisma.Decimal(0)
    const totalOutstanding = sumOwed.minus(sumPaid)

    const mappedItems: OutstandingItem[] = items.map((p) => ({
      billingPeriodId: p.id,
      periodMonth: p.periodMonth,
      courseTitle: p.enrollment.batch.course.title,
      batchName: p.enrollment.batch.name,
      amountOutstanding: p.amountOwed.minus(p.amountPaid),
    }))

    return {
      totalOutstanding,
      dueCount: count,
      items: mappedItems,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    }
  }

  async enrollments(
    actor: AuthUser,
    query: { batchId?: string },
  ): Promise<EnrollmentReport> {
    const scopeBatchIds = await this.getTaughtBatchIds(actor)
    const batchIds =
      scopeBatchIds === null
        ? query.batchId
          ? [query.batchId]
          : null
        : query.batchId
          ? scopeBatchIds.includes(query.batchId)
            ? [query.batchId]
            : []
          : scopeBatchIds

    if (batchIds?.length === 0) {
      return { batches: [], totals: { filled: 0, pending: 0, fullBatches: 0 } }
    }

    const batches = await this.prisma.batch.findMany({
      where: batchIds ? { id: { in: batchIds } } : {},
      select: {
        id: true,
        name: true,
        capacity: true,
        status: true,
        course: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const ids = batches.map((b) => b.id)
    if (ids.length === 0) {
      return { batches: [], totals: { filled: 0, pending: 0, fullBatches: 0 } }
    }

    const grouped = await this.prisma.enrollment.groupBy({
      by: ['batchId', 'status'],
      where: {
        batchId: { in: ids },
        status: { in: ['pending', 'active'] },
      },
      _count: { _all: true },
    })

    const filledByBatch = new Map<string, { filled: number; pending: number }>()
    for (const g of grouped) {
      const cur = filledByBatch.get(g.batchId) ?? { filled: 0, pending: 0 }
      cur.filled += g._count._all
      if (g.status === 'pending') cur.pending += g._count._all
      filledByBatch.set(g.batchId, cur)
    }

    const reportBatches = batches.map((b) => {
      const counts = filledByBatch.get(b.id) ?? { filled: 0, pending: 0 }
      return {
        batchId: b.id,
        batchName: b.name,
        courseTitle: b.course.title,
        capacity: b.capacity,
        filled: counts.filled,
        pendingCount: counts.pending,
        seatRemaining: Math.max(0, b.capacity - counts.filled),
        status: b.status,
      }
    })

    const totals = reportBatches.reduce(
      (acc, b) => ({
        filled: acc.filled + b.filled,
        pending: acc.pending + b.pendingCount,
        fullBatches: acc.fullBatches + (b.seatRemaining === 0 ? 1 : 0),
      }),
      { filled: 0, pending: 0, fullBatches: 0 },
    )

    return { batches: reportBatches, totals }
  }

  async ledger(
    actor: AuthUser,
    query: {
      from?: string
      to?: string
      batchId?: string
      page?: string
      limit?: string
    },
  ): Promise<LedgerReport> {
    const scopeBatchIds = await this.getTaughtBatchIds(actor)
    const { from, toExclusive } = this.resolveMonthRange(query)
    const { page, limit, skip } = resolvePagination({
      page: query.page,
      limit: query.limit,
    })
    const take = skip + limit

    const batchIds =
      scopeBatchIds === null
        ? query.batchId
          ? [query.batchId]
          : null
        : query.batchId
          ? scopeBatchIds.includes(query.batchId)
            ? [query.batchId]
            : []
          : scopeBatchIds

    if (batchIds?.length === 0) {
      return {
        entries: [],
        meta: { page, limit, total: 0, totalPages: 1 },
      }
    }

    const paymentWhere: Prisma.PaymentWhereInput = {
      billingPeriod: {
        periodMonth: { gte: from, lt: toExclusive },
        ...(batchIds ? { enrollment: { batchId: { in: batchIds } } } : {}),
      },
    }

    const refundWhere: Prisma.RefundWhereInput = {
      payment: {
        billingPeriod: {
          periodMonth: { gte: from, lt: toExclusive },
          ...(batchIds ? { enrollment: { batchId: { in: batchIds } } } : {}),
        },
      },
    }

    const [payments, refunds, paymentTotal, refundTotal] = await Promise.all(
      [
        this.prisma.payment.findMany({
          where: paymentWhere,
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            transactionReference: true,
            proofUrl: true,
            verifiedAt: true,
            createdAt: true,
            billingPeriod: {
              select: {
                periodMonth: true,
                enrollment: {
                  select: {
                    batch: {
                      select: {
                        name: true,
                        course: { select: { title: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.refund.findMany({
          where: refundWhere,
          orderBy: { refundedAt: 'desc' },
          take,
          select: {
            id: true,
            amount: true,
            reason: true,
            refundedAt: true,
            payment: {
              select: {
                id: true,
                createdAt: true,
                billingPeriod: {
                  select: {
                    periodMonth: true,
                    enrollment: {
                      select: {
                        batch: {
                          select: {
                            name: true,
                            course: { select: { title: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.payment.count({ where: paymentWhere }),
        this.prisma.refund.count({ where: refundWhere }),
      ],
    )

    const toCreatedAt = (d: Date | null) => d ?? new Date(0)

    const paymentEntries: LedgerEntry[] = payments.map((p) => ({
      kind: 'payment',
      id: p.id,
      createdAt: toCreatedAt(p.verifiedAt) > new Date(0) ? p.verifiedAt! : p.createdAt,
      periodMonth: p.billingPeriod.periodMonth,
      courseTitle: p.billingPeriod.enrollment.batch.course.title,
      batchName: p.billingPeriod.enrollment.batch.name,
      amount: p.amount,
      status: p.status,
      method: p.method,
      transactionReference: p.transactionReference,
    }))

    const refundEntries: LedgerEntry[] = refunds.map((r) => ({
      kind: 'refund',
      id: r.id,
      createdAt: r.refundedAt,
      periodMonth: r.payment.billingPeriod.periodMonth,
      courseTitle: r.payment.billingPeriod.enrollment.batch.course.title,
      batchName: r.payment.billingPeriod.enrollment.batch.name,
      amount: r.amount.negated(),
      refundReason: r.reason,
    }))

    const merged = [...paymentEntries, ...refundEntries].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )

    const slice = merged.slice(skip, skip + limit)
    const total = paymentTotal + refundTotal

    return {
      entries: slice,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async auditLogs(
    actor: AuthUser,
    query: {
      actorUserId?: string
      action?: string
      targetType?: string
      targetId?: string
      page?: string
      limit?: string
    },
  ): Promise<Paginated<AuditLogEntry>> {
    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
    })

    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    const data: AuditLogEntry[] = rows.map((r) => ({
      id: r.id,
      actorUserId: r.actorUserId,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      createdAt: r.createdAt,
      details: r.details as Prisma.InputJsonValue | null,
    }))

    return buildPaginatedResult(data, total, page, limit)
  }

  async exportLedgerCsv(
    actor: AuthUser,
    query: { from?: string; to?: string; batchId?: string },
  ): Promise<string> {
    const { from, toExclusive } = this.resolveMonthRange(query)
    const batchIds =
      query.batchId ? [query.batchId] : null

    const paymentWhere: Prisma.PaymentWhereInput = {
      billingPeriod: {
        periodMonth: { gte: from, lt: toExclusive },
        ...(batchIds ? { enrollment: { batchId: { in: batchIds } } } : {}),
      },
    }

    const refundWhere: Prisma.RefundWhereInput = {
      payment: {
        billingPeriod: {
          periodMonth: { gte: from, lt: toExclusive },
          ...(batchIds ? { enrollment: { batchId: { in: batchIds } } } : {}),
        },
      },
    }

    // Note: export endpoint is admin-only; this keeps it simple and bounded.
    const payments = await this.prisma.payment.findMany({
      where: paymentWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        transactionReference: true,
        verifiedAt: true,
        createdAt: true,
        billingPeriod: {
          select: {
            periodMonth: true,
            enrollment: {
              select: {
                batch: {
                  select: {
                    name: true,
                    course: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    const refunds = await this.prisma.refund.findMany({
      where: refundWhere,
      orderBy: { refundedAt: 'desc' },
      select: {
        id: true,
        amount: true,
        reason: true,
        refundedAt: true,
        payment: {
          select: {
            billingPeriod: {
              select: {
                periodMonth: true,
                enrollment: {
                  select: {
                    batch: {
                      select: {
                        name: true,
                        course: { select: { title: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const entries = [
      ...payments.map((p) => ({
        kind: 'payment' as const,
        id: p.id,
        createdAt: p.verifiedAt ?? p.createdAt,
        periodMonth: p.billingPeriod.periodMonth,
        courseTitle: p.billingPeriod.enrollment.batch.course.title,
        batchName: p.billingPeriod.enrollment.batch.name,
        amount: p.amount,
        status: p.status,
        method: p.method,
        txRef: p.transactionReference,
        refundReason: '',
      })),
      ...refunds.map((r) => ({
        kind: 'refund' as const,
        id: r.id,
        createdAt: r.refundedAt,
        periodMonth: r.payment.billingPeriod.periodMonth,
        courseTitle: r.payment.billingPeriod.enrollment.batch.course.title,
        batchName: r.payment.billingPeriod.enrollment.batch.name,
        amount: r.amount.negated(),
        status: '',
        method: '',
        txRef: '',
        refundReason: r.reason,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const escape = (value: unknown): string => {
      const str = value === null || value === undefined ? '' : String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replaceAll('"', '""')}"`
      }
      return str
    }

    const header = [
      'periodMonth',
      'kind',
      'createdAt',
      'courseTitle',
      'batchName',
      'amount',
      'status',
      'method',
      'transactionReference',
      'refundReason',
    ]

    const csvRows = entries.map((e) =>
      [
        escape(e.periodMonth.toISOString()),
        e.kind,
        e.createdAt.toISOString(),
        escape(e.courseTitle),
        escape(e.batchName),
        escape(e.amount.toFixed(2)),
        escape(e.status),
        escape(e.method),
        escape(e.txRef ?? ''),
        escape(e.refundReason),
      ].join(','),
    )

    return [header.join(','), ...csvRows].join('\n')
  }
}

