import { Button, Group, LoadingOverlay, Select, Text, Title } from '@mantine/core';
import type { Appointment, Practitioner, Slot } from '@medplum/fhirtypes';
import { IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { CSSProperties, JSX, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { SlotInfo } from 'react-big-calendar';
import { Calendar as ReactBigCalendar } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { ScheduleAvailability } from '../../utils/scheduling';
import { SchedulingTransientIdentifier, isSlotWithinAvailability } from '../../utils/scheduling';
import './Calendar.css';
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
} from './calendarUtils';
import { EventWithTooltip, ViewIcon, ViewSelectOption } from './calendarViewComponents';

export type PractitionerSchedule = {
  practitioner: Practitioner;
  appointments: Appointment[];
  slots: Slot[];
  availability: ScheduleAvailability | null;
};

type PractitionerResource = { id: string; name: string };
type ScheduleEvent = BaseScheduleEvent;

const PAGE_SIZE = 4;

function getPractitionerName(p: Practitioner): string {
  const n = p.name?.[0];
  if (!n) return p.id ?? 'Unknown';
  return n.text ?? `${(n.given ?? []).join(' ')} ${n.family ?? ''}`.trim();
}

function PractitionerHeader({ resource }: { label: ReactNode; index: number; resource: object }): JSX.Element {
  const { name } = resource as PractitionerResource;
  return (
    <div style={{ padding: '6px 0', lineHeight: 1.3 }}>
      <div style={{ fontSize: '12px', color: 'var(--mantine-color-gray-6)' }}>Practitioner</div>
      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{name}</div>
    </div>
  );
}

export function CalendarSchedule(props: {
  date?: Date;
  practitioners: PractitionerSchedule[];
  style?: CSSProperties;
  onDateChange?: (date: Date) => void;
  onBack?: () => void;
  lockView?: boolean;
  loading?: boolean;
  onSelectInterval?: (slotInfo: SlotInfo) => void;
  onSelectSlot?: (slot: Slot) => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  slotPropGetter?: (date: Date) => { className?: string; style?: CSSProperties };
}): JSX.Element {
  const { onDateChange, onSelectAppointment, onSelectSlot, slotPropGetter } = props;
  const [date, setDate] = useState<Date>(props.date ?? new Date());
  const [page, setPage] = useState(0);
  const total = props.practitioners.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Set page to valid range whenever the practitioners list changes...
  const safePage = Math.min(page, pageCount - 1);

  const visiblePractitioners = useMemo(
    () => props.practitioners.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [props.practitioners, safePage]
  );

  const resources = useMemo<PractitionerResource[]>(
    () =>
      visiblePractitioners.map(({ practitioner }) => ({
        id: practitioner.id!,
        name: getPractitionerName(practitioner),
      })),
    [visiblePractitioners]
  );

  const events = useMemo(
    () =>
      visiblePractitioners.flatMap(({ practitioner, appointments, slots }) => [
        ...appointmentsToEvents(appointments, practitioner.id!),
        ...slotsToEvents(
          slots.filter((s) => SchedulingTransientIdentifier.get(s)),
          practitioner.id!
        ),
      ]),
    [visiblePractitioners]
  );

  const backgroundEvents = useMemo(
    () =>
      visiblePractitioners.flatMap(({ practitioner, slots }) =>
        slotsToEvents(
          slots.filter((s) => !SchedulingTransientIdentifier.get(s)),
          practitioner.id!
        )
      ),
    [visiblePractitioners]
  );

  const availabilityById = useMemo(
    () => new Map(props.practitioners.map((ps) => [ps.practitioner.id!, ps.availability])),
    [props.practitioners]
  );

  const computedSlotPropGetter = useCallback(
    (date: Date, resourceId?: string | number): { className?: string; style?: CSSProperties } => {
      if (resourceId) {
        const avail = availabilityById.get(resourceId as string);
        if (avail && avail.windows.length > 0 && !isSlotWithinAvailability(date.getTime(), avail)) {
          return { style: { backgroundColor: 'var(--mantine-color-gray-0)', cursor: 'default' } };
        }
      }
      return slotPropGetter?.(date) ?? {};
    },
    [availabilityById, slotPropGetter]
  );

  const computedEventPropGetter = useCallback(
    (
      event: ScheduleEvent,
      start: Date,
      end: Date,
      isSelected: boolean
    ): { className?: string; style?: CSSProperties } => {
      // Color virtual free slot events outside their practitioner's availability as gray
      if (event.type === 'slot' && event.resourceId) {
        const avail = availabilityById.get(event.resourceId as string);
        if (avail && avail.windows.length > 0 && !isSlotWithinAvailability(start.getTime(), avail)) {
          return {
            style: { backgroundColor: 'var(--mantine-color-gray-0)', opacity: 0.75, cursor: 'default' },
            className: 'rbc-slot-event',
          };
        }
      }
      return eventPropGetter(event, start, end, isSelected);
    },
    [availabilityById]
  );

  const navigate = useCallback(
    (newDate: Date) => {
      setDate(newDate);
      onDateChange?.(newDate);
    },
    [onDateChange]
  );

  const handleSelectEvent = useCallback(
    (event: ScheduleEvent) => {
      if (event.type === 'appointment') {
        onSelectAppointment?.(event.appointment);
      } else if (event.type === 'slot') {
        onSelectSlot?.(event.slot);
      }
    },
    [onSelectAppointment, onSelectSlot]
  );

  const pageStart = total === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const pageEnd = Math.min((safePage + 1) * PAGE_SIZE, total);
  const isToday = dayjs(date).isSame(dayjs(), 'day');

  return (
    <div
      data-testid="calendar-schedule"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', ...props.style }}
    >
      <LoadingOverlay visible={props.loading ?? false} zIndex={10} overlayProps={{ radius: 'sm', blur: 0 }} />

      <Group justify="space-between" pb="sm">
        <Group>
          <Button
            variant="default"
            size="xs"
            onClick={() => navigate(new Date())}
            style={{
              background: 'var(--mantine-color-white)',
              marginRight: -10,
              fontSize: '14px',
              fontWeight: 400,
              ...(isToday ? { color: 'var(--mantine-color-blue-8)', fontWeight: 500 } : {}),
            }}
            aria-label="Today"
          >
            Today
          </Button>
          <Button
            variant="default"
            size="xs"
            aria-label="Previous day"
            style={{
              background: 'var(--mantine-color-white)',
              marginRight: -10,
              minWidth: 0,
              width: '1.5rem',
              padding: 0,
            }}
            onClick={() => navigate(dayjs(date).subtract(1, 'day').toDate())}
          >
            <IconChevronLeft size={16} />
          </Button>
          <Button
            variant="default"
            size="xs"
            aria-label="Next day"
            style={{ background: 'var(--mantine-color-white)', minWidth: 0, width: '1.5rem', padding: 0 }}
            onClick={() => navigate(dayjs(date).add(1, 'day').toDate())}
          >
            <IconChevronRight size={16} />
          </Button>
          <Title order={5} style={{ fontWeight: 500, ...(isToday ? { color: 'var(--mantine-color-blue-8)' } : {}) }}>
            {dayjs(date).format('dddd, D MMMM YYYY')}
          </Title>
        </Group>

        <Group gap="xs">
          {total > PAGE_SIZE && (
            <>
              <Button
                variant="default"
                size="xs"
                aria-label="Previous practitioners"
                aria-disabled={safePage === 0}
                tabIndex={safePage === 0 ? -1 : undefined}
                style={{
                  background: 'var(--mantine-color-blue-0)',
                  minWidth: 0,
                  width: '1.5rem',
                  padding: 0,
                  ...(safePage === 0 ? { opacity: 0.4, pointerEvents: 'none' } : {}),
                }}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <IconChevronLeft size={16} />
              </Button>
              <Text size="xs" c="dark" fw={500} style={{ fontSize: '14px' }}>
                {pageStart} to {pageEnd} of {total} Practitioners
              </Text>
              <Button
                variant="default"
                size="xs"
                aria-label="Next practitioners"
                aria-disabled={safePage >= pageCount - 1}
                tabIndex={safePage >= pageCount - 1 ? -1 : undefined}
                style={{
                  background: 'var(--mantine-color-blue-0)',
                  minWidth: 0,
                  width: '1.5rem',
                  padding: 0,
                  ...(safePage >= pageCount - 1 ? { opacity: 0.4, pointerEvents: 'none' } : {}),
                }}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                <IconChevronRight size={16} />
              </Button>
            </>
          )}
          <Select
            size="xs"
            value="day_schedule"
            onChange={(value) => {
              if (value && value !== 'day_schedule') props.onBack?.();
            }}
            w={160}
            allowDeselect={false}
            rightSection={<IconChevronDown size={16} />}
            styles={{
              input: { fontWeight: 400, height: '32px', paddingTop: 4, paddingBottom: 4, fontSize: '14px' },
              option: { fontWeight: 400, fontSize: '14px' },
            }}
            data={VIEW_SELECT_DATA.map((item) => ({
              ...item,
              disabled: item.value !== 'day_schedule' && !!props.lockView,
            }))}
            leftSection={<ViewIcon value="day_schedule" />}
            renderOption={({ option }) => <ViewSelectOption option={option} />}
          />
        </Group>
      </Group>

      <div style={{ flex: 1, minHeight: 0 }} className="day-schedule-calendar">
        <ReactBigCalendar<ScheduleEvent, PractitionerResource>
          tooltipAccessor={() => ''}
          components={{
            // Suppress the built-in toolbar — we render our own above...
            toolbar: () => null,
            event: EventWithTooltip,
            resourceHeader: PractitionerHeader,
          }}
          views={{ day: true }}
          view="day"
          date={date}
          localizer={calendarLocalizer}
          resources={resources}
          resourceIdAccessor="id"
          resourceTitleAccessor="name"
          events={events}
          backgroundEvents={backgroundEvents}
          onNavigate={navigate}
          onSelectSlot={props.onSelectInterval}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={computedEventPropGetter}
          slotPropGetter={computedSlotPropGetter}
          formats={CALENDAR_FORMATS}
          min={CALENDAR_MIN_TIME}
          max={CALENDAR_MAX_TIME}
          style={{ height: '100%' }}
          dayLayoutAlgorithm="no-overlap"
        />
      </div>
    </div>
  );
}
