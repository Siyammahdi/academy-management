import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Course } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CoursesService } from './courses.service';
import type { CourseWithOpenBatches } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import type { Paginated, PaginationQuery } from '../../common/utils/pagination';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get()
  list(@Query() query: PaginationQuery): Promise<Paginated<Course>> {
    return this.coursesService.listActive(query);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string): Promise<CourseWithOpenBatches> {
    return this.coursesService.getById(id);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post()
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Course> {
    return this.coursesService.create(dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Course> {
    return this.coursesService.update(id, dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Course> {
    return this.coursesService.archive(id, user);
  }
}
