import { describe, expect, test } from 'vitest';
import { isValidEmail, isValidUkPostcode } from './emailUtils';

describe('emailUtils', () => {
  describe('isValidEmail', () => {
    test('accepts valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('first.last+tag@sub.example.co.uk')).toBe(true);
    });

    test('trims whitespace before validation', () => {
      expect(isValidEmail('  user@example.com  ')).toBe(true);
    });

    test('rejects invalid email addresses', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUkPostcode', () => {
    test('accepts valid UK postcodes', () => {
      expect(isValidUkPostcode('SW1A 1AA')).toBe(true);
      expect(isValidUkPostcode('M11AE')).toBe(true);
    });

    test('trims whitespace and is case-insensitive', () => {
      expect(isValidUkPostcode('  sw1a 1aa  ')).toBe(true);
    });

    test('rejects invalid UK postcodes', () => {
      expect(isValidUkPostcode('12345')).toBe(false);
      expect(isValidUkPostcode('ABCDE')).toBe(false);
      expect(isValidUkPostcode('')).toBe(false);
    });
  });
});
