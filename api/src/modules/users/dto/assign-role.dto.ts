import { IsIn, IsNotEmpty, IsString } from 'class-validator'
import { RoleName } from '@prisma/client'

const ROLES = Object.values(RoleName)

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ROLES)
  role: RoleName
}
