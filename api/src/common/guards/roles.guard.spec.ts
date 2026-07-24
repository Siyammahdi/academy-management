import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { InsufficientPermissionsException } from '../exceptions/insufficient-permissions.exception';
import { AuthUser } from '../decorators/current-user.decorator';

function createContext(user: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params: {} }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function createGuard(requiredRoles: RoleName[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  describe('RBAC-01: a user holding both manager and student can act in both capacities', () => {
    it('allows a dual-role user on a manager-only route', () => {
      const guard = createGuard(['manager', 'admin']);
      const context = createContext({
        id: 'u1',
        email: 'm@x.com',
        roles: ['manager', 'student'],
        studentId: 's1',
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('allows the same dual-role user on a student-only route', () => {
      const guard = createGuard(['student']);
      const context = createContext({
        id: 'u1',
        email: 'm@x.com',
        roles: ['manager', 'student'],
        studentId: 's1',
      });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('RBAC-05: a manager receives 403 creating a course or batch', () => {
    it('rejects a manager on an admin-only route', () => {
      const guard = createGuard(['admin']);
      const context = createContext({
        id: 'u1',
        email: 'm@x.com',
        roles: ['manager'],
        studentId: null,
      });
      expect(() => guard.canActivate(context)).toThrow(
        InsufficientPermissionsException,
      );
    });
  });

  it('allows any authenticated user when the route requires no specific role', () => {
    const guard = createGuard(undefined);
    const context = createContext({
      id: 'u1',
      email: 'x@x.com',
      roles: [],
      studentId: null,
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
