import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Enrollment } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  EnrollmentService,
  EnrollResult,
  EnrollmentWithBatch,
} from './enrollment.service';
import { LateJoinerDto } from './dto/late-joiner.dto';
import type { Paginated, PaginationQuery } from '../../common/utils/pagination';

// No shared prefix — doc 06 §5's four routes live under /batches, /enrollments,
// and /me respectively.
@Controller()
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Roles('student')
  @UseGuards(RolesGuard)
  @Post('batches/:id/enroll')
  enroll(
    @Param('id') batchId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<EnrollResult> {
    return this.enrollmentService.selfEnroll(batchId, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('batches/:id/late-joiner')
  addLateJoiner(
    @Param('id') batchId: string,
    @Body() dto: LateJoinerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EnrollResult> {
    return this.enrollmentService.addLateJoiner(batchId, dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post('enrollments/:id/withdraw')
  withdraw(
    @Param('id') enrollmentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Enrollment> {
    return this.enrollmentService.withdraw(enrollmentId, user);
  }

  @Roles('student')
  @UseGuards(RolesGuard)
  @Get('me/enrollments')
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQuery,
  ): Promise<Paginated<EnrollmentWithBatch>> {
    return this.enrollmentService.listMine(user, query);
  }
}
