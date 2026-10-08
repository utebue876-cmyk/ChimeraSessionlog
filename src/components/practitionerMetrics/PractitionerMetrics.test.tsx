import { MantineProvider } from '@mantine/core';
import type { Appointment, Slot } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Range } from '../../types/scheduling';
import { PractitionerMetrics } from './PractitionerMetrics';
import type { ClinicalHoursSummary, DailyMetricBreakdown, MetricRow } from './usePractitionerMetrics';
import { usePractitionerMetrics } from './usePractitionerMetrics';

vi.mock('chart.js', () => ({
  Chart: Object.assign(
    vi.fn(function () {
      return { destroy: vi.fn() };
    }),
    {
      register: vi.fn(),
      getChart: vi.fn().mockReturnValue(undefined),
    }
  ),
  ArcElement: {},
  PieController: {},
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

vi.mock('./usePractitionerMetrics', () => ({
  usePractitionerMetrics: vi.fn(),
}));

const mockMetrics: MetricRow[] = [
  { label: 'Appointments', count: 5, hours: 6.5, weeklyPercent: 17 },
  { label: 'Annual Leave', count: 1, hours: 7.5, weeklyPercent: 20 },
  { label: 'Meeting', count: 2, hours: 3.0, weeklyPercent: 8 },
  { label: 'Training', count: 0, hours: 0, weeklyPercent: 0 },
  { label: 'Lunch', count: 0, hours: 0, weeklyPercent: 0 },
  { label: 'Other', count: 0, hours: 0, weeklyPercent: 0 },
  { label: 'Unallocated', count: 0, hours: 20.5, weeklyPercent: 55 },
];

const mockClinicalHoursSummary: ClinicalHoursSummary = {
  hours: 6.5,
  percentage: 65,
  color: 'green',
};

const mockDailyBreakdown: DailyMetricBreakdown[] = [
  { day: 'Mon', appointments: 1.5, blocked: 0, unallocated: 6.5 },
  { day: 'Tue', appointments: 2.0, blocked: 7.5, unallocated: 0 },
  { day: 'Wed', appointments: 1.0, blocked: 0, unallocated: 7.0 },
  { day: 'Thu', appointments: 1.0, blocked: 3.0, unallocated: 4.0 },
  { day: 'Fri', appointments: 1.0, blocked: 0, unallocated: 7.0 },
];

describe('PractitionerMetrics', () => {
  const defaultProps: {
    slots: Slot[];
    appointments: Appointment[];
    range: Range | undefined;
    workingWeekHours: number;
    clinicalHours: number;
  } = {
    slots: [],
    appointments: [],
    range: undefined,
    workingWeekHours: 37.5,
    clinicalHours: 10,
  };

  beforeEach(() => {
    vi.mocked(usePractitionerMetrics).mockReturnValue({
      metrics: mockMetrics,
      clinicalHoursSummary: mockClinicalHoursSummary,
      dailyBreakdown: mockDailyBreakdown,
    });
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}): ReturnType<typeof render> =>
    render(
      <MantineProvider>
        <PractitionerMetrics {...defaultProps} {...props} />
      </MantineProvider>
    );

  test('shows "Current period" when no range is provided', () => {
    renderComponent();
    expect(screen.getByText('Current period')).toBeInTheDocument();
  });

  test('shows formatted date range label when range is provided', () => {
    renderComponent({
      range: { start: new Date(2026, 7, 11), end: new Date(2026, 7, 16) },
    });
    expect(screen.getByText('11 Aug – 15 Aug 2026')).toBeInTheDocument();
  });

  test('shows clinical hours section label', () => {
    renderComponent();
    expect(screen.getByText('Appointments % of 10h clinical hours')).toBeInTheDocument();
  });

  test('renders clinical hours progress bar', () => {
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders metrics table with row labels', () => {
    renderComponent();
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.getByText('Unallocated')).toBeInTheDocument();
  });

  test('shows em-dash for Unallocated count column', () => {
    renderComponent();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('shows 100% in the totals footer', () => {
    renderComponent();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('shows total appointment count in footer', () => {
    renderComponent();
    // sum of all counts: 5 + 1 + 2 = 8
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  test('shows pie chart title including working week hours', () => {
    renderComponent();
    expect(screen.getByText('% of allocated hours based on a 37.5h working week')).toBeInTheDocument();
  });

  test('renders canvas elements for both the pie and bar charts', () => {
    const { container } = renderComponent();
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
  });

  test('passes props to usePractitionerMetrics', () => {
    renderComponent({ workingWeekHours: 35, clinicalHours: 20 });
    expect(vi.mocked(usePractitionerMetrics)).toHaveBeenCalledWith(
      defaultProps.slots,
      defaultProps.appointments,
      undefined,
      35,
      20
    );
  });
});
