import { Progress, Stack, Text } from '@mantine/core';
import type { JSX } from 'react';
import { formatPercent } from '../../utils/formatUtils';

interface ClinicalHoursMetricsProps {
  clinicalHoursSummary: {
    hours: number;
    percentage: number;
    color: string;
  };
  clinicalHours: number;
}

export function ClinicalHoursMetrics({ clinicalHoursSummary, clinicalHours }: ClinicalHoursMetricsProps): JSX.Element {
  return (
    <Stack gap={8}>
      <Text size="xs" fw={400}>
        Appointments % of {clinicalHours}h clinical hours
      </Text>
      <Progress
        value={clinicalHoursSummary.percentage}
        color={clinicalHoursSummary.color}
        size="sm"
        radius="sm"
        aria-label="Clinical hours progress"
      />
      <Text size="xs">
        {formatPercent(clinicalHoursSummary.percentage)} ({clinicalHoursSummary.hours.toFixed(1)}h / {clinicalHours}
        h)
      </Text>
    </Stack>
  );
}
