import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import {
  TARGET_RESOURCE_KEY,
  TargetResourceKind,
} from '../decorators/target-resource.decorator';
import { BatchNotAssignedException } from '../exceptions/batch-not-assigned.exception';
import { resolveTarget } from './target-resolver.util';

/// doc 04 §3.1 / §4.1 (RBAC-02) — a manager's authority is scoped to batches
/// they are assigned to. Admins bypass (doc 04 §4.2).
@Injectable()
export class BatchScopeGuard implements CanActivate {
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

    const kind = this.reflector.getAllAndOverride<TargetResourceKind>(
      TARGET_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const batchId =
      kind === undefined || kind === 'batch'
        ? (params.batchId ?? params.id)
        : (await resolveTarget(this.prisma, kind, params.id)).batchId;

    const assignment = await this.prisma.batchManager.findUnique({
      where: { batchId_userId: { batchId, userId: user.id } },
    });

    if (!assignment) {
      throw new BatchNotAssignedException();
    }

    return true;
  }
}
