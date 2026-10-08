import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useEncountersPage } from './useEncountersPage';

const searchResources = vi.hoisted(() => vi.fn());
const readReference = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources, readReference }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => ({ activeEpisode: { resourceType: 'EpisodeOfCare', id: 'ep-1', status: 'active' } }),
}));

vi.mock('../../utils/appointmentUtils', () => ({
  getPlanDefinitionNameFromEncounter: vi.fn(async () => 'Initial Assessment'),
  getServiceTypeForAppointment: vi.fn(async () => ({ text: 'CBT' })),
}));

describe('useEncountersPage', () => {
  test('loads encounters and resolves related appointment/practitioner data', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);

    searchResources.mockResolvedValue([
      {
        resourceType: 'Encounter',
        id: 'enc-1',
        status: 'finished',
        appointment: [{ reference: 'Appointment/a1' }],
        participant: [{ individual: { reference: 'Practitioner/pr1' } }],
      },
    ]);
    readReference.mockImplementation(async (ref: any) => {
      if (ref.reference === 'Appointment/a1') {
        return { resourceType: 'Appointment', id: 'a1', status: 'booked', start: '2026-01-01T09:00:00Z' };
      }
      if (ref.reference === 'Practitioner/pr1') {
        return { resourceType: 'Practitioner', id: 'pr1', name: [{ family: 'Smith', given: ['Alex'] }] };
      }
      return undefined;
    });

    const { result } = renderHook(() => useEncountersPage(20));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.encounters).toHaveLength(1);
    expect(result.current.planDefinitionNames['enc-1']).toBe('Initial Assessment');
    expect(result.current.sortedEncounters[0].serviceType).toEqual({ text: 'CBT' });
  });

  test('navigates to encounter detail and create encounter routes', () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p2' } as any);
    searchResources.mockResolvedValue([]);

    const { result } = renderHook(() => useEncountersPage(20));

    act(() => {
      result.current.handleOpenEncounter('enc-99');
      result.current.handleCreateAppointment();
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/p2/Encounter/enc-99');
    expect(navigate).toHaveBeenCalledWith('/Patient/p2/Encounter/new');
  });
});
