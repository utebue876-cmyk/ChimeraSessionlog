import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useProjectOrganizationStore } from '../../store/projectOrganizationStore';
import { CaseModal } from './CaseModal';

const hookState = vi.hoisted(() => ({
  status: 'active' as string | null,
  setStatus: vi.fn(),
  serviceTypeCode: null as string | null,
  setServiceTypeCode: vi.fn(),
  openedDate: '2026-01-01',
  setOpenedDate: vi.fn(),
  mhCaseStateCode: null as string | null,
  setMhCaseStateCode: vi.fn(),
  managingOrganization: undefined,
  setManagingOrganization: vi.fn(),
  setManagingOrganizationName: vi.fn(),
  managingOrganizationResource: undefined,
  insuranceProvider: undefined,
  setInsuranceProvider: vi.fn(),
  setInsuranceProviderName: vi.fn(),
  setInsuranceProviderResource: vi.fn(),
  insuranceProviderResource: undefined,
  insurancePlan: undefined,
  setInsurancePlan: vi.fn(),
  setInsurancePlanResource: vi.fn(),
  insurancePlanResource: undefined,
  requiresInsurancePlan: false,
  policyNumber: '',
  setPolicyNumber: vi.fn(),
  careManager: undefined,
  setCareManager: vi.fn(),
  setCareManagerName: vi.fn(),
  careManagerResource: undefined,
  isLoading: false,
  isEditMode: false,
  statusOptions: [{ value: 'active', label: 'Active' }],
  mhCaseStateOptions: [
    { value: 'intake', label: 'Intake' },
    { value: 'closed', label: 'Closed' },
  ],
  serviceTypeOptions: [{ value: 'cbt', label: 'CBT' }],
  fieldErrors: {},
  handleSaveCase: vi.fn(),
  consentSigned: false,
  setConsentSigned: vi.fn(),
  consentDate: '',
  setConsentDate: vi.fn(),
  optimaEmployer: undefined,
  setOptimaEmployer: vi.fn(),
  setOptimaEmployerResource: vi.fn(),
  optimaEmployerResource: undefined,
  optimaLocation: '',
  setOptimaLocation: vi.fn(),
  optimaFacility: '',
  setOptimaFacility: vi.fn(),
  hasOptimaExtension: false,
}));

vi.mock('./useCaseModal', () => ({
  useCaseModal: () => hookState,
}));

vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: { opened: boolean; title: React.ReactNode; children: React.ReactNode }) =>
    opened ? (
      <div role="dialog">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => ({}),
  ResourceInput: ({ label }: { label: string }) => <div>{label}</div>,
}));

describe('CaseModal', () => {
  const patient: Patient = {
    resourceType: 'Patient',
    id: 'patient-1',
    name: [{ family: 'Doe', given: ['Jane'] }],
  };

  beforeEach(() => {
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
    vi.clearAllMocks();
    hookState.isEditMode = false;
    hookState.isLoading = false;
    hookState.consentSigned = false;
  });

  test('renders create-mode UI and triggers save handler', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <CaseModal patient={patient} opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('New Case')).toBeInTheDocument();
    expect(screen.getByLabelText(/Opened Date/i)).toBeInTheDocument();
    const createButton = screen.getByRole('button', { name: 'Create Case' });
    expect(createButton).toBeInTheDocument();

    await user.click(createButton);

    expect(hookState.handleSaveCase).toHaveBeenCalled();
  });

  test('renders edit-mode UI without opened date and with save changes button', () => {
    hookState.isEditMode = true;

    render(
      <MantineProvider>
        <CaseModal patient={patient} opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Edit Case')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Opened Date/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  test('shows consent date field when consent is signed', () => {
    hookState.consentSigned = true;

    render(
      <MantineProvider>
        <CaseModal patient={patient} opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByLabelText(/Consent Date/i)).toBeInTheDocument();
  });

  test('hides the Optima Health information section when there is no optima extension', () => {
    hookState.hasOptimaExtension = false;

    render(
      <MantineProvider>
        <CaseModal patient={patient} opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.queryByText('Optima Health Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Employer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Location/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Facility/i)).not.toBeInTheDocument();
  });

  test('shows optima field values and enabled inputs when optima extension present', () => {
    hookState.hasOptimaExtension = true;
    hookState.optimaEmployerResource = { resourceType: 'Organization', id: 'employer-1', name: 'Acme Corp' } as any;
    hookState.optimaLocation = 'London';
    hookState.optimaFacility = 'Clinic A';

    render(
      <MantineProvider>
        <CaseModal patient={patient} opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Employer')).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toHaveValue('London');
    expect(screen.getByLabelText(/Facility/i)).toHaveValue('Clinic A');
  });
});
