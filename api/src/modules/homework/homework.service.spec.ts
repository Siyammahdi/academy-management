import { NotFoundException } from '@nestjs/common';
import { HomeworkService } from './homework.service';
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
  service: HomeworkService;
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
  const service = new HomeworkService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, audit, prisma };
}

describe('HomeworkService', () => {
  describe('create', () => {
    it('resolves dueDate to the end of the Dhaka calendar day and writes a homework_created audit entry', async () => {
      const created = {
        id: 'hw1',
        batchId: 'batch1',
        title: 'Chapter 1 exercises',
        dueDate: new Date('2026-08-15T17:59:59.000Z'),
      };
      const tx = {
        batch: { findUnique: jest.fn().mockResolvedValue({ id: 'batch1' }) },
        homework: { create: jest.fn().mockResolvedValue(created) },
      };
      const { service, audit } = createService(tx);

      const result = await service.create(
        'batch1',
        {
          title: 'Chapter 1 exercises',
          description: 'Do all odd-numbered problems.',
          dueDate: '2026-08-15',
        },
        manager,
      );

      expect(result.id).toBe('hw1');
      expect(tx.homework.create).toHaveBeenCalledWith({
        data: {
          batchId: 'batch1',
          title: 'Chapter 1 exercises',
          description: 'Do all odd-numbered problems.',
          dueDate: new Date('2026-08-15T17:59:59.000Z'),
        },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'homework_created',
          targetType: 'Homework',
          targetId: 'hw1',
          details: {
            batchId: 'batch1',
            title: 'Chapter 1 exercises',
            dueDate: '2026-08-15T17:59:59.000Z',
          },
        }),
        tx,
      );
    });

    it('throws NotFoundException when the batch does not exist', async () => {
      const tx = { batch: { findUnique: jest.fn().mockResolvedValue(null) } };
      const { service } = createService(tx);

      await expect(
        service.create(
          'missing',
          {
            title: 'x',
            description: 'y',
            dueDate: '2026-08-15',
          },
          manager,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('records the new fields and writes a homework_updated audit entry', async () => {
      const before = {
        id: 'hw1',
        batchId: 'batch1',
        title: 'Old title',
        description: 'Old description',
        dueDate: new Date('2026-08-15T17:59:59.000Z'),
      };
      const after = {
        ...before,
        title: 'New title',
        dueDate: new Date('2026-08-20T17:59:59.000Z'),
      };
      const tx = {
        homework: {
          findUnique: jest.fn().mockResolvedValue(before),
          update: jest.fn().mockResolvedValue(after),
        },
      };
      const { service, audit } = createService(tx);

      const result = await service.update(
        'hw1',
        { title: 'New title', dueDate: '2026-08-20' },
        manager,
      );

      expect(result.title).toBe('New title');
      expect(tx.homework.update).toHaveBeenCalledWith({
        where: { id: 'hw1' },
        data: {
          title: 'New title',
          description: undefined,
          dueDate: new Date('2026-08-20T17:59:59.000Z'),
        },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'homework_updated',
          targetType: 'Homework',
          targetId: 'hw1',
          details: {
            before: {
              title: 'Old title',
              description: 'Old description',
              dueDate: '2026-08-15T17:59:59.000Z',
            },
            after: {
              title: 'New title',
              description: 'Old description',
              dueDate: '2026-08-20T17:59:59.000Z',
            },
          },
        }),
        tx,
      );
    });

    it('throws NotFoundException when the homework does not exist', async () => {
      const tx = {
        homework: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const { service } = createService(tx);

      await expect(
        service.update('missing', { title: 'x' }, manager),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the row and writes a homework_deleted audit entry', async () => {
      const homework = {
        id: 'hw1',
        batchId: 'batch1',
        title: 'Chapter 1 exercises',
        dueDate: new Date('2026-08-15T17:59:59.000Z'),
      };
      const tx = {
        homework: {
          findUnique: jest.fn().mockResolvedValue(homework),
          delete: jest.fn().mockResolvedValue(homework),
        },
      };
      const { service, audit } = createService(tx);

      await service.remove('hw1', manager);

      expect(tx.homework.delete).toHaveBeenCalledWith({ where: { id: 'hw1' } });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'homework_deleted',
          targetType: 'Homework',
          targetId: 'hw1',
        }),
        tx,
      );
    });

    it('throws NotFoundException when the homework does not exist', async () => {
      const tx = {
        homework: { findUnique: jest.fn().mockResolvedValue(null) },
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
      const { service } = createService({}, { homework: { findMany } });

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
        orderBy: { dueDate: 'asc' },
      });
    });

    it('returns an empty list for a user with no Student profile', async () => {
      const findMany = jest.fn();
      const { service } = createService({}, { homework: { findMany } });

      const result = await service.listMine(manager);

      expect(result).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });
  });
});
