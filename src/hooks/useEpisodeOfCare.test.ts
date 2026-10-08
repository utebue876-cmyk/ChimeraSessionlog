import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useEpisodeOfCare } from './useEpisodeOfCare';

const searchResources = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources }));
const notificationsShow = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: notificationsShow },
}));

describe('useEpisodeOfCare', () => {
  test('returns empty state when patientRef is undefined', async () => {
    const { result } = renderHook(() => useEpisodeOfCare(undefined));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(result.current.selectedId).toBeNull();
  });

  test('loads episodes and auto-selects when exactly one result exists', async () => {
    searchResources.mockResolvedValue([
      {
        resourceType: 'EpisodeOfCare',
        id: 'ep-1',
        identifier: [{ value: 'CASE-1' }],
      },
    ]);

    const { result } = renderHook(() => useEpisodeOfCare('Patient/p1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchResources).toHaveBeenCalledWith('EpisodeOfCare', { patient: 'Patient/p1' });
    expect(result.current.options).toEqual([{ value: 'ep-1', label: 'CASE-1' }]);
    expect(result.current.map['ep-1']).toEqual(expect.objectContaining({ id: 'ep-1' }));
    expect(result.current.selectedId).toBe('ep-1');
  });

  test('shows notification on load error', async () => {
    searchResources.mockRejectedValue(new Error('failed'));

    const { result } = renderHook(() => useEpisodeOfCare('Patient/p2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(notificationsShow).toHaveBeenCalled();
    expect(result.current.options).toEqual([]);
  });
});
