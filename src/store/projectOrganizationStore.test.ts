import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useProjectOrganizationStore } from './projectOrganizationStore';

describe('useProjectOrganizationStore', () => {
  test('defaults to undefined organization details', () => {
    const { result } = renderHook(() => useProjectOrganizationStore());

    expect(result.current.organizationCode).toBeUndefined();
    expect(result.current.organizationName).toBeUndefined();
  });

  test('setOrganization stores both the code and name', () => {
    const { result } = renderHook(() => useProjectOrganizationStore());

    act(() => {
      result.current.setOrganization('iprs-health', 'IPRS Health');
    });

    expect(result.current.organizationCode).toBe('iprs-health');
    expect(result.current.organizationName).toBe('IPRS Health');
  });
});
