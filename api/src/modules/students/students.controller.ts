import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Admin overview tile (doc 09 — counts of active batches, students,
  // pending payments). Not part of doc 06's endpoint table; the smallest
  // real implementation of this module's existing (previously empty) stub.
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('count')
  count(): Promise<{ count: number }> {
    return this.studentsService.count();
  }
}
