import { renderHook } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useActiveEpisode } from './useActiveEpisode';

const setActiveEpisode = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const storeState = vi.hoisted(() => ({
  activeEpisode: { resourceType: 'EpisodeOfCare', id: 'ep-1', status: 'active', patient: { reference: 'Patient/p1' } },
  setActiveEpisode,
}));

vi.mock('../store/episodeOfCareStore', () => ({
  useEpisodeOfCareStore: (selector: any) => selector(storeState),
}));

describe('useActiveEpisode', () => {
  test('returns activeEpisode and setter from store', () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ pathname: '/Patient/p1/case' } as any);

    const { result } = renderHook(() => useActiveEpisode());
    expect(result.current.activeEpisode?.id).toBe('ep-1');

    act(() => {
      result.current.setActiveEpisode({ resourceType: 'EpisodeOfCare', id: 'ep-2', status: 'active' } as any);
    });

    expect(setActiveEpisode).toHaveBeenCalledWith(expect.objectContaining({ id: 'ep-2' }));
  });

  test('switchEpisode navigates to encounters when currently in encounter chart path', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ pathname: '/Patient/p1/Encounter/e1' } as any);

    const { result } = renderHook(() => useActiveEpisode());

    act(() => {
      result.current.switchEpisode({ resourceType: 'EpisodeOfCare', id: 'ep-9', status: 'active' } as any, 'p77');
    });

    expect(setActiveEpisode).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/Patient/p77/encounters');
  });

  test('switchEpisode navigates to Task list when currently in task path', () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ pathname: '/Patient/p1/task/t1' } as any);

    const { result } = renderHook(() => useActiveEpisode());

    act(() => {
      result.current.switchEpisode({ resourceType: 'EpisodeOfCare', id: 'ep-9', status: 'active' } as any, 'p88');
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/p88/Task');
  });
});
