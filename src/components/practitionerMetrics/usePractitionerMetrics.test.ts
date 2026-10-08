import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { usePractitionerMetrics } from './usePractitionerMetrics';

describe('usePractitionerMetrics', () => {
  test('rounds weekly percentages so they total 100%', () => {
    const slots = [
      {
        resourceType: 'Slot',
        id: 'slot-1',
        status: 'busy-unavailable',
        start: '2026-08-03T09:00:00Z',
        end: '2026-08-03T17:00:00Z',
        comment: 'Other',
      },
    ] as any;

    const appointments = [
      {
        resourceType: 'Appointment',
        id: 'appt-1',
        start: '2026-08-04T09:00:00Z',
        end: '2026-08-04T10:00:00Z',
      },
    ] as any;

    const { result } = renderHook(() => usePractitionerMetrics(slots, appointments, undefined));

    const percentages = result.current.metrics.map((row) => row.weeklyPercent);
    expect(percentages).toEqual([3, 0, 0, 0, 0, 20, 77]);
    expect(percentages.reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});
