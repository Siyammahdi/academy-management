import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SelfApprovalGuard } from './self-approval.guard';
import { SelfApprovalException } from '../exceptions/self-approval.exception';
import { AuthUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

function createContext(
  user: AuthUser,
  params: Record<string, string>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function createGuard(paymentRecord: unknown): {
  guard: SelfApprovalGuard;
  findUniqueOrThrow: jest.Mock;
} {
  const findUniqueOrThrow = jest.fn().mockResolvedValue(paymentRecord);
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue('payment'),
  } as unknown as Reflector;
  const prisma = {
    payment: { findUniqueOrThrow },
  } as unknown as PrismaService;
  return { guard: new SelfApprovalGuard(prisma, reflector), findUniqueOrThrow };
}

describe('SelfApprovalGuard', () => {
  describe('RBAC-03: a teacher receives 403 verifying a payment on their own enrollment, even in a batch they manage', () => {
    it('rejects when the target payment belongs to the teacher’s own Student profile', async () => {
      const { guard } = createGuard({
        billingPeriod: {
          enrollment: { batchId: 'batch1', studentId: 'student-mgr' },
        },
      });
      // This teacher legitimately manages batch1 (irrelevant here — doc 04 §3.2:
      // the block applies even when the teacher is assigned to the batch).
      const teacherActingOnOwnEnrollment: AuthUser = {
        id: 'mgr1',
        email: 'm@x.com',
        roles: ['teacher', 'student'],
        studentId: 'student-mgr',
      };
      const context = createContext(teacherActingOnOwnEnrollment, {
        id: 'payment1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        SelfApprovalException,
      );
    });
  });

  it("allows a teacher verifying a payment on a different student's enrollment", async () => {
    const { guard } = createGuard({
      billingPeriod: {
        enrollment: { batchId: 'batch1', studentId: 'student-other' },
      },
    });
    const teacher: AuthUser = {
      id: 'mgr1',
      email: 'm@x.com',
      roles: ['teacher'],
      studentId: 'student-mgr',
    };
    const context = createContext(teacher, { id: 'payment1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('lets an admin bypass self-approval entirely, even on their own enrollment', async () => {
    const { guard, findUniqueOrThrow } = createGuard({
      billingPeriod: {
        enrollment: { batchId: 'batch1', studentId: 'admin-student' },
      },
    });
    const admin: AuthUser = {
      id: 'admin1',
      email: 'a@x.com',
      roles: ['admin'],
      studentId: 'admin-student',
    };
    const context = createContext(admin, { id: 'payment1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('allows a plain teacher with no linked Student profile', async () => {
    const { guard } = createGuard({
      billingPeriod: {
        enrollment: { batchId: 'batch1', studentId: 'student-other' },
      },
    });
    const teacher: AuthUser = {
      id: 'mgr1',
      email: 'm@x.com',
      roles: ['teacher'],
      studentId: null,
    };
    const context = createContext(teacher, { id: 'payment1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
