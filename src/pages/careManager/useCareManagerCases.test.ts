import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useCareManagerCases } from './useCareManagerCases';

const searchResourcePages = vi.hoisted(() => vi.fn());
const readResource = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResourcePages, readResource }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useMedplumProfile: () => ({ resourceType: 'Practitioner', id: 'pr-1' }),
}));

vi.mock('../utils/episodeOfCareUtils', () => ({
  getCaseStatus: () => 'Intake',
}));

vi.mock('../utils/patientUtils', () => ({
  formatSortableName: (name: any) => `${name?.family ?? ''}, ${(name?.given ?? []).join(' ')}`,
}));

async function* pages(data: any[][]): AsyncGenerator<any[]> {
  for (const page of data) {
    yield page;
  }
}

describe('useCareManagerCases', () => {
  test('loads care manager cases and opens selected case', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);

    searchResourcePages.mockReturnValue(
      pages([
        [
          {
            resourceType: 'EpisodeOfCare',
            id: 'ep-1',
            patient: { reference: 'Patient/p1' },
            identifier: [{ value: 'CASE-1' }],
            type: [{ text: 'CBT' }],
          },
        ],
      ])
    );
    readResource.mockResolvedValue({ resourceType: 'Patient', id: 'p1', name: [{ family: 'Doe', given: ['Jane'] }] });

    const { result } = renderHook(() => useCareManagerCases());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.cases).toHaveLength(1);
    expect(result.current.cases[0].patientName).toContain('Doe');

    act(() => {
      result.current.handleOpenCase(result.current.cases[0]);
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/p1/case', { state: { targetEpisodeId: 'ep-1' } });
  });
});
