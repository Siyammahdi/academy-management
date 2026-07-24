// doc 06 §1 — every list endpoint accepts ?page=&limit= (max 100) and
// returns { data, meta }. Query strings, not DTOs (doc 06 §13 scopes
// class-validator DTOs to request bodies) — parsed and clamped here instead.

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function resolvePagination(query: PaginationQuery): ResolvedPagination {
  const parsedPage = Number.parseInt(query.page ?? '', 10);
  const parsedLimit = Number.parseInt(query.limit ?? '', 10);

  const page =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;
  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
