import { Operator, parseSearchRequest } from '@medplum/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { normalizeTaskSearch } from './taskSearch';

vi.mock('@medplum/core', async () => {
  const actual = await vi.importActual<typeof import('@medplum/core')>('@medplum/core');
  return {
    ...actual,
    parseSearchRequest: vi.fn(),
  };
});

const parseSearchRequestMock = vi.mocked(parseSearchRequest);

describe('normalizeTaskSearch', () => {
  beforeEach(() => {
    parseSearchRequestMock.mockReset();
  });

  test('adds default sort rule, count, and total when missing', () => {
    parseSearchRequestMock.mockReturnValue({ resourceType: 'Task', filters: [] } as any);

    const result = normalizeTaskSearch('/Task', '?status=requested');

    expect(parseSearchRequestMock).toHaveBeenCalledWith('/Task?status=requested');
    expect(result.normalizedSearch.sortRules).toEqual([{ code: '_lastUpdated', descending: true }]);
    expect(result.normalizedSearch.count).toBe(20);
    expect(result.normalizedSearch.total).toBe('accurate');
    expect(result.needsNavigation).toBe(true);
  });

  test('does not require navigation when required params already exist', () => {
    const parsed = {
      resourceType: 'Task',
      sortRules: [{ code: '_lastUpdated' }],
      count: 10,
      total: 'accurate',
      filters: [{ code: 'status', operator: Operator.EQUALS, value: 'requested' }],
    };
    parseSearchRequestMock.mockReturnValue(parsed as any);

    const result = normalizeTaskSearch('/Task', '?_count=10');

    expect(result.normalizedSearch.sortRules).toEqual(parsed.sortRules);
    expect(result.normalizedSearch.count).toBe(10);
    expect(result.normalizedSearch.total).toBe('accurate');
    expect(result.needsNavigation).toBe(false);
  });

  test('merges additional filters and replaces by matching code', () => {
    parseSearchRequestMock.mockReturnValue({
      resourceType: 'Task',
      sortRules: [{ code: '_lastUpdated' }],
      count: 20,
      total: 'accurate',
      filters: [
        { code: 'status', operator: Operator.EQUALS, value: 'requested' },
        { code: 'owner', operator: Operator.EQUALS, value: 'Practitioner/123' },
      ],
    } as any);

    const result = normalizeTaskSearch('/Task', '?status=requested', {
      additionalFilters: [
        { code: 'status', operator: Operator.EQUALS, value: 'in-progress' },
        { code: 'priority', operator: Operator.EQUALS, value: 'urgent' },
      ],
    });

    expect(result.normalizedSearch.filters).toEqual([
      { code: 'owner', operator: Operator.EQUALS, value: 'Practitioner/123' },
      { code: 'status', operator: Operator.EQUALS, value: 'in-progress' },
      { code: 'priority', operator: Operator.EQUALS, value: 'urgent' },
    ]);
    expect(result.needsNavigation).toBe(false);
  });
});
