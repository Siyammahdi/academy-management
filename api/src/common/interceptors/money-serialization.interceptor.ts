import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { formatMoney, isDecimal } from '../utils/money';

// doc 07 §3 (common/interceptors — "response shaping") + §6 (money is
// serialized as fixed 2-decimal strings). Walks every response body and
// reformats any Prisma.Decimal it finds, so no controller has to remember
// to do it by hand.
function reshape(value: unknown): unknown {
  if (isDecimal(value)) {
    return formatMoney(value);
  }
  if (Array.isArray(value)) {
    return value.map(reshape);
  }
  if (value instanceof Date) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = reshape(val);
    }
    return result;
  }
  return value;
}

@Injectable()
export class MoneySerializationInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => reshape(data)));
  }
}
