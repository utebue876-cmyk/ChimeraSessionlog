import { Group, Tooltip } from '@mantine/core';
import { IconBriefcase, IconCalendar, IconCalendarMonth, IconCalendarWeek, IconUsers } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { JSX, ReactNode } from 'react';
import type { BaseScheduleEvent } from './calendarUtils';
import { isAllDayBlock } from './calendarUtils';

export function EventWithTooltip({ event }: { event: BaseScheduleEvent; title?: ReactNode }): JSX.Element {
  if (event.type === 'pending-block') {
    const durationMin = dayjs(event.end).diff(dayjs(event.start), 'minute');
    return (
      <div style={{ padding: '1px 3px', fontSize: '0.75rem', fontWeight: 600, color: '#c92a2a' }}>
        {durationMin > 30 ? 'Blocking...' : ''}
      </div>
    );
  }

  const durationMin = dayjs(event.end).diff(dayjs(event.start), 'minute');
  const allDay = event.type === 'slot' && isAllDayBlock(event);
  const timeStr = allDay
    ? 'All Day'
    : `${dayjs(event.start).format('HH:mm')} \u2013 ${dayjs(event.end).format('HH:mm')}`;

  const label =
    event.type === 'appointment' ? (
      <>
        <div>{event.title as string}</div>
        <div style={{ opacity: 0.8 }}>{timeStr}</div>
        <div style={{ opacity: 0.8, textTransform: 'capitalize' }}>Status: {event.appointment.status}</div>
      </>
    ) : (
      <>
        <div>
          {event.type === 'slot' && event.status === 'busy-unavailable' ? (event.title as string) : 'Available'}
        </div>
        <div style={{ opacity: 0.8 }}>{timeStr}</div>
      </>
    );

  return (
    <>
      <Tooltip label={label} withArrow position="top" multiline openDelay={400} closeDelay={100}>
        <div style={{ position: 'absolute', inset: 0 }} />
      </Tooltip>
      {durationMin > 30 && (
        <>
          {allDay && <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>All Day</div>}
          {event.title as string}
        </>
      )}
    </>
  );
}

export function ViewIcon({ value, size = 18 }: { value: string; size?: number }): JSX.Element | null {
  if (value === 'day') return <IconCalendar size={size} />;
  if (value === 'work_week') return <IconBriefcase size={size} />;
  if (value === 'week') return <IconCalendarWeek size={size} />;
  if (value === 'month') return <IconCalendarMonth size={size} />;
  if (value === 'day_schedule') return <IconUsers size={size} />;
  return null;
}

// renderOption content for the view Select - shared by both calendar toolbars.
export function ViewSelectOption({ option }: { option: { value: string; label: string } }): JSX.Element {
  return (
    <Group gap="xs">
      <ViewIcon value={option.value} />
      {option.label}
    </Group>
  );
}
