import { act, renderHook, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { describe, expect, test, vi } from 'vitest';
import { useSelfReferralAppointment } from './useSelfReferralAppointment';

const searchResources = vi.hoisted(() => vi.fn());
const setStep = vi.hoisted(() => vi.fn());
const setAppointmentDetails = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources }));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector({ setStep, setAppointmentDetails }),
}));

vi.mock('../../utils/scheduling', () => ({
  getDurationMinutesForServiceType: () => 30,
  getScheduleAvailabilityForServiceType: () => ({ windows: [{ dayOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'] }] }),
  getSlotServiceType: () => ({ coding: [{ code: 'test' }] }),
  isSlotWithinAvailability: () => true,
  SchedulingTransientIdentifier: { set: vi.fn() },
  serviceTypesFromSchedulingParameters: () => [{ coding: [{ code: 'test' }] }],
}));

describe('useSelfReferralAppointment', () => {
  test('loads schedules and supports week navigation', async () => {
    searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'Schedule') {
        return [{ resourceType: 'Schedule', id: 's1', actor: [{ reference: 'Practitioner/p1' }] }];
      }
      if (resourceType === 'Appointment') {
        return [];
      }
      return [];
    });

    const { result } = renderHook(() => useSelfReferralAppointment());
    await waitFor(() => expect(searchResources).toHaveBeenCalled());

    act(() => {
      result.current.goForward();
    });
    expect(result.current.canGoBack).toBe(true);
  });

  test('confirm with no selected slot does not advance', () => {
    searchResources.mockResolvedValue([]);
    const { result } = renderHook(() => useSelfReferralAppointment());
    act(() => {
      result.current.handleConfirm();
    });
    expect(setStep).not.toHaveBeenCalledWith(4);
  });

  test('excludes blocked slots from generated available times', async () => {
    const monday = dayjs()
      .subtract(dayjs().day() === 0 ? 6 : dayjs().day() - 1, 'day')
      .startOf('day');
    const blockedStart = monday.hour(9).minute(0).second(0).millisecond(0).toDate();
    const blockedEnd = monday.hour(9).minute(30).second(0).millisecond(0).toDate();

    searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'Schedule') {
        return [{ resourceType: 'Schedule', id: 's1', actor: [{ reference: 'Practitioner/p1' }] }];
      }
      if (resourceType === 'Appointment') {
        return [];
      }
      if (resourceType === 'Slot') {
        return [
          {
            resourceType: 'Slot',
            id: 'blocked-1',
            status: 'busy-unavailable',
            start: blockedStart.toISOString(),
            end: blockedEnd.toISOString(),
            schedule: { reference: 'Schedule/s1' },
          },
        ];
      }
      return [];
    });

    const { result } = renderHook(() => useSelfReferralAppointment());
    await waitFor(() => expect(searchResources).toHaveBeenCalledWith('Slot', expect.any(Array)));

    const mondayIso = monday.format('YYYY-MM-DD');
    const mondayColumn = result.current.dayColumns.find((column) => column.date.format('YYYY-MM-DD') === mondayIso);
    expect(mondayColumn?.timeSlots.some((slot) => slot.timeLabel === '09:00')).toBe(false);
  });
});
