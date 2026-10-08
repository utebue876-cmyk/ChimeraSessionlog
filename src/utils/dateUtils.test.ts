import { describe, expect, test } from 'vitest';
import { isValidIsoDate } from './dateUtils';

describe('isValidIsoDate', () => {
  test('accepts valid YYYY-MM-DD calendar dates', () => {
    expect(isValidIsoDate('2024-01-01')).toBe(true);
    expect(isValidIsoDate('1990-12-31')).toBe(true);
    expect(isValidIsoDate('2000-02-29')).toBe(true); // leap year
  });

  test('rejects dates that do not exist on the calendar', () => {
    expect(isValidIsoDate('2023-02-29')).toBe(false); // not a leap year
    expect(isValidIsoDate('2024-02-30')).toBe(false);
    expect(isValidIsoDate('2024-13-01')).toBe(false);
    expect(isValidIsoDate('2024-00-10')).toBe(false);
    expect(isValidIsoDate('2024-04-31')).toBe(false);
  });

  test('rejects values that are not in YYYY-MM-DD format', () => {
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate('2024/01/01')).toBe(false);
    expect(isValidIsoDate('24-01-01')).toBe(false);
    expect(isValidIsoDate('not-a-date')).toBe(false);
    expect(isValidIsoDate('2024-1-1')).toBe(false);
  });
});
