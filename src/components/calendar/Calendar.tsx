import { Button, Group, SegmentedControl, Select, Title, Tooltip } from '@mantine/core';
import type { Appointment, Slot } from '@medplum/fhirtypes';
import { IconCalendar, IconChevronDown, IconChevronLeft, IconChevronRight, IconList } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { CSSProperties, JSX } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CalendarProps, HeaderProps, SlotInfo, View } from 'react-big-calendar';
import { Calendar as ReactBigCalendar } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { Range } from '../../types/scheduling';
import type { ScheduleAvailability } from '../../utils/scheduling';
import { SchedulingTransientIdentifier, isSlotWithinAvailability } from '../../utils/scheduling';
import './Calendar.css';
import { CalendarScheduleList } from './CalendarScheduleList';
import {
  CALENDAR_FORMATS,
  CALENDAR_MAX_TIME,
  CALENDAR_MIN_TIME,
  VIEW_SELECT_DATA,
  appointmentsToEvents,
  calendarLocalizer,
  eventPropGetter,
  slotsToEvents,
  type BaseScheduleEvent,
  type PendingBlockEvent,
} from './calendarUtils';
import { EventWithTooltip, ViewIcon, ViewSelectOption } from './calendarViewComponents';

// @types/react-big-calendar 1.16.3 is missing backgroundEventPropGetter; extend
// the type locally so tsc accepts the prop that the runtime library supports.
type ScheduleEvent = BaseScheduleEvent;
type ExtendedCalendarProps = CalendarProps<ScheduleEvent> & {
  backgroundEventPropGetter?: (
    event: ScheduleEvent,
    start: Date,
    end: Date,
    isSelected: boolean
  ) => { className?: string; style?: CSSProperties };
};
const BigCalendar = ReactBigCalendar as React.ComponentType<ExtendedCalendarProps>;

const DayColumnHeader = ({ date }: { date: Date }): JSX.Element => (
  <div style={{ padding: '6px 0', lineHeight: 1.3 }}>
    <div style={{ fontSize: '0.85rem', fontWeight: 400 }}>{dayjs(date).format('dddd')}</div>
    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{dayjs(date).format('D')}</div>
  </div>
);

// Compute the visible date range for a given view + date, matching what RBC would report.
function computeRange(view: View, date: Date): Range {
  const d = dayjs(date);
  if (view === 'day') {
    return { start: d.startOf('day').toDate(), end: d.add(1, 'day').startOf('day').toDate() };
  }
  if (view === 'work_week') {
    return { start: d.startOf('week').toDate(), end: d.startOf('week').add(5, 'day').toDate() };
  }
  if (view === 'month') {
    return {
      start: d.startOf('month').startOf('week').toDate(),
      end: d.endOf('month').endOf('week').add(1, 'day').startOf('day').toDate(),
    };
  }
  // week
  return { start: d.startOf('week').toDate(), end: d.add(1, 'week').startOf('week').toDate() };
}

interface CalendarToolbarProps {
  view: View;
  date: Date;
  onNavigate: (action: 'TODAY' | 'PREV' | 'NEXT') => void;
  onView: (view: View) => void;
  onDaySchedule?: () => void;
  viewMode: 'calendar' | 'list';
  onToggleViewMode: (mode: 'calendar' | 'list') => void;
}

export const CalendarToolbar = (props: CalendarToolbarProps): JSX.Element => {
  return (
    <Group justify="space-between" pb="sm">
      <Group>
        <Button
          variant="default"
          size="xs"
          onClick={() => props.onNavigate('TODAY')}
          style={{ background: 'var(--mantine-color-white)', marginRight: -10, fontSize: '14px', fontWeight: 400 }}
          aria-label="Today"
        >
          Today
        </Button>
        <Button
          variant="default"
          size="xs"
          aria-label="Previous"
          style={{
            background: 'var(--mantine-color-white)',
            marginRight: -10,
            minWidth: 0,
            width: '1.5rem',
            padding: 0,
          }}
          onClick={() => props.onNavigate('PREV')}
        >
          <IconChevronLeft size={16} />
        </Button>
        <Button
          variant="default"
          size="xs"
          aria-label="Next"
          style={{ background: 'var(--mantine-color-white)', minWidth: 0, width: '1.5rem', padding: 0 }}
          onClick={() => props.onNavigate('NEXT')}
        >
          <IconChevronRight size={16} />
        </Button>
        <Title order={5} mr="md" style={{ fontWeight: 500 }}>
          {props.view === 'day' && dayjs(props.date).format('dddd, D MMMM YYYY')}
          {(props.view === 'week' || props.view === 'work_week') &&
            (() => {
              const start = dayjs(props.date).startOf('week');
              const end = props.view === 'work_week' ? start.add(4, 'day') : dayjs(props.date).endOf('week');
              if (start.year() !== end.year()) return `${start.format('D MMM YYYY')} - ${end.format('D MMM YYYY')}`;
              if (start.month() !== end.month()) return `${start.format('D MMM')} - ${end.format('D MMM YYYY')}`;
              return `${start.format('D')} - ${end.format('D MMMM YYYY')}`;
            })()}
          {props.view === 'month' &&
            (() => {
              const start = dayjs(props.date).startOf('month');
              const end = dayjs(props.date).endOf('month');
              return `${start.format('D')} - ${end.format('D MMMM YYYY')}`;
            })()}
        </Title>
      </Group>
      <Group gap="xs">
        <SegmentedControl
          value={props.viewMode}
          onChange={(v) => props.onToggleViewMode(v as 'calendar' | 'list')}
          data={[
            {
              value: 'calendar',
              label: (
                <Tooltip label="Calendar View" position="bottom" withArrow>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
                    <IconCalendar size={16} />
                  </div>
                </Tooltip>
              ),
            },
            {
              value: 'list',
              label: (
                <Tooltip label="List View" position="bottom" withArrow>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
                    <IconList size={16} />
                  </div>
                </Tooltip>
              ),
            },
          ]}
          style={{ backgroundColor: 'var(--mantine-color-white)', border: '1px solid var(--mantine-color-gray-4)' }}
          styles={{
            root: { height: 32, padding: 2, minHeight: 'unset' },
            control: { height: '100%' },
            indicator: { backgroundColor: 'var(--mantine-color-blue-2)', height: '100%' },
            label: {
              color: 'var(--mantine-color-gray-9)',
              padding: '0 10px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            },
          }}
        />
        <Select
          size="xs"
          value={props.view}
          onChange={(value) => {
            if (!value) return;
            if (value === 'day_schedule') {
              props.onDaySchedule?.();
              return;
            }
            props.onView(value as View);
          }}
          w={160}
          allowDeselect={false}
          rightSection={<IconChevronDown size={16} />}
          styles={{
            input: { fontWeight: 400, height: '32px', paddingTop: 4, paddingBottom: 4, fontSize: '14px' },
            option: { fontWeight: 400, fontSize: '14px' },
          }}
          data={VIEW_SELECT_DATA}
          leftSection={<ViewIcon value={props.view} />}
          renderOption={({ option }) => <ViewSelectOption option={option} />}
        />
      </Group>
    </Group>
  );
};

export function Calendar(props: {
  slots: Slot[];
  appointments: Appointment[];
  style?: React.CSSProperties;
  onSelectInterval?: (slotInfo: SlotInfo) => void;
  onSelectSlot?: (slot: Slot) => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  onRangeChange?: (range: Range) => void;
  onViewChange?: (view: View) => void;
  onLoadStart?: () => void;
  onDaySchedule?: () => void;
  slotPropGetter?: (date: Date) => { className?: string; style?: React.CSSProperties };
  availability?: ScheduleAvailability;
  pendingBlock?: { start: Date; end: Date };
}): JSX.Element {
  const {
    slots,
    appointments,
    style,
    onSelectInterval,
    onSelectSlot,
    onSelectAppointment,
    onRangeChange,
    onViewChange,
    onLoadStart,
    onDaySchedule,
    slotPropGetter,
    availability,
    pendingBlock,
  } = props;
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Derive range from view + date — drives both the calendar and the list via onRangeChange.
  const range = useMemo(() => computeRange(view, date), [view, date]);
  useEffect(() => {
    onRangeChange?.(range);
  }, [range, onRangeChange]);
  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  const handleNavigate = useCallback(
    (action: 'TODAY' | 'PREV' | 'NEXT') => {
      onLoadStart?.();
      if (action === 'TODAY') {
        setDate(new Date());
        return;
      }
      const delta = action === 'PREV' ? -1 : 1;
      setDate((prev) => {
        if (view === 'day') return dayjs(prev).add(delta, 'day').toDate();
        if (view === 'month') return dayjs(prev).add(delta, 'month').toDate();
        return dayjs(prev).add(delta, 'week').toDate();
      });
    },
    [view, onLoadStart]
  );

  const handleSelectEvent = useCallback(
    (event: ScheduleEvent) => {
      if (event.type === 'appointment') onSelectAppointment?.(event.appointment);
      else if (event.type === 'slot') onSelectSlot?.(event.slot);
    },
    [onSelectAppointment, onSelectSlot]
  );

  const pendingBlockBackgroundEvents: PendingBlockEvent[] = pendingBlock
    ? [{ type: 'pending-block' as const, title: 'Blocking...', start: pendingBlock.start, end: pendingBlock.end }]
    : [];

  // Free slots are not meaningful at month granularity and produce excessive "+X more" noise.
  const events = [
    ...appointmentsToEvents(appointments),
    ...(view !== 'month' ? slotsToEvents(slots.filter((slot) => SchedulingTransientIdentifier.get(slot))) : []),
  ];
  const backgroundEvents = [
    ...slotsToEvents(slots.filter((slot) => !SchedulingTransientIdentifier.get(slot))),
    ...pendingBlockBackgroundEvents,
  ];

  const backgroundEventPropGetter = useCallback(
    (
      event: ScheduleEvent,
      start: Date,
      end: Date,
      isSelected: boolean
    ): { className?: string; style?: React.CSSProperties } => {
      const styles = eventPropGetter(event, start, end, isSelected);
      if (event.type === 'pending-block') {
        return {
          ...styles,
          className: `${styles.className ?? ''} rbc-pending-block`.trim(),
        };
      }
      return styles;
    },
    []
  );

  // When no SchedulingParameters availability is configured, derive a per-day
  // working-hours envelope from free slots so both pre-hours and post-hours
  // cells are grayed correctly in week/day views.
  const freeSlotBoundsByDay = useMemo(() => {
    const bounds = new Map<string, { start: number; end: number }>();
    for (const slot of slots) {
      if (slot.status !== 'free') {
        continue;
      }
      const slotStartMs = new Date(slot.start).getTime();
      const slotEndMs = new Date(slot.end).getTime();
      const dayKey = dayjs(slotStartMs).format('YYYY-MM-DD');
      const existing = bounds.get(dayKey);
      if (!existing) {
        bounds.set(dayKey, { start: slotStartMs, end: slotEndMs });
      } else {
        bounds.set(dayKey, {
          start: Math.min(existing.start, slotStartMs),
          end: Math.max(existing.end, slotEndMs),
        });
      }
    }
    return bounds;
  }, [slots]);

  const computedSlotPropGetter = useCallback(
    (date: Date): { className?: string; style?: React.CSSProperties } => {
      const dateMs = date.getTime();

      // Outside configured availability windows → gray background
      if (availability && availability.windows.length > 0 && !isSlotWithinAvailability(dateMs, availability)) {
        return { style: { backgroundColor: 'var(--mantine-color-gray-0)', cursor: 'default' } };
      }

      if (dateMs >= Date.now()) {
        // Fallback when no availability windows: gray cells outside each day's
        // free-slot envelope.
        if (!availability?.windows.length) {
          const dayKey = dayjs(date).format('YYYY-MM-DD');
          const dayBounds = freeSlotBoundsByDay.get(dayKey);
          if (!dayBounds || dateMs < dayBounds.start || dateMs >= dayBounds.end) {
            return { style: { backgroundColor: 'var(--mantine-color-gray-0)', cursor: 'default' } };
          }
        }
        return { style: { cursor: 'pointer' } };
      }

      return slotPropGetter?.(date) ?? {};
    },
    [availability, freeSlotBoundsByDay, slotPropGetter]
  );

  const dayPropGetter = useCallback((d: Date) => {
    if (dayjs(d).isBefore(dayjs().startOf('day'))) return { className: 'past-date' };
    return {};
  }, []);

  return (
    <div
      data-testid="calendar"
      className="chimera-calendar"
      style={{ display: 'flex', flexDirection: 'column', ...style }}
    >
      <CalendarToolbar
        view={view}
        date={date}
        onNavigate={handleNavigate}
        onView={setView}
        onDaySchedule={onDaySchedule}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />
      {viewMode === 'calendar' ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <BigCalendar
            tooltipAccessor={() => ''}
            components={{
              toolbar: () => null,
              event:
                view === 'month'
                  ? ({ event }: { event: ScheduleEvent }) => (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          padding: '1px 3px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.title as string}
                      </div>
                    )
                  : EventWithTooltip,
              header: ({ date }: HeaderProps) => <DayColumnHeader date={date} />,
            }}
            views={['month', 'week', 'work_week', 'day']}
            formats={{ ...CALENDAR_FORMATS, weekdayFormat: 'dddd' }}
            min={CALENDAR_MIN_TIME}
            max={CALENDAR_MAX_TIME}
            view={view}
            date={date}
            localizer={calendarLocalizer}
            events={events}
            backgroundEvents={backgroundEvents}
            onNavigate={(newDate: Date, newView: View) => {
              onLoadStart?.();
              setDate(newDate);
              setView(newView);
            }}
            onSelectSlot={onSelectInterval}
            onSelectEvent={handleSelectEvent}
            onView={setView}
            selectable={!!onSelectInterval}
            eventPropGetter={eventPropGetter}
            backgroundEventPropGetter={backgroundEventPropGetter}
            dayPropGetter={dayPropGetter}
            slotPropGetter={computedSlotPropGetter}
            style={{ height: '100%' }}
            dayLayoutAlgorithm="no-overlap"
          />
        </div>
      ) : (
        <CalendarScheduleList appointments={appointments} style={{ flex: 1, minHeight: 0 }} />
      )}
    </div>
  );
}
