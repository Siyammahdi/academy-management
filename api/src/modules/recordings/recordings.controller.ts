import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { RecordedClass } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { TargetResource } from '../../common/decorators/target-resource.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BatchScopeGuard } from '../../common/guards/batch-scope.guard';
import { RecordingsService } from './recordings.service';
import type { RecordingWithContext } from './recordings.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';

// No shared prefix — routes live under /batches, /recordings, and /me,
// same convention as HomeworkController/EnrollmentController.
@Controller()
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Roles('teacher', 'admin')
  @TargetResource('batch')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Post('batches/:id/recordings')
  create(
    @Param('id') id: string,
    @Body() dto: CreateRecordingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RecordedClass> {
    return this.recordingsService.create(id, dto, user);
  }

  @Roles('teacher', 'admin')
  @TargetResource('batch')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Get('batches/:id/recordings')
  listForBatch(@Param('id') id: string): Promise<RecordedClass[]> {
    return this.recordingsService.listForBatch(id);
  }

  @Roles('teacher', 'admin')
  @TargetResource('recording')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Patch('recordings/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRecordingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RecordedClass> {
    return this.recordingsService.update(id, dto, user);
  }

  @Roles('teacher', 'admin')
  @TargetResource('recording')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Delete('recordings/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.recordingsService.remove(id, user);
  }

  @Roles('student')
  @UseGuards(RolesGuard)
  @Get('me/recordings')
  listMine(@CurrentUser() user: AuthUser): Promise<RecordingWithContext[]> {
    return this.recordingsService.listMine(user);
  }
}
