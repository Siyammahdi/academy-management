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

interface HomeworkBody {
  id: string;
  batchId: string;
  title: string;
  description: string;
  dueDate: string;
}

interface HomeworkWithContextBody extends HomeworkBody {
  batch: { id: string; name: string; course: { title: string } };
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

describe('Homework (real Postgres)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string; // never assigned to any batch in this file

  async function createUserWithRole(
    prefix: string,
    role: 'admin' | 'manager',
  ): Promise<{ token: string; userId: string }> {
    const passwordHash = await argon2.hash('password123');
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const user = await prisma.user.create({ data: { email, passwordHash } });
    await prisma.userRole.create({ data: { userId: user.id, role } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);
    return {
      token: (res.body as LoginResponseBody).accessToken,
      userId: user.id,
    };
  }

  async function registerStudent(
    prefix: string,
  ): Promise<{ accessToken: string; userId: string }> {
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
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return {
      accessToken: (res.body as LoginResponseBody).accessToken,
      userId: user.id,
    };
  }

  async function createCourseAndBatch(): Promise<string> {
    const courseRes = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Homework Test Course ${Date.now()}-${Math.random()}`,
        billingType: 'monthly',
        enrollmentFee: '1000.00',
        monthlyFee: '500.00',
      })
      .expect(201);
    const courseId = (courseRes.body as IdBody).id;

    const batchRes = await request(app.getHttpServer())
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId,
        name: `Homework Test Batch ${Date.now()}`,
        capacity: 30,
        courseStartDate: futureIso(45),
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
      })
      .expect(201);
    return (batchRes.body as IdBody).id;
  }

  // Enrolls, pays in full, and has an admin verify the payment — exercises
  // the real ENR-06/07 activation path so /me/homework's active-enrollment
  // filter has something real to find.
  async function enrollAndActivate(
    batchId: string,
    prefix: string,
  ): Promise<string> {
    const student = await registerStudent(prefix);
    const enrollRes = await request(app.getHttpServer())
      .post(`/api/v1/batches/${batchId}/enroll`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({})
      .expect(201);
    const { firstPeriod } = enrollRes.body as EnrollResponseBody;

    const payRes = await request(app.getHttpServer())
      .post(`/api/v1/billing-periods/${firstPeriod.id}/pay/manual`)
      .set('Authorization', `Bearer ${student.accessToken}`)
      .send({
        amount: firstPeriod.amountOwed,
        transactionReference: `MANUAL-${Date.now()}`,
        proofUrl: 'https://example.com/proof.jpg',
      })
      .expect(201);
    const paymentId = (payRes.body as IdBody).id;

    await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    return student.accessToken;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    adminToken = (await createUserWithRole('hw-admin', 'admin')).token;
    managerToken = (await createUserWithRole('hw-manager', 'manager')).token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('manager batch scope', () => {
    it('rejects a manager not assigned to the batch on create, list, update, and delete', async () => {
      const batchId = await createCourseAndBatch();

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Chapter 1',
          description: 'Read chapter 1.',
          dueDate: futureIso(7),
        })
        .expect(403);
      expect((createRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
      expect((listRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      // Seed a homework row as admin so update/delete have a real target.
      const hwRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Chapter 1',
          description: 'Read chapter 1.',
          dueDate: futureIso(7),
        })
        .expect(201);
      const homeworkId = (hwRes.body as HomeworkBody).id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Hacked title' })
        .expect(403);
      expect((updateRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
      expect((deleteRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      const stillThere = await prisma.homework.findUniqueOrThrow({
        where: { id: homeworkId },
      });
      expect(stillThere.title).toBe('Chapter 1');
    });

    it('lets the assigned manager create, list, update, and delete', async () => {
      const batchId = await createCourseAndBatch();
      const assigned = await createUserWithRole(
        'hw-assigned-manager',
        'manager',
      );
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/managers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: assigned.userId })
        .expect(201);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .send({
          title: 'Chapter 1',
          description: 'Read chapter 1.',
          dueDate: futureIso(7),
        })
        .expect(201);
      const homeworkId = (createRes.body as HomeworkBody).id;

      const createdAudit = await prisma.auditLog.findFirst({
        where: { action: 'homework_created', targetId: homeworkId },
      });
      expect(createdAudit).not.toBeNull();

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .expect(200);
      expect(listRes.body as HomeworkBody[]).toHaveLength(1);

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .send({ title: 'Chapter 1 (revised)' })
        .expect(200);
      expect((updateRes.body as HomeworkBody).title).toBe(
        'Chapter 1 (revised)',
      );

      const updatedAudit = await prisma.auditLog.findFirst({
        where: { action: 'homework_updated', targetId: homeworkId },
      });
      expect(updatedAudit).not.toBeNull();

      await request(app.getHttpServer())
        .delete(`/api/v1/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .expect(200);

      const deletedAudit = await prisma.auditLog.findFirst({
        where: { action: 'homework_deleted', targetId: homeworkId },
      });
      expect(deletedAudit).not.toBeNull();

      const gone = await prisma.homework.findUnique({
        where: { id: homeworkId },
      });
      expect(gone).toBeNull();
    });
  });

  describe('validation', () => {
    it('rejects an invalid dueDate with a validation error', async () => {
      const batchId = await createCourseAndBatch();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Chapter 1',
          description: 'Read chapter 1.',
          dueDate: 'not-a-date',
        })
        .expect(400);
      expect((res.body as ErrorResponseBody).error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /me/homework', () => {
    it('ENR-06/07: only shows homework from batches where the enrollment has actually activated', async () => {
      const activeBatchId = await createCourseAndBatch();
      const pendingBatchId = await createCourseAndBatch();

      await request(app.getHttpServer())
        .post(`/api/v1/batches/${activeBatchId}/homework`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Active batch homework',
          description: 'Should be visible.',
          dueDate: futureIso(10),
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${pendingBatchId}/homework`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Pending batch homework',
          description: 'Should NOT be visible yet.',
          dueDate: futureIso(3),
        })
        .expect(201);

      // Same student: active in one batch, merely pending (unverified
      // manual payment) in the other.
      const studentToken = await enrollAndActivate(activeBatchId, 'hw-student');
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${pendingBatchId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/homework')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const homework = res.body as HomeworkWithContextBody[];

      expect(homework).toHaveLength(1);
      expect(homework[0].title).toBe('Active batch homework');
      expect(homework[0].batch.id).toBe(activeBatchId);
      expect(homework[0].batch.course.title).toContain('Homework Test Course');
    });

    it('sorts by dueDate ascending across enrollments', async () => {
      const batchId = await createCourseAndBatch();
      const studentToken = await enrollAndActivate(batchId, 'hw-sort-student');

      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Later',
          description: 'Due later.',
          dueDate: futureIso(20),
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/homework`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Sooner',
          description: 'Due sooner.',
          dueDate: futureIso(2),
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/homework')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const homework = res.body as HomeworkWithContextBody[];

      expect(homework.map((h) => h.title)).toEqual(['Sooner', 'Later']);
    });
  });
});
