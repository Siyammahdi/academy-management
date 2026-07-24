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
}

interface LoginResponseBody {
  accessToken: string;
}

interface IdBody {
  id: string;
}

interface EnrollResponseBody {
  enrollment: { id: string; status: string };
  firstPeriod: {
    id: string;
    periodMonth: string;
    amountOwed: string;
    dueDate: string;
  };
}

interface EnrollmentListBody {
  data: Array<{ id: string; status: string }>;
}

function futureIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function pastIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

describe('Enrollment (real Postgres)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;

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
  ): Promise<{ accessToken: string; studentDbId: string }> {
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
    return { accessToken, studentDbId: user.student.id };
  }

  async function createCourseAndBatch(opts: {
    capacity: number;
    entryDiscountPercent?: number;
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
        title: `Enrollment Test Course ${Date.now()}-${Math.random()}`,
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
        entryDiscountPercent: opts.entryDiscountPercent,
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

    adminToken = await createStaffUser('enr-admin', 'admin');
    managerToken = await createStaffUser('enr-manager', 'manager');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ENR-04: capacity checks are concurrency-safe', () => {
    it('exactly one of two simultaneous enrollments succeeds on the last seat', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 1,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
      });

      const studentA = await registerStudent('race-a');
      const studentB = await registerStudent('race-b');

      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/batches/${batchId}/enroll`)
          .set('Authorization', `Bearer ${studentA.accessToken}`)
          .send({}),
        request(app.getHttpServer())
          .post(`/api/v1/batches/${batchId}/enroll`)
          .set('Authorization', `Bearer ${studentB.accessToken}`)
          .send({}),
      ]);

      const statuses = [resA.status, resB.status].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409]);

      const failed = resA.status === 409 ? resA : resB;
      expect((failed.body as ErrorResponseBody).error).toBe('BATCH_FULL');

      const enrollmentCount = await prisma.enrollment.count({
        where: { batchId },
      });
      expect(enrollmentCount).toBe(1);
    });
  });

  describe('ENR-03: enrollment is refused at capacity', () => {
    it('returns 409 BATCH_FULL with the exact user-facing message', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 1,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
      });
      const first = await registerStudent('full-1');
      const second = await registerStudent('full-2');

      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${first.accessToken}`)
        .send({})
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${second.accessToken}`)
        .send({})
        .expect(409);
      const body = res.body as ErrorResponseBody;
      expect(body.error).toBe('BATCH_FULL');
      expect(body.message).toBe('Full — try next batch.');
    });
  });

  describe('ENR-10: a student cannot hold two enrollments in the same batch', () => {
    it('returns 409 ALREADY_ENROLLED on a duplicate attempt', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
      });
      const student = await registerStudent('dupe');

      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(409);
      expect((res.body as ErrorResponseBody).error).toBe('ALREADY_ENROLLED');
    });
  });

  describe('ENR-05 / BIL-03: first billing period amount', () => {
    it('with a 100% discount, amountOwed is just the monthly fee', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        entryDiscountPercent: 100,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: '2027-01-15T00:00:00.000Z',
        enrollmentFee: '1000.00',
        monthlyFee: '500.00',
      });
      const student = await registerStudent('discount-100');

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(201);
      const body = res.body as EnrollResponseBody;

      expect(body.firstPeriod.amountOwed).toBe('500.00'); // 0 entry + 500 monthly
      expect(body.firstPeriod.periodMonth).toBe('2027-01');
    });

    it('with no discount, amountOwed is the full entry fee plus the monthly fee', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        entryDiscountPercent: 0,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: '2027-02-10T00:00:00.000Z',
        enrollmentFee: '1000.00',
        monthlyFee: '500.00',
      });
      const student = await registerStudent('discount-0');

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(201);
      const body = res.body as EnrollResponseBody;

      expect(body.firstPeriod.amountOwed).toBe('1500.00'); // 1000 entry + 500 monthly
      expect(body.firstPeriod.periodMonth).toBe('2027-02');
    });
  });

  describe('ENR-02: self-enrollment is refused outside the enrollment window', () => {
    it('returns 403 ENROLLMENT_WINDOW_CLOSED', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(60),
        enrollmentClosesAt: pastIso(30),
        courseStartDate: futureIso(10),
      });
      const student = await registerStudent('window-closed');

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(403);
      expect((res.body as ErrorResponseBody).error).toBe(
        'ENROLLMENT_WINDOW_CLOSED',
      );
    });
  });

  describe('ENR-08: late joiners are admin-only and bypass the window', () => {
    it('rejects a manager with 403 INSUFFICIENT_PERMISSIONS', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(60),
        enrollmentClosesAt: pastIso(30),
        courseStartDate: futureIso(10),
      });
      const student = await registerStudent('late-target-1');

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/late-joiner`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ studentId: student.studentDbId })
        .expect(403);
      expect((res.body as ErrorResponseBody).error).toBe(
        'INSUFFICIENT_PERMISSIONS',
      );
    });

    it('allows an admin to add a late joiner despite the closed window', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(60),
        enrollmentClosesAt: pastIso(30),
        courseStartDate: futureIso(10),
      });
      const student = await registerStudent('late-target-2');

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/late-joiner`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentId: student.studentDbId })
        .expect(201);
      expect((res.body as EnrollResponseBody).enrollment.status).toBe(
        'pending',
      );
    });
  });

  describe('withdraw + /me/enrollments', () => {
    it('an admin can withdraw an enrollment, reflected in the student’s own list', async () => {
      const { batchId } = await createCourseAndBatch({
        capacity: 30,
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
        courseStartDate: futureIso(45),
      });
      const student = await registerStudent('withdraw-test');

      const enrollRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/enroll`)
        .set('Authorization', `Bearer ${student.accessToken}`)
        .send({})
        .expect(201);
      const enrollmentId = (enrollRes.body as EnrollResponseBody).enrollment.id;

      await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentId}/withdraw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/me/enrollments')
        .set('Authorization', `Bearer ${student.accessToken}`)
        .expect(200);
      const body = listRes.body as EnrollmentListBody;
      const found = body.data.find((e) => e.id === enrollmentId);
      expect(found?.status).toBe('withdrawn');
    });
  });
});
