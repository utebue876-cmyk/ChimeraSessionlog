import { render } from '@testing-library/react';
import type { ChartConfiguration } from 'chart.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DailyBreakdownChart } from './DailyBreakdownChart';
import type { DailyMetricBreakdown } from './usePractitionerMetrics';

const { mockChartConstructor, mockDestroy, mockGetChart } = vi.hoisted(() => {
  const mockDestroy = vi.fn();
  const mockGetChart = vi.fn().mockReturnValue(undefined);
  const mockChartConstructor = vi.fn(function (_canvas: unknown, _config: ChartConfiguration<'bar'>) {
    return { destroy: mockDestroy };
  });
  Object.assign(mockChartConstructor, { register: vi.fn(), getChart: mockGetChart });
  return { mockChartConstructor, mockDestroy, mockGetChart };
});

vi.mock('chart.js', () => ({
  Chart: mockChartConstructor,
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

const testDailyBreakdown: DailyMetricBreakdown[] = [
  { day: 'Mon', appointments: 3, blocked: 1, unallocated: 4 },
  { day: 'Tue', appointments: 2, blocked: 0, unallocated: 6 },
  { day: 'Wed', appointments: 4, blocked: 2, unallocated: 2 },
  { day: 'Thu', appointments: 1, blocked: 3, unallocated: 4 },
  { day: 'Fri', appointments: 0, blocked: 0, unallocated: 8 },
];

describe('DailyBreakdownChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChart.mockReturnValue(undefined);
  });

  test('renders a canvas element', () => {
    const { container } = render(<DailyBreakdownChart dailyBreakdown={testDailyBreakdown} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  test('creates a stacked bar chart', () => {
    render(<DailyBreakdownChart dailyBreakdown={testDailyBreakdown} />);
    expect(mockChartConstructor).toHaveBeenCalledOnce();
    expect(mockChartConstructor.mock.calls[0][1].type).toBe('bar');
  });

  test('uses day labels from dailyBreakdown', () => {
    render(<DailyBreakdownChart dailyBreakdown={testDailyBreakdown} />);
    const config = mockChartConstructor.mock.calls[0][1];
    expect(config.data.labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  });

  test('passes appointment, blocked, and unallocated data as separate datasets', () => {
    render(<DailyBreakdownChart dailyBreakdown={testDailyBreakdown} />);
    const { datasets } = mockChartConstructor.mock.calls[0][1].data;

    expect(datasets[0].label).toBe('Appointments');
    expect(datasets[0].data).toEqual([3, 2, 4, 1, 0]);

    expect(datasets[1].label).toBe('Blocked');
    expect(datasets[1].data).toEqual([1, 0, 2, 3, 0]);

    expect(datasets[2].label).toBe('Unallocated');
    expect(datasets[2].data).toEqual([4, 6, 2, 4, 8]);
  });

  test('destroys existing chart instance before creating a new one', () => {
    const existingDestroy = vi.fn();
    mockGetChart.mockReturnValue({ destroy: existingDestroy });

    render(<DailyBreakdownChart dailyBreakdown={testDailyBreakdown} />);
    expect(existingDestroy).toHaveBeenCalledOnce();
  });

  test('destroys chart on unmount', () => {
    const { unmount } = render(<DailyBreakdownChart dailyBreakdown={testDailyBreakdown} />);
    unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  test('handles empty dailyBreakdown', () => {
    render(<DailyBreakdownChart dailyBreakdown={[]} />);
    const config = mockChartConstructor.mock.calls[0][1];
    expect(config.data.labels).toEqual([]);
    expect(config.data.datasets[0].data).toEqual([]);
  });
});
