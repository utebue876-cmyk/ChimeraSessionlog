import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MH_SERVICE_VALUESET_AVIVA_URL, MH_SERVICE_VALUESET_VITALITY_URL } from '../config/chimera-urls';
import { useServiceTypeOptions } from './useServiceTypeOptions';

const valueSetExpand = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ valueSetExpand }));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

describe('useServiceTypeOptions', () => {
  test('loads options using aviva valueset by default', async () => {
    valueSetExpand.mockResolvedValue({
      expansion: {
        contains: [{ code: 'svc-1', display: 'Service 1', system: 'sys' }, { code: 'svc-2' }],
      },
    });

    const { result } = renderHook(() => useServiceTypeOptions(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(valueSetExpand).toHaveBeenCalledWith({ url: MH_SERVICE_VALUESET_AVIVA_URL });
    expect(result.current.isVitalityOrganizationSelected).toBe(false);
    expect(result.current.serviceTypeOptions).toEqual([
      { value: 'svc-1', label: 'Service 1', system: 'sys' },
      { value: 'svc-2', label: 'svc-2', system: undefined },
    ]);
  });

  test('uses vitality valueset when organization includes vitality', async () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [{ code: 'v-1', display: 'Vitality Service' }] } });

    const { result } = renderHook(() => useServiceTypeOptions('  Vitality Health  '));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(valueSetExpand).toHaveBeenCalledWith({ url: MH_SERVICE_VALUESET_VITALITY_URL });
    expect(result.current.isVitalityOrganizationSelected).toBe(true);
    expect(result.current.serviceTypeOptions[0]).toEqual({
      value: 'v-1',
      label: 'Vitality Service',
      system: undefined,
    });
  });

  test('returns empty options on expand failure', async () => {
    valueSetExpand.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useServiceTypeOptions('aviva'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.serviceTypeOptions).toEqual([]);
  });
});
