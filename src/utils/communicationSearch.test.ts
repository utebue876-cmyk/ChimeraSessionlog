import { parseSearchRequest } from '@medplum/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { normalizeCommunicationSearch } from './communicationSearch';

vi.mock('@medplum/core', async () => {
  const actual = await vi.importActual<typeof import('@medplum/core')>('@medplum/core');
  return {
    ...actual,
    parseSearchRequest: vi.fn(),
  };
});

const parseSearchRequestMock = vi.mocked(parseSearchRequest);

describe('normalizeCommunicationSearch', () => {
  beforeEach(() => {
    parseSearchRequestMock.mockReset();
    parseSearchRequestMock.mockReturnValue({ resourceType: 'Communication' } as any);
  });

  test('adds default params when search is empty', () => {
    const result = normalizeCommunicationSearch({ search: '' });

    expect(result.normalizedSearch).toBe('_sort=-_lastUpdated&status=in-progress&_count=20&_total=accurate');
    expect(parseSearchRequestMock).toHaveBeenCalledWith(
      'Communication?_sort=-_lastUpdated&status=in-progress&_count=20&_total=accurate'
    );
  });

  test('preserves provided params and only appends missing defaults', () => {
    const result = normalizeCommunicationSearch({ search: 'status=completed&_count=5' });

    expect(result.normalizedSearch).toBe('status=completed&_count=5&_sort=-_lastUpdated&_total=accurate');
    expect(parseSearchRequestMock).toHaveBeenCalledWith(
      'Communication?status=completed&_count=5&_sort=-_lastUpdated&_total=accurate'
    );
  });

  test('respects custom default values', () => {
    const result = normalizeCommunicationSearch({
      search: '',
      defaultSort: '-sent',
      defaultStatus: 'completed',
      defaultCount: '50',
      defaultTotal: 'none',
    });

    expect(result.normalizedSearch).toBe('_sort=-sent&status=completed&_count=50&_total=none');
    expect(parseSearchRequestMock).toHaveBeenCalledWith(
      'Communication?_sort=-sent&status=completed&_count=50&_total=none'
    );
  });
});
