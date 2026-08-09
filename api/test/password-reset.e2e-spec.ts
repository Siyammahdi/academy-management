import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/modules/email/email.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { MoneySerializationInterceptor } from '../src/common/interceptors/money-serialization.interceptor';

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('Password reset (real Postgres)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let emailService: {
    sendPasswordResetEmail: jest.Mock;
    sendVerificationEmail: jest.Mock;
  };

  const email = `reset-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const originalPassword = 'password123';
  const newPassword = 'brand-new-password';

  beforeAll(async () => {
    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new MoneySerializationInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  let userId: string;
  let refreshToken: string;

  it('creates a verified user and establishes a refresh session', async () => {
    const passwordHash = await argon2.hash(originalPassword);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'Reset Tester',
        phone: '01700000001',
        isEmailVerified: true,
        roles: { create: { role: 'student' } },
        student: {
          create: {
            studentId: `RST-${Date.now().toString(36).slice(-6).toUpperCase()}`,
            fullName: 'Reset Tester',
            phone: '01700000001',
          },
        },
      },
    });
    userId = user.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: originalPassword })
      .expect(200);
    const body = login.body as AuthResponseBody;
    refreshToken = body.refreshToken;
    expect(typeof refreshToken).toBe('string');
  });

  it('forgot-password returns 200 for an unknown email without enqueueing', async () => {
    emailService.sendPasswordResetEmail.mockClear();
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: `missing-${Date.now()}@example.com` })
      .expect(200);

    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('forgot-password returns 200 for a registered email and enqueues a reset mail', async () => {
    emailService.sendPasswordResetEmail.mockClear();
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(200);

    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        resetUrl: expect.stringContaining('/reset-password?token='),
        expiryMinutes: 30,
      }),
    );
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId, usedAt: null },
    });
    expect(tokens.length).toBe(1);
  });

  it('a second forgot-password invalidates the previous unused token', async () => {
    emailService.sendPasswordResetEmail.mockClear();
    const before = await prisma.passwordResetToken.findMany({
      where: { userId, usedAt: null },
    });
    expect(before.length).toBe(1);
    const previousHash = before[0].tokenHash;

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(200);

    const previous = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: previousHash },
    });
    expect(previous.usedAt).not.toBeNull();

    const active = await prisma.passwordResetToken.findMany({
      where: { userId, usedAt: null },
    });
    expect(active.length).toBe(1);
    expect(active[0].tokenHash).not.toBe(previousHash);
  });

  it('rejects an expired reset token with RESET_TOKEN_EXPIRED', async () => {
    const raw = `expired-${Date.now()}`;
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: raw, newPassword })
      .expect(400);

    expect((res.body as ErrorResponseBody).error).toBe('RESET_TOKEN_EXPIRED');
  });

  it('rejects a used reset token with INVALID_RESET_TOKEN', async () => {
    const raw = `used-${Date.now()}`;
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 30 * 60_000),
        usedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: raw, newPassword })
      .expect(400);

    expect((res.body as ErrorResponseBody).error).toBe('INVALID_RESET_TOKEN');
  });

  it('resets the password, marks the token used, and revokes all refresh tokens', async () => {
    const raw = `valid-${Date.now()}`;
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });

    const activeBefore = await prisma.refreshToken.count({
      where: { userId, revokedAt: null },
    });
    expect(activeBefore).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: raw, newPassword })
      .expect(200);

    const tokenRow = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(raw) },
    });
    expect(tokenRow.usedAt).not.toBeNull();

    const activeAfter = await prisma.refreshToken.count({
      where: { userId, revokedAt: null },
    });
    expect(activeAfter).toBe(0);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await argon2.verify(user.passwordHash, newPassword)).toBe(true);
    expect(await argon2.verify(user.passwordHash, originalPassword)).toBe(
      false,
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
  });
});
