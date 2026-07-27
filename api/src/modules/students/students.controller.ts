import { Controller, Get, Query, UseGuards } from '@nestjs/common'

import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { PaginationQuery } from '../../common/utils/pagination'
import { StudentsService } from './students.service'

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Admin overview tile — smallest real implementation of this module.
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('count')
  count(): Promise<{ count: number }> {
    return this.studentsService.count()
  }

  // Must be declared after `count` so Nest does not treat "count" as an id.
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get()
  list(
    @Query() query: PaginationQuery & { q?: string; status?: string },
  ) {
    return this.studentsService.list(query)
  }
}
