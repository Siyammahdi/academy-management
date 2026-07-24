import { firstDayOfDhakaMonth, derivePeriodDueDate } from './period';

describe('firstDayOfDhakaMonth', () => {
  it('returns the first of the month for a mid-month UTC instant', () => {
    const result = firstDayOfDhakaMonth(new Date('2026-08-15T12:00:00.000Z'));
    expect(result.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('TIME-02: a late-UTC instant already past midnight in Dhaka rolls to the next month', () => {
    // 2026-07-31T23:00:00Z is 2026-08-01T05:00:00 in Dhaka (UTC+6)
    const result = firstDayOfDhakaMonth(new Date('2026-07-31T23:00:00.000Z'));
    expect(result.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('does not roll over for an instant still before midnight in Dhaka', () => {
    // 2026-07-31T17:00:00Z is 2026-07-31T23:00:00 in Dhaka — still July
    const result = firstDayOfDhakaMonth(new Date('2026-07-31T17:00:00.000Z'));
    expect(result.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('derivePeriodDueDate', () => {
  it("BIL-05: matches doc 06 §5's worked example (dueDayEnd 5, August 2026)", () => {
    const periodMonth = new Date(Date.UTC(2026, 7, 1));
    const result = derivePeriodDueDate(periodMonth, 5);
    expect(result.toISOString()).toBe('2026-08-05T17:59:59.000Z');
  });

  it('uses dueDayEnd, not dueDayStart, as the enforced deadline', () => {
    const periodMonth = new Date(Date.UTC(2026, 7, 1));
    const result = derivePeriodDueDate(periodMonth, 20);
    expect(result.toISOString()).toBe('2026-08-20T17:59:59.000Z');
  });
});
