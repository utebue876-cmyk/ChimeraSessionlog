import { useQuery } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useOdsSearchOrganisation } from './useOdsSearchOrganisation';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('useOdsSearchOrganisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.enabled) {
        return {
          data: {
            orgArray: [
              {
                id: 'A10001',
                name: 'HEREWARD MEDICAL',
                primaryRoleName: 'General Medical Practice',
                roleName: ['Role'],
                status: 'Active',
                address1: '1 High St',
                address2: 'Town',
                postcode: 'PE10',
              },
            ],
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

  test('validates that at least one search field is provided', () => {
    const { result } = renderHook(() => useOdsSearchOrganisation());

    act(() => {
      result.current.handleSearch();
    });

    expect(result.current.validationError).toContain('Please enter at least one');
    expect(result.current.submitted).toBe(false);
  });

  test('submits request and returns organisations', () => {
    const { result } = renderHook(() => useOdsSearchOrganisation());

    act(() => {
      result.current.setName('HEREWARD');
    });

    act(() => {
      result.current.handleSearch();
    });

    expect(result.current.validationError).toBeNull();
    expect(result.current.submitted).toBe(true);
    expect(result.current.organisations).toHaveLength(1);
    expect(result.current.organisations[0].name).toBe('HEREWARD MEDICAL');

    const lastCall = vi.mocked(useQuery).mock.calls.at(-1)?.[0] as any;
    expect(lastCall.enabled).toBe(true);
  });

  test('resets all fields and submitted state', () => {
    const { result } = renderHook(() => useOdsSearchOrganisation());

    act(() => {
      result.current.setName('HEREWARD');
      result.current.setAddress('EXETER STREET');
      result.current.setTown('BOURNE');
      result.current.setPostcode('PE10');
      result.current.setStatus('Active');
      result.current.handleSearch();
    });

    act(() => {
      result.current.handleReset();
    });

    expect(result.current.name).toBe('');
    expect(result.current.address).toBe('');
    expect(result.current.town).toBe('');
    expect(result.current.postcode).toBe('');
    expect(result.current.status).toBe('');
    expect(result.current.submitted).toBe(false);
    expect(result.current.currentPage).toBe(1);
  });

  test('maps query error to error string', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new Error('organisation search failed'),
    } as any);

    const { result } = renderHook(() => useOdsSearchOrganisation());

    expect(result.current.error).toBe('organisation search failed');
  });
});
