import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TargetResourceKind } from '../decorators/target-resource.decorator';

export interface ResolvedTarget {
  batchId: string;
  // Undefined for resource kinds with no owning student (e.g. 'homework') —
  // SelfApprovalGuard is never applied to those routes.
  studentId?: string;
}

/**
 * Walks from a route's `:id` param down to the batch/student it belongs to,
 * per the resource kind set by @TargetResource (doc 04 §4.1). Used by both
 * BatchScopeGuard and SelfApprovalGuard so the walk is defined once.
 */
export async function resolveTarget(
  prisma: PrismaService,
  kind: Exclude<TargetResourceKind, 'batch'>,
  id: string,
): Promise<ResolvedTarget> {
  try {
    switch (kind) {
      case 'payment': {
        const payment = await prisma.payment.findUniqueOrThrow({
          where: { id },
          include: { billingPeriod: { include: { enrollment: true } } },
        });
        return {
          batchId: payment.billingPeriod.enrollment.batchId,
          studentId: payment.billingPeriod.enrollment.studentId,
        };
      }
      case 'request': {
        const request = await prisma.request.findUniqueOrThrow({
          where: { id },
          include: { billingPeriod: { include: { enrollment: true } } },
        });
        return {
          batchId: request.billingPeriod.enrollment.batchId,
          studentId: request.billingPeriod.enrollment.studentId,
        };
      }
      case 'billingPeriod': {
        const period = await prisma.billingPeriod.findUniqueOrThrow({
          where: { id },
          include: { enrollment: true },
        });
        return {
          batchId: period.enrollment.batchId,
          studentId: period.enrollment.studentId,
        };
      }
      case 'enrollment': {
        const enrollment = await prisma.enrollment.findUniqueOrThrow({
          where: { id },
        });
        return {
          batchId: enrollment.batchId,
          studentId: enrollment.studentId,
        };
      }
      case 'homework': {
        const homework = await prisma.homework.findUniqueOrThrow({
          where: { id },
        });
        return { batchId: homework.batchId };
      }
      case 'recording': {
        const recording = await prisma.recordedClass.findUniqueOrThrow({
          where: { id },
        });
        return { batchId: recording.batchId };
      }
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Not found');
    }
    throw error;
  }
}
