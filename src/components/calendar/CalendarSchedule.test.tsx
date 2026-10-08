import type { Appointment, Practitioner, Slot } from '@medplum/fhirtypes';
import { describe, expect, test, vi } from 'vitest';
import { render, screen, userEvent } from '../../testUtils/render';
import type { ScheduleAvailability } from '../../utils/scheduling';
import * as schedulingUtils from '../../utils/scheduling';
import { SchedulingTransientIdentifier } from '../../utils/scheduling';
import type { PractitionerSchedule } from './CalendarSchedule';
import { CalendarSchedule } from './CalendarSchedule';

function buildPractitioner(id: string, name: string): Practitioner {
  return {
    resourceType: 'Practitioner',
    id,
    name: [{ text: name }],
  };
}

function buildPractitionerSchedule(id: number): PractitionerSchedule {
  const practitioner = buildPractitioner(`p-${id}`, `Practitioner ${id}`);
  const appointments: Appointment[] = [];
  const slots: Slot[] = [];
  return {
    practitioner,
    appointments,
    slots,
    availability: null,
  };
}

describe('CalendarSchedule', () => {
  test('renders toolbar controls', () => {
    render(<CalendarSchedule practitioners={[buildPractitionerSchedule(1)]} />);

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeInTheDocument();
  });

  test('invokes onDateChange when navigating days', async () => {
    const onDateChange = vi.fn();

    render(<CalendarSchedule practitioners={[buildPractitionerSchedule(1)]} onDateChange={onDateChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));

    expect(onDateChange).toHaveBeenCalledTimes(1);
    expect(onDateChange).toHaveBeenCalledWith(expect.any(Date));
  });

  test('paginates practitioners when more than four are present', async () => {
    const practitioners = [1, 2, 3, 4, 5].map(buildPractitionerSchedule);

    render(<CalendarSchedule practitioners={practitioners} />);

    expect(screen.getByText('1 to 4 of 5 Practitioners')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next practitioners' }));

    expect(screen.getByText('5 to 5 of 5 Practitioners')).toBeInTheDocument();
  });

  test('computedEventPropGetter grays out virtual slot events outside practitioner availability', () => {
    const availability: ScheduleAvailability = {
      windows: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri'], startMinutes: 9 * 60, endMinutes: 17 * 60 }],
      timezone: 'UTC',
    };

    // Slot outside working hours — isSlotWithinAvailability will return false for it
    const outsideSlot: Slot = {
      resourceType: 'Slot',
      id: 'slot-outside',
      status: 'free',
      start: '2024-01-20T20:00:00Z', // 20:00 UTC — outside 09-17 window
      end: '2024-01-20T20:30:00Z',
      schedule: { reference: 'Schedule/1' },
    };
    SchedulingTransientIdentifier.set(outsideSlot);

    const ps: PractitionerSchedule = {
      practitioner: buildPractitioner('p-1', 'Dr Smith'),
      appointments: [],
      slots: [outsideSlot],
      availability,
    };

    // Force isSlotWithinAvailability to return false so the gray branch is taken
    vi.spyOn(schedulingUtils, 'isSlotWithinAvailability').mockReturnValue(false);

    const { container } = render(<CalendarSchedule practitioners={[ps]} date={new Date('2024-01-20')} />);

    // The event element should have gray-0 background applied
    const grayEvents = container.querySelectorAll('[style*="gray-0"]');
    expect(grayEvents.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });
});
