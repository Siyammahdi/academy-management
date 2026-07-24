import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details: unknown;
}

interface LoginResponseBody {
  accessToken: string;
}

interface IdBody {
  id: string;
}

interface EnrollResponseBody {
  enrollment: { id: string };
  firstPeriod: { id: string; amountOwed: string };
}

interface GuestLookupResponseBody {
  student: Record<string, unknown>;
  outstandingDues: Array<{
    billingPeriodId: string;
    courseTitle: string;
    batchName: string;
    periodMonth: string;
    amountOutstanding: string;
  }>;
}

function futureIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function pastIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

describe('Guest payment (real Postgres)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

  async function createStaffUser(prefix: string): Promise<string> {
    const passwordHash = await argon2.hash('password123');
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const user = await prisma.user.create({ data: { email, passwordHash } });
    await prisma.userRole.create({ data: { userId: user.id, role: 'admin' } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as LoginResponseBody).accessToken;
  }

  // A unique phone per call — the shared helper used elsewhere in this
  // suite hardcodes one phone for every student, which would make a
  // phone-based guest lookup ambiguous against the accumulated test data.
  async function registerStudent(
    prefix: string,
  ): Promise<{ phone: string; email: string }> {
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const phone = `017${Date.now()}`.slice(0, 11);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Guest Flow Student',
        phone,
      })
      .expect(201);
    return { phone, email };
  }

  async function createCourseAndBatch(opts: {
    capacity: number;
    enrollmentOpensAt: string;
    enrollmentClosesAt: string;
    courseStartDate: string;
    enrollmentFee?: string;
    monthlyFee?: string;
  }): Promise<{ batchId: string }> {
    const courseRes = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Guest Test Course ${Date.now()}-${Math.random()}`,
        billingType: 'monthly',
        enrollmentFee: opts.enrollmentFee ?? '1000.00',
        monthlyFee: opts.monthlyFee ?? '500.00',
      })
      .expect(201);
    const courseId = (courseRes.body as IdBody).id;

    const batchRes = await request(app.getHttpServer())
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId,
        name: `Batch ${Date.now()}`,
        capacity: opts.capacity,
        courseStartDate: opts.courseStartDate,
        enrollmentOpensAt: opts.enrollmentOpensAt,
        enrollmentClosesAt: opts.enrollmentClosesAt,
      })
      .expect(201);
    return { batchId: (batchRes.body as IdBody).id };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    adminToken = await createStaffUser('guest-admin');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PAY-11: a guest payment requires guestName and guestPhone', () => {
    it('rejects guest manual payment missing guestName/guestPhone with a validation error', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
      });
      const student = await registerStudent('pay11-manual');

      // Register, then log in as the student to enroll (registerStudent
      // above doesn't return a token; re-derive one via login for enroll).
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: student.email, password: 'password123' })
        .expect(200);
      const studentToken = (loginRes.body as LoginResponseBody).accessToken;

      const enrollRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(201);
      const { firstPeriod } = enrollRes.body as EnrollResponseBody;

      const res = await request(app.getHttpServer())
        .post('/api/v1/guest/pay/manual')
        .send({
          billingPeriodId: firstPeriod.id,
          amount: firstPeriod.amountOwed,
          transactionReference: `GUEST-${Date.now()}`,
          proofUrl: 'https://example.com/proof.jpg',
          // guestName / guestPhone deliberately omitted
        })
        .expect(400);
      const body = res.body as ErrorResponseBody;
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('records paidBy=guest with guestName/guestPhone once both are supplied', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
      });
      const student = await registerStudent('pay11-full');
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: student.email, password: 'password123' })
        .expect(200);
      const studentToken = (loginRes.body as LoginResponseBody).accessToken;

      const enrollRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(201);
      const { firstPeriod } = enrollRes.body as EnrollResponseBody;

      const payRes = await request(app.getHttpServer())
        .post('/api/v1/guest/pay/manual')
        .send({
          billingPeriodId: firstPeriod.id,
          amount: firstPeriod.amountOwed,
          transactionReference: `GUEST-${Date.now()}`,
          proofUrl: 'https://example.com/proof.jpg',
          guestName: 'Abdullah Rahman Sr.',
          guestPhone: '01711111111',
        })
        .expect(201);
      const paymentId = (payRes.body as IdBody).id;

      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      expect(payment.paidBy).toBe('guest');
      expect(payment.guestName).toBe('Abdullah Rahman Sr.');
      expect(payment.guestPhone).toBe('01711111111');

      // BIL-09 persisted-status fix applies identically to guest payments.
      const period = await prisma.billingPeriod.findUniqueOrThrow({
        where: { id: firstPeriod.id },
      });
      expect(period.status).toBe('pending');
    });
  });

  describe('Full guest flow: lookup finds the student and every due separately', () => {
    it('looks up by phone and returns the enrolled period as an outstanding due', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
        enrollmentFee: '1000.00',
        monthlyFee: '500.00',
      });
      const student = await registerStudent('lookup-flow');
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: student.email, password: 'password123' })
        .expect(200);
      const studentToken = (loginRes.body as LoginResponseBody).accessToken;

      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(201);

      const lookupRes = await request(app.getHttpServer())
        .post('/api/v1/guest/lookup')
        .send({ identifier: student.phone })
        .expect(200);
      const body = lookupRes.body as GuestLookupResponseBody;

      expect(body.student).toEqual({ fullName: 'Guest Flow Student' });
      expect(body.outstandingDues).toHaveLength(1);
      expect(body.outstandingDues[0].amountOutstanding).toBe('1500.00');
    });
  });

  describe('GST-04: an unmatched identifier returns 404 with no other detail', () => {
    it('returns STUDENT_NOT_FOUND for a nonexistent identifier', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/guest/lookup')
        .send({ identifier: 'no-such-student-ever' })
        .expect(404);
      const body = res.body as ErrorResponseBody;
      expect(body.error).toBe('STUDENT_NOT_FOUND');
    });
  });
});
