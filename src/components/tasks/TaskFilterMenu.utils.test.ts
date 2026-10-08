import { describe, expect, test } from 'vitest';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TaskFilterType,
} from './TaskFilterMenu.utils';

describe('TaskFilterMenu.utils', () => {
  test('exposes expected filter types and status labels', () => {
    expect(TaskFilterType.STATUS).toBe('status');
    expect(TASK_STATUSES).toContain('in-progress');
    expect(TASK_STATUS_LABELS['on-hold']).toBe('On Hold');
  });

  test('exposes expected priorities and labels', () => {
    expect(TASK_PRIORITIES).toEqual(['routine', 'urgent', 'asap', 'stat']);
    expect(TASK_PRIORITY_LABELS.asap).toBe('ASAP');
  });
});
