import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const manager: AuthUser = {
  id: 'mgr1',
  email: 'manager@x.com',
  roles: ['manager'],
  studentId: null,
};

const student: AuthUser = {
  id: 'user1',
  email: 'student@x.com',
  roles: ['student'],
  studentId: 'student1',
};

function createService(
  tx: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): {
  service: RecordingsService;
  audit: { record: jest.Mock };
  prisma: Record<string, unknown>;
} {
  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((arg: unknown) =>
        Array.isArray(arg)
          ? Promise.all(arg)
          : (arg as (tx: unknown) => unknown)(tx),
      ),
    ...extra,
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new RecordingsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, audit, prisma };
}

describe('RecordingsService', () => {
  describe('create', () => {
    it('extracts the video id from a pasted YouTube link and writes a recording_added audit entry', async () => {
      const created = {
        id: 'rec1',
        batchId: 'batch1',
        title: 'Week 1 class',
        youtubeVideoId: 'dQw4w9WgXcQ',
        recordedFor: new Date('2026-08-15T00:00:00.000Z'),
      };
      const tx = {
        batch: { findUnique: jest.fn().mockResolvedValue({ id: 'batch1' }) },
        recordedClass: { create: jest.fn().mockResolvedValue(created) },
      };
      const { service, audit } = createService(tx);

      const result = await service.create(
        'batch1',
        {
          title: 'Week 1 class',
          youtubeVideoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          recordedFor: '2026-08-15',
        },
        manager,
      );

      expect(result.id).toBe('rec1');
      expect(tx.recordedClass.create).toHaveBeenCalledWith({
        data: {
          batchId: 'batch1',
          title: 'Week 1 class',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: new Date('2026-08-15'),
        },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'recording_added',
          targetType: 'RecordedClass',
          targetId: 'rec1',
          details: {
            batchId: 'batch1',
            title: 'Week 1 class',
            youtubeVideoId: 'dQw4w9WgXcQ',
          },
        }),
        tx,
      );
    });

    it('stores a bare video id unchanged', async () => {
      const created = {
        id: 'rec1',
        batchId: 'batch1',
        title: 'Week 1 class',
        youtubeVideoId: 'dQw4w9WgXcQ',
        recordedFor: new Date('2026-08-15'),
      };
      const tx = {
        batch: { findUnique: jest.fn().mockResolvedValue({ id: 'batch1' }) },
        recordedClass: { create: jest.fn().mockResolvedValue(created) },
      };
      const { service } = createService(tx);

      await service.create(
        'batch1',
        {
          title: 'Week 1 class',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: '2026-08-15',
        },
        manager,
      );

      expect(tx.recordedClass.create).toHaveBeenCalledWith({
        data: {
          batchId: 'batch1',
          title: 'Week 1 class',
          youtubeVideoId: 'dQw4w9WgXcQ',
          recordedFor: new Date('2026-08-15'),
        },
      });
    });

    it('throws NotFoundException when the batch does not exist', async () => {
      const tx = { batch: { findUnique: jest.fn().mockResolvedValue(null) } };
      const { service } = createService(tx);

      await expect(
        service.create(
          'missing',
          {
            title: 'x',
            youtubeVideoId: 'dQw4w9WgXcQ',
            recordedFor: '2026-08-15',
          },
          manager,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('re-extracts the id when a new link is provided and writes a recording_updated audit entry', async () => {
      const before = {
        id: 'rec1',
        batchId: 'batch1',
        title: 'Old title',
        youtubeVideoId: 'aaaaaaaaaaa',
        recordedFor: new Date('2026-08-15'),
      };
      const after = {
        ...before,
        title: 'New title',
        youtubeVideoId: 'bbbbbbbbbbb',
      };
      const tx = {
        recordedClass: {
          findUnique: jest.fn().mockResolvedValue(before),
          update: jest.fn().mockResolvedValue(after),
        },
      };
      const { service, audit } = createService(tx);

      const result = await service.update(
        'rec1',
        {
          title: 'New title',
          youtubeVideoId: 'https://youtu.be/bbbbbbbbbbb',
        },
        manager,
      );

      expect(result.title).toBe('New title');
      expect(tx.recordedClass.update).toHaveBeenCalledWith({
        where: { id: 'rec1' },
        data: {
          title: 'New title',
          youtubeVideoId: 'bbbbbbbbbbb',
          recordedFor: undefined,
        },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'recording_updated',
          targetType: 'RecordedClass',
          targetId: 'rec1',
        }),
        tx,
      );
    });

    it('throws BadRequestException for an unparsable YouTube link on update', async () => {
      const before = {
        id: 'rec1',
        batchId: 'batch1',
        title: 'Old title',
        youtubeVideoId: 'aaaaaaaaaaa',
        recordedFor: new Date('2026-08-15'),
      };
      const tx = {
        recordedClass: { findUnique: jest.fn().mockResolvedValue(before) },
      };
      const { service } = createService(tx);

      await expect(
        service.update('rec1', { youtubeVideoId: 'not a link' }, manager),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the recording does not exist', async () => {
      const tx = {
        recordedClass: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const { service } = createService(tx);

      await expect(
        service.update('missing', { title: 'x' }, manager),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the row and writes a recording_deleted audit entry', async () => {
      const recording = {
        id: 'rec1',
        batchId: 'batch1',
        title: 'Week 1 class',
        youtubeVideoId: 'dQw4w9WgXcQ',
      };
      const tx = {
        recordedClass: {
          findUnique: jest.fn().mockResolvedValue(recording),
          delete: jest.fn().mockResolvedValue(recording),
        },
      };
      const { service, audit } = createService(tx);

      await service.remove('rec1', manager);

      expect(tx.recordedClass.delete).toHaveBeenCalledWith({
        where: { id: 'rec1' },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'recording_deleted',
          targetType: 'RecordedClass',
          targetId: 'rec1',
        }),
        tx,
      );
    });

    it('throws NotFoundException when the recording does not exist', async () => {
      const tx = {
        recordedClass: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const { service } = createService(tx);

      await expect(service.remove('missing', manager)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listMine', () => {
    it('never trusts a client-supplied id: derives the student from the token and filters to active enrollments', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const { service } = createService({}, { recordedClass: { findMany } });

      await service.listMine(student);

      expect(findMany).toHaveBeenCalledWith({
        where: {
          batch: {
            enrollments: {
              some: { studentId: 'student1', status: 'active' },
            },
          },
        },
        include: { batch: { include: { course: true } } },
        orderBy: { recordedFor: 'desc' },
      });
    });

    it('returns an empty list for a user with no Student profile', async () => {
      const findMany = jest.fn();
      const { service } = createService({}, { recordedClass: { findMany } });

      const result = await service.listMine(manager);

      expect(result).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });
  });
});
