import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { ChartNoteStatus } from '../../types/encounter';
import { useEncounterHeader } from './useEncounterHeader';

const medplumState = vi.hoisted(() => ({}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useResource: (ref: any) => {
    if (ref?.reference === 'EpisodeOfCare/e1') {
      return { resourceType: 'EpisodeOfCare', id: 'e1', identifier: [{ value: 'CASE-123' }] };
    }
    if (ref?.reference === 'Appointment/a1') {
      return {
        resourceType: 'Appointment',
        id: 'a1',
        start: '2026-01-01T09:00:00Z',
        end: '2026-01-01T09:30:00Z',
        participant: [{ status: 'accepted', actor: { reference: 'Practitioner/pr1', display: 'Dr Default' } }],
      };
    }
    return undefined;
  },
}));

vi.mock('../../utils/appointmentUtils', () => ({
  getPlanDefinitionNameFromEncounter: vi.fn(async () => 'Initial Assessment'),
  getServiceTypeForAppointment: vi.fn(async () => ({ text: 'CBT' })),
}));

describe('useEncounterHeader', () => {
  const encounter = {
    resourceType: 'Encounter',
    id: 'enc-1',
    status: 'planned',
    episodeOfCare: [{ reference: 'EpisodeOfCare/e1' }],
    appointment: [{ reference: 'Appointment/a1' }],
  } as any;

  test('loads display metadata and handles tab/practitioner changes', async () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() =>
      useEncounterHeader({ encounter, chartNoteStatus: ChartNoteStatus.Unsigned, onTabChange })
    );

    await waitFor(() => {
      expect(result.current.planDefinitionName).toBe('Initial Assessment');
      expect(result.current.serviceType).toBe('CBT');
    });

    expect(result.current.caseIdentifier).toBe('CASE-123');
    expect(result.current.appointmentPractitionerName).toBe('Dr Default');

    act(() => {
      result.current.handleTabChange('history');
    });
    expect(onTabChange).toHaveBeenCalledWith('history');
    expect(result.current.activeTab).toBe('history');

    act(() => {
      result.current.handlePractitionerChanged({
        resourceType: 'Practitioner',
        id: 'p2',
        name: [{ family: 'Smith', given: ['Alex'] }],
      } as any);
    });
    expect(result.current.appointmentPractitionerName).toBe('Alex Smith');
  });

  test('status transitions and cancel confirmation flow', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useEncounterHeader({ encounter, chartNoteStatus: ChartNoteStatus.Unsigned, onStatusChange })
    );

    act(() => {
      result.current.handleStatusChange('in-progress');
    });
    expect(onStatusChange).toHaveBeenCalledWith('in-progress');
    expect(result.current.status).toBe('in-progress');

    act(() => {
      result.current.handleStatusChange('cancelled');
    });
    expect(result.current.confirmOpened).toBe(true);

    act(() => {
      result.current.confirmStatusChange();
    });
    expect(onStatusChange).toHaveBeenCalledWith('cancelled');
    expect(result.current.status).toBe('cancelled');
  });

  test('sign flow opens only when chart is not signed-and-locked', () => {
    const onSign = vi.fn();
    const { result } = renderHook(() =>
      useEncounterHeader({ encounter, chartNoteStatus: ChartNoteStatus.Unsigned, onSign })
    );

    act(() => {
      result.current.handleSign();
    });
    expect(result.current.signOpened).toBe(true);

    act(() => {
      result.current.onConfirmSign({ reference: 'Practitioner/p1' } as any, true);
    });
    expect(onSign).toHaveBeenCalledWith({ reference: 'Practitioner/p1' }, true);
    expect(result.current.signOpened).toBe(false);

    const { result: locked } = renderHook(() =>
      useEncounterHeader({ encounter, chartNoteStatus: ChartNoteStatus.SignedAndLocked, onSign })
    );
    act(() => {
      locked.current.handleSign();
    });
    expect(locked.current.signOpened).toBe(false);
  });
});
