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
import type { Homework } from '@prisma/client';
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

// No shared prefix — routes live under /batches, /homework, and /me
// respectively, same convention as EnrollmentController/MyBatchesController.
@Controller()
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Roles('manager', 'admin')
  @TargetResource('batch')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Post('batches/:id/homework')
  create(
    @Param('id') id: string,
    @Body() dto: CreateHomeworkDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Homework> {
    return this.homeworkService.create(id, dto, user);
  }

  @Roles('manager', 'admin')
  @TargetResource('batch')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Get('batches/:id/homework')
  listForBatch(@Param('id') id: string): Promise<Homework[]> {
    return this.homeworkService.listForBatch(id);
  }

  @Roles('manager', 'admin')
  @TargetResource('homework')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Patch('homework/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHomeworkDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Homework> {
    return this.homeworkService.update(id, dto, user);
  }

  @Roles('manager', 'admin')
  @TargetResource('homework')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Delete('homework/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.homeworkService.remove(id, user);
  }

  @Roles('student')
  @UseGuards(RolesGuard)
  @Get('me/homework')
  listMine(@CurrentUser() user: AuthUser): Promise<HomeworkWithContext[]> {
    return this.homeworkService.listMine(user);
  }
}
