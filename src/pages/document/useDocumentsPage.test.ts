import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useDocumentsPage } from './useDocumentsPage';

const searchResources = vi.hoisted(() => vi.fn());
const readReference = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources, readReference }));

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => ({
    activeEpisode: { resourceType: 'EpisodeOfCare', id: 'ep-1', identifier: [{ value: 'CASE-1' }] },
  }),
}));

describe('useDocumentsPage', () => {
  test('returns empty state when patient id is missing', async () => {
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: undefined } as any);

    const { result } = renderHook(() => useDocumentsPage(10));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.documents).toEqual([]);
  });

  test('loads docs, filters by active episode, and resolves author', async () => {
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);

    searchResources.mockResolvedValue([
      {
        resourceType: 'DocumentReference',
        id: 'd1',
        status: 'current',
        context: { encounter: [{ reference: 'EpisodeOfCare/ep-1' }] },
        author: [{ reference: 'Practitioner/pr1' }],
      },
      {
        resourceType: 'DocumentReference',
        id: 'd2',
        status: 'current',
        context: { encounter: [{ reference: 'EpisodeOfCare/other' }] },
      },
    ]);
    readReference.mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'pr1',
      name: [{ family: 'Smith', given: ['Alex'] }],
    });

    const { result } = renderHook(() => useDocumentsPage(10));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documents[0].document.id).toBe('d1');
    expect(result.current.documents[0].author?.id).toBe('pr1');

    act(() => {
      result.current.reload();
    });
    await waitFor(() => expect(searchResources).toHaveBeenCalledTimes(2));
  });
});
