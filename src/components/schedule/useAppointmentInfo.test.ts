import type { Appointment, Bundle, Encounter, Schedule, Slot } from '@medplum/fhirtypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAppointmentInfo } from './useAppointmentInfo';

const medplumState = vi.hoisted(() => ({
  readReference: vi.fn(),
  searchOne: vi.fn(),
  deleteResource: vi.fn(),
  get: vi.fn(),
}));

const notificationsState = vi.hoisted(() => ({
  showNotification: vi.fn(),
}));

const appointmentUtilsState = vi.hoisted(() => ({
  getPlanDefinitionNameFromEncounter: vi.fn(),
  getServiceTypeForAppointment: vi.fn(),
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('@mantine/notifications', () => ({
  showNotification: (...args: unknown[]) => notificationsState.showNotification(...args),
}));

vi.mock('../../utils/appointmentUtils', () => ({
  getPlanDefinitionNameFromEncounter: (...args: unknown[]) =>
    appointmentUtilsState.getPlanDefinitionNameFromEncounter(...args),
  getServiceTypeForAppointment: (...args: unknown[]) => appointmentUtilsState.getServiceTypeForAppointment(...args),
}));

const baseAppointment: Appointment = {
  resourceType: 'Appointment',
  id: 'app-1',
  status: 'booked',
  start: '2026-07-16T09:00:00Z',
  end: '2026-07-16T09:30:00Z',
  participant: [
    { actor: { reference: 'Patient/p1', display: 'Jane Doe' }, status: 'accepted' },
    { actor: { reference: 'Practitioner/pr1', display: 'Dr Smith' }, status: 'accepted' },
  ],
};

describe('useAppointmentInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    medplumState.searchOne.mockResolvedValue(undefined);
    medplumState.deleteResource.mockResolvedValue(undefined);
    medplumState.get.mockResolvedValue({ entry: [] });
    medplumState.readReference.mockResolvedValue(undefined);
    appointmentUtilsState.getPlanDefinitionNameFromEncounter.mockResolvedValue(undefined);
    appointmentUtilsState.getServiceTypeForAppointment.mockResolvedValue(undefined);
  });

  test('resolves displays from references and async lookups', async () => {
    const appointment: Appointment = {
      ...baseAppointment,
      supportingInformation: [{ reference: 'EpisodeOfCare/e1' }],
      basedOn: [{ reference: 'PlanDefinition/pd-1' }],
    };

    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: 'enc-1',
      status: 'planned',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
      subject: { reference: 'Patient/p1' },
    };

    medplumState.readReference.mockResolvedValue({
      resourceType: 'EpisodeOfCare',
      id: 'e1',
      identifier: [{ value: 'CASE-123' }],
    });
    appointmentUtilsState.getPlanDefinitionNameFromEncounter.mockResolvedValue('Initial Assessment');
    appointmentUtilsState.getServiceTypeForAppointment.mockResolvedValue({ text: 'Triage' });

    const { result } = renderHook(() => useAppointmentInfo({ appointment, encounter, onClose: vi.fn() }));

    await waitFor(() => {
      expect(result.current.practitionerDisplay).toBe('Dr Smith');
      expect(result.current.patientDisplay).toBe('Jane Doe');
      expect(result.current.caseDisplay).toBe('CASE-123');
      expect(result.current.serviceTypeDisplay).toBe('Triage');
      expect(result.current.careTemplateDisplay).toBe('Initial Assessment');
      expect(result.current.formattedDate).toBeTruthy();
      expect(result.current.formattedTimeRange).toContain('-');
    });
  });

  test('prefers appointment service types and does not call async fallback', async () => {
    const appointment: Appointment = {
      ...baseAppointment,
      serviceType: [{ text: 'Type A' }, { text: 'Type B' }],
    };

    const { result } = renderHook(() => useAppointmentInfo({ appointment, onClose: vi.fn() }));

    await waitFor(() => {
      expect(result.current.serviceTypeDisplay).toBe('Type A, Type B');
    });

    expect(appointmentUtilsState.getServiceTypeForAppointment).not.toHaveBeenCalled();
  });

  describe('handleDelete', () => {
    test('deletes encounter then appointment and calls onClose and onDelete', async () => {
      const onClose = vi.fn();
      const onDelete = vi.fn();

      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'enc-1',
        status: 'planned',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
      };

      const { result } = renderHook(() =>
        useAppointmentInfo({ appointment: baseAppointment, encounter, onClose, onDelete })
      );

      await act(() => result.current.handleDelete());

      expect(medplumState.deleteResource).toHaveBeenCalledWith('Encounter', 'enc-1');
      expect(medplumState.deleteResource).toHaveBeenCalledWith('Appointment', 'app-1');
      expect(onDelete).toHaveBeenCalledWith(baseAppointment);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('skips encounter deletion when no encounter is provided', async () => {
      const onClose = vi.fn();

      const { result } = renderHook(() => useAppointmentInfo({ appointment: baseAppointment, onClose }));

      await act(() => result.current.handleDelete());

      expect(medplumState.deleteResource).toHaveBeenCalledWith('Appointment', 'app-1');
      expect(medplumState.deleteResource).not.toHaveBeenCalledWith('Encounter', expect.any(String));
    });

    test('deletes all slots referenced in appointment.slot', async () => {
      const appointment: Appointment = {
        ...baseAppointment,
        slot: [{ reference: 'Slot/slot-1' }, { reference: 'Slot/slot-2' }],
      };

      const { result } = renderHook(() => useAppointmentInfo({ appointment, onClose: vi.fn() }));

      await act(() => result.current.handleDelete());

      expect(medplumState.deleteResource).toHaveBeenCalledWith('Slot', 'slot-1');
      expect(medplumState.deleteResource).toHaveBeenCalledWith('Slot', 'slot-2');
    });

    test('finds and deletes non-free buffer slots from the practitioner schedule, ignores free slots', async () => {
      const schedule: Schedule = { resourceType: 'Schedule', id: 'sched-1', actor: [] };
      const bufferSlot: Slot = {
        resourceType: 'Slot',
        id: 'buf-1',
        status: 'busy-unavailable',
        start: '2026-07-16T08:45:00Z',
        end: '2026-07-16T09:00:00Z',
        schedule: { reference: 'Schedule/sched-1' },
      };
      const freeSlot: Slot = {
        resourceType: 'Slot',
        id: 'free-1',
        status: 'free',
        start: '2026-07-16T09:30:00Z',
        end: '2026-07-16T10:00:00Z',
        schedule: { reference: 'Schedule/sched-1' },
      };

      medplumState.searchOne.mockResolvedValue(schedule);
      medplumState.get.mockResolvedValue({
        resourceType: 'Bundle',
        entry: [{ resource: bufferSlot }, { resource: freeSlot }],
      } as Bundle<Slot>);

      const { result } = renderHook(() => useAppointmentInfo({ appointment: baseAppointment, onClose: vi.fn() }));

      await act(() => result.current.handleDelete());

      expect(medplumState.searchOne).toHaveBeenCalledWith('Schedule', { actor: 'Practitioner/pr1' });
      expect(medplumState.deleteResource).toHaveBeenCalledWith('Slot', 'buf-1');
      expect(medplumState.deleteResource).not.toHaveBeenCalledWith('Slot', 'free-1');
    });

    test('does not search for buffer slots when appointment has no practitioner', async () => {
      const appointment: Appointment = {
        resourceType: 'Appointment',
        id: 'app-no-prac',
        status: 'booked',
        start: '2026-07-16T09:00:00Z',
        end: '2026-07-16T09:30:00Z',
        participant: [{ actor: { reference: 'Patient/p1' }, status: 'accepted' }],
      };

      const { result } = renderHook(() => useAppointmentInfo({ appointment, onClose: vi.fn() }));

      await act(() => result.current.handleDelete());

      expect(medplumState.deleteResource).toHaveBeenCalledWith('Appointment', 'app-no-prac');
      expect(medplumState.searchOne).not.toHaveBeenCalled();
    });

    test('shows error notification and does not call onClose on failure', async () => {
      const onClose = vi.fn();

      medplumState.deleteResource.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAppointmentInfo({ appointment: baseAppointment, onClose }));

      await act(() => result.current.handleDelete());

      expect(notificationsState.showNotification).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
      expect(onClose).not.toHaveBeenCalled();
    });

    test('exposes deleting as false initially', () => {
      const { result } = renderHook(() => useAppointmentInfo({ appointment: baseAppointment, onClose: vi.fn() }));

      expect(result.current.deleting).toBe(false);
    });
  });
});
