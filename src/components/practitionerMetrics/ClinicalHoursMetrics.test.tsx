import { describe, expect, test } from 'vitest';
import { render, screen } from '../../testUtils/render';
import { ClinicalHoursMetrics } from './ClinicalHoursMetrics';

describe('ClinicalHoursMetrics', () => {
  test('renders the formatted percentage, hours and clinical-hours total', () => {
    render(
      <ClinicalHoursMetrics clinicalHoursSummary={{ hours: 12.5, percentage: 60, color: 'blue' }} clinicalHours={20} />
    );

    expect(screen.getByText('Appointments % of 20h clinical hours')).toBeInTheDocument();
    expect(screen.getByText('60% (12.5h / 20h)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Clinical hours progress' })).toBeInTheDocument();
  });
});
