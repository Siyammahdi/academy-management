import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Prisma.InputJsonValue;
}

/**
 * The write side of the append-only audit log (AUD-01/02/03). Accepts either
 * the shared PrismaService or a `tx` from an in-flight $transaction, so a
 * call site can log atomically alongside the mutation it's documenting.
 */
export interface AuditWriter {
  auditLog: {
    create: (args: { data: AuditEntry }) => Promise<unknown>;
  };
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    entry: AuditEntry,
    db: AuditWriter = this.prisma,
  ): Promise<void> {
    await db.auditLog.create({ data: entry });
  }
}
