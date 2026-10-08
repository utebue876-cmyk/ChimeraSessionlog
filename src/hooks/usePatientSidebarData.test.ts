import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { usePatientSidebarData } from './usePatientSidebarData';

const searchResources = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources }));

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));

describe('usePatientSidebarData', () => {
  test('deduplicates identical searches across sections', async () => {
    searchResources.mockResolvedValue([{ resourceType: 'Observation', id: 'o1' }]);

    const sections = [
      {
        key: 'a',
        searches: [{ key: 'obs', resourceType: 'Observation', patientParam: 'subject', query: { status: 'final' } }],
      },
      {
        key: 'b',
        searches: [{ key: 'obs2', resourceType: 'Observation', patientParam: 'subject', query: { status: 'final' } }],
      },
    ];

    const { result } = renderHook(() => usePatientSidebarData({ reference: 'Patient/p1' } as any, sections as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(searchResources).toHaveBeenCalledTimes(1);
    expect(result.current.sectionData[0].obs).toHaveLength(1);
    expect(result.current.sectionData[1].obs2).toHaveLength(1);
    expect(result.current.error).toBeUndefined();
  });

  test('returns empty arrays for failed searches and exposes error', async () => {
    searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'Observation') return [{ resourceType: 'Observation', id: 'o1' }];
      throw new Error('failed fetch');
    });

    const sections = [
      { key: 'a', searches: [{ key: 'ok', resourceType: 'Observation' }] },
      { key: 'b', searches: [{ key: 'bad', resourceType: 'Condition' }] },
    ];

    const { result } = renderHook(() => usePatientSidebarData({ reference: 'Patient/p1' } as any, sections as any));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sectionData[0].ok).toHaveLength(1);
    expect(result.current.sectionData[1].bad).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
