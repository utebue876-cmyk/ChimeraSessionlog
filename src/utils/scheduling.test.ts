import type { Schedule, Slot } from '@medplum/fhirtypes';
import { getScheduleAvailability, SchedulingTransientIdentifier } from './scheduling';

const SchedulingParametersURI = 'https://medplum.com/fhir/StructureDefinition/SchedulingParameters';

/** Build a Schedule with SchedulingParameters extensions for testing */
function makeSchedule(
  serviceTypeWindows: Array<{
    days: string[];
    start: string;
    end: string;
    timezone?: string;
  }>
): Schedule {
  return {
    resourceType: 'Schedule',
    id: 'test-sched',
    actor: [],
    extension: serviceTypeWindows.map((w, i) => ({
      url: SchedulingParametersURI,
      extension: [
        { url: 'timezone', valueCode: w.timezone ?? 'UTC' },
        {
          url: 'availability',
          extension: [
            {
              url: 'availableTime',
              extension: [
                ...w.days.map((d) => ({ url: 'daysOfWeek', valueCode: d })),
                { url: 'availableStartTime', valueTime: w.start },
                { url: 'availableEndTime', valueTime: w.end },
              ],
            },
          ],
        },
        // minimal serviceType so the extension is a valid SchedulingParameters entry
        { url: 'serviceType', valueCodeableConcept: { coding: [{ code: `svc-${i}` }] } },
      ],
    })),
  };
}

describe('SchedulingTransientIdentifier', () => {
  test('set', () => {
    const slot: Slot = {
      resourceType: 'Slot',
      start: '2026-01-15T00:00:00.000Z',
      end: '2026-01-15T00:00:00.000Z',
      schedule: { reference: 'Schedule/12345' },
      status: 'busy',
    };

    SchedulingTransientIdentifier.set(slot);
    expect(slot).toHaveProperty('identifier');
    expect(slot.identifier).toHaveLength(1);
    expect(slot.identifier?.[0]).toHaveProperty('system', 'https://medplum.com/fhir/scheduling-transient-id');
    expect(slot.identifier?.[0]).toHaveProperty('use', 'temp');
    expect(slot.identifier?.[0]).toHaveProperty('value');
    // naive check: does this look like a uuid
    expect(slot.identifier?.[0].value).toMatch(/[-0-9a-f]{36}/);
  });

  test('get on a resource that was not `set` upon returns undefined', () => {
    const slot: Slot = {
      resourceType: 'Slot',
      start: '2026-01-15T00:00:00.000Z',
      end: '2026-01-15T00:00:00.000Z',
      schedule: { reference: 'Schedule/12345' },
      status: 'busy',
    };

    expect(SchedulingTransientIdentifier.get(slot)).toBeUndefined();
  });

  test('get on a resource that was `set` upon returns the ID', () => {
    const id = 'cb103a82-f313-4b22-8918-ed8de4b4143d';
    const slot: Slot = {
      resourceType: 'Slot',
      start: '2026-01-15T00:00:00.000Z',
      end: '2026-01-15T00:00:00.000Z',
      schedule: { reference: 'Schedule/12345' },
      status: 'busy',
      identifier: [
        {
          system: 'https://medplum.com/fhir/scheduling-transient-id',
          value: id,
          use: 'temp',
        },
      ],
    };

    expect(SchedulingTransientIdentifier.get(slot)).toEqual(id);
  });
});

describe('getScheduleAvailability', () => {
  test('returns empty windows for a schedule with no SchedulingParameters', () => {
    const schedule: Schedule = { resourceType: 'Schedule', id: 's1', actor: [] };
    const result = getScheduleAvailability(schedule);
    expect(result.windows).toHaveLength(0);
    expect(result.timezone).toBe('UTC');
  });

  test('parses availability windows from a single service type', () => {
    const schedule = makeSchedule([{ days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00:00', end: '17:00:00' }]);
    const result = getScheduleAvailability(schedule);

    expect(result.windows).toHaveLength(1);
    expect(result.windows[0].days).toEqual(['mon', 'tue', 'wed', 'thu', 'fri']);
    expect(result.windows[0].startMinutes).toBe(9 * 60);
    expect(result.windows[0].endMinutes).toBe(17 * 60);
  });

  test('aggregates windows from multiple service types', () => {
    const schedule = makeSchedule([
      { days: ['mon', 'tue', 'wed'], start: '08:00:00', end: '12:00:00' },
      { days: ['thu', 'fri'], start: '13:00:00', end: '17:00:00' },
    ]);
    const result = getScheduleAvailability(schedule);

    expect(result.windows).toHaveLength(2);
    expect(result.windows[0].startMinutes).toBe(8 * 60);
    expect(result.windows[1].startMinutes).toBe(13 * 60);
  });

  test('uses the timezone from the extensions', () => {
    const schedule = makeSchedule([{ days: ['mon'], start: '09:00:00', end: '17:00:00', timezone: 'Europe/London' }]);
    const result = getScheduleAvailability(schedule);
    expect(result.timezone).toBe('Europe/London');
  });
});
