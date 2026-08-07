import { Type } from 'class-transformer'
import { IsIn, IsNotEmpty, IsString } from 'class-validator'
import { RoleName } from '@prisma/client'

const ROLES = Object.values(RoleName)

/** Replaces the user's entire role set with exactly this one role. */
export class SetRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ROLES)
  role: RoleName
}

// Keep transformer happy if nested usage appears later.
void Type
