import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { TargetResource } from '../../common/decorators/target-resource.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BatchScopeGuard } from '../../common/guards/batch-scope.guard';
import { HomeworkService } from './homework.service';
import type { HomeworkWithContext } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import type { HomeworkResponse } from './homework.presentation';

@Controller()
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Roles('teacher', 'admin')
  @TargetResource('batch')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Post('batches/:id/homework')
  create(
    @Param('id') id: string,
    @Body() dto: CreateHomeworkDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HomeworkResponse> {
    return this.homeworkService.create(id, dto, user);
  }

  @Roles('teacher', 'admin')
  @TargetResource('batch')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Get('batches/:id/homework')
  listForBatch(@Param('id') id: string): Promise<HomeworkResponse[]> {
    return this.homeworkService.listForBatch(id);
  }

  @Roles('teacher', 'admin')
  @TargetResource('homework')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Patch('homework/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHomeworkDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HomeworkResponse> {
    return this.homeworkService.update(id, dto, user);
  }

  @Roles('teacher', 'admin')
  @TargetResource('homework')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Delete('homework/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.homeworkService.remove(id, user);
  }

  /** PDF worksheet — teachers of the batch, or students with an active seat. */
  @Roles('student', 'teacher', 'admin')
  @UseGuards(RolesGuard)
  @Get('homework/:id/pdf')
  async pdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const allowed = await this.homeworkService.canAccessPdf(id, user);
    if (!allowed) {
      throw new NotFoundException('Not found');
    }
    const file = await this.homeworkService.getPdf(id);
    if (!file) {
      throw new NotFoundException('Not found');
    }
    const body = Buffer.from(file.body);
    res.status(200);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(body.byteLength));
    res.setHeader(
      'Content-Disposition',
      `inline; filename="homework-${id}.pdf"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(body);
  }

  @Roles('student')
  @UseGuards(RolesGuard)
  @Get('me/homework')
  listMine(@CurrentUser() user: AuthUser): Promise<HomeworkWithContext[]> {
    return this.homeworkService.listMine(user);
  }
}
