import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useRecentPatients } from './useRecentPatients';

const medplumState = vi.hoisted(() => ({
  searchResources: vi.fn(),
}));

const profileState = vi.hoisted(() => ({
  profile: { resourceType: 'Practitioner', id: 'pr1' } as any,
}));

const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useMedplumProfile: () => profileState.profile,
}));

describe('useRecentPatients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigateSpy as any);
  });

  test('returns empty entries when no activity is found', async () => {
    medplumState.searchResources.mockResolvedValue([]);

    const { result } = renderHook(() => useRecentPatients());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entries).toEqual([]);
  });

  test('loads recent patients from audit events', async () => {
    medplumState.searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'AuditEvent') {
        return [
          {
            resourceType: 'AuditEvent',
            recorded: '2026-01-02T10:00:00Z',
            entity: [{ what: { reference: 'Patient/p1' } }],
          },
          {
            resourceType: 'AuditEvent',
            recorded: '2026-01-01T10:00:00Z',
            entity: [{ what: { reference: 'Patient/p2' } }],
          },
        ];
      }

      if (resourceType === 'Patient') {
        return [
          { resourceType: 'Patient', id: 'p1', name: [{ family: 'Doe', given: ['Jane'] }] },
          { resourceType: 'Patient', id: 'p2', name: [{ family: 'Smith', given: ['John'] }] },
        ];
      }

      return [];
    });

    const { result } = renderHook(() => useRecentPatients());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.entries).toHaveLength(2);
    });

    expect(result.current.entries[0].patient.id).toBe('p1');
    expect(result.current.entries[1].patient.id).toBe('p2');
  });

  test('navigates to patient case when row handler is called', async () => {
    medplumState.searchResources.mockResolvedValue([]);

    const { result } = renderHook(() => useRecentPatients());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.onPatientClick('p1');
    });

    expect(navigateSpy).toHaveBeenCalledWith('/Patient/p1/case');
  });
});
