import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator'
import { RoleName } from '@prisma/client'

const ROLES = Object.values(RoleName)

export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLES, { each: true })
  roles: RoleName[]

  // Required when granting the student role (creates ANA profile).
  @ValidateIf((dto: CreateUserDto) => dto.roles?.includes('student'))
  @IsString()
  @IsNotEmpty()
  fullName?: string

  @ValidateIf((dto: CreateUserDto) => dto.roles?.includes('student'))
  @IsString()
  @IsNotEmpty()
  phone?: string
}
