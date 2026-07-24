import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';

// FEE-03 — editing these fields never touches an existing batch's snapshot.
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
