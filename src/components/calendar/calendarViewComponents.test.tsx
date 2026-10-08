import { describe, expect, test } from 'vitest';
import { render, screen } from '../../testUtils/render';
import type { BaseAppointmentEvent, BaseSlotEvent, PendingBlockEvent } from './calendarUtils';
import { EventWithTooltip, ViewIcon } from './calendarViewComponents';

describe('EventWithTooltip', () => {
  test('renders a "Blocking..." label for a pending block longer than 30 minutes', () => {
    const event: PendingBlockEvent = {
      type: 'pending-block',
      title: 'Pending',
      start: new Date('2026-01-01T09:00:00Z'),
      end: new Date('2026-01-01T09:45:00Z'),
    };

    render(<EventWithTooltip event={event} />);

    expect(screen.getByText('Blocking...')).toBeInTheDocument();
  });

  test('renders nothing for a short pending block (<= 30 minutes)', () => {
    const event: PendingBlockEvent = {
      type: 'pending-block',
      title: 'Pending',
      start: new Date('2026-01-01T09:00:00Z'),
      end: new Date('2026-01-01T09:20:00Z'),
    };

    render(<EventWithTooltip event={event} />);

    expect(screen.queryByText('Blocking...')).not.toBeInTheDocument();
  });

  test('renders the appointment title once the event runs longer than 30 minutes', () => {
    const event: BaseAppointmentEvent = {
      type: 'appointment',
      title: 'Jamie Doe',
      appointment: { resourceType: 'Appointment', status: 'booked', participant: [] },
      start: new Date('2026-01-01T09:00:00Z'),
      end: new Date('2026-01-01T09:45:00Z'),
    };

    render(<EventWithTooltip event={event} />);

    expect(screen.getByText('Jamie Doe')).toBeInTheDocument();
  });

  test('hides the visible label for a 30-minutes-or-shorter event', () => {
    const event: BaseAppointmentEvent = {
      type: 'appointment',
      title: 'Jamie Doe',
      appointment: { resourceType: 'Appointment', status: 'booked', participant: [] },
      start: new Date('2026-01-01T09:00:00Z'),
      end: new Date('2026-01-01T09:30:00Z'),
    };

    render(<EventWithTooltip event={event} />);

    expect(screen.queryByText('Jamie Doe')).not.toBeInTheDocument();
  });

  test('renders the blocked slot title and "All Day" for an all-day blocked slot', () => {
    const event: BaseSlotEvent = {
      type: 'slot',
      title: 'Blocked',
      status: 'busy-unavailable',
      slot: {
        resourceType: 'Slot',
        status: 'busy-unavailable',
        start: '2026-01-01T00:00:00Z',
        end: '2026-01-01T23:59:00Z',
        schedule: { reference: 'Schedule/1' },
      },
      start: new Date('2026-01-01T00:00:00Z'),
      end: new Date('2026-01-01T23:59:00Z'),
    };

    render(<EventWithTooltip event={event} />);

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('All Day')).toBeInTheDocument();
  });
});

describe('ViewIcon', () => {
  test.each([['day'], ['work_week'], ['week'], ['month'], ['day_schedule']])(
    'renders an icon for the "%s" view',
    (value) => {
      const { container } = render(<ViewIcon value={value} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    }
  );

  test('renders nothing for an unknown view value', () => {
    const { container } = render(<ViewIcon value="unknown" />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
