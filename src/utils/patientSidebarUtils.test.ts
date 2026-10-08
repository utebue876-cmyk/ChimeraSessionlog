import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { calculateAge, calculateAgeString, killEvent } from './patientSidebarUtils';

describe('patientSidebar-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('killEvent prevents default and stops propagation', () => {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;

    killEvent(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  test('calculateAge handles birthday before and after current date', () => {
    expect(calculateAge('2000-07-01')).toBe(26);
    expect(calculateAge('2000-07-20')).toBe(25);
  });

  test('calculateAge returns null for invalid and future dates', () => {
    expect(calculateAge('not-a-date')).toBeNull();
    expect(calculateAge('3000-01-01')).toBeNull();
  });

  test('calculateAgeString returns formatted age or placeholder', () => {
    expect(calculateAgeString('2000-07-01')).toBe('Age 26');
    expect(calculateAgeString('bad')).toBe('Age --');
  });
});
