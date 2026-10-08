import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { resolveTaskDisplay, toTaskListItems, useTaskSearchPage } from './useTaskSearchPage';

const searchResources = vi.hoisted(() => vi.fn());
const readResource = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources, readResource }));
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

describe('useTaskSearchPage', () => {
  test('resolveTaskDisplay resolves practitioner and patient names', async () => {
    readResource.mockImplementation(async (type: string, id: string) => {
      if (type === 'Practitioner')
        return { resourceType: 'Practitioner', id, name: [{ family: 'Smith', given: ['Alex'] }] };
      if (type === 'Patient') return { resourceType: 'Patient', id, name: [{ family: 'Doe', given: ['Jane'] }] };
      return { resourceType: type, id };
    });

    await expect(resolveTaskDisplay(medplumState as any, 'Practitioner/pr1')).resolves.toBe('Alex Smith');
    await expect(resolveTaskDisplay(medplumState as any, 'Patient/p1')).resolves.toBe('Jane Doe');
    await expect(resolveTaskDisplay(medplumState as any, 'Observation/o1')).resolves.toBe('Observation/o1');
  });

  test('toTaskListItems resolves owner/for display fields', async () => {
    readResource.mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'pr1',
      name: [{ family: 'One', given: ['Dr'] }],
    });
    const items = await toTaskListItems(
      medplumState as any,
      [
        {
          resourceType: 'Task',
          id: 't1',
          status: 'requested',
          intent: 'order',
          owner: { reference: 'Practitioner/pr1' },
          for: { display: 'Patient Display' },
        },
      ] as any
    );

    expect(items[0].ownerDisplay).toBe('Dr One');
    expect(items[0].forDisplay).toBe('Patient Display');
  });

  test('loads tasks and opens patient-task route with target episode id', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    searchResources.mockResolvedValue([
      {
        resourceType: 'Task',
        id: 't1',
        status: 'requested',
        intent: 'order',
        owner: { display: 'Owner A' },
        for: { reference: 'Patient/p1', display: 'Jane Doe' },
        focus: { reference: 'EpisodeOfCare/e1' },
      },
    ]);

    const { result } = renderHook(() => useTaskSearchPage(20, [['status', 'requested']]));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks).toHaveLength(1);

    act(() => {
      result.current.handleOpenTask(result.current.tasks[0]);
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/p1/task/t1', { state: { targetEpisodeId: 'e1' } });
  });

  test('skips fetching when filters are null and supports refresh', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    const { result } = renderHook(() => useTaskSearchPage(20, null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toEqual([]);

    searchResources.mockResolvedValue([]);
    const { result: withFilters } = renderHook(() => useTaskSearchPage(20, [['status', 'requested']]));
    await waitFor(() => expect(withFilters.current.loading).toBe(false));

    act(() => {
      withFilters.current.refresh();
    });
    await waitFor(() => expect(searchResources).toHaveBeenCalled());
  });
});
