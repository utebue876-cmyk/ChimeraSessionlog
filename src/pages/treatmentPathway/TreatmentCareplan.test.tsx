import { describe, expect, test, vi } from 'vitest';
import { render, screen, userEvent } from '../../testUtils/render';
import { TreatmentCareplan } from './TreatmentCareplan';
import type { ConfirmedTreatmentPathway } from './useTreatmentPathway';

const mockUseTreatmentCareplan = vi.hoisted(() => vi.fn());

vi.mock('./useTreatmentCareplan', () => ({
  useTreatmentCareplan: mockUseTreatmentCareplan,
}));

const confirmedPathway: ConfirmedTreatmentPathway = {
  pathwayLabel: 'CBT',
  sessionsAuthorised: 4,
  authorisationReference: 'AUTH-1',
  startedDate: '2026-01-01',
  caseLabel: 'CASE-001',
  funderLabel: 'Aviva Health',
};

function baseHookValue(overrides?: Partial<ReturnType<typeof mockUseTreatmentCareplan>>): any {
  return {
    pathwayLabel: 'CBT',
    sessionsAuthorised: 4,
    authorisationReference: 'AUTH-1',
    caseLabel: 'CASE-001',
    funderLabel: 'Aviva Health',
    startedDate: '01/01/2026',
    authorisedServices: [],
    authorisedServicesLoading: false,
    authorisedServicesError: undefined,
    sessionLog: [{ id: '1', date: '', service: 'CBT', outcome: null }],
    outcomeOptions: [{ value: 'attended', label: 'Attended' }],
    setSessionOutcome: vi.fn(),
    setSessionDate: vi.fn(),
    countsTowardsAuthorisation: () => true,
    addSession: vi.fn(),
    saveSessions: vi.fn(),
    canAddSession: true,
    closureReasonOptions: [{ value: 'condition-resolved', label: 'Condition resolved' }],
    closureReasonOptionsLoading: false,
    closureReason: null,
    setClosureReason: vi.fn(),
    ...overrides,
  };
}

describe('TreatmentCareplan', () => {
  test('renders the confirmed pathway summary', () => {
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue());

    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);

    expect(screen.getByText('CBT', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('CASE-001')).toBeInTheDocument();
    expect(screen.getByText('AUTH-1')).toBeInTheDocument();
  });

  test('add session button triggers addSession and is disabled when not allowed', async () => {
    const addSession = vi.fn();
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue({ addSession }));

    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add session' }));

    expect(addSession).toHaveBeenCalled();
  });

  test('add session button is disabled when canAddSession is false', () => {
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue({ canAddSession: false }));

    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Add session' })).toBeDisabled();
  });

  test('start over button calls onStartOver', async () => {
    const onStartOver = vi.fn();
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue());

    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={onStartOver} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(onStartOver).toHaveBeenCalled();
  });

  test('Close case button is disabled until a closure reason is selected', () => {
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue({ closureReason: null }));

    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Close case' })).toBeDisabled();
  });

  test('Close case button is enabled once a closure reason is selected', () => {
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue({ closureReason: 'condition-resolved' }));

    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Close case' })).toBeEnabled();
  });

  test('renders the closure reason options from the hook', () => {
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue());

    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);

    expect(screen.getByText('Close Case')).toBeInTheDocument();
    expect(screen.getByText('Closure reason')).toBeInTheDocument();
  });

  test('renders an inline error in the authorised-services table', () => {
    mockUseTreatmentCareplan.mockReturnValue(
      baseHookValue({
        authorisedServicesError: 'Authorised services unavailable: Coverage has no insurance plan link',
      })
    );
    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Coverage has no insurance plan link');
    expect(screen.getByRole('alert').closest('td')).toHaveAttribute('colspan', '5');
  });

  test('shows a loading message while FHIR data is being read', () => {
    mockUseTreatmentCareplan.mockReturnValue(baseHookValue({ authorisedServicesLoading: true }));
    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading authorised services');
  });

  test('renders plan figures, zero remaining styling and the new session helper text', () => {
    mockUseTreatmentCareplan.mockReturnValue(
      baseHookValue({
        pathwayLabel: 'Virtual CBT',
        authorisedServices: [
          { service: 'Virtual CBT', tier: 'Delegated authority', authorised: 0, used: 0, remaining: 0 },
        ],
        sessionLog: [{ id: '1', date: '', service: 'Virtual CBT', outcome: null }],
      })
    );
    render(<TreatmentCareplan confirmedPathway={confirmedPathway} onStartOver={vi.fn()} />);
    expect(screen.getAllByRole('cell', { name: 'Virtual CBT' })).toHaveLength(2);
    expect(screen.getAllByRole('cell', { name: '0' })[2]).toHaveStyle({ color: 'var(--mantine-color-red-text)' });
    expect(screen.getByText('Each row records a session against the authorised service.')).toBeInTheDocument();
  });
});
