import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Batch } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { TargetResource } from '../../common/decorators/target-resource.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BatchScopeGuard } from '../../common/guards/batch-scope.guard';
import { BatchesService } from './batches.service';
import type {
  BatchListQuery,
  BatchWithSeats,
  RosterEntry,
} from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { ChangeBatchStatusDto } from './dto/change-batch-status.dto';
import { AssignManagerDto } from './dto/assign-manager.dto';
import type { Paginated } from '../../common/utils/pagination';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Public()
  @Get()
  list(@Query() query: BatchListQuery): Promise<Paginated<Batch>> {
    return this.batchesService.list(query);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string): Promise<BatchWithSeats> {
    return this.batchesService.getById(id);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post()
  create(
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Batch> {
    return this.batchesService.create(dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBatchDto): Promise<Batch> {
    return this.batchesService.update(id, dto);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeBatchStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Batch> {
    return this.batchesService.changeStatus(id, dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/managers')
  assignManager(
    @Param('id') id: string,
    @Body() dto: AssignManagerDto,
  ): Promise<void> {
    return this.batchesService.assignManager(id, dto);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete(':id/managers/:userId')
  removeManager(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.batchesService.removeManager(id, userId);
  }

  @Roles('manager', 'admin')
  @TargetResource('batch')
  @UseGuards(RolesGuard, BatchScopeGuard)
  @Get(':id/roster')
  getRoster(@Param('id') id: string): Promise<RosterEntry[]> {
    return this.batchesService.getRoster(id);
  }
}
