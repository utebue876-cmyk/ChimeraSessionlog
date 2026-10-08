import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useEpisodeTasksPage } from './useEpisodeTasksPage';

const searchResources = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources }));
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useSubscription: vi.fn(),
}));

vi.mock('./useActiveEpisode', () => ({
  useActiveEpisode: () => ({
    activeEpisode: {
      resourceType: 'EpisodeOfCare',
      id: 'ep-1',
      identifier: [{ value: 'CASE-1' }],
    },
  }),
}));

vi.mock('./useTaskSearchPage', () => ({
  toTaskListItems: async (_medplum: any, tasks: any[]) =>
    tasks.map((task) => ({ task, ownerDisplay: task.owner?.display ?? '', forDisplay: task.for?.display ?? '' })),
}));

describe('useEpisodeTasksPage', () => {
  test('filters tasks to current patient+episode and opens task route', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);

    searchResources.mockResolvedValue([
      {
        resourceType: 'Task',
        id: 't1',
        status: 'requested',
        intent: 'order',
        for: { reference: 'Patient/p1' },
        focus: { reference: 'EpisodeOfCare/ep-1' },
      },
      {
        resourceType: 'Task',
        id: 't2',
        status: 'requested',
        intent: 'order',
        for: { reference: 'Patient/other' },
        focus: { reference: 'EpisodeOfCare/ep-1' },
      },
    ]);

    const { result } = renderHook(() => useEpisodeTasksPage(20));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].task.id).toBe('t1');
    expect(result.current.episodeIdentifier).toBe('CASE-1');

    act(() => {
      result.current.handleOpenTask(result.current.tasks[0]);
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/p1/task/t1', { state: { targetEpisodeId: 'ep-1' } });
  });
});
