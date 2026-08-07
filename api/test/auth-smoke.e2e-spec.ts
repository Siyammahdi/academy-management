import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface UserBody {
  id: string;
  email: string;
  roles: string[];
  studentId: string | null;
}

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  user: UserBody;
}

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details: unknown;
  timestamp: string;
  path: string;
}

describe('Auth flow smoke test (real Postgres)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  let refreshToken: string;
  let accessToken: string;

  it('registers a new user without issuing a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        fullName: 'Smoke Test',
        phone: '01700000000',
      })
      .expect(201);
    const body = res.body as {
      email: string;
      requiresEmailVerification: boolean;
      message: string;
    };

    expect(body.email).toBe(email.toLowerCase());
    expect(body.requiresEmailVerification).toBe(true);
    expect(body).not.toHaveProperty('accessToken');
  });

  it('rejects a duplicate registration with 409 EMAIL_ALREADY_REGISTERED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        fullName: 'Smoke Test',
        phone: '01700000000',
      })
      .expect(409);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('blocks login until the email is verified', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(403);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('EMAIL_NOT_VERIFIED');
  });

  it('verifies email with the stored OTP and then allows login', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    // Bypass email: plant a known OTP hash for the smoke path.
    const code = '654321';
    const codeHash = createHash('sha256').update(code).digest('hex');
    await prisma.otpCode.deleteMany({ where: { userId: user.id } });
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        type: 'EMAIL',
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60_000),
        attempts: 0,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email, code })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const body = login.body as AuthResponseBody;
    expect(body.user.roles).toEqual(['student']);
    expect(body.user.studentId).toMatch(/^ANA-\d{4}$/);
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('returns the current user from GET /auth/me', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = res.body as UserBody;
    expect(body.email).toBe(email.toLowerCase());
  });

  it('rotates the refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    const body = res.body as AuthResponseBody;
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    refreshToken = body.refreshToken;
    accessToken = body.accessToken;
  });

  it('logs out and rejects the old refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
