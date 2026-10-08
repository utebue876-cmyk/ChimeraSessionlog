import { render } from '@testing-library/react';
import type { ChartConfiguration } from 'chart.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { MetricRow } from './usePractitionerMetrics';
import { WeeklyMetricsChart } from './WeeklyMetricsChart';

const { mockChartConstructor, mockDestroy, mockGetChart } = vi.hoisted(() => {
  const mockDestroy = vi.fn();
  const mockGetChart = vi.fn().mockReturnValue(undefined);
  const mockChartConstructor = vi.fn(function (_canvas: unknown, _config: ChartConfiguration<'pie'>) {
    return { destroy: mockDestroy };
  });
  Object.assign(mockChartConstructor, { register: vi.fn(), getChart: mockGetChart });
  return { mockChartConstructor, mockDestroy, mockGetChart };
});

vi.mock('chart.js', () => ({
  Chart: mockChartConstructor,
  ArcElement: {},
  PieController: {},
  Tooltip: {},
  Legend: {},
}));

const SLICE_COLORS = ['#2A9D8F', '#6A4C93', '#264653', '#E9C46A', '#E76F51', '#0077B6', '#74c0fc', '#FFB703'];

const testMetrics: MetricRow[] = [
  { label: 'Appointments', count: 3, hours: 2.5, weeklyPercent: 10 },
  { label: 'Annual Leave', count: 0, hours: 0, weeklyPercent: 0 },
  { label: 'Unallocated', count: 0, hours: 35, weeklyPercent: 90 },
];

describe('WeeklyMetricsChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChart.mockReturnValue(undefined);
  });

  test('renders a canvas element', () => {
    const { container } = render(<WeeklyMetricsChart metrics={testMetrics} sliceColors={SLICE_COLORS} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  test('creates a pie chart', () => {
    render(<WeeklyMetricsChart metrics={testMetrics} sliceColors={SLICE_COLORS} />);
    expect(mockChartConstructor).toHaveBeenCalledOnce();
    expect(mockChartConstructor.mock.calls[0][1].type).toBe('pie');
  });

  test('filters out zero-hour metrics from chart data', () => {
    render(<WeeklyMetricsChart metrics={testMetrics} sliceColors={SLICE_COLORS} />);
    const config = mockChartConstructor.mock.calls[0][1];
    // 'Annual Leave' has 0 hours and should be excluded
    expect(config.data.labels).toEqual(['Appointments', 'Unallocated']);
    expect(config.data.datasets[0].data).toEqual([2.5, 35]);
  });

  test('assigns slice color based on original metric index', () => {
    render(<WeeklyMetricsChart metrics={testMetrics} sliceColors={SLICE_COLORS} />);
    const config = mockChartConstructor.mock.calls[0][1];
    // Appointments is index 0, Unallocated is index 2 in the original array
    expect(config.data.datasets[0].backgroundColor).toEqual([SLICE_COLORS[0], SLICE_COLORS[2]]);
  });

  test('destroys existing chart instance before creating a new one', () => {
    const existingDestroy = vi.fn();
    mockGetChart.mockReturnValue({ destroy: existingDestroy });

    render(<WeeklyMetricsChart metrics={testMetrics} sliceColors={SLICE_COLORS} />);
    expect(existingDestroy).toHaveBeenCalledOnce();
  });

  test('destroys chart on unmount', () => {
    const { unmount } = render(<WeeklyMetricsChart metrics={testMetrics} sliceColors={SLICE_COLORS} />);
    unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  test('renders no chart data when all metrics have zero hours', () => {
    const zeroMetrics: MetricRow[] = [
      { label: 'Appointments', count: 0, hours: 0, weeklyPercent: 0 },
      { label: 'Unallocated', count: 0, hours: 0, weeklyPercent: 0 },
    ];
    render(<WeeklyMetricsChart metrics={zeroMetrics} sliceColors={SLICE_COLORS} />);
    const config = mockChartConstructor.mock.calls[0][1];
    expect(config.data.labels).toEqual([]);
    expect(config.data.datasets[0].data).toEqual([]);
  });
});
