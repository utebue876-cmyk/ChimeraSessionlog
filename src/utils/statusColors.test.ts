import { describe, expect, test } from 'vitest';
import {
  getCaseStatusColor,
  getDocRefDocStatusColor,
  getDocRefStatusColor,
  getEncounterStatusColor,
  getTaskPriorityColor,
  getTaskStatusColor,
} from './statusColors';

describe('statusColors', () => {
  test('maps case status case-insensitively and falls back to gray', () => {
    expect(getCaseStatusColor('TRIAGE PENDING')).toBe('gray');
    expect(getCaseStatusColor('closed')).toBe('gray');
    expect(getCaseStatusColor('unknown')).toBe('gray');
  });

  test('maps Encounter status to expected colors', () => {
    expect(getEncounterStatusColor('planned')).toBe('green');
    expect(getEncounterStatusColor('triaged')).toBe('yellow');
    expect(getEncounterStatusColor('onleave')).toBe('orange');
    expect(getEncounterStatusColor('entered-in-error')).toBe('red');
  });

  test('maps task priority with routine and undefined defaulting to blue', () => {
    expect(getTaskPriorityColor('stat')).toBe('red');
    expect(getTaskPriorityColor('asap')).toBe('orange');
    expect(getTaskPriorityColor('urgent')).toBe('yellow');
    expect(getTaskPriorityColor('routine')).toBe('blue');
    expect(getTaskPriorityColor(undefined)).toBe('blue');
  });

  test('maps task status and uses gray fallback', () => {
    expect(getTaskStatusColor('requested')).toBe('blue');
    expect(getTaskStatusColor('completed')).toBe('green');
    expect(getTaskStatusColor('failed')).toBe('red');
    expect(getTaskStatusColor('draft')).toBe('gray');
  });

  test('maps document reference colors', () => {
    expect(getDocRefDocStatusColor('final')).toBe('green');
    expect(getDocRefDocStatusColor('amended')).toBe('orange');
    expect(getDocRefDocStatusColor(undefined)).toBe('gray');

    expect(getDocRefStatusColor('current')).toBe('green');
    expect(getDocRefStatusColor('entered-in-error')).toBe('red');
    expect(getDocRefStatusColor(undefined)).toBe('gray');
  });
});
