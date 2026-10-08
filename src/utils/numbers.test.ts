import { afterEach, describe, expect, test, vi } from 'vitest';
import { generate6DigitRandomNumber } from './numbers';

describe('numbers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns exactly 6 digits', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1712345678901);
    vi.spyOn(Math, 'random').mockReturnValue(0.42);

    const result = generate6DigitRandomNumber();

    expect(result).toMatch(/^\d{6}$/);
  });

  test('uses timestamp suffix and random suffix with zero padding', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890123);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(generate6DigitRandomNumber()).toBe('012300');
  });

  test('handles upper random bound', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890123);
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);

    expect(generate6DigitRandomNumber()).toBe('012399');
  });
});
