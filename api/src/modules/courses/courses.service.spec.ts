import { NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const admin: AuthUser = {
  id: 'admin1',
  email: 'admin@x.com',
  roles: ['admin'],
  studentId: null,
};

function createService(tx: Record<string, unknown>): {
  service: CoursesService;
  audit: { record: jest.Mock };
} {
  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((arg: unknown) =>
        Array.isArray(arg)
          ? Promise.all(arg)
          : (arg as (tx: unknown) => unknown)(tx),
      ),
  } as unknown as PrismaService;
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new CoursesService(prisma, audit as unknown as AuditService);
  return { service, audit };
}

describe('CoursesService', () => {
  describe('create', () => {
    it('creates the course and writes a course_created audit entry', async () => {
      const created = {
        id: 'course1',
        title: 'Arabic',
        description: null,
        billingType: 'monthly',
        enrollmentFee: { toString: () => '1000.00' },
        monthlyFee: { toString: () => '500.00' },
        status: 'active',
      };
      const tx = { course: { create: jest.fn().mockResolvedValue(created) } };
      const { service, audit } = createService(tx);

      const result = await service.create(
        {
          title: 'Arabic',
          billingType: 'monthly',
          enrollmentFee: '1000.00',
          monthlyFee: '500.00',
        },
        admin,
      );

      expect(result).toBe(created);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'course_created',
          targetType: 'Course',
          targetId: 'course1',
          actorUserId: 'admin1',
        }),
        tx,
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the course does not exist', async () => {
      const tx = { course: { findUnique: jest.fn().mockResolvedValue(null) } };
      const { service } = createService(tx);

      await expect(service.update('missing', {}, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('FEE-03: updates only the course row and writes a course_updated audit entry', async () => {
      const before = {
        id: 'course1',
        title: 'Arabic',
        description: null,
        billingType: 'monthly',
        enrollmentFee: { toString: () => '1000.00' },
        monthlyFee: { toString: () => '500.00' },
        status: 'active',
      };
      const after = { ...before, monthlyFee: { toString: () => '600.00' } };
      const tx = {
        course: {
          findUnique: jest.fn().mockResolvedValue(before),
          update: jest.fn().mockResolvedValue(after),
        },
      };
      const { service, audit } = createService(tx);

      const result = await service.update(
        'course1',
        { monthlyFee: '600.00' },
        admin,
      );

      expect(result).toBe(after);
      // No batch table is ever touched by a course update — batches keep
      // their own frozen snapshot (doc 05 §2), never re-read from Course.
      expect(tx).not.toHaveProperty('batch');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'course_updated',
          targetId: 'course1',
        }),
        tx,
      );
    });
  });

  describe('archive', () => {
    it('sets status to archived and writes a course_updated audit entry', async () => {
      const before = { id: 'course1', status: 'active' };
      const after = { id: 'course1', status: 'archived' };
      const tx = {
        course: {
          findUnique: jest.fn().mockResolvedValue(before),
          update: jest.fn().mockResolvedValue(after),
        },
      };
      const { service, audit } = createService(tx);

      const result = await service.archive('course1', admin);

      expect(result).toBe(after);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'course_updated',
          details: {
            before: { status: 'active' },
            after: { status: 'archived' },
          },
        }),
        tx,
      );
    });

    it('throws NotFoundException when the course does not exist', async () => {
      const tx = { course: { findUnique: jest.fn().mockResolvedValue(null) } };
      const { service } = createService(tx);

      await expect(service.archive('missing', admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
