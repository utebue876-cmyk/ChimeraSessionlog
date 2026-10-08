import { useMedplum } from '@medplum/react';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useServiceSchedulePage } from './useServiceSchedulePage';

vi.mock('@medplum/react', () => ({
  useMedplum: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../../utils/notifications', () => ({
  showErrorNotification: vi.fn(),
}));

vi.mock('../../utils/scheduling', () => ({
  SchedulingTransientIdentifier: { set: vi.fn() },
  getAlignmentIntervalMinutesForServiceType: vi.fn(() => 30),
  getDurationMinutesForServiceType: vi.fn(() => 30),
  getScheduleAvailabilityForServiceType: vi.fn(() => ({ windows: [] })),
  getSlotServiceType: vi.fn(() => ({ text: 'Service' })),
  isSlotWithinAvailability: vi.fn(() => true),
  serviceTypesFromSchedulingParameters: vi.fn((schedule: any) => schedule.serviceType ?? []),
}));

describe('useServiceSchedulePage', () => {
  const navigateSpy = vi.fn();
  const medplum = {
    searchResources: vi.fn(),
    readResource: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigateSpy);
    vi.mocked(useMedplum).mockReturnValue(medplum as any);

    medplum.searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'Schedule') {
        return [
          {
            resourceType: 'Schedule',
            id: 'sch-1',
            actor: [{ reference: 'Practitioner/pr-1' }],
            serviceType: [{ coding: [{ code: 'svc-1', display: 'Service A' }] }],
          },
        ];
      }
      if (resourceType === 'Appointment') {
        return [];
      }
      if (resourceType === 'Encounter') {
        return [];
      }
      return [];
    });

    medplum.readResource.mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'pr-1',
      name: [{ family: 'Smith', given: ['John'] }],
    });
  });

  test('loads service type options from schedules and loads practitioners after selecting service type', async () => {
    const { result } = renderHook(() => useServiceSchedulePage());

    await waitFor(() => {
      expect(result.current.serviceTypeOptions.length).toBeGreaterThan(0);
    });

    const key = result.current.serviceTypeOptions[0].key;
    act(() => {
      result.current.setSelectedServiceTypeKey(key);
    });

    await waitFor(() => {
      expect(result.current.practitioners.length).toBe(1);
    });

    act(() => {
      result.current.selectPractitioner(result.current.practitioners[0]);
    });

    expect(result.current.selectedPractitioner?.id).toBe('pr-1');
    expect(result.current.selectedSchedule?.id).toBe('sch-1');
  });

  test('opens booking drawer only for free slots', () => {
    const { result } = renderHook(() => useServiceSchedulePage());

    act(() => {
      result.current.handleSelectSlot({ resourceType: 'Slot', status: 'busy' } as any);
    });
    expect(result.current.bookingDrawerOpen).toBe(false);

    act(() => {
      result.current.handleSelectSlot({ resourceType: 'Slot', status: 'free' } as any);
    });
    expect(result.current.bookingDrawerOpen).toBe(true);
  });

  test('book success updates appointments and opens appointment details', () => {
    const { result } = renderHook(() => useServiceSchedulePage());
    const newAppointment = { resourceType: 'Appointment', id: 'appt-1' } as any;

    act(() => {
      result.current.handleBookSuccess({ appointments: [newAppointment], slots: [] });
    });

    expect(result.current.appointments).toEqual([newAppointment]);
    expect(result.current.bookingDrawerOpen).toBe(false);
    expect(result.current.appointmentDetailsOpen).toBe(true);
    expect(result.current.appointmentDetails?.id).toBe('appt-1');
  });
});
