import { Divider, Stack, Text } from '@mantine/core';
import type { Appointment, Slot } from '@medplum/fhirtypes';
import dayjs from 'dayjs';
import type { JSX } from 'react';
import { defaultClinicalHours, defaultWorkingWeekHours } from '../../config/constants';
import type { Range } from '../../types/scheduling';
import { ClinicalHoursMetrics } from './ClinicalHoursMetrics';
import { DailyBreakdownChart } from './DailyBreakdownChart';
import { usePractitionerMetrics } from './usePractitionerMetrics';
import { WeeklyMetricsChart } from './WeeklyMetricsChart';
import { WeeklyMetricsTable } from './WeeklyMetricsTable';

// One colour per block reason + appointments & Unalllocated...
const sliceColors = [
  '#2A9D8F', // teal - appointments
  '#6A4C93', // purple
  '#264653', // dark slate
  '#E9C46A', // amber
  '#E76F51', // coral
  '#0077B6', // blue
  '#74c0fc', // light blue — Unallocated
  '#FFB703', // yellow
];

// Full width style as the drawer and stack already have padding...
const fullWidthDividerStyle = {
  borderColor: 'var(--mantine-color-gray-5)',
  marginInline: 'calc(-2 * var(--mantine-spacing-md))',
  width: 'calc(100% + 4 * var(--mantine-spacing-md))',
} as const;

interface PractitionerMetricsProps {
  slots: Slot[];
  appointments: Appointment[];
  range: Range | undefined;
  workingWeekHours?: number;
  clinicalHours?: number;
}

export function PractitionerMetrics({
  slots,
  appointments,
  range,
  workingWeekHours = defaultWorkingWeekHours,
  clinicalHours = defaultClinicalHours,
}: PractitionerMetricsProps): JSX.Element {
  const { metrics, clinicalHoursSummary, dailyBreakdown } = usePractitionerMetrics(
    slots,
    appointments,
    range,
    workingWeekHours,
    clinicalHours
  );
  const pieChartTitle = `% of allocated hours based on a ${workingWeekHours}h working week`;

  const rangeLabel = range
    ? `${dayjs(range.start).format('D MMM')} – ${dayjs(range.end).subtract(1, 'day').format('D MMM YYYY')}`
    : 'Current period';

  return (
    <Stack p="md" gap="md">
      <Text size="lg">{rangeLabel}</Text>

      <ClinicalHoursMetrics clinicalHoursSummary={clinicalHoursSummary} clinicalHours={clinicalHours} />

      <Divider style={fullWidthDividerStyle} />

      <WeeklyMetricsTable metrics={metrics} workingWeekHours={workingWeekHours} sliceColors={sliceColors} />

      <Text size="xs" ta="center">
        {pieChartTitle}
      </Text>

      <WeeklyMetricsChart metrics={metrics} sliceColors={sliceColors} />

      <Divider style={fullWidthDividerStyle} />

      <DailyBreakdownChart dailyBreakdown={dailyBreakdown} />
    </Stack>
  );
}
