import { renderHook } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useCreateVisit } from './useCreateVisit';

const searchResources = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources }));
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const createAppointment = vi.hoisted(() => vi.fn());
const createEncounter = vi.hoisted(() => vi.fn());
const botCreateTaskReplacement = vi.hoisted(() => vi.fn());
const createBufferSlots = vi.hoisted(() => vi.fn());
const showErrorNotification = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));
vi.mock('../../utils/encounter', () => ({ createAppointment, createEncounter, botCreateTaskReplacement }));
vi.mock('../../utils/scheduling', () => ({ createBufferSlots }));
vi.mock('../../utils/notifications', () => ({ showErrorNotification }));
vi.mock('../../hooks/useAppointmentSlots', () => ({
  useAppointmentSlots: () => ({
    serviceTypes: [{ text: 'Service 1' }],
    selectedServiceTypeIndex: 0,
    setSelectedServiceTypeIndex: vi.fn(),
    selectedServiceType: { text: 'Service 1' },
    availableSlots: [],
    selectedSlotId: null,
    setSelectedSlotId: vi.fn(),
    selectedSlot: undefined,
  }),
}));

describe('useCreateVisit', () => {
  test('loads episodes and auto-selects when single result', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    searchResources.mockResolvedValue([{ resourceType: 'EpisodeOfCare', id: 'ep-1' }]);

    const { result } = renderHook(() =>
      useCreateVisit({
        appointmentSlot: { start: new Date('2026-01-01T09:00:00Z'), end: new Date('2026-01-01T09:30:00Z') },
      })
    );

    await act(async () => {
      await result.current.handlePatientChange({ resourceType: 'Patient', id: 'p1' } as any);
    });

    expect(result.current.episodes).toHaveLength(1);
    expect(result.current.selectedEpisode?.id).toBe('ep-1');
  });

  test('submits and navigates on successful creation', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    searchResources.mockResolvedValue([{ resourceType: 'EpisodeOfCare', id: 'ep-1' }]);
    createAppointment.mockResolvedValue({ resourceType: 'Appointment', id: 'a1' });
    createEncounter.mockResolvedValue({ resourceType: 'Encounter', id: 'enc-1' });

    const { result } = renderHook(() =>
      useCreateVisit({
        appointmentSlot: { start: new Date('2026-01-01T09:00:00Z'), end: new Date('2026-01-01T09:30:00Z') },
        schedule: { resourceType: 'Schedule', id: 's1' } as any,
      })
    );

    await act(async () => {
      await result.current.handlePatientChange({ resourceType: 'Patient', id: 'p1' } as any);
    });
    act(() => {
      result.current.setPlanDefinitionData({ resourceType: 'PlanDefinition', id: 'pd1' } as any);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createAppointment).toHaveBeenCalled();
    expect(botCreateTaskReplacement).toHaveBeenCalled();
    expect(createBufferSlots).toHaveBeenCalled();
    expect(createEncounter).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/Patient/p1/Encounter/enc-1');
    expect(showErrorNotification).not.toHaveBeenCalled();
  });
});
