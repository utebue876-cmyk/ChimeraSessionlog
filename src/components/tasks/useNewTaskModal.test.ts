import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { useNewTaskModal } from './useNewTaskModal';

const createResource = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ createResource }));
const notificationsShow = vi.hoisted(() => vi.fn());
const recordPatientActivity = vi.hoisted(() => vi.fn());
const activeEpisodeState = vi.hoisted(() => ({
  activeEpisode: { resourceType: 'EpisodeOfCare', id: 'ep-1', identifier: [{ value: 'CASE-1' }] },
}));
const patientState = vi.hoisted(() => ({ resourceType: 'Patient', id: 'p1' }));
const episodeOfCareState = vi.hoisted(() => ({
  options: [{ value: 'ep-1', label: 'CASE-1' }],
  map: { 'ep-1': { resourceType: 'EpisodeOfCare', id: 'ep-1' } },
  selectedId: 'ep-1',
  setSelectedId: vi.fn(),
  isLoading: false,
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useMedplumProfile: () => ({ resourceType: 'Practitioner', id: 'pr1' }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: notificationsShow },
}));

vi.mock('../../store/episodeOfCareStore', () => ({
  useEpisodeOfCareStore: (selector: any) => selector(activeEpisodeState),
}));

vi.mock('../../hooks/usePatient', () => ({
  usePatient: () => patientState,
}));

vi.mock('../../hooks/useEpisodeOfCare', () => ({
  useEpisodeOfCare: () => episodeOfCareState,
}));

vi.mock('../../utils/patientActivity', () => ({ recordPatientActivity }));

describe('useNewTaskModal', () => {
  test('sets required field errors and warning notification when submit is invalid', async () => {
    const { result } = renderHook(() => useNewTaskModal({ opened: true, onClose: vi.fn() }));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.fieldErrors.title).toBe('Required');
    expect(result.current.fieldErrors.assignee).toBe('Required');
    expect(notificationsShow).toHaveBeenCalledWith(expect.objectContaining({ color: 'yellow' }));
  });

  test('creates task successfully and calls callbacks', async () => {
    const onClose = vi.fn();
    const onTaskCreated = vi.fn();
    createResource.mockResolvedValue({ resourceType: 'Task', id: 't1' });

    const { result } = renderHook(() => useNewTaskModal({ opened: true, onClose, onTaskCreated }));

    act(() => {
      result.current.setTitle('Follow up');
      result.current.setStatus('requested');
      result.current.setPriority('routine');
      result.current.setAssignee({ reference: 'Practitioner/pr2' });
      result.current.setTaskPatient({ reference: 'Patient/p1' });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Task', status: 'requested' }));
    expect(recordPatientActivity).toHaveBeenCalled();
    expect(onTaskCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    expect(onClose).toHaveBeenCalled();
  });
});
