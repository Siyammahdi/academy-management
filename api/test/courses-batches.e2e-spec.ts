import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface CourseBody {
  id: string;
  enrollmentFee: string;
  monthlyFee: string;
}

interface BatchBody {
  id: string;
  courseId: string;
  enrollmentFee: string;
  monthlyFee: string;
  status: string;
}

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
}

interface LoginResponseBody {
  accessToken: string;
}

describe('Courses/Batches (real Postgres)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;

  async function createUserWithRole(
    email: string,
    role: 'admin' | 'manager',
  ): Promise<string> {
    const passwordHash = await argon2.hash('password123');
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });
    await prisma.userRole.create({ data: { userId: user.id, role } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return (res.body as LoginResponseBody).accessToken;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    adminToken = await createUserWithRole(
      `admin-${suffix}@example.com`,
      'admin',
    );
    managerToken = await createUserWithRole(
      `manager-${suffix}@example.com`,
      'manager',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('FEE-02 / FEE-03: batch fee snapshot', () => {
    let courseId: string;
    let batchId: string;

    it('FEE-02: a created batch carries the course fees as its own values', async () => {
      const courseRes = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Fee Snapshot Course ${Date.now()}`,
          billingType: 'monthly',
          enrollmentFee: '1000.00',
          monthlyFee: '500.00',
        })
        .expect(201);
      courseId = (courseRes.body as CourseBody).id;

      const batchRes = await request(app.getHttpServer())
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId,
          name: `Batch ${Date.now()}`,
          capacity: 30,
          courseStartDate: '2027-01-01T00:00:00.000Z',
          enrollmentOpensAt: '2026-12-01T00:00:00.000Z',
          enrollmentClosesAt: '2026-12-31T00:00:00.000Z',
        })
        .expect(201);
      const batch = batchRes.body as BatchBody;
      batchId = batch.id;

      expect(batch.enrollmentFee).toBe('1000.00');
      expect(batch.monthlyFee).toBe('500.00');
    });

    it('rejects a client-supplied fee on batch creation (doc 06 §13)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId,
          name: 'Should be rejected',
          capacity: 30,
          enrollmentFee: '1.00',
          courseStartDate: '2027-01-01T00:00:00.000Z',
          enrollmentOpensAt: '2026-12-01T00:00:00.000Z',
          enrollmentClosesAt: '2026-12-31T00:00:00.000Z',
        })
        .expect(400);
      expect((res.body as ErrorResponseBody).error).toBe('VALIDATION_ERROR');
    });

    it('FEE-03: editing the course fee leaves the existing batch untouched', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollmentFee: '2000.00', monthlyFee: '800.00' })
        .expect(200);

      const batchRes = await request(app.getHttpServer())
        .get(`/api/v1/batches/${batchId}`)
        .expect(200);
      const batch = batchRes.body as BatchBody;

      expect(batch.enrollmentFee).toBe('1000.00');
      expect(batch.monthlyFee).toBe('500.00');
    });

    it('AUD-04: course_created, course_updated, and batch_created were logged', async () => {
      const [courseCreated, courseUpdated, batchCreated] = await Promise.all([
        prisma.auditLog.findFirst({
          where: { action: 'course_created', targetId: courseId },
        }),
        prisma.auditLog.findFirst({
          where: { action: 'course_updated', targetId: courseId },
        }),
        prisma.auditLog.findFirst({
          where: { action: 'batch_created', targetId: batchId },
        }),
      ]);

      expect(courseCreated).not.toBeNull();
      expect(courseUpdated).not.toBeNull();
      expect(batchCreated).not.toBeNull();
    });

    it('BIL-11 / AUD-04: changing batch status to completed is recorded and audited', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' })
        .expect(201);
      expect((res.body as BatchBody).status).toBe('completed');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'batch_status_changed', targetId: batchId },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe('RBAC-05: a manager receives 403 creating a course or a batch', () => {
    it('rejects a manager creating a course', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Should be forbidden',
          billingType: 'monthly',
          enrollmentFee: '1000.00',
          monthlyFee: '500.00',
        })
        .expect(403);
      expect((res.body as ErrorResponseBody).error).toBe(
        'INSUFFICIENT_PERMISSIONS',
      );
    });

    it('rejects a manager creating a batch', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          courseId: 'irrelevant',
          name: 'Should be forbidden',
          capacity: 30,
          courseStartDate: '2027-01-01T00:00:00.000Z',
          enrollmentOpensAt: '2026-12-01T00:00:00.000Z',
          enrollmentClosesAt: '2026-12-31T00:00:00.000Z',
        })
        .expect(403);
      expect((res.body as ErrorResponseBody).error).toBe(
        'INSUFFICIENT_PERMISSIONS',
      );
    });
  });

  describe('Class links', () => {
    async function createCourseAndBatch(): Promise<string> {
      const courseRes = await request(app.getHttpServer())
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Class Link Course ${Date.now()}-${Math.random()}`,
          billingType: 'monthly',
          enrollmentFee: '1000.00',
          monthlyFee: '500.00',
        })
        .expect(201);
      const courseId = (courseRes.body as CourseBody).id;

      const batchRes = await request(app.getHttpServer())
        .post('/api/v1/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId,
          name: `Class Link Batch ${Date.now()}`,
          capacity: 30,
          courseStartDate: '2027-01-01T00:00:00.000Z',
          enrollmentOpensAt: '2026-12-01T00:00:00.000Z',
          enrollmentClosesAt: '2026-12-31T00:00:00.000Z',
        })
        .expect(201);
      return (batchRes.body as BatchBody).id;
    }

    it('rejects a manager not assigned to the batch with 403 BATCH_NOT_ASSIGNED', async () => {
      const batchId = await createCourseAndBatch();

      // `managerToken`'s user is never assigned to any batch in this file.
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/batches/${batchId}/class-link`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ classLink: 'https://meet.google.com/abc-defg-hij' })
        .expect(403);
      expect((res.body as ErrorResponseBody).error).toBe('BATCH_NOT_ASSIGNED');

      const batch = await prisma.batch.findUniqueOrThrow({
        where: { id: batchId },
      });
      expect(batch.classLink).toBeNull();
    });

    it('lets the assigned manager set the link and writes class_link_updated', async () => {
      const batchId = await createCourseAndBatch();
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const assignedManagerToken = await createUserWithRole(
        `assigned-manager-${suffix}@example.com`,
        'manager',
      );
      const assignedManager = await prisma.user.findUniqueOrThrow({
        where: { email: `assigned-manager-${suffix}@example.com` },
      });
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/managers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: assignedManager.id })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/batches/${batchId}/class-link`)
        .set('Authorization', `Bearer ${assignedManagerToken}`)
        .send({ classLink: 'https://meet.google.com/abc-defg-hij' })
        .expect(200);
      expect((res.body as BatchBody & { classLink: string }).classLink).toBe(
        'https://meet.google.com/abc-defg-hij',
      );

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'class_link_updated', targetId: batchId },
      });
      expect(audit).not.toBeNull();

      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/batches/${batchId}`)
        .expect(200);
      expect((getRes.body as BatchBody & { classLink: string }).classLink).toBe(
        'https://meet.google.com/abc-defg-hij',
      );
    });

    it('an admin may set the link on any batch regardless of assignment', async () => {
      const batchId = await createCourseAndBatch();

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/batches/${batchId}/class-link`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ classLink: 'https://t.me/an_nahda_batch' })
        .expect(200);
      expect((res.body as BatchBody & { classLink: string }).classLink).toBe(
        'https://t.me/an_nahda_batch',
      );
    });

    it('rejects a non-URL value with a validation error', async () => {
      const batchId = await createCourseAndBatch();

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/batches/${batchId}/class-link`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ classLink: 'not-a-url' })
        .expect(400);
      expect((res.body as ErrorResponseBody).error).toBe('VALIDATION_ERROR');
    });
  });
});
