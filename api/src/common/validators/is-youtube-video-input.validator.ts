import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { extractYoutubeVideoId } from '../utils/youtube';

// Accepts either a bare YouTube video id or a full youtube.com/youtu.be
// link — the service extracts the id from whichever was sent. This only
// validates that extraction would succeed.
export function IsYoutubeVideoInput(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isYoutubeVideoInput',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' && extractYoutubeVideoId(value) !== null
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid YouTube video link or id`;
        },
      },
    });
  };
}
