import { BadRequestException, Injectable } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserSummary {
  id: string;
  email: string;
  roles: RoleName[];
}

function isRoleName(value: string): value is RoleName {
  return (Object.values(RoleName) as string[]).includes(value);
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Backs the "assign manager" picker on /admin/batches — there is no
  // dedicated user-search surface in doc 06, so this is scoped to exactly
  // that need: find users holding a given role, admin-only.
  async list(role?: string): Promise<UserSummary[]> {
    if (role !== undefined && !isRoleName(role)) {
      throw new BadRequestException(`Invalid role filter: ${role}`);
    }

    const users = await this.prisma.user.findMany({
      where: role ? { roles: { some: { role } } } : undefined,
      include: { roles: true },
      orderBy: { email: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    }));
  }
}
