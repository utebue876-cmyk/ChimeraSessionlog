import { useQuery } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useOdsSearch } from './useOdsSearch';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('useOdsSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.enabled) {
        return {
          data: {
            pracArray: [
              {
                id: 'A12345',
                name: 'SMITH, JANE',
                role: 'R0260',
                roleName: 'GENERAL MEDICAL PRACTITIONER',
                type: 'Doctor',
                lastChangeDate: '2026-01-01',
                practitionerInactive: false,
              },
            ],
            pracCodeSystemUpdatedAt: '2026-01-01',
          },
          isFetching: false,
          error: null,
        } as any;
      }

      return {
        data: undefined,
        isFetching: false,
        error: null,
      } as any;
    });
  });

  test('has initial empty state with disabled query', () => {
    const { result } = renderHook(() => useOdsSearch());

    expect(result.current.query).toBe('');
    expect(result.current.submittedQuery).toBeNull();
    expect(result.current.practitioners).toEqual([]);
    expect(result.current.currentPage).toBe(1);

    const firstCall = vi.mocked(useQuery).mock.calls[0]?.[0] as any;
    expect(firstCall.enabled).toBe(false);
  });

  test('submits trimmed query and exposes fetched practitioner data', () => {
    const { result } = renderHook(() => useOdsSearch());

    act(() => {
      result.current.setQuery('  SMITH  ');
    });

    act(() => {
      result.current.handleSearch();
    });

    expect(result.current.submittedQuery).toBe('SMITH');
    expect(result.current.currentPage).toBe(1);
    expect(result.current.practitioners).toHaveLength(1);
    expect(result.current.updatedAt).toBe('2026-01-01');

    const lastCall = vi.mocked(useQuery).mock.calls.at(-1)?.[0] as any;
    expect(lastCall.enabled).toBe(true);
  });

  test('resets search state', () => {
    const { result } = renderHook(() => useOdsSearch());

    act(() => {
      result.current.setQuery('PARRY');
      result.current.handleSearch();
    });

    act(() => {
      result.current.handleReset();
    });

    expect(result.current.query).toBe('');
    expect(result.current.submittedQuery).toBeNull();
    expect(result.current.currentPage).toBe(1);
  });

  test('maps useQuery error to error string', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new Error('network down'),
    } as any);

    const { result } = renderHook(() => useOdsSearch());

    expect(result.current.error).toBe('network down');
  });
});
