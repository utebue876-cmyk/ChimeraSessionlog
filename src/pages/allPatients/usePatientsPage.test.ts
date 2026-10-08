import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { usePatientsPage } from './usePatientsPage';

const searchResourcePages = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResourcePages }));
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));

async function* pages(data: any[][]): AsyncGenerator<any[]> {
  for (const page of data) {
    yield page;
  }
}

describe('usePatientsPage', () => {
  test('auto-opens when only one patient exists', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    searchResourcePages.mockReturnValue(
      pages([[{ resourceType: 'Patient', id: 'p1', name: [{ family: 'Doe', given: ['Jane'] }] }]])
    );

    renderHook(() => usePatientsPage(10));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/Patient/p1/case', undefined);
    });
  });

  test('loads, sorts, paginates patients and supports manual open', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    searchResourcePages.mockReturnValue(
      pages([
        [
          { resourceType: 'Patient', id: 'p2', name: [{ family: 'Zed', given: ['Amy'] }] },
          { resourceType: 'Patient', id: 'p1', name: [{ family: 'Able', given: ['Bob'] }] },
        ],
      ])
    );

    const { result } = renderHook(() => usePatientsPage(1));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.patients.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.pagedPatients).toHaveLength(1);

    act(() => {
      result.current.handleOpenPatient('p2');
    });
    expect(navigate).toHaveBeenCalledWith('/Patient/p2/case', undefined);
  });
});
