import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Prisma } from '@prisma/client';

// PAY-10 — amount must be > 0. class-validator's built-in @IsPositive()
// requires `typeof value === 'number'`, which a decimal string (doc 07 §6
// — money is never a number, anywhere) can never satisfy; doc 06 §13's own
// `@IsDecimal() @IsPositive() amount: string` example is broken as written
// (verified empirically — it rejects every valid decimal string
// unconditionally). This checks positivity directly on the string instead.
export function IsPositiveDecimalString(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isPositiveDecimalString',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          try {
            return new Prisma.Decimal(value).greaterThan(0);
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a positive amount`;
        },
      },
    });
  };
}
