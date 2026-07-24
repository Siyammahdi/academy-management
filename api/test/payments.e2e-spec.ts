import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  computeVerifySign,
  SslcommerzWebhookPayload,
} from '../src/modules/gateway/gateway.service';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
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

function futureIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function pastIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

describe('Payments (real Postgres)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

  async function createStaffUser(
    prefix: string,
    role: 'admin' | 'manager',
  ): Promise<string> {
    const passwordHash = await argon2.hash('password123');
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const user = await prisma.user.create({ data: { email, passwordHash } });
    await prisma.userRole.create({ data: { userId: user.id, role } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as LoginResponseBody).accessToken;
  }

  async function registerStudent(
    prefix: string,
  ): Promise<{ accessToken: string; studentDbId: string; userId: string }> {
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password123',
        fullName: 'Test Student',
        phone: '01700000000',
      })
      .expect(201);
    const accessToken = (res.body as LoginResponseBody).accessToken;

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { student: true },
    });
    if (!user.student) {
      throw new Error('expected register to create a linked Student');
    }
    return { accessToken, studentDbId: user.student.id, userId: user.id };
  }

  async function createCourseAndBatch(opts: {
    capacity: number;
    enrollmentOpensAt: string;
    enrollmentClosesAt: string;
    courseStartDate: string;
    enrollmentFee?: string;
    monthlyFee?: string;
  }): Promise<{ courseId: string; batchId: string }> {
    const courseRes = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Payments Test Course ${Date.now()}-${Math.random()}`,
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
    const batchId = (batchRes.body as IdBody).id;

    return { courseId, batchId };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    adminToken = await createStaffUser('pay-admin', 'admin');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PAY-04: a duplicate webhook callback does not double-credit', () => {
    it('settles a gateway payment exactly once across two identical IPN deliveries', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
        enrollmentFee: '1000.00',
        monthlyFee: '500.00',
      });
      const student = await registerStudent('webhook-dupe');

      const enrollRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(201);
      const { firstPeriod } = enrollRes.body as EnrollResponseBody;

      // A gateway payment is normally created by payGateway() after a real
      // SSLCommerz session-init call; here we create the row directly since
      // the webhook (PAY-03/PAY-04) is what's under test, not session init.
      const transactionReference = `GW-dupe-${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          billingPeriodId: firstPeriod.id,
          amount: firstPeriod.amountOwed,
          method: 'gateway',
          status: 'pending',
          paidBy: 'student',
          transactionReference,
        },
      });

      const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
      if (!storePassword) {
        throw new Error('SSLCOMMERZ_STORE_PASSWORD must be set for this test');
      }

      const payload: SslcommerzWebhookPayload = {
        tran_id: transactionReference,
        status: 'VALID',
        amount: firstPeriod.amountOwed,
        verify_key: 'tran_id,status,amount,store_passwd',
      };
      payload.verify_sign =
        computeVerifySign(payload, storePassword) ?? undefined;

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sslcommerz')
        .send(payload)
        .expect(200);

      const afterFirst = await prisma.billingPeriod.findUniqueOrThrow({
        where: { id: firstPeriod.id },
      });
      expect(afterFirst.amountPaid.toFixed(2)).toBe(firstPeriod.amountOwed);

      // A second, identical delivery — SSLCommerz's IPN is not guaranteed
      // exactly-once. It must ack 200 without crediting the period again.
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/sslcommerz')
        .send(payload)
        .expect(200);

      const afterSecond = await prisma.billingPeriod.findUniqueOrThrow({
        where: { id: firstPeriod.id },
      });
      expect(afterSecond.amountPaid.toFixed(2)).toBe(firstPeriod.amountOwed);

      const paymentCount = await prisma.payment.count({
        where: { transactionReference },
      });
      expect(paymentCount).toBe(1);

      const settledPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      expect(settledPayment.status).toBe('verified');
    });

    it('rejects a webhook with an invalid signature', async () => {
      const payload: SslcommerzWebhookPayload = {
        tran_id: 'GW-nonexistent',
        status: 'VALID',
        amount: '500.00',
        verify_key: 'tran_id,status,amount,store_passwd',
        verify_sign: 'not-a-real-signature',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/webhooks/sslcommerz')
        .send(payload)
        .expect(401);
      expect((res.body as ErrorResponseBody).error).toBe(
        'INVALID_WEBHOOK_SIGNATURE',
      );
    });
  });

  describe('BIL-09: the period status column is persisted, not just corrected on read', () => {
    it('submitting a manual payment sets the period to pending in the database; rejecting it returns the period to unpaid', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
        enrollmentFee: '1000.00',
        monthlyFee: '500.00',
      });
      const student = await registerStudent('bil09-status');

      const enrollRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(201);
      const { firstPeriod } = enrollRes.body as EnrollResponseBody;

      const beforePayment = await prisma.billingPeriod.findUniqueOrThrow({
        where: { id: firstPeriod.id },
      });
      expect(beforePayment.status).toBe('unpaid');

      const payRes = await request(app.getHttpServer())
        .post(`/api/v1/billing-periods/${firstPeriod.id}/pay/manual`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({
          amount: firstPeriod.amountOwed,
          transactionReference: `MANUAL-BIL09-${Date.now()}`,
          proofUrl: 'https://example.com/proof.jpg',
        })
        .expect(201);
      const paymentId = (payRes.body as IdBody).id;

      // PEN-05 — the penalty job reads this column directly, never through
      // an API response, so the fix has to live in the write path.
      const afterSubmit = await prisma.billingPeriod.findUniqueOrThrow({
        where: { id: firstPeriod.id },
      });
      expect(afterSubmit.status).toBe('pending');

      await request(app.getHttpServer())
        .post(`/api/v1/payments/${paymentId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);

      const afterReject = await prisma.billingPeriod.findUniqueOrThrow({
        where: { id: firstPeriod.id },
      });
      expect(afterReject.status).toBe('unpaid');
    });
  });

  describe('RBAC-03: a manager cannot verify or reject their own enrollment', () => {
    it('returns 403 SELF_APPROVAL_FORBIDDEN even in a batch they manage', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
        enrollmentFee: '1000.00',
        monthlyFee: '500.00',
      });

      // One account, two hats: a student profile AND a manager role
      // (RBAC-01 — a person may be both). Roles are re-read from the DB on
      // every request (see JwtStrategy), so granting 'manager' after
      // registration takes effect immediately without a fresh login.
      const dualHat = await registerStudent('dual-hat');
      await prisma.userRole.create({
        data: { userId: dualHat.userId, role: 'manager' },
      });

      const enrollRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${dualHat.accessToken}`)
        .send({})
        .expect(201);
      const { firstPeriod } = enrollRes.body as EnrollResponseBody;

      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/managers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: dualHat.userId })
        .expect(201);

      const payRes = await request(app.getHttpServer())
        .post(`/api/v1/billing-periods/${firstPeriod.id}/pay/manual`)
        .set('Authorization', `Bearer ${dualHat.accessToken}`)
        .send({
          amount: firstPeriod.amountOwed,
          transactionReference: `MANUAL-${Date.now()}`,
          proofUrl: 'https://example.com/proof.jpg',
        })
        .expect(201);
      const paymentId = (payRes.body as IdBody).id;

      const verifyRes = await request(app.getHttpServer())
        .post(`/api/v1/payments/${paymentId}/verify`)
        .set('Authorization', `Bearer ${dualHat.accessToken}`)
        .send({})
        .expect(403);
      expect((verifyRes.body as ErrorResponseBody).error).toBe(
        'SELF_APPROVAL_FORBIDDEN',
      );

      const rejectRes = await request(app.getHttpServer())
        .post(`/api/v1/payments/${paymentId}/reject`)
        .set('Authorization', `Bearer ${dualHat.accessToken}`)
        .send({})
        .expect(403);
      expect((rejectRes.body as ErrorResponseBody).error).toBe(
        'SELF_APPROVAL_FORBIDDEN',
      );

      // Confirm it wasn't silently settled by either blocked attempt.
      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      expect(payment.status).toBe('pending');
    });
  });
});
