import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleName } from '@prisma/client';

/**
 * The authenticated principal, populated by JwtAuthGuard.
 *
 * `studentId` is the internal `Student.id` (cuid) — the FK value that
 * `Enrollment.studentId` points to — NOT the human-readable `Student.studentId`
 * code (e.g. "ANA-0042") shown to users. Guards compare against this field.
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: RoleName[];
  studentId: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
