import type { Schedule } from '@medplum/fhirtypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useFindPane } from './useFindPane';

const searchResources = vi.hoisted(() => vi.fn());
const transientSet = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources }));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('uuid', () => ({
  v4: () => 'fixed-id',
}));

vi.mock('../../hooks/useSchedulingStartsAt', () => ({
  useSchedulingStartsAt: () => new Date(0),
}));

vi.mock('../../utils/scheduling', () => ({
  SchedulingTransientIdentifier: { set: transientSet },
  getAlignmentIntervalMinutesForServiceType: () => 30,
  getDurationMinutesForServiceType: () => 30,
  getScheduleAvailabilityForServiceType: () => ({ windows: [{ dayOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'] }] }),
  getSlotServiceType: () => ({ coding: [{ code: 'svc-a' }], text: 'Service A' }),
  isSlotWithinAvailability: () => true,
  serviceTypesFromSchedulingParameters: () => [{ coding: [{ code: 'svc-a' }], text: 'Service A' }],
}));

describe('useFindPane', () => {
  const schedule: Schedule & { id: string } = {
    resourceType: 'Schedule',
    id: 'sch-1',
    actor: [{ reference: 'Practitioner/pr-1' }],
  };

  test('auto-selects single service type and generates slots', async () => {
    searchResources.mockResolvedValue([]);
    const onSuccess = vi.fn();

    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const params = { schedule, range: { start, end }, onSuccess };

    const { result } = renderHook(() => useFindPane(params));

    await waitFor(() => {
      expect(searchResources).toHaveBeenCalledWith('Appointment', expect.any(Array));
    });

    expect(result.current.serviceTypes).toHaveLength(1);
    expect(result.current.serviceType).toBeDefined();
    expect(result.current.displaySlots.length).toBeGreaterThan(0);
    expect(transientSet).toHaveBeenCalled();
  });

  test('excludes a slot that overlaps an existing appointment', async () => {
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    searchResources.mockResolvedValue([
      {
        resourceType: 'Appointment',
        status: 'booked',
        start: start.toISOString(),
      },
    ]);

    const params = { schedule, range: { start, end }, onSuccess: vi.fn() };
    const { result } = renderHook(() => useFindPane(params));

    await waitFor(() => {
      expect(searchResources).toHaveBeenCalled();
    });

    expect(result.current.displaySlots.some((slot) => slot.start === start.toISOString())).toBe(false);
  });

  test('handleDismiss and handleBookSuccess clear local state and forward success', () => {
    searchResources.mockResolvedValue([]);
    const onSuccess = vi.fn();
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const params = { schedule, range: { start, end }, onSuccess };

    const { result } = renderHook(() => useFindPane(params));

    act(() => {
      result.current.setChosenSlot({ resourceType: 'Slot', status: 'free' } as any);
    });
    expect(result.current.chosenSlot).toBeDefined();

    act(() => {
      result.current.handleDismiss();
    });
    expect(result.current.serviceType).toBeUndefined();

    act(() => {
      result.current.handleBookSuccess({ appointments: [], slots: [] });
    });

    expect(result.current.serviceType).toBeUndefined();
    expect(result.current.chosenSlot).toBeUndefined();
    expect(onSuccess).toHaveBeenCalledWith({ appointments: [], slots: [] });
  });
});
