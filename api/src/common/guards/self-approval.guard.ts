import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import {
  TARGET_RESOURCE_KEY,
  TargetResourceKind,
} from '../decorators/target-resource.decorator';
import { SelfApprovalException } from '../exceptions/self-approval.exception';
import { resolveTarget } from './target-resolver.util';

/// doc 04 §3.2 (RBAC-03) — a manager must never approve an action on their
/// own enrollment, even in a batch they legitimately manage. Admins bypass
/// (doc 04 §4.2).
@Injectable()
export class SelfApprovalGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthUser; params: Record<string, string> }>();
    const { user, params } = request;

    if (user.roles.includes('admin')) {
      return true;
    }

    if (user.studentId === null) {
      return true;
    }

    const kind =
      this.reflector.getAllAndOverride<TargetResourceKind>(
        TARGET_RESOURCE_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? 'enrollment';

    if (kind === 'batch') {
      return true;
    }

    const { studentId } = await resolveTarget(this.prisma, kind, params.id);

    // RBAC-03 — refused even though the manager legitimately manages this
    // batch (doc 04 §3.2). Not a 404 either way: never leak existence.
    if (studentId === user.studentId) {
      throw new SelfApprovalException();
    }

    return true;
  }
}
