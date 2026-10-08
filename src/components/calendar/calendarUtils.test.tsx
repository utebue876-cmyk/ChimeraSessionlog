import type { Appointment, Slot } from '@medplum/fhirtypes';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { appointmentsToEvents, eventPropGetter, slotsToEvents } from './calendarUtils';
import { ViewIcon } from './calendarViewComponents';

describe('calendarUtils', () => {
  test('maps appointments to events and filters cancelled ones', () => {
    const appointments: Appointment[] = [
      {
        resourceType: 'Appointment',
        id: 'a1',
        status: 'pending',
        start: '2024-06-01T10:00:00Z',
        end: '2024-06-01T10:30:00Z',
        participant: [{ actor: { reference: 'Patient/p1', display: 'Jane Doe' }, status: 'accepted' }],
      },
      {
        resourceType: 'Appointment',
        id: 'a2',
        status: 'cancelled',
        start: '2024-06-01T11:00:00Z',
        end: '2024-06-01T11:30:00Z',
        participant: [],
      },
    ];

    const events = appointmentsToEvents(appointments, 'prac-1');

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Jane Doe (pending)');
    expect(events[0].resourceId).toBe('prac-1');
  });

  test('maps slots and styles free/blocked slot events', () => {
    const slots: Slot[] = [
      {
        resourceType: 'Slot',
        id: 's1',
        schedule: { reference: 'Schedule/1' },
        status: 'free',
        start: '2024-06-01T10:00:00Z',
        end: '2024-06-01T10:30:00Z',
      },
      {
        resourceType: 'Slot',
        id: 's2',
        schedule: { reference: 'Schedule/1' },
        status: 'busy',
        start: '2024-06-01T11:00:00Z',
        end: '2024-06-01T11:30:00Z',
      },
    ];

    const [freeEvent, busyEvent] = slotsToEvents(slots);
    const freeStyle = eventPropGetter(freeEvent, freeEvent.start, freeEvent.end, false);
    const busyStyle = eventPropGetter(busyEvent, busyEvent.start, busyEvent.end, false);

    expect(freeEvent.title).toBe('');
    expect(busyEvent.title).toBe('Blocked');
    expect(freeStyle.className).toBe('rbc-slot-event rbc-slot-free');
    expect(busyStyle.className).toBe('rbc-slot-event rbc-slot-blocked');
  });

  test('blocked slot event has title Blocked and allDay is not set', () => {
    const slots: Slot[] = [
      {
        resourceType: 'Slot',
        id: 'all-day-block',
        schedule: { reference: 'Schedule/1' },
        status: 'busy-unavailable',
        start: new Date(2024, 5, 1, 0, 0, 0).toISOString(),
        end: new Date(2024, 5, 2, 0, 0, 0).toISOString(),
      },
    ];

    const [blockedEvent] = slotsToEvents(slots);

    expect(blockedEvent.title).toBe('Blocked');
    // allDay must NOT be set — RBC moves allDay=true background events to the
    // all-day row which is hidden by CSS, making the block invisible.
    expect((blockedEvent as { allDay?: boolean }).allDay).toBeUndefined();
  });

  test('returns icon for known view and null for unknown view', () => {
    const known = render(<ViewIcon value="day" />);
    expect(known.container.querySelector('svg')).not.toBeNull();

    const unknown = render(<ViewIcon value="unknown" />);
    expect(unknown.container.firstChild).toBeNull();
  });
});
