import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { UnauthenticatedException } from '../../../common/exceptions/unauthenticated.exception';
import { JWT_ACCESS_SECRET } from '../jwt.config';

interface AccessTokenPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true, student: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthenticatedException();
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
      studentId: user.student?.id ?? null,
    };
  }
}
