import { ArcElement, Chart, Legend, PieController, Tooltip } from 'chart.js';
import type { JSX } from 'react';
import { useEffect, useRef } from 'react';
import type { MetricRow } from './usePractitionerMetrics';

Chart.register(ArcElement, PieController, Tooltip, Legend);

interface WeeklyMetricsChartProps {
  metrics: MetricRow[];
  sliceColors: string[];
}

export function WeeklyMetricsChart({ metrics, sliceColors }: WeeklyMetricsChartProps): JSX.Element {
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = pieCanvasRef.current;
    if (!canvas) return;

    Chart.getChart(canvas)?.destroy();

    const nonZero = metrics.filter((m) => m.hours > 0);
    const chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: nonZero.map((m) => m.label),
        datasets: [
          {
            data: nonZero.map((m) => parseFloat(m.hours.toFixed(2))),
            backgroundColor: nonZero.map((m) => sliceColors[metrics.indexOf(m)]),
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false, position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 8 } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${(ctx.parsed as number).toFixed(1)}h` } },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [metrics, sliceColors]);

  return (
    <div style={{ maxWidth: 170, margin: '0 auto', marginTop: 0 }}>
      <canvas ref={pieCanvasRef} />
    </div>
  );
}
