import type { Schedule } from '@medplum/fhirtypes';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { useAppointmentSlots } from './useAppointmentSlots';

const get = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ get }));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('../utils/scheduling', () => ({
  SchedulingTransientIdentifier: {
    set: vi.fn((slot: any) => {
      slot.__id = slot.start;
    }),
    get: vi.fn((slot: any) => slot.__id ?? slot.start),
  },
  getServiceTypeReference: () => 'ValueSet/svc-1',
  serviceTypesFromSchedulingParameters: () => [{ coding: [{ code: 'svc-1' }], text: 'Service 1' }],
}));

describe('useAppointmentSlots', () => {
  const schedule: Schedule = {
    resourceType: 'Schedule',
    id: 'sch-1',
    actor: [],
  };

  test('auto-selects single service type and loads mapped available slots', async () => {
    get.mockResolvedValue({
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            status: 'proposed',
            start: '2026-01-01T09:00:00Z',
            end: '2026-01-01T09:30:00Z',
            serviceType: [{ text: 'Service 1' }],
          },
        },
      ],
    });

    const { result } = renderHook(() => useAppointmentSlots({ schedule, appointmentDate: '2026-01-01' }));

    await waitFor(() => expect(result.current.availableSlots.length).toBe(1));

    expect(result.current.serviceTypes).toHaveLength(1);
    expect(result.current.selectedServiceTypeIndex).toBe(0);
    expect(result.current.selectedSlot).toBeDefined();
  });

  test('allows selecting slot id manually', async () => {
    get.mockResolvedValue({ entry: [] });
    const { result } = renderHook(() => useAppointmentSlots({ schedule, appointmentDate: '2026-01-02' }));

    await waitFor(() => expect(result.current.availableSlots).toEqual([]));

    act(() => {
      result.current.setSelectedSlotId('abc');
    });
    expect(result.current.selectedSlotId).toBe('abc');
  });
});
