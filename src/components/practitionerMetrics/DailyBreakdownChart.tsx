import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import type { JSX } from 'react';
import { useEffect, useRef } from 'react';
import type { DailyMetricBreakdown } from './usePractitionerMetrics';

const CHART_FONT_FAMILY =
  "-apple-system, 'system-ui', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

interface DailyBreakdownChartProps {
  dailyBreakdown: DailyMetricBreakdown[];
}

export function DailyBreakdownChart({ dailyBreakdown }: DailyBreakdownChartProps): JSX.Element {
  const barCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;

    Chart.getChart(canvas)?.destroy();

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dailyBreakdown.map((day) => day.day),
        datasets: [
          {
            label: 'Appointments',
            data: dailyBreakdown.map((day) => day.appointments),
            backgroundColor: '#2A9D8F',
            stack: 'hours',
            borderRadius: 2,
            borderSkipped: false,
            barThickness: 10,
          },
          {
            label: 'Blocked',
            data: dailyBreakdown.map((day) => day.blocked),
            backgroundColor: '#E76F51',
            stack: 'hours',
            borderRadius: 2,
            borderSkipped: false,
            barThickness: 10,
          },
          {
            label: 'Unallocated',
            data: dailyBreakdown.map((day) => day.unallocated),
            backgroundColor: '#74c0fc',
            stack: 'hours',
            borderRadius: 2,
            borderSkipped: false,
            barThickness: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              font: {
                family: CHART_FONT_FAMILY,
                size: 10,
              },
              color: 'var(--mantine-color-gray-7)',
            },
          },
          y: {
            stacked: true,
            min: 0,
            max: 8,
            ticks: {
              stepSize: 1,
              callback: (value) => `${value}h`,
              font: {
                family: CHART_FONT_FAMILY,
                size: 10,
              },
              color: 'var(--mantine-color-gray-7)',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Hours per day based on an 8h working day',
            color: 'var(--mantine-color-gray-7)',
            font: {
              family: CHART_FONT_FAMILY,
              size: 11,
              weight: 'normal',
            },
            padding: { top: 0, bottom: 20 },
          },
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              boxHeight: 8,
              padding: 8,
              font: {
                family: CHART_FONT_FAMILY,
                size: 11,
                weight: 'normal',
              },
              color: 'var(--mantine-color-gray-7)',
            },
          },
          tooltip: {
            titleFont: {
              family: CHART_FONT_FAMILY,
            },
            bodyFont: {
              family: CHART_FONT_FAMILY,
            },
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(1)}h` },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [dailyBreakdown]);

  return (
    <div style={{ height: 180, width: '100%' }}>
      <canvas ref={barCanvasRef} />
    </div>
  );
}
