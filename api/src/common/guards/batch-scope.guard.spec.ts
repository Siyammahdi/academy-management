import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BatchScopeGuard } from './batch-scope.guard';
import { BatchNotAssignedException } from '../exceptions/batch-not-assigned.exception';
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

function createGuard(findUnique: jest.Mock): BatchScopeGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue('batch'),
  } as unknown as Reflector;
  const prisma = { batchTeacher: { findUnique } } as unknown as PrismaService;
  return new BatchScopeGuard(prisma, reflector);
}

describe('BatchScopeGuard', () => {
  describe('RBAC-02: a teacher receives 403 on an unassigned batch', () => {
    it('rejects when no BatchTeacher row exists for this user and batch', async () => {
      const findUnique = jest.fn().mockResolvedValue(null);
      const guard = createGuard(findUnique);
      const context = createContext(
        { id: 'mgr1', email: 'm@x.com', roles: ['teacher'], studentId: null },
        { id: 'batch1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        BatchNotAssignedException,
      );
      expect(findUnique).toHaveBeenCalledWith({
        where: { batchId_userId: { batchId: 'batch1', userId: 'mgr1' } },
      });
    });
  });

  it('allows a teacher assigned to the batch', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'bm1' });
    const guard = createGuard(findUnique);
    const context = createContext(
      { id: 'mgr1', email: 'm@x.com', roles: ['teacher'], studentId: null },
      { id: 'batch1' },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('lets an admin bypass batch scope entirely, without querying assignments', async () => {
    const findUnique = jest.fn();
    const guard = createGuard(findUnique);
    const context = createContext(
      { id: 'admin1', email: 'a@x.com', roles: ['admin'], studentId: null },
      { id: 'batch1' },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
