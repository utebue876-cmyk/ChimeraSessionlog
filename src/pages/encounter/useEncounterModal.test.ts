import { renderHook } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useEncounterModal } from './useEncounterModal';

const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const medplumState = vi.hoisted(() => ({
  getProfile: vi.fn(() => ({ resourceType: 'Practitioner', id: 'pr1' })),
  searchOne: vi.fn().mockResolvedValue({ resourceType: 'Schedule', id: 's1' }),
  updateResource: vi.fn().mockResolvedValue({}),
}));
const showNotification = vi.hoisted(() => vi.fn());
const createAppointment = vi.hoisted(() => vi.fn());
const createEncounter = vi.hoisted(() => vi.fn());
const botCreateTaskReplacement = vi.hoisted(() => vi.fn());
const createBufferSlots = vi.hoisted(() => vi.fn());
const recordPatientActivity = vi.hoisted(() => vi.fn());
const appointmentSlotsState = vi.hoisted(() => ({
  serviceTypes: [{ text: 'Svc' }] as { text: string }[],
  selectedServiceTypeIndex: undefined as number | undefined,
  setSelectedServiceTypeIndex: vi.fn(),
  selectedServiceType: undefined as { text: string } | undefined,
  availableSlots: [] as unknown[],
  selectedSlotId: null as string | null,
  setSelectedSlotId: vi.fn(),
  selectedSlot: undefined as { start: string; end: string } | undefined,
}));

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));
vi.mock('@mantine/notifications', () => ({ showNotification }));
vi.mock('../../hooks/usePatient', () => ({ usePatient: () => ({ resourceType: 'Patient', id: 'p1' }) }));
vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => ({ activeEpisode: { resourceType: 'EpisodeOfCare', id: 'ep1' } }),
}));
vi.mock('../../utils/encounter', () => ({ createAppointment, createEncounter, botCreateTaskReplacement }));
vi.mock('../../utils/scheduling', () => ({ createBufferSlots }));
vi.mock('../../utils/patientActivity', () => ({ recordPatientActivity }));

vi.mock('../../hooks/useAppointmentSlots', () => ({
  useAppointmentSlots: () => appointmentSlotsState,
}));

describe('useEncounterModal', () => {
  test('validates required fields on submit', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);

    const { result } = renderHook(() => useEncounterModal({ opened: true, onClose: vi.fn() }));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.fieldErrors.serviceType).toBe('Required');
    expect(result.current.fieldErrors.selectedSlot).toBe('Required');
    expect(result.current.fieldErrors.planDefinitionData).toBe('Required');
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ color: 'yellow' }));
  });

  test('handleClose navigates back when no onClose provided', () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    const { result } = renderHook(() => useEncounterModal({ opened: undefined, onClose: undefined }));

    act(() => {
      result.current.handleClose();
    });

    expect(navigate).toHaveBeenCalledWith(-1);
    expect(result.current.isOpen).toBe(false);
  });

  test('completes the schedule assessment task that opened the modal once the encounter is created', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    appointmentSlotsState.serviceTypes = [];
    appointmentSlotsState.selectedSlot = { start: '2024-01-01T10:00:00.000Z', end: '2024-01-01T11:00:00.000Z' };
    createAppointment.mockResolvedValue({ resourceType: 'Appointment', id: 'appt1' });
    createEncounter.mockResolvedValue({ resourceType: 'Encounter', id: 'enc1' });
    botCreateTaskReplacement.mockResolvedValue({ resourceType: 'Task', id: 'notif1' });

    const scheduleAssessmentTask = {
      resourceType: 'Task',
      id: 'task1',
      status: 'requested',
      intent: 'order',
      identifier: [
        { system: 'http://fhir.chimera.health/identifier/case-task', value: 'CR-00000001:schedule-assessment' },
      ],
    } as const;

    const { result } = renderHook(() =>
      useEncounterModal({ opened: true, onClose: vi.fn(), scheduleAssessmentTask: scheduleAssessmentTask as any })
    );

    act(() => {
      result.current.setPlanDefinitionData({ resourceType: 'PlanDefinition', id: 'plan1', status: 'active' } as any);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(medplumState.updateResource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task1', status: 'completed' })
    );
    expect(navigate).toHaveBeenCalledWith('/Patient/p1/Encounter/enc1');
  });
});
