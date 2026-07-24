import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BatchesService } from './batches.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const admin: AuthUser = {
  id: 'admin1',
  email: 'admin@x.com',
  roles: ['admin'],
  studentId: null,
};

function createService(
  tx: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): {
  service: BatchesService;
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
  const service = new BatchesService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, audit, prisma };
}

describe('BatchesService', () => {
  describe('create', () => {
    it('FEE-02: copies the course fees onto the batch as its own values', async () => {
      const course = {
        id: 'course1',
        enrollmentFee: { toString: () => '1000.00' },
        monthlyFee: { toString: () => '500.00' },
      };
      const created = { ...course, id: 'batch1' };
      const tx = {
        course: { findUnique: jest.fn().mockResolvedValue(course) },
        batch: { create: jest.fn().mockResolvedValue(created) },
      };
      const { service, audit } = createService(tx);

      await service.create(
        {
          courseId: 'course1',
          name: 'Batch 1',
          capacity: 30,
          courseStartDate: '2026-08-01T00:00:00.000Z',
          enrollmentOpensAt: '2026-07-01T00:00:00.000Z',
          enrollmentClosesAt: '2026-07-31T00:00:00.000Z',
        },
        admin,
      );

      expect(tx.batch.create).toHaveBeenCalledWith({
        data: {
          courseId: 'course1',
          name: 'Batch 1',
          enrollmentFee: course.enrollmentFee,
          monthlyFee: course.monthlyFee,
          entryDiscountPercent: undefined,
          capacity: 30,
          courseStartDate: new Date('2026-08-01T00:00:00.000Z'),
          enrollmentOpensAt: new Date('2026-07-01T00:00:00.000Z'),
          enrollmentClosesAt: new Date('2026-07-31T00:00:00.000Z'),
          dueDayStart: undefined,
          dueDayEnd: undefined,
        },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'batch_created',
          targetId: 'batch1',
        }),
        tx,
      );
    });

    it('throws NotFoundException when the course does not exist', async () => {
      const tx = { course: { findUnique: jest.fn().mockResolvedValue(null) } };
      const { service } = createService(tx);

      await expect(
        service.create(
          {
            courseId: 'missing',
            name: 'Batch 1',
            capacity: 30,
            courseStartDate: '2026-08-01T00:00:00.000Z',
            enrollmentOpensAt: '2026-07-01T00:00:00.000Z',
            enrollmentClosesAt: '2026-07-31T00:00:00.000Z',
          },
          admin,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an enrollment window that closes before it opens', async () => {
      const { service } = createService({});

      await expect(
        service.create(
          {
            courseId: 'course1',
            name: 'Batch 1',
            capacity: 30,
            courseStartDate: '2026-08-01T00:00:00.000Z',
            enrollmentOpensAt: '2026-07-31T00:00:00.000Z',
            enrollmentClosesAt: '2026-07-01T00:00:00.000Z',
          },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a dueDayStart after dueDayEnd', async () => {
      const { service } = createService({});

      await expect(
        service.create(
          {
            courseId: 'course1',
            name: 'Batch 1',
            capacity: 30,
            courseStartDate: '2026-08-01T00:00:00.000Z',
            enrollmentOpensAt: '2026-07-01T00:00:00.000Z',
            enrollmentClosesAt: '2026-07-31T00:00:00.000Z',
            dueDayStart: 10,
            dueDayEnd: 5,
          },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('computes seatsRemaining from capacity minus active/pending enrollments', async () => {
      const { service, prisma } = createService(
        {},
        {
          batch: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ id: 'batch1', capacity: 30, managers: [] }),
          },
          enrollment: { count: jest.fn().mockResolvedValue(12) },
        },
      );

      const result = await service.getById('batch1');

      expect(result.seatsRemaining).toBe(18);
      expect(result.managers).toEqual([]);
      expect(prisma.enrollment).toBeDefined();
    });

    it('throws NotFoundException when the batch does not exist', async () => {
      const { service } = createService(
        {},
        { batch: { findUnique: jest.fn().mockResolvedValue(null) } },
      );

      await expect(service.getById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changeStatus', () => {
    it('BIL-11: records the new status and writes a batch_status_changed audit entry', async () => {
      const before = { id: 'batch1', status: 'enrolling' };
      const after = { id: 'batch1', status: 'completed' };
      const tx = {
        batch: {
          findUnique: jest.fn().mockResolvedValue(before),
          update: jest.fn().mockResolvedValue(after),
        },
      };
      const { service, audit } = createService(tx);

      const result = await service.changeStatus(
        'batch1',
        { status: 'completed' },
        admin,
      );

      expect(result.status).toBe('completed');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'batch_status_changed',
          details: {
            before: { status: 'enrolling' },
            after: { status: 'completed' },
          },
        }),
        tx,
      );
    });
  });

  describe('updateClassLink', () => {
    it('records the new link and writes a class_link_updated audit entry', async () => {
      const before = { id: 'batch1', classLink: null };
      const after = {
        id: 'batch1',
        classLink: 'https://meet.example.com/room',
      };
      const tx = {
        batch: {
          findUnique: jest.fn().mockResolvedValue(before),
          update: jest.fn().mockResolvedValue(after),
        },
      };
      const { service, audit } = createService(tx);

      const result = await service.updateClassLink(
        'batch1',
        { classLink: 'https://meet.example.com/room' },
        admin,
      );

      expect(result.classLink).toBe('https://meet.example.com/room');
      expect(tx.batch.update).toHaveBeenCalledWith({
        where: { id: 'batch1' },
        data: { classLink: 'https://meet.example.com/room' },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'class_link_updated',
          targetType: 'Batch',
          targetId: 'batch1',
          details: {
            before: { classLink: null },
            after: { classLink: 'https://meet.example.com/room' },
          },
        }),
        tx,
      );
    });

    it('throws NotFoundException when the batch does not exist', async () => {
      const tx = { batch: { findUnique: jest.fn().mockResolvedValue(null) } };
      const { service } = createService(tx);

      await expect(
        service.updateClassLink(
          'missing',
          { classLink: 'https://meet.example.com/room' },
          admin,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignManager', () => {
    it('rejects a duplicate assignment with ConflictException', async () => {
      const { service } = createService(
        {},
        {
          batch: { findUnique: jest.fn().mockResolvedValue({ id: 'batch1' }) },
          user: { findUnique: jest.fn().mockResolvedValue({ id: 'mgr1' }) },
          batchManager: {
            create: jest.fn().mockRejectedValue(
              new Prisma.PrismaClientKnownRequestError('duplicate', {
                code: 'P2002',
                clientVersion: '7.9.0',
              }),
            ),
          },
        },
      );

      await expect(
        service.assignManager('batch1', { userId: 'mgr1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeManager', () => {
    it('throws NotFoundException when no assignment exists', async () => {
      const { service } = createService(
        {},
        {
          batchManager: { findUnique: jest.fn().mockResolvedValue(null) },
        },
      );

      await expect(service.removeManager('batch1', 'mgr1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
