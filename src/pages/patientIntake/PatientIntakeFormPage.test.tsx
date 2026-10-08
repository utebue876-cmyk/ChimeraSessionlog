import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { OPTIMA_HEALTH_NAME } from '../../config/constants';
import { PatientIntakeFormPage } from './PatientIntakeFormPage';
import { PATIENT_INTAKE_INITIAL_VALUES, type PatientIntakeFormValues } from './patientIntakeSchema';

const hookState = vi.hoisted(() => ({
  values: { ...({} as PatientIntakeFormValues) },
  errors: {} as Record<string, string>,
  set: vi.fn(),
  serviceTypeOptions: [{ value: 'treatment-only', label: 'Treatment Only' }],
  serviceTypeLoading: false,
  submitting: false,
  matchingPatients: [] as unknown[],
  handleSubmit: vi.fn(),
  handleOpenMatchingPatient: vi.fn(),
  handleDismissMatchingPatients: vi.fn(),
}));

vi.mock('./usePatientIntakeForm', () => ({
  usePatientIntakeForm: () => hookState,
}));

vi.mock('../../config/projectOrganization', () => ({
  getCurrentOrganisationName: () => 'IPRS Health',
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => ({}),
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResourceInput: ({ label, name }: { label: string; name: string }) => <div data-testid={name}>{label}</div>,
}));

function renderPage(): void {
  render(
    <MantineProvider>
      <PatientIntakeFormPage />
    </MantineProvider>
  );
}

describe('PatientIntakeFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.values = { ...PATIENT_INTAKE_INITIAL_VALUES };
    hookState.errors = {};
    hookState.submitting = false;
    hookState.matchingPatients = [];
  });

  test('renders the core demographic and contact fields', () => {
    renderPage();

    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select gender')).toBeInTheDocument();
    expect(screen.getByTestId('healthcare-provider')).toBeInTheDocument();
    expect(screen.getByTestId('insurance-provider')).toBeInTheDocument();
  });

  test('typing into First Name calls set with the field and value', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/First Name/i), 'J');

    expect(hookState.set).toHaveBeenCalledWith('firstName', 'J');
  });

  test('does not render Optima-specific fields when the funder is not Optima Health', () => {
    hookState.values = {
      ...hookState.values,
      insuranceProviderRef: { reference: 'Organization/aviva', display: 'Aviva Health' },
    };
    renderPage();

    expect(screen.queryByTestId('optima-employer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Location/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Facility/i)).not.toBeInTheDocument();
  });

  test('renders Optima-specific fields when the funder is Optima Health', () => {
    hookState.values = {
      ...hookState.values,
      insuranceProviderRef: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME },
    };
    renderPage();

    expect(screen.getByTestId('optima-employer')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Facility/i)).toBeInTheDocument();
  });

  test('does not render the insurance plan field when the funder is Optima Health', () => {
    hookState.values = {
      ...hookState.values,
      insuranceProviderRef: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME },
    };
    renderPage();

    expect(screen.queryByTestId('insurance-plan')).not.toBeInTheDocument();
  });

  test('renders the insurance plan field when the funder is Aviva or Vitality Health', () => {
    hookState.values = {
      ...hookState.values,
      insuranceProviderRef: { reference: 'Organization/aviva', display: 'Aviva Health' },
    };
    renderPage();

    expect(screen.getByTestId('insurance-plan')).toBeInTheDocument();

    hookState.values = {
      ...hookState.values,
      insuranceProviderRef: { reference: 'Organization/vitality', display: 'Vitality Health' },
    };
    renderPage();

    expect(screen.getAllByTestId('insurance-plan').length).toBeGreaterThan(0);
  });

  test('clicking Submit invokes handleSubmit', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(hookState.handleSubmit).toHaveBeenCalled();
  });

  test('marks required fields as invalid when errors are present', () => {
    hookState.errors = { firstName: 'Required' };
    renderPage();

    expect(screen.getByLabelText(/First Name/i)).toHaveAttribute('aria-invalid', 'true');
  });
});
