import type { WithId } from '@medplum/core';
import type { Encounter, Practitioner, Provenance, Reference, Task } from '@medplum/fhirtypes';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ChartNoteStatus } from '../../types/encounter';
import { useEncounterChart } from './useEncounterChart';

const medplumMock = vi.hoisted(() => ({
  searchResources: vi.fn(),
  updateResource: vi.fn(),
  createResource: vi.fn(),
}));

const useEncounterChartDataMock = vi.hoisted(() => vi.fn());
const debouncedUpdateResourceMock = vi.hoisted(() => vi.fn());
const updateEncounterStatusMock = vi.hoisted(() => vi.fn());
const showErrorNotificationMock = vi.hoisted(() => vi.fn());
const recordPatientActivityMock = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumMock,
}));

vi.mock('../../hooks/useEncounterChartData', () => ({
  useEncounterChartData: (...args: any[]) => useEncounterChartDataMock(...args),
}));

vi.mock('../../hooks/useDebouncedUpdateResource', () => ({
  useDebouncedUpdateResource: () => debouncedUpdateResourceMock,
}));

vi.mock('../../utils/encounter', () => ({
  updateEncounterStatus: (...args: any[]) => updateEncounterStatusMock(...args),
}));

vi.mock('../../utils/notifications', () => ({
  showErrorNotification: (...args: any[]) => showErrorNotificationMock(...args),
}));

vi.mock('../../utils/patientActivity', () => ({
  recordPatientActivity: (...args: any[]) => recordPatientActivityMock(...args),
}));

const encounter: WithId<Encounter> = {
  resourceType: 'Encounter',
  id: 'enc-1',
  status: 'in-progress',
  class: { code: 'AMB' },
  subject: { reference: 'Patient/p1' },
};

const practitionerRef: Reference<Practitioner> = { reference: 'Practitioner/prac-1' };

function makeHookData(overrides?: Record<string, unknown>): any {
  return {
    encounter,
    patient: { resourceType: 'Patient', id: 'p1' },
    claim: undefined,
    practitioner: { resourceType: 'Practitioner', id: 'prac-1' },
    tasks: [
      { resourceType: 'Task', id: 't1', status: 'in-progress', intent: 'order' },
      { resourceType: 'Task', id: 't2', status: 'completed', intent: 'order' },
    ] as Task[],
    clinicalImpression: {
      resourceType: 'ClinicalImpression',
      id: 'ci-1',
      status: 'in-progress',
      subject: { reference: 'Patient/p1' },
      note: [{ text: 'Initial note' }],
    },
    chargeItems: [],
    appointment: { resourceType: 'Appointment', id: 'a1', status: 'booked', participant: [] },
    setEncounter: vi.fn(),
    setClaim: vi.fn(),
    setPractitioner: vi.fn(),
    setTasks: vi.fn(),
    setClinicalImpression: vi.fn(),
    setChargeItems: vi.fn(),
    ...overrides,
  };
}

describe('useEncounterChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    medplumMock.searchResources.mockResolvedValue([]);
    medplumMock.updateResource.mockImplementation(async (resource: any) => resource);
    medplumMock.createResource.mockImplementation(async (resource: any) => ({ ...resource, id: 'prov-1' }));
    updateEncounterStatusMock.mockResolvedValue({ ...encounter, status: 'finished' });
    debouncedUpdateResourceMock.mockResolvedValue(undefined);
    useEncounterChartDataMock.mockReturnValue(makeHookData());
  });

  test('defaults to notes tab and updates tab', () => {
    const { result } = renderHook(() => useEncounterChart(encounter));

    expect(result.current.activeTab).toBe('notes');

    act(() => {
      result.current.handleTabChange('details');
    });

    expect(result.current.activeTab).toBe('details');
  });

  test('loads provenance and sets signed/locked status when impression is completed', async () => {
    const provenance: Provenance = {
      resourceType: 'Provenance',
      id: 'prov-1',
      target: [{ reference: 'Encounter/enc-1' }],
      recorded: new Date().toISOString(),
      agent: [{ who: { reference: 'Practitioner/prac-1' } }],
    };

    medplumMock.searchResources.mockResolvedValue([provenance]);
    useEncounterChartDataMock.mockReturnValue(
      makeHookData({
        clinicalImpression: {
          resourceType: 'ClinicalImpression',
          id: 'ci-1',
          status: 'completed',
          subject: { reference: 'Patient/p1' },
        },
      })
    );

    const { result } = renderHook(() => useEncounterChart(encounter));

    await waitFor(() => {
      expect(result.current.provenances).toHaveLength(1);
      expect(result.current.chartNoteStatus).toBe(ChartNoteStatus.SignedAndLocked);
    });
  });

  test('updates note and records patient activity', async () => {
    const { result } = renderHook(() => useEncounterChart(encounter));

    await act(async () => {
      await result.current.handleChartNoteChange({ target: { value: 'Updated note' } } as any);
    });

    expect(debouncedUpdateResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({ note: [{ text: 'Updated note' }] })
    );
    expect(recordPatientActivityMock).toHaveBeenCalledWith(medplumMock, 'p1');
    expect(result.current.chartNote).toBe('Updated note');
  });

  test('updates encounter status and writes activity', async () => {
    const hookData = makeHookData();
    useEncounterChartDataMock.mockReturnValue(hookData);

    const { result } = renderHook(() => useEncounterChart(encounter));

    await act(async () => {
      await result.current.handleEncounterStatusChange('finished');
    });

    expect(updateEncounterStatusMock).toHaveBeenCalledWith(
      medplumMock,
      encounter,
      expect.objectContaining({ resourceType: 'Appointment' }),
      'finished'
    );
    expect(hookData.setEncounter).toHaveBeenCalledWith(expect.objectContaining({ status: 'finished' }));
    expect(recordPatientActivityMock).toHaveBeenCalledWith(medplumMock, 'p1');
  });

  test('sign with lock completes pending tasks, clinical impression, and sets signed/locked', async () => {
    const hookData = makeHookData();
    useEncounterChartDataMock.mockReturnValue(hookData);

    const { result } = renderHook(() => useEncounterChart(encounter));

    await act(async () => {
      await result.current.handleSign(practitionerRef, true);
    });

    expect(medplumMock.updateResource).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', status: 'completed' }));
    expect(medplumMock.updateResource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ci-1', status: 'completed' })
    );
    expect(medplumMock.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'Provenance',
        target: [{ reference: 'Encounter/enc-1' }],
      })
    );
    expect(hookData.setTasks).toHaveBeenCalled();
    expect(hookData.setClinicalImpression).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(result.current.chartNoteStatus).toBe(ChartNoteStatus.SignedAndLocked);
  });

  test('updateTaskList delegates to task setter', () => {
    const hookData = makeHookData();
    useEncounterChartDataMock.mockReturnValue(hookData);

    const { result } = renderHook(() => useEncounterChart(encounter));

    act(() => {
      result.current.updateTaskList({
        resourceType: 'Task',
        id: 't1',
        status: 'completed',
        intent: 'order',
      } as WithId<Task>);
    });

    expect(hookData.setTasks).toHaveBeenCalledWith(expect.any(Function));
  });
});
