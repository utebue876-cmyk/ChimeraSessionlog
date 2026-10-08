import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { useChangePractitionerModal } from './useChangePractitionerModal';

const medplumState = vi.hoisted(() => ({
  searchResources: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue({ entry: [] }),
  readResource: vi.fn(),
  searchOne: vi.fn(),
  patchResource: vi.fn(),
  deleteResource: vi.fn(),
}));

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));
vi.mock('@mantine/notifications', () => ({ showNotification: vi.fn() }));
vi.mock('../../utils/appointmentUtils', () => ({
  getServiceTypeForAppointment: vi.fn(async () => ({ text: 'CBT' })),
}));
vi.mock('../../utils/scheduling', () => ({
  getServiceTypeReference: () => 'ValueSet/svc-1',
  SchedulingTransientIdentifier: { set: vi.fn() },
}));

describe('useChangePractitionerModal', () => {
  const appointment = {
    resourceType: 'Appointment',
    id: 'a1',
    status: 'booked',
    start: '2026-01-01T09:00:00Z',
    end: '2026-01-01T09:30:00Z',
    participant: [{ status: 'accepted', actor: { reference: 'Practitioner/pr1' } }],
  } as any;

  test('computes labels and validates submit when practitioner is not selected', async () => {
    const { result } = renderHook(() =>
      useChangePractitionerModal({
        appointment,
        encounter: { resourceType: 'Encounter', id: 'e1', status: 'planned' } as any,
        opened: false,
        onClose: vi.fn(),
      })
    );

    await waitFor(() => expect(result.current.serviceTypeLabel).toBe('CBT'));
    expect(result.current.timeSlotLabel).toContain('09:00');

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.practitionerError).toBe('Please select a practitioner');
  });

  test('handleClose clears selected practitioner and calls onClose', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useChangePractitionerModal({
        appointment,
        encounter: { resourceType: 'Encounter', id: 'e1', status: 'planned' } as any,
        opened: false,
        onClose,
      })
    );

    act(() => {
      result.current.setPractitioner({ resourceType: 'Practitioner', id: 'p2' } as any);
    });
    expect(result.current.practitioner?.id).toBe('p2');

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.practitioner).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
  });
});
