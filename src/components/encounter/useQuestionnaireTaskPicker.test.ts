import type { WithId } from '@medplum/core';
import type { Encounter, Patient, Practitioner, Task } from '@medplum/fhirtypes';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useQuestionnaireTaskPicker } from './useQuestionnaireTaskPicker';

const medplumMock = vi.hoisted(() => ({
  searchResources: vi.fn(),
  createResource: vi.fn(),
}));

const showErrorNotificationMock = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumMock,
}));

vi.mock('../../utils/notifications', () => ({
  showErrorNotification: (...args: any[]) => showErrorNotificationMock(...args),
}));

const encounter: WithId<Encounter> = {
  resourceType: 'Encounter',
  id: 'enc-1',
  status: 'in-progress',
  class: { code: 'AMB' },
  subject: { reference: 'Patient/p1' },
};

const patient: WithId<Patient> = {
  resourceType: 'Patient',
  id: 'p1',
};

const practitioner: WithId<Practitioner> = {
  resourceType: 'Practitioner',
  id: 'prac-1',
};

describe('useQuestionnaireTaskPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    medplumMock.searchResources.mockResolvedValue([
      { resourceType: 'Questionnaire', id: 'q-1', status: 'active', title: 'Mood Assessment' },
      { resourceType: 'Questionnaire', id: 'q-2', status: 'active', title: 'Anxiety Screening' },
    ]);
    medplumMock.createResource.mockImplementation(async (resource: any) => ({
      ...resource,
      id: 'task-new',
    }));
  });

  test('loads questionnaires and excludes ones already represented by existing tasks', async () => {
    const existingTasks: WithId<Task>[] = [
      {
        resourceType: 'Task',
        id: 'task-1',
        status: 'in-progress',
        intent: 'order',
        focus: { reference: 'Questionnaire/q-2' },
      },
    ];

    const { result } = renderHook(() =>
      useQuestionnaireTaskPicker({
        encounter,
        patient,
        practitioner,
        existingTasks,
        onTaskCreated: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(result.current.options.map((o) => o.label)).toContain('Mood Assessment');
      expect(result.current.options.map((o) => o.label)).not.toContain('Anxiety Screening');
    });
  });

  test('creates a persisted task and calls onTaskCreated', async () => {
    const onTaskCreated = vi.fn();

    const { result } = renderHook(() =>
      useQuestionnaireTaskPicker({
        encounter,
        patient,
        practitioner,
        existingTasks: [],
        onTaskCreated,
      })
    );

    await waitFor(() => {
      expect(result.current.options.length).toBeGreaterThan(1);
    });

    act(() => {
      result.current.setSelectedQuestionnaireId('q-1');
    });

    await act(async () => {
      await result.current.handleCreateTask();
    });

    expect(medplumMock.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'Task',
        status: 'draft',
        intent: 'order',
        encounter: { reference: 'Encounter/enc-1' },
        for: { reference: 'Patient/p1' },
        owner: { reference: 'Practitioner/prac-1' },
        focus: { reference: 'Questionnaire/q-1' },
      })
    );
    expect(onTaskCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-new' }));
    expect(result.current.selectedQuestionnaireId).toBe('');
  });

  test('reports fetch error', async () => {
    medplumMock.searchResources.mockRejectedValueOnce(new Error('boom'));

    renderHook(() =>
      useQuestionnaireTaskPicker({
        encounter,
        patient,
        practitioner,
        existingTasks: [],
        onTaskCreated: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(showErrorNotificationMock).toHaveBeenCalled();
    });
  });
});
