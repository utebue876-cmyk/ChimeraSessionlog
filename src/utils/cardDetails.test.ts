import { describe, expect, test } from 'vitest';
import { digitsOnly, formatCardNumber, formatPostcode } from './cardDetails';

describe('cardDetails', () => {
  test('formatCardNumber strips non-digits, caps at 16 digits, and groups by 4', () => {
    expect(formatCardNumber('1234-5678 9012 3456 7890')).toBe('1234 5678 9012 3456');
    expect(formatCardNumber('abcd')).toBe('');
  });

  test('digitsOnly strips non-digits and enforces max length', () => {
    expect(digitsOnly('ab12-34cd', 3)).toBe('123');
    expect(digitsOnly('9999', 10)).toBe('9999');
  });

  test('formatPostcode uppercases, strips invalid chars, and inserts inward-code space', () => {
    expect(formatPostcode('sw1a1aa')).toBe('SW1A 1AA');
    expect(formatPostcode('m1!1ae')).toBe('M1 1AE');
    expect(formatPostcode('ab')).toBe('AB');
  });
});
