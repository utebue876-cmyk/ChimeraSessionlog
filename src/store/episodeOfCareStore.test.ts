import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useEpisodeOfCareStore } from './episodeOfCareStore';

describe('useEpisodeOfCareStore', () => {
  test('defaults to no active episode', () => {
    const { result } = renderHook(() => useEpisodeOfCareStore());

    expect(result.current.activeEpisode).toBeUndefined();
  });

  test('setActiveEpisode stores and can clear the active episode', () => {
    const { result } = renderHook(() => useEpisodeOfCareStore());
    const episode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      patient: { reference: 'Patient/1' },
    };

    act(() => {
      result.current.setActiveEpisode(episode);
    });
    expect(result.current.activeEpisode).toEqual(episode);

    act(() => {
      result.current.setActiveEpisode(undefined);
    });
    expect(result.current.activeEpisode).toBeUndefined();
  });
});
