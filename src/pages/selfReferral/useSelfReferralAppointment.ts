import type { WithId } from '@medplum/core';
import { getReferenceString } from '@medplum/core';
import type { Appointment, Schedule, Slot } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import {
  getDurationMinutesForServiceType,
  getScheduleAvailabilityForServiceType,
  getSlotServiceType,
  isSlotWithinAvailability,
  SchedulingTransientIdentifier,
  serviceTypesFromSchedulingParameters,
} from '../../utils/scheduling';

export type TimeFilter = 'am' | 'pm' | 'all';

export interface TimeSlot {
  timeLabel: string;
  start: Date;
  slots: Slot[];
}

export interface DayColumn {
  date: dayjs.Dayjs;
  timeSlots: TimeSlot[];
}

export interface UseSelfReferralAppointmentResult {
  weekDays: dayjs.Dayjs[];
  dayColumns: DayColumn[];
  filter: TimeFilter;
  setFilter: (f: TimeFilter) => void;
  loading: boolean;
  selectedTimeLabel: string | null;
  selectedDayIso: string | null;
  selectSlot: (dayIso: string, timeLabel: string) => void;
  canGoBack: boolean;
  goBack: () => void;
  goForward: () => void;
  handleConfirm: () => void;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Monday of the given week offset from today
function getWeekStart(offset: number): dayjs.Dayjs {
  const today = dayjs();
  const monday = today.subtract(today.day() === 0 ? 6 : today.day() - 1, 'day');
  return monday.add(offset * 7, 'day').startOf('day');
}

/** Generate free slots for a schedule+serviceType over a time range, excluding booked appointments. */
function generateSlotsForSchedule(
  schedule: WithId<Schedule>,
  rangeStart: Date,
  rangeEnd: Date,
  appointments: Appointment[],
  blockedSlots: Slot[]
): Slot[] {
  const serviceTypes = [...serviceTypesFromSchedulingParameters(schedule), ...(schedule.serviceType ?? [])];

  // De-duplicate service types by code
  const seen = new Set<string>();
  const uniqueServiceTypes = serviceTypes.filter((st) => {
    const key = st.coding?.map((c) => c.code ?? '').join(',') ?? st.text ?? '';
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const allSlots: Slot[] = [];

  for (const serviceType of uniqueServiceTypes) {
    const availability = getScheduleAvailabilityForServiceType(schedule, serviceType);
    if (availability.windows.length === 0) continue;

    const durationMs = (getDurationMinutesForServiceType(schedule, serviceType) ?? 30) * 60_000;
    const rangeStartMs = rangeStart.getTime();
    const rangeEndMs = rangeEnd.getTime();
    const alignedStart = Math.floor(rangeStartMs / durationMs) * durationMs;
    const slotServiceType = getSlotServiceType(schedule, serviceType);

    for (let t = alignedStart; t < rangeEndMs; t += durationMs) {
      const slotEnd = t + durationMs;
      if (slotEnd <= rangeStartMs) continue;
      if (!isSlotWithinAvailability(t, availability)) continue;

      const overlapsApt = appointments.some(
        (apt) => apt.start && apt.end && t < new Date(apt.end).getTime() && slotEnd > new Date(apt.start).getTime()
      );
      if (overlapsApt) continue;

      const overlapsBlock = blockedSlots.some(
        (slot) => slot.start && slot.end && t < new Date(slot.end).getTime() && slotEnd > new Date(slot.start).getTime()
      );
      if (overlapsBlock) continue;

      const slot: Slot = {
        resourceType: 'Slot',
        start: new Date(t).toISOString(),
        end: new Date(slotEnd).toISOString(),
        status: 'free',
        schedule: { reference: getReferenceString(schedule) },
        serviceType: [slotServiceType],
      };
      SchedulingTransientIdentifier.set(slot);
      allSlots.push(slot);
    }
  }

  return allSlots;
}

export function useSelfReferralAppointment(): UseSelfReferralAppointmentResult {
  const medplum = useMedplum();
  const setStep = useSelfReferralStore((s) => s.setStep);
  const setAppointmentDetails = useSelfReferralStore((s) => s.setAppointmentDetails);

  const [weekOffset, setWeekOffset] = useState(0);
  const [filter, setFilter] = useState<TimeFilter>('am');
  const [loading, setLoading] = useState(false);
  const [rawSlots, setRawSlots] = useState<Slot[]>([]);
  const [selectedTimeLabel, setSelectedTimeLabel] = useState<string | null>(null);
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
  const [allSchedules, setAllSchedules] = useState<WithId<Schedule>[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Slot[]>([]);

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);

  // Mon–Sun for the selected week
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')), [weekStart]);

  // Load all active schedules once
  useEffect(() => {
    medplum
      .searchResources('Schedule', [
        ['_count', '200'],
        ['active', 'true'],
      ])
      .then((results) => setAllSchedules(results as WithId<Schedule>[]))
      .catch(() => setAllSchedules([]));
  }, [medplum]);

  // Load week data used to compute available slots.
  useEffect(() => {
    if (allSchedules.length === 0) {
      setAppointments([]);
      setBlockedSlots([]);
      return;
    }

    let active = true;
    const weekStartIso = weekStart.toISOString();
    const weekEndIso = weekStart.add(7, 'day').toISOString();
    const rangeStart = weekStart.startOf('day').toDate();
    const rangeEnd = weekStart.add(7, 'day').startOf('day').toDate();

    const loadAppointments = async (): Promise<void> => {
      try {
        const results = await medplum.searchResources('Appointment', [
          ['_count', '1000'],
          ['date', `ge${weekStartIso}`],
          ['date', `lt${weekEndIso}`],
        ]);
        if (active) {
          setAppointments(results);
        }
      } catch {
        if (active) {
          setAppointments([]);
        }
      }
    };

    const loadBlockedSlots = async (): Promise<void> => {
      try {
        const blockedBySchedule = await Promise.all(
          allSchedules.map(async (schedule) => {
            const scheduleRef = getReferenceString(schedule);
            const slots = await medplum.searchResources('Slot', [
              ['_count', '1000'],
              ['schedule', scheduleRef],
              ['start', `le${rangeEnd.toISOString()}`],
              ['status', 'busy-unavailable'],
            ]);
            return slots.filter((slot) => {
              if (!slot.start || !slot.end) return false;
              const blockStart = new Date(slot.start).getTime();
              const blockEnd = new Date(slot.end).getTime();
              return blockStart < rangeEnd.getTime() && blockEnd > rangeStart.getTime();
            });
          })
        );
        if (active) {
          setBlockedSlots(blockedBySchedule.flat());
        }
      } catch {
        if (active) {
          setBlockedSlots([]);
        }
      }
    };

    void Promise.all([loadAppointments(), loadBlockedSlots()]);

    return () => {
      active = false;
    };
  }, [medplum, allSchedules, weekStart]);

  // Generate slots for the week across all schedules
  useEffect(() => {
    if (allSchedules.length === 0) return;
    setRawSlots([]);
    setLoading(true);
    setSelectedTimeLabel(null);
    setSelectedDayIso(null);

    const rangeStart = weekStart.startOf('day').toDate();
    const rangeEnd = weekStart.add(7, 'day').startOf('day').toDate();

    const generated: Slot[] = [];
    for (const schedule of allSchedules) {
      const scheduleRef = getReferenceString(schedule);
      const scheduleBlockedSlots = blockedSlots.filter((slot) => slot.schedule?.reference === scheduleRef);
      generated.push(...generateSlotsForSchedule(schedule, rangeStart, rangeEnd, appointments, scheduleBlockedSlots));
    }
    setRawSlots(generated);
    setLoading(false);
  }, [allSchedules, weekStart, appointments, blockedSlots]);

  // Group slots into day columns, deduplicated by time
  const dayColumns = useMemo<DayColumn[]>(() => {
    return weekDays.map((day) => {
      const dayIso = day.format('YYYY-MM-DD');

      const daySlots = rawSlots.filter((s) => s.start && dayjs(s.start).format('YYYY-MM-DD') === dayIso);

      const filtered = daySlots.filter((s) => {
        if (!s.start) return false;
        const h = new Date(s.start).getHours();
        if (filter === 'am') return h < 12;
        if (filter === 'pm') return h >= 12;
        return true;
      });

      // Deduplicate by start time label, keeping all matching slots
      const timeMap = new Map<string, TimeSlot>();
      for (const slot of filtered) {
        if (!slot.start) continue;
        const startDate = new Date(slot.start);
        const label = formatTime(startDate);
        const existing = timeMap.get(label);
        if (existing) {
          existing.slots.push(slot);
        } else {
          timeMap.set(label, { timeLabel: label, start: startDate, slots: [slot] });
        }
      }

      const timeSlots = [...timeMap.values()].sort((a, b) => a.start.getTime() - b.start.getTime());

      return { date: day, timeSlots };
    });
  }, [weekDays, rawSlots, filter]);

  const selectSlot = useCallback((dayIso: string, timeLabel: string) => {
    setSelectedDayIso(dayIso);
    setSelectedTimeLabel(timeLabel);
  }, []);

  const canGoBack = weekOffset > 0;

  const goBack = useCallback(() => {
    if (canGoBack) setWeekOffset((o) => o - 1);
  }, [canGoBack]);

  const goForward = useCallback(() => setWeekOffset((o) => o + 1), []);

  const handleConfirm = useCallback(() => {
    if (!selectedDayIso || !selectedTimeLabel) return;

    // Find all raw slots matching the selected day + time
    const matchingSlots = rawSlots.filter(
      (s) =>
        s.start &&
        dayjs(s.start).format('YYYY-MM-DD') === selectedDayIso &&
        formatTime(new Date(s.start)) === selectedTimeLabel
    );

    // Collect all distinct Practitioner actor refs from the matching schedules
    const practitionerRefs: string[] = [];
    for (const slot of matchingSlots) {
      const schedRef = slot.schedule?.reference;
      if (!schedRef) continue;
      const schedule = allSchedules.find((sc) => getReferenceString(sc) === schedRef);
      if (!schedule) continue;
      for (const actor of schedule.actor ?? []) {
        if (actor.reference?.startsWith('Practitioner/') && !practitionerRefs.includes(actor.reference)) {
          practitionerRefs.push(actor.reference);
        }
      }
    }

    // Randomly select one practitioner when multiple are available
    const practitionerRef =
      practitionerRefs.length > 0
        ? (practitionerRefs[Math.floor(Math.random() * practitionerRefs.length)] ?? null)
        : null;

    // Take the serviceType from the first matching slot
    const serviceType = matchingSlots[0]?.serviceType?.[0] ?? null;

    setAppointmentDetails(`${selectedDayIso}T${selectedTimeLabel}:00`, practitionerRef, serviceType);
    setStep(4);
  }, [setStep, setAppointmentDetails, selectedDayIso, selectedTimeLabel, rawSlots, allSchedules]);

  return {
    weekDays,
    dayColumns,
    filter,
    setFilter,
    loading,
    selectedTimeLabel,
    selectedDayIso,
    selectSlot,
    canGoBack,
    goBack,
    goForward,
    handleConfirm,
  };
}
