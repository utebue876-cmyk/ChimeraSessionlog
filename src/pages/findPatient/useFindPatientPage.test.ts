import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useFindPatientPage } from './useFindPatientPage';

const searchResources = vi.hoisted(() => vi.fn());
const readResource = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources, readResource }));
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

describe('useFindPatientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('opens search modal on mount and supports reset/change', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    const { result } = renderHook(() => useFindPatientPage(10));

    await waitFor(() => expect(result.current.searchModalOpened).toBe(true));

    act(() => {
      result.current.handleChange('firstName', 'Jane');
    });
    expect(result.current.formValues.firstName).toBe('Jane');

    act(() => {
      result.current.handleReset();
    });
    expect(result.current.matches).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  test('navigates directly when one match is found', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    searchResources.mockResolvedValueOnce([
      {
        resourceType: 'Patient',
        id: 'p1',
        name: [{ family: 'Doe', given: ['Jane'] }],
      },
    ]);

    const { result } = renderHook(() => useFindPatientPage(10));

    await act(async () => {
      result.current.handleChange('firstName', 'Jane');
      await result.current.handleFindPatients();
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/p1/case', undefined);
  });

  test('case-id search maps episode id to navigation state', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    searchResources
      .mockResolvedValueOnce([
        {
          resourceType: 'EpisodeOfCare',
          id: 'ep-1',
          patient: { reference: 'Patient/p1' },
        },
      ])
      .mockResolvedValueOnce([]);
    readResource.mockImplementation(async (_type: string, id: string) => ({
      resourceType: 'Patient',
      id,
      name: [{ family: 'Doe', given: ['Jane'] }],
    }));

    const { result } = renderHook(() => useFindPatientPage(10));

    act(() => {
      result.current.handleChange('caseId', 'CASE-1');
    });
    await act(async () => {
      await result.current.handleFindPatients();
    });

    expect(navigate).toHaveBeenLastCalledWith('/Patient/p1/case', { state: { targetEpisodeId: 'ep-1' } });
  });

  test('handleOpenPatient safely no-ops when patient id is undefined', async () => {
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    const { result } = renderHook(() => useFindPatientPage(10));

    await act(async () => {
      result.current.handleOpenPatient(undefined);
    });

    expect(navigate).not.toHaveBeenCalled();
  });
});
