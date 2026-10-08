import { describe, expect, test } from 'vitest';
import { formatDateTimeHhMm, toUpperAmPm } from './timeUtils';

describe('timeUtils', () => {
  describe('formatDateTimeHhMm', () => {
    test('formats a Date instance as dd/mm/yyyy hh:mm', () => {
      const date = new Date(2024, 0, 5, 9, 7);
      expect(formatDateTimeHhMm(date)).toBe('05/01/2024 09:07');
    });

    test('formats a valid ISO string', () => {
      expect(formatDateTimeHhMm('2024-01-05T09:07:00')).toBe('05/01/2024 09:07');
    });

    test('returns empty string for invalid input', () => {
      expect(formatDateTimeHhMm('not-a-date')).toBe('');
    });
  });

  describe('toUpperAmPm', () => {
    test('uppercases am/pm tokens', () => {
      expect(toUpperAmPm('starts at 9:00 am and ends at 5:00 pm')).toBe('starts at 9:00 AM and ends at 5:00 PM');
    });

    test('keeps unrelated words unchanged', () => {
      expect(toUpperAmPm('example amount ramp')).toBe('example amount ramp');
    });
  });
});
