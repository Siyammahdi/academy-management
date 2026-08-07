import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'

import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { PaginationQuery } from '../../common/utils/pagination'
import { StudentsService } from './students.service'

@Controller('students')
@Roles('admin')
@UseGuards(RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('count')
  count(): Promise<{ count: number }> {
    return this.studentsService.count()
  }

  @Get()
  list(@Query() query: PaginationQuery & { q?: string; status?: string }) {
    return this.studentsService.list(query)
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.studentsService.getDetail(id)
  }
}
