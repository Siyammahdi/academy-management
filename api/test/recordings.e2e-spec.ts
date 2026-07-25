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

interface RecordingBody {
  id: string;
  batchId: string;
  title: string;
  youtubeVideoId: string;
  recordedFor: string;
}

interface RecordingWithContextBody extends RecordingBody {
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

describe('Recordings (real Postgres)', () => {
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
        title: `Recordings Test Course ${Date.now()}-${Math.random()}`,
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
        name: `Recordings Test Batch ${Date.now()}`,
        capacity: 30,
        courseStartDate: futureIso(45),
        enrollmentOpensAt: pastIso(1),
        enrollmentClosesAt: futureIso(30),
      })
      .expect(201);
    return (batchRes.body as IdBody).id;
  }

  // Enrolls, pays in full, and has an admin verify the payment — same
  // ENR-06/07 activation path /me/recordings' active-enrollment filter
  // relies on.
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

    adminToken = (await createUserWithRole('rec-admin', 'admin')).token;
    managerToken = (await createUserWithRole('rec-manager', 'manager')).token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('manager batch scope', () => {
    it('rejects a manager not assigned to the batch on create, list, update, and delete', async () => {
      const batchId = await createCourseAndBatch();

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/recordings`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Week 1',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: pastIso(1),
        })
        .expect(403);
      expect((createRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/batches/${batchId}/recordings`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
      expect((listRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      // Seed a recording as admin so update/delete have a real target.
      const recRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/recordings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Week 1',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: pastIso(1),
        })
        .expect(201);
      const recordingId = (recRes.body as RecordingBody).id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/recordings/${recordingId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Hacked title' })
        .expect(403);
      expect((updateRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/recordings/${recordingId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
      expect((deleteRes.body as ErrorResponseBody).error).toBe(
        'BATCH_NOT_ASSIGNED',
      );

      const stillThere = await prisma.recordedClass.findUniqueOrThrow({
        where: { id: recordingId },
      });
      expect(stillThere.title).toBe('Week 1');
    });

    it('lets the assigned manager create, list, update, and delete', async () => {
      const batchId = await createCourseAndBatch();
      const assigned = await createUserWithRole(
        'rec-assigned-manager',
        'manager',
      );
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/managers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: assigned.userId })
        .expect(201);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/recordings`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .send({
          title: 'Week 1',
          youtubeVideoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          recordedFor: pastIso(1),
        })
        .expect(201);
      const recording = createRes.body as RecordingBody;
      expect(recording.youtubeVideoId).toBe('dQw4w9WgXcQ');

      const addedAudit = await prisma.auditLog.findFirst({
        where: { action: 'recording_added', targetId: recording.id },
      });
      expect(addedAudit).not.toBeNull();

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/batches/${batchId}/recordings`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .expect(200);
      expect(listRes.body as RecordingBody[]).toHaveLength(1);

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/recordings/${recording.id}`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .send({ youtubeVideoId: 'https://youtu.be/jNQXAC9IVRw' })
        .expect(200);
      expect((updateRes.body as RecordingBody).youtubeVideoId).toBe(
        'jNQXAC9IVRw',
      );

      const updatedAudit = await prisma.auditLog.findFirst({
        where: { action: 'recording_updated', targetId: recording.id },
      });
      expect(updatedAudit).not.toBeNull();

      await request(app.getHttpServer())
        .delete(`/api/v1/recordings/${recording.id}`)
        .set('Authorization', `Bearer ${assigned.token}`)
        .expect(200);

      const deletedAudit = await prisma.auditLog.findFirst({
        where: { action: 'recording_deleted', targetId: recording.id },
      });
      expect(deletedAudit).not.toBeNull();

      const gone = await prisma.recordedClass.findUnique({
        where: { id: recording.id },
      });
      expect(gone).toBeNull();
    });
  });

  describe('validation', () => {
    it('rejects an input that does not yield a valid YouTube video id', async () => {
      const batchId = await createCourseAndBatch();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/recordings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Week 1',
          youtubeVideoId: 'https://vimeo.com/12345',
          recordedFor: pastIso(1),
        })
        .expect(400);
      expect((res.body as ErrorResponseBody).error).toBe('VALIDATION_ERROR');
    });

    it('accepts a bare 11-character video id', async () => {
      const batchId = await createCourseAndBatch();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/batches/${batchId}/recordings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Week 1',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: pastIso(1),
        })
        .expect(201);
      expect((res.body as RecordingBody).youtubeVideoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('GET /me/recordings', () => {
    it('only shows recordings from batches where the enrollment has activated, newest first', async () => {
      const activeBatchId = await createCourseAndBatch();
      const pendingBatchId = await createCourseAndBatch();

      await request(app.getHttpServer())
        .post(`/api/v1/batches/${activeBatchId}/recordings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Older class',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: pastIso(10),
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${activeBatchId}/recordings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Newer class',
          youtubeVideoId: 'jNQXAC9IVRw',
          recordedFor: pastIso(1),
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${pendingBatchId}/recordings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Should not be visible',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: pastIso(1),
        })
        .expect(201);

      const studentToken = await enrollAndActivate(
        activeBatchId,
        'rec-student',
      );
      await request(app.getHttpServer())
        .post(`/api/v1/batches/${pendingBatchId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/recordings')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const recordings = res.body as RecordingWithContextBody[];

      expect(recordings.map((r) => r.title)).toEqual([
        'Newer class',
        'Older class',
      ]);
      expect(recordings[0]?.batch.id).toBe(activeBatchId);
    });
  });
});
