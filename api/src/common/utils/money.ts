import { Prisma } from '@prisma/client';

// doc 07 §6 — money is serialized as strings with exactly 2 decimal places
// (e.g. "1500.00"). Prisma.Decimal's default toJSON()/toString() strips
// trailing zeros ("1000"), which is not this format — always go through
// this function instead.
export function formatMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

export function isDecimal(value: unknown): value is Prisma.Decimal {
  return value instanceof Prisma.Decimal;
}
