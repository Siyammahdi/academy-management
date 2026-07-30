import { HttpStatus } from '@nestjs/common';
import type { Homework, Prisma } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';

export const HOMEWORK_PDF_MAX_BYTES = 5 * 1024 * 1024;

export class HomeworkPdfInvalidException extends DomainException {
  constructor(message: string) {
    super('HOMEWORK_PDF_INVALID', message, HttpStatus.BAD_REQUEST);
  }
}

/** Scalar homework fields safe for JSON — never Bytes. */
export const HOMEWORK_PUBLIC_SELECT = {
  id: true,
  batchId: true,
  title: true,
  description: true,
  dueDate: true,
  createdAt: true,
  pdfMimeType: true,
} satisfies Prisma.HomeworkSelect;

export type HomeworkPublicRow = Prisma.HomeworkGetPayload<{
  select: typeof HOMEWORK_PUBLIC_SELECT;
}>;

export type HomeworkResponse = Omit<HomeworkPublicRow, 'pdfMimeType'> & {
  hasPdf: boolean;
};

export function presentHomework(row: HomeworkPublicRow): HomeworkResponse {
  const { pdfMimeType, ...rest } = row;
  return {
    ...rest,
    hasPdf: typeof pdfMimeType === 'string' && pdfMimeType.length > 0,
  };
}

export function presentHomeworkRow(homework: Homework): HomeworkResponse {
  const { pdf: _pdf, pdfMimeType, ...rest } = homework;
  return {
    ...rest,
    hasPdf: typeof pdfMimeType === 'string' && pdfMimeType.length > 0,
  };
}

/** Light sanitize: strip scripts/event handlers; keep formatting tags. */
export function sanitizeHomeworkHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function decodeHomeworkPdf(input: {
  mimeType: string;
  data: string;
}): { mimeType: string; bytes: Uint8Array<ArrayBuffer> } {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (mimeType !== 'application/pdf') {
    throw new HomeworkPdfInvalidException('Homework attachment must be a PDF.');
  }

  let raw = input.data.trim();
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(raw);
  if (dataUrl) {
    const embedded = dataUrl[1]!.trim().toLowerCase();
    if (embedded !== 'application/pdf') {
      throw new HomeworkPdfInvalidException(
        'PDF mime type does not match the file data.',
      );
    }
    raw = dataUrl[2]!;
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(raw, 'base64');
  } catch {
    throw new HomeworkPdfInvalidException('PDF data is invalid.');
  }
  if (bytes.length === 0) {
    throw new HomeworkPdfInvalidException('PDF data is empty.');
  }
  if (bytes.length > HOMEWORK_PDF_MAX_BYTES) {
    throw new HomeworkPdfInvalidException('PDF must be 5 MB or smaller.');
  }

  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return { mimeType, bytes: copy };
}
