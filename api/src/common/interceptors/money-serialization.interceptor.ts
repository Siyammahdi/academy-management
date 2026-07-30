import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { formatMoney, isDecimal } from '../utils/money';

// doc 07 §3 (common/interceptors — "response shaping") + §6 (money is
// serialized as fixed 2-decimal strings). Walks every response body and
// reformats any Prisma.Decimal it finds, so no controller has to remember
// to do it by hand.
//
// Also strips Course.thumbnail Bytes (never JSON-safe) and turns
// thumbnailMimeType into hasThumbnail for nested course includes.
// StreamableFile (binary covers / PDFs) must pass through untouched —
// reshaping it turns the stream into a tiny JSON blob in the browser.
function reshape(value: unknown): unknown {
  if (isDecimal(value)) {
    return formatMoney(value);
  }
  if (value instanceof StreamableFile) {
    return value;
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(reshape);
  }
  if (value instanceof Date) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const result: Record<string, unknown> = {};
    let sawThumbnailMime = false;
    let thumbnailMime: unknown;
    let sawHasThumbnail = false;
    let hadThumbnailBytes = false;

    for (const [key, val] of entries) {
      if (key === 'thumbnail' || key === 'pdf') {
        if (Buffer.isBuffer(val) || val instanceof Uint8Array) {
          hadThumbnailBytes = val.length > 0;
        }
        continue;
      }
      if (key === 'thumbnailMimeType') {
        sawThumbnailMime = true;
        thumbnailMime = val;
        continue;
      }
      if (key === 'hasThumbnail') {
        sawHasThumbnail = true;
      }
      result[key] = reshape(val);
    }

    if (!sawHasThumbnail && (sawThumbnailMime || hadThumbnailBytes)) {
      result.hasThumbnail =
        hadThumbnailBytes ||
        (typeof thumbnailMime === 'string' && thumbnailMime.length > 0);
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
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) {
          return data;
        }
        return reshape(data);
      }),
    );
  }
}
