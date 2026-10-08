import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { MetricRow } from './usePractitionerMetrics';
import { WeeklyMetricsTable } from './WeeklyMetricsTable';

const sliceColors = ['#2A9D8F', '#6A4C93', '#264653', '#E9C46A', '#E76F51', '#0077B6', '#74c0fc', '#FFB703'];

const testMetrics: MetricRow[] = [
  { label: 'Appointments', count: 5, hours: 6.5, weeklyPercent: 17 },
  { label: 'Annual Leave', count: 1, hours: 7.5, weeklyPercent: 20 },
  { label: 'Meeting', count: 2, hours: 3.0, weeklyPercent: 8 },
  { label: 'Unallocated', count: 0, hours: 23.0, weeklyPercent: 55 },
];

const renderTable = (metrics = testMetrics, workingWeekHours = 40): ReturnType<typeof render> =>
  render(
    <MantineProvider>
      <WeeklyMetricsTable metrics={metrics} workingWeekHours={workingWeekHours} sliceColors={sliceColors} />
    </MantineProvider>
  );

describe('WeeklyMetricsTable', () => {
  test('renders the working week hours in the heading', () => {
    renderTable(testMetrics, 37.5);
    expect(screen.getByText('Categorised hours % of 37.5h working week')).toBeInTheDocument();
  });

  test('renders a row for each metric', () => {
    renderTable();
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.getByText('Unallocated')).toBeInTheDocument();
  });

  test('renders hours formatted to one decimal place', () => {
    renderTable();
    expect(screen.getByText('6.5')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
  });

  test('renders weekly percentage for each row', () => {
    renderTable();
    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
  });

  test('shows em-dash instead of count for Unallocated row', () => {
    renderTable();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('shows numeric count for non-Unallocated rows', () => {
    renderTable();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('renders column headers', () => {
    renderTable();
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByText('No.')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Weekly %')).toBeInTheDocument();
  });

  test('renders footer with summed totals', () => {
    const { container } = renderTable();
    const tfoot = container.querySelector('tfoot') as HTMLElement;
    // total count = 5 + 1 + 2 + 0 = 8
    expect(within(tfoot).getByText('8')).toBeInTheDocument();
    // total hours = 6.5 + 7.5 + 3.0 + 23.0 = 40.0
    expect(within(tfoot).getByText('40.0')).toBeInTheDocument();
    expect(within(tfoot).getByText('100%')).toBeInTheDocument();
  });

  test('renders a colour swatch for each metric row using the correct slice colour', () => {
    const { container } = renderTable();
    const swatches = container.querySelectorAll('td:first-child div[style*="background"]');
    expect(swatches[0]).toHaveStyle({ background: sliceColors[0] });
    expect(swatches[1]).toHaveStyle({ background: sliceColors[1] });
    expect(swatches[2]).toHaveStyle({ background: sliceColors[2] });
    expect(swatches[3]).toHaveStyle({ background: sliceColors[3] });
  });

  test('renders correctly with an empty metrics array', () => {
    renderTable([]);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
