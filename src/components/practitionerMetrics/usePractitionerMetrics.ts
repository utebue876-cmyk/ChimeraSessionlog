import type { Appointment, Slot } from '@medplum/fhirtypes';
import { useMemo } from 'react';
import { defaultClinicalHours, defaultWorkingWeekHours } from '../../config/constants';
import type { Range } from '../../types/scheduling';

export const BLOCK_REASONS = ['Annual Leave', 'Meeting', 'Training', 'Lunch', 'Other'] as const;

export interface MetricRow {
  label: string;
  count: number;
  hours: number;
  weeklyPercent: number;
}

export interface ClinicalHoursSummary {
  hours: number;
  percentage: number;
  color: 'red' | 'orange' | 'green';
}

export interface DailyMetricBreakdown {
  day: string;
  appointments: number;
  blocked: number;
  unallocated: number;
}

function roundPercentagesToWholeNumbers(values: number[]): number[] {
  const floored = values.map((value) => Math.floor(value));
  const remainder = 100 - floored.reduce((sum, value) => sum + value, 0);

  if (remainder === 0) {
    return floored;
  }

  const order = [...values.keys()]
    .map((index) => ({
      index,
      decimal: values[index] - Math.floor(values[index]),
    }))
    .sort((left, right) => right.decimal - left.decimal || left.index - right.index);

  for (let i = 0; i < Math.abs(remainder); i++) {
    const index = order[i].index;
    floored[index] += remainder > 0 ? 1 : -1;
  }

  return floored;
}

function durationHours(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
}

// Returns YYYY-MM-DD in local time to avoid UTC date-shift when matching events to days.
function localDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Count Mon–Fri days touched by the slot (used to cap 24h blocks at 8h per working day).
function countWeekdays(start: Date, end: Date): number {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  let count = 0;
  while (d <= endDay) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1); // treat weekend-only slots as 1 partial day
}

function workingDurationHours(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const raw = (e.getTime() - s.getTime()) / 3_600_000;
  return Math.min(raw, countWeekdays(s, e) * 8);
}

export function usePractitionerMetrics(
  slots: Slot[],
  appointments: Appointment[],
  range: Range | undefined,
  workingWeekHours = defaultWorkingWeekHours,
  clinicalHours = defaultClinicalHours
): { metrics: MetricRow[]; clinicalHoursSummary: ClinicalHoursSummary; dailyBreakdown: DailyMetricBreakdown[] } {
  return useMemo(() => {
    const rangeEndMs = range?.end.getTime() ?? Infinity;
    const inRange = (start: string) => new Date(start).getTime() < rangeEndMs;

    const blocked = slots.filter((s) => s.status === 'busy-unavailable' && inRange(s.start));
    const rangedAppointments = appointments.filter((a) => a.start && inRange(a.start));

    const blockRows: MetricRow[] = BLOCK_REASONS.map((reason) => {
      const matching = blocked.filter((s) => (s.comment?.trim() || 'Other') === reason);
      const hours = matching.reduce((sum, s) => sum + workingDurationHours(s.start, s.end), 0);
      return { label: reason, count: matching.length, hours, weeklyPercent: (hours / workingWeekHours) * 100 };
    });

    const aptHours = rangedAppointments.reduce(
      (sum, a) => sum + (a.start && a.end ? durationHours(a.start, a.end) : 0),
      0
    );

    const totalBlockedHours = blockRows.reduce((sum, r) => sum + r.hours, 0);
    const unallocatedHours = Math.max(0, workingWeekHours - totalBlockedHours - aptHours);

    const rows = [
      {
        label: 'Appointments',
        count: rangedAppointments.length,
        hours: aptHours,
        weeklyPercent: (aptHours / workingWeekHours) * 100,
      },
      ...blockRows,
      {
        label: 'Unallocated',
        count: 0,
        hours: unallocatedHours,
        weeklyPercent: (unallocatedHours / workingWeekHours) * 100,
      },
    ];

    const rawPercentages = rows.map((row) => row.weeklyPercent);
    const rawTotal = rawPercentages.reduce((sum, v) => sum + v, 0);
    // Normalise so inputs always sum to 100 regardless of range length.
    const normalised = rawTotal > 0 ? rawPercentages.map((v) => (v / rawTotal) * 100) : rawPercentages;
    const roundedPercentages = roundPercentagesToWholeNumbers(normalised);
    const metrics = rows.map((row, index) => ({
      ...row,
      weeklyPercent: roundedPercentages[index],
    }));

    const clinicalHoursPercentage = (aptHours / clinicalHours) * 100;
    const clinicalHoursSummary: ClinicalHoursSummary = {
      hours: aptHours,
      percentage: Math.min(clinicalHoursPercentage, 100),
      color: clinicalHoursPercentage < 50 ? 'red' : clinicalHoursPercentage < 75 ? 'orange' : 'green',
    };

    const baseDate = range?.start ? new Date(range.start) : new Date();
    const monday = new Date(baseDate);
    const dayOffset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dayOffset);
    monday.setHours(0, 0, 0, 0);

    const dailyBreakdown: DailyMetricBreakdown[] = Array.from({ length: 5 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      const dayLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][index];
      const dayKey = localDateKey(date.toISOString());

      const dailyAppointments = rangedAppointments
        .filter((a) => a.start && dayKey === localDateKey(a.start))
        .reduce((sum, a) => sum + (a.start && a.end ? durationHours(a.start, a.end) : 0), 0);

      const dailyBlocked = blocked
        .filter((s) => dayKey === localDateKey(s.start))
        .reduce((sum, s) => sum + workingDurationHours(s.start, s.end), 0);

      const dailyUnallocated = Math.max(0, 8 - dailyAppointments - dailyBlocked);

      return {
        day: dayLabel,
        appointments: Number(dailyAppointments.toFixed(1)),
        blocked: Number(dailyBlocked.toFixed(1)),
        unallocated: Number(dailyUnallocated.toFixed(1)),
      };
    });

    return { metrics, clinicalHoursSummary, dailyBreakdown };
  }, [slots, appointments, range, workingWeekHours, clinicalHours]);
}
