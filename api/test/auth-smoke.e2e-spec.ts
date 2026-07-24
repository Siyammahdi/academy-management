import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

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
  const email = `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let refreshToken: string;
  let accessToken: string;

  it('registers a new user + student, returns a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Smoke Test',
        phone: '01700000000',
      })
      .expect(201);
    const body = res.body as AuthResponseBody;

    expect(body.user.roles).toEqual(['student']);
    expect(body.user.studentId).toMatch(/^ANA-\d{4}$/);
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('rejects a duplicate registration with 409 EMAIL_ALREADY_REGISTERED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Smoke Test',
        phone: '01700000000',
      })
      .expect(409);
    const body = res.body as ErrorResponseBody;

    expect(body.error).toBe('EMAIL_ALREADY_REGISTERED');
    expect(body.timestamp).toBeDefined();
    expect(body.path).toBe('/api/v1/auth/register');
  });

  it('rejects an unknown field with 400 VALIDATION_ERROR (whitelist/forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123', notAField: 'x' })
      .expect(400);
    const body = res.body as ErrorResponseBody;

    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    const body = res.body as AuthResponseBody;

    expect(body.user.email).toBe(email);
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    const body = res.body as ErrorResponseBody;

    expect(body.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects /auth/me without a token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
    const body = res.body as ErrorResponseBody;

    expect(body.error).toBe('UNAUTHENTICATED');
  });

  it('returns the current user for /auth/me with a valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = res.body as UserBody;

    expect(body.email).toBe(email);
    expect(body.roles).toEqual(['student']);
  });

  it('rotates the refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    const body = res.body as AuthResponseBody;

    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).not.toBe(refreshToken);

    // old refresh token must now be dead (rotated, not reusable)
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    const replayBody = replay.body as ErrorResponseBody;
    expect(replayBody.error).toBe('INVALID_REFRESH_TOKEN');

    refreshToken = body.refreshToken;
  });

  it('logs out, after which the refresh token is dead', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('INVALID_REFRESH_TOKEN');
  });
});
