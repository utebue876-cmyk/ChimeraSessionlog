import { Group, Table, Text } from '@mantine/core';
import type { JSX } from 'react';
import { formatPercent } from '../../utils/formatUtils';
import type { MetricRow } from './usePractitionerMetrics';

interface WeeklyMetricsTableProps {
  metrics: MetricRow[];
  workingWeekHours: number;
  sliceColors: string[];
}

export function WeeklyMetricsTable({ metrics, workingWeekHours, sliceColors }: WeeklyMetricsTableProps): JSX.Element {
  return (
    <>
      <Text size="xs" ta="center">
        Categorised hours % of {workingWeekHours}h working week
      </Text>

      <Table fz={11} verticalSpacing={3}>
        <Table.Thead>
          <Table.Tr
            style={{
              borderBottom: '1px solid var(--mantine-color-gray-4)',
            }}
          >
            <Table.Th fw={500}>Item</Table.Th>
            <Table.Th fw={500} ta="right">
              No.
            </Table.Th>
            <Table.Th fw={500} ta="right">
              Hours
            </Table.Th>
            <Table.Th fw={500} ta="right">
              Weekly %
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {metrics.map((m, i) => (
            <Table.Tr key={m.label}>
              <Table.Td>
                <Group gap="xs">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: sliceColors[i], flexShrink: 0 }} />
                  {m.label}
                </Group>
              </Table.Td>
              <Table.Td ta="right">{m.label === 'Unallocated' ? '—' : m.count}</Table.Td>
              <Table.Td ta="right">{m.hours.toFixed(1)}</Table.Td>
              <Table.Td ta="right">{formatPercent(m.weeklyPercent)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
        <Table.Tfoot style={{ borderTop: '1px solid var(--mantine-color-gray-4)' }}>
          <Table.Tr fw={500} style={{ borderBottom: '1px solid var(--mantine-color-gray-4)' }}>
            <Table.Td>Total</Table.Td>
            <Table.Td ta="right">{metrics.reduce((s, m) => s + m.count, 0)}</Table.Td>
            <Table.Td ta="right">{metrics.reduce((s, m) => s + m.hours, 0).toFixed(1)}</Table.Td>
            <Table.Td ta="right">100%</Table.Td>
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </>
  );
}
