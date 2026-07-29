import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
import type { CourseResponse } from './course.presentation';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get()
  list(@Query() query: PaginationQuery): Promise<Paginated<CourseResponse>> {
    return this.coursesService.listActive(query);
  }

  @Public()
  @Get(':id/thumbnail')
  async thumbnail(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.coursesService.getThumbnail(id);
    if (!file) {
      throw new NotFoundException('Not found');
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return new StreamableFile(file.body);
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
  ): Promise<CourseResponse> {
    return this.coursesService.create(dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseResponse> {
    return this.coursesService.update(id, dto, user);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseResponse> {
    return this.coursesService.archive(id, user);
  }
}
