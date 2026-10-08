import { describe, expect, test, vi } from 'vitest';
import { render, screen, userEvent } from '../../testUtils/render';
import { getTodayIsoDate } from '../../utils/dateUtils';
import { TreatmentPathway } from './TreatmentPathway';

const mockUseTreatmentPathway = vi.hoisted(() => vi.fn());

vi.mock('./useTreatmentPathway', () => ({
  useTreatmentPathway: mockUseTreatmentPathway,
}));

function baseHookValue(overrides?: Partial<ReturnType<typeof mockUseTreatmentPathway>>): any {
  return {
    values: {
      primaryDiagnosis: null,
      secondaryDiagnosis: null,
      pathway: null,
      sessionsAuthorised: 6,
      authorisationReference: '',
      clinicalRationale: '',
    },
    errors: {},
    set: vi.fn(),
    confirmPathway: vi.fn().mockResolvedValue(true),
    submitting: false,
    loading: false,
    diagnosisOptions: [{ value: 'depression', label: 'Depression' }],
    diagnosisOptionsLoading: false,
    pathwayOptions: [{ value: 'cbt', label: 'CBT' }],
    pathwayOptionsLoading: false,
    caseLabel: 'CASE-001',
    funderLabel: 'Aviva Health',
    policyLabel: 'POLICY-1',
    assessingClinicianLabel: 'Dr. Smith',
    ...overrides,
  };
}

describe('TreatmentPathway', () => {
  test('shows a loader while case/pathway details are loading', () => {
    mockUseTreatmentPathway.mockReturnValue(baseHookValue({ loading: true }));

    render(<TreatmentPathway onConfirm={vi.fn()} />);

    expect(screen.queryByText('Select Treatment Pathway')).not.toBeInTheDocument();
  });

  test('renders case summary once loaded', () => {
    mockUseTreatmentPathway.mockReturnValue(baseHookValue());

    render(<TreatmentPathway onConfirm={vi.fn()} />);

    expect(screen.getByText('Select Treatment Pathway')).toBeInTheDocument();
    expect(screen.getByText('CASE-001')).toBeInTheDocument();
    expect(screen.getByText('Aviva Health')).toBeInTheDocument();
  });

  test('does not confirm when validation/save fails', async () => {
    const onConfirm = vi.fn();
    mockUseTreatmentPathway.mockReturnValue(baseHookValue({ confirmPathway: vi.fn().mockResolvedValue(false) }));

    render(<TreatmentPathway onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm pathway' }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('confirms with the selected pathway label when the save succeeds', async () => {
    const onConfirm = vi.fn();
    mockUseTreatmentPathway.mockReturnValue(
      baseHookValue({
        values: {
          primaryDiagnosis: 'depression',
          secondaryDiagnosis: null,
          pathway: 'cbt',
          sessionsAuthorised: 6,
          authorisationReference: 'AUTH-1',
          clinicalRationale: 'Clinically indicated',
        },
      })
    );

    render(<TreatmentPathway onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm pathway' }));

    expect(onConfirm).toHaveBeenCalledWith({
      pathwayLabel: 'CBT',
      sessionsAuthorised: 6,
      authorisationReference: 'AUTH-1',
      startedDate: getTodayIsoDate(),
      caseLabel: 'CASE-001',
      funderLabel: 'Aviva Health',
    });
  });
});
