import type { Appointment, Slot } from '@medplum/fhirtypes';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import type { CSSProperties } from 'react';
import type { Event } from 'react-big-calendar';
import { dayjsLocalizer } from 'react-big-calendar';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(updateLocale);
dayjs.updateLocale('en', { weekStart: 1 });
dayjs.tz.setDefault(dayjs.tz.guess());

// dayjsLocalizers merge() uses 'MM/DD/YYYY' internally, but dayjs.tz can't
// parse slashes — its regex splits on [.: T-] only, producing a 1-hour-off
// result in BST. Override merge to use ISO format.

export const calendarLocalizer = (() => {
  const loc = dayjsLocalizer(dayjs);
  loc.merge = (date: Date | null | undefined, time: Date | null | undefined): Date | null => {
    if (!date || !time) return null;
    const tm = dayjs.tz(time).format('HH:mm:ss');
    const dt = dayjs.tz(date).startOf('day').format('YYYY-MM-DD');
    return dayjs.tz(`${dt}T${tm}`).toDate();
  };
  return loc;
})();

export const CALENDAR_FORMATS = {
  timeGutterFormat: 'HH:mm',
  // Full range (event starts and ends within the visible day)
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${dayjs(start).format('HH:mm')} – ${dayjs(end).format('HH:mm')}`,
  // Event ends after the visible day (e.g. midnight-to-midnight block) — show start only
  eventTimeRangeStartFormat: ({ start }: { start: Date }) => dayjs(start).format('HH:mm'),
  // Event starts before the visible day — show end only
  eventTimeRangeEndFormat: ({ end }: { end: Date }) => `– ${dayjs(end).format('HH:mm')}`,
};

export const CALENDAR_MIN_TIME = (() => {
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  return d;
})();

export const CALENDAR_MAX_TIME = (() => {
  const d = new Date();
  d.setHours(23, 0, 0, 0);
  return d;
})();

export type BaseAppointmentEvent = Event & {
  type: 'appointment';
  appointment: Appointment;
  start: Date;
  end: Date;
  resourceId?: string;
};

export type BaseSlotEvent = Event & {
  type: 'slot';
  slot: Slot;
  status: string;
  start: Date;
  end: Date;
  resourceId?: string;
};

export type PendingBlockEvent = {
  type: 'pending-block';
  title: string;
  start: Date;
  end: Date;
};

export type BaseScheduleEvent = BaseAppointmentEvent | BaseSlotEvent | PendingBlockEvent;

export function appointmentsToEvents(appointments: Appointment[], resourceId?: string): BaseAppointmentEvent[] {
  return appointments
    .filter((a) => a.status !== 'cancelled' && a.start && a.end)
    .map((a) => {
      const patient = a.participant.find((p) => p.actor?.reference?.startsWith('Patient/'));
      const statusSuffix = !['booked', 'arrived', 'fulfilled'].includes(a.status as string) ? ` (${a.status})` : '';
      return {
        type: 'appointment' as const,
        appointment: a,
        title: `${patient?.actor?.display ?? 'No Patient'}${statusSuffix}`,
        start: new Date(a.start as string),
        end: new Date(a.end as string),
        resource: a,
        resourceId,
      };
    });
}

export function slotsToEvents(slots: Slot[], resourceId?: string): BaseSlotEvent[] {
  return slots.map((slot) => ({
    type: 'slot' as const,
    slot,
    status: slot.status,
    resource: slot,
    start: new Date(slot.start),
    end: new Date(slot.end),
    title: slot.status === 'free' ? '' : slot.comment ? `Blocked – ${slot.comment}` : 'Blocked',
    resourceId,
  }));
}

export function isAllDayBlock(event: BaseSlotEvent): boolean {
  return (
    event.status === 'busy-unavailable' &&
    event.start.getHours() === 0 &&
    event.start.getMinutes() === 0 &&
    event.end.getHours() === 23 &&
    event.end.getMinutes() >= 59
  );
}

export function eventPropGetter(
  event: BaseScheduleEvent,
  _start: Date,
  _end: Date,
  _isSelected: boolean
): { className?: string; style?: CSSProperties } {
  const style: CSSProperties = {
    backgroundColor: '#228be6',
    border: '1px solid rgba(255,255,255,0)',
    borderRadius: '2px',
    color: 'white',
    display: 'block',
    opacity: 1.0,
  };

  if (event.type === 'appointment') {
    const isPast = event.end < new Date();
    if (isPast) {
      style.backgroundColor = event.appointment.status !== 'fulfilled' ? '#c92a2a' : '#2f9e44';
    }
  }

  if (event.type === 'pending-block') {
    return {
      style: {
        backgroundColor: 'rgba(250, 82, 82, 0.12)',
        border: '2px dashed rgba(250, 82, 82, 0.65)',
        borderRadius: '2px',
        color: '#c92a2a',
        display: 'block',
        opacity: 1,
      },
    };
  }

  if (event.type === 'slot') {
    style.backgroundColor = event.status === 'free' ? '#d3f9d8' : '#ced4da';
    style.color = 'black';
    style.opacity = 0.6;
    const statusClass = event.status === 'free' ? ' rbc-slot-free' : ' rbc-slot-blocked';
    const extraClass = isAllDayBlock(event) ? ' rbc-blocked-allday' : '';
    return { style, className: `rbc-slot-event${statusClass}${extraClass}` };
  }

  return { style };
}

export const VIEW_SELECT_DATA = [
  { value: 'day', label: 'Day' },
  { value: 'work_week', label: 'Working Week' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'day_schedule', label: 'Day Schedule' },
];
