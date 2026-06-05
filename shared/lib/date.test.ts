import { describe, expect, it } from 'vitest';

import { getWeekStart, isIsoDateString, toIsoDate } from './date';

describe('toIsoDate', () => {
  it('returns the local calendar date in ISO format', () => {
    const date = new Date(2026, 5, 5, 0, 30, 0);

    expect(toIsoDate(date)).toBe('2026-06-05');
  });
});

describe('getWeekStart', () => {
  it('accepts an ISO date string and returns the Monday of that week', () => {
    expect(getWeekStart('2026-06-05')).toBe('2026-06-01');
  });

  it('returns Monday for a mid-week date', () => {
    const date = new Date(2026, 5, 4, 18, 0, 0);

    expect(getWeekStart(date)).toBe('2026-06-01');
  });

  it('returns the same day when the input is already Monday', () => {
    const date = new Date(2026, 5, 1, 8, 0, 0);

    expect(getWeekStart(date)).toBe('2026-06-01');
  });

  it('treats Sunday as the end of the same week', () => {
    const date = new Date(2026, 5, 7, 22, 15, 0);

    expect(getWeekStart(date)).toBe('2026-06-01');
  });
});

describe('isIsoDateString', () => {
  it('accepts a valid ISO date string', () => {
    expect(isIsoDateString('2026-06-05')).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isIsoDateString('2026-02-30')).toBe(false);
  });

  it('rejects malformed date strings', () => {
    expect(isIsoDateString('2026-6-5')).toBe(false);
  });
});
