import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useOrgPractitioners } from './useOrgPractitioners';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('useOrgPractitioners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: {
        practitioners: [
          {
            code: 'P100',
            name: 'SMITH, JOHN',
            roleCode: 'R0260',
            roleName: 'General Practitioner',
            joinDate: '2025-01-01',
            leftDate: '',
            type: 'Doctor',
          },
        ],
      },
      isFetching: false,
      error: null,
    } as any);
  });

  test('returns practitioners list and loading/error state', () => {
    const { result } = renderHook(() => useOrgPractitioners('A10001', true));

    expect(result.current.practitioners).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('disables query when hook is not enabled', () => {
    renderHook(() => useOrgPractitioners('A10001', false));

    const call = vi.mocked(useQuery).mock.calls[0]?.[0] as any;
    expect(call.enabled).toBe(false);
  });

  test('disables query when org id is empty even if enabled true', () => {
    renderHook(() => useOrgPractitioners('', true));

    const call = vi.mocked(useQuery).mock.calls[0]?.[0] as any;
    expect(call.enabled).toBe(false);
  });

  test('maps error object to message', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new Error('failed to fetch practitioners'),
    } as any);

    const { result } = renderHook(() => useOrgPractitioners('A10001', true));

    expect(result.current.error).toBe('failed to fetch practitioners');
  });
});
