import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentNotFoundException } from '../../common/exceptions/student-not-found.exception';

export interface OutstandingDue {
  billingPeriodId: string;
  courseTitle: string;
  batchName: string;
  periodMonth: string;
  amountOutstanding: Prisma.Decimal;
}

export interface GuestLookupResult {
  student: { fullName: string };
  outstandingDues: OutstandingDue[];
}

@Injectable()
export class GuestService {
  constructor(private readonly prisma: PrismaService) {}

  // GST-01 — public, matched against studentId, phone, or the linked
  // user's email; GST-04 — no match reads as 404, nothing else.
  async lookup(identifier: string): Promise<GuestLookupResult> {
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [
          { studentId: identifier },
          { phone: identifier },
          { user: { email: identifier } },
        ],
      },
    });
    if (!student) {
      throw new StudentNotFoundException();
    }

    // GST-02/GST-03 — every outstanding period listed on its own, never
    // merged into a total. `status: { not: 'paid' }` is exactly
    // "amountOwed > amountPaid" (BIL-09), safe to rely on now that
    // payments.service.ts persists the real status at write time rather
    // than only deriving it on read.
    const periods = await this.prisma.billingPeriod.findMany({
      where: { enrollment: { studentId: student.id }, status: { not: 'paid' } },
      include: {
        enrollment: { include: { batch: { include: { course: true } } } },
      },
      orderBy: { periodMonth: 'asc' },
    });

    // GST-05 — name and amounts only. doc 06 §8's own example additionally
    // echoes the human-readable studentId; that's excluded here as
    // "other profile data" the endpoint has no business repeating back to
    // an unauthenticated caller who may only have guessed a phone number.
    return {
      student: { fullName: student.fullName },
      outstandingDues: periods.map((period) => ({
        billingPeriodId: period.id,
        courseTitle: period.enrollment.batch.course.title,
        batchName: period.enrollment.batch.name,
        periodMonth: period.periodMonth.toISOString().slice(0, 7),
        amountOutstanding: period.amountOwed.minus(period.amountPaid),
      })),
    };
  }
}
