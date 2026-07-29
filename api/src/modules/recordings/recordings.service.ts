import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordedClass } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { extractYoutubeVideoId } from '../../common/utils/youtube';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';

export type RecordingWithContext = RecordedClass & {
  batch: { id: string; name: string; course: { title: string } };
};

// The DTO's own validator already confirmed this input extracts cleanly
// (IsYoutubeVideoInput); this re-derives the id to actually store it,
// handling the (unreachable in practice) null branch rather than asserting.
function resolveVideoId(input: string): string {
  const videoId = extractYoutubeVideoId(input);
  if (!videoId) {
    throw new BadRequestException('Invalid YouTube video link or id');
  }
  return videoId;
}

@Injectable()
export class RecordingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    batchId: string,
    dto: CreateRecordingDto,
    actor: AuthUser,
  ): Promise<RecordedClass> {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        throw new NotFoundException('Not found');
      }

      const recording = await tx.recordedClass.create({
        data: {
          batchId,
          title: dto.title,
          youtubeVideoId: resolveVideoId(dto.youtubeVideoId),
          recordedFor: new Date(dto.recordedFor),
        },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'recording_added',
          targetType: 'RecordedClass',
          targetId: recording.id,
          details: {
            batchId,
            title: recording.title,
            youtubeVideoId: recording.youtubeVideoId,
          },
        },
        tx,
      );

      return recording;
    });
  }

  async listForBatch(batchId: string): Promise<RecordedClass[]> {
    return this.prisma.recordedClass.findMany({
      where: { batchId },
      orderBy: { recordedFor: 'desc' },
    });
  }

  async update(
    id: string,
    dto: UpdateRecordingDto,
    actor: AuthUser,
  ): Promise<RecordedClass> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.recordedClass.findUnique({ where: { id } });
      if (!before) {
        throw new NotFoundException('Not found');
      }

      const after = await tx.recordedClass.update({
        where: { id },
        data: {
          title: dto.title,
          youtubeVideoId: dto.youtubeVideoId
            ? resolveVideoId(dto.youtubeVideoId)
            : undefined,
          recordedFor: dto.recordedFor ? new Date(dto.recordedFor) : undefined,
        },
      });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'recording_updated',
          targetType: 'RecordedClass',
          targetId: id,
          details: {
            before: {
              title: before.title,
              youtubeVideoId: before.youtubeVideoId,
            },
            after: {
              title: after.title,
              youtubeVideoId: after.youtubeVideoId,
            },
          },
        },
        tx,
      );

      return after;
    });
  }

  async remove(id: string, actor: AuthUser): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const recording = await tx.recordedClass.findUnique({ where: { id } });
      if (!recording) {
        throw new NotFoundException('Not found');
      }

      await tx.recordedClass.delete({ where: { id } });

      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'recording_deleted',
          targetType: 'RecordedClass',
          targetId: id,
          details: {
            batchId: recording.batchId,
            title: recording.title,
          },
        },
        tx,
      );
    });
  }

  // Never trust a client-supplied identifier for ownership (doc 04 §6) —
  // the student is derived from the token, and only their ACTIVE
  // enrollments' batches contribute recordings.
  async listMine(actor: AuthUser): Promise<RecordingWithContext[]> {
    if (actor.studentId === null) {
      return [];
    }

    return this.prisma.recordedClass.findMany({
      where: {
        batch: {
          enrollments: {
            some: { studentId: actor.studentId, status: 'active' },
          },
        },
      },
      include: {
        batch: {
          include: {
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { recordedFor: 'desc' },
    });
  }
}
