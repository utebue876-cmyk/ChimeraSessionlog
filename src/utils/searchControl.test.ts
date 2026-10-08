import type { SearchRequest } from '@medplum/core';
import { Operator } from '@medplum/core';
import { describe, expect, test } from 'vitest';
import { getPopulatedSearch } from './searchControl';

describe('getPopulatedSearch', () => {
  test('adds Task defaults when fields, sortRules, and filters are missing', () => {
    const result = getPopulatedSearch({ resourceType: 'Task' });

    expect(result.fields).toEqual(['code', '_lastUpdated', 'owner', 'for', 'priority']);
    expect(result.sortRules).toEqual([{ code: '-priority-order,due-date' }]);
    expect(result.filters).toEqual([{ code: 'status:not', operator: Operator.EQUALS, value: 'completed' }]);
  });

  test('adds non-Task defaults for Patient', () => {
    const result = getPopulatedSearch({ resourceType: 'Patient' });

    expect(result.fields).toEqual(['name', 'birthdate', 'gender']);
    expect(result.sortRules).toEqual([{ code: '-_lastUpdated' }]);
    expect(result.filters).toEqual([]);
  });

  test('preserves provided fields, sortRules, and filters', () => {
    const parsedSearch: SearchRequest = {
      resourceType: 'Task',
      fields: ['status'],
      sortRules: [{ code: '_lastUpdated', descending: true }],
      filters: [{ code: 'status', operator: Operator.EQUALS, value: 'requested' }],
    };

    const result = getPopulatedSearch(parsedSearch);

    expect(result.fields).toEqual(parsedSearch.fields);
    expect(result.sortRules).toEqual(parsedSearch.sortRules);
    expect(result.filters).toEqual(parsedSearch.filters);
  });
});
