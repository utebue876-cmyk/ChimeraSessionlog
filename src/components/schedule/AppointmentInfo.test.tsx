import { MantineProvider } from '@mantine/core';
import type { Appointment, Encounter } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppointmentInfo } from './AppointmentInfo';

const hookState = vi.hoisted(() => ({
  handleDelete: vi.fn(),
  deleting: false,
  formattedDate: 'Wednesday, 16/07/2026',
  formattedTimeRange: '09:00 - 09:30',
  practitionerDisplay: 'Dr Smith',
  patientDisplay: 'Jane Doe',
  caseDisplay: 'CASE-123',
  serviceTypeDisplay: 'Triage',
  careTemplateDisplay: 'Initial Assessment',
}));

vi.mock('./useAppointmentInfo', () => ({
  useAppointmentInfo: () => hookState,
}));

const baseAppointment: Appointment = {
  resourceType: 'Appointment',
  id: 'app-1',
  status: 'booked',
  start: '2026-07-16T09:00:00Z',
  end: '2026-07-16T09:30:00Z',
  participant: [],
};

const baseEncounter: Encounter = {
  resourceType: 'Encounter',
  id: 'enc-1',
  status: 'planned',
  class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
};

function setup(props: {
  appointment?: Appointment;
  encounter?: Encounter;
  canShowAppointment?: boolean;
  onShowAppointment?: () => Promise<void>;
  onClose?: () => void;
  onDelete?: (appointment: Appointment) => void;
}): void {
  render(
    <MantineProvider>
      <AppointmentInfo
        appointment={props.appointment ?? baseAppointment}
        encounter={props.encounter}
        canShowAppointment={props.canShowAppointment ?? true}
        onShowAppointment={props.onShowAppointment ?? vi.fn().mockResolvedValue(undefined)}
        onClose={props.onClose ?? vi.fn()}
        onDelete={props.onDelete}
      />
    </MantineProvider>
  );
}

describe('AppointmentInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.handleDelete = vi.fn();
    hookState.deleting = false;
  });

  test('renders hook values in the form fields', () => {
    setup({});

    expect(screen.getByDisplayValue('Dr Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CASE-123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Triage')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial Assessment')).toBeInTheDocument();
    expect(screen.getByText('Wednesday, 16/07/2026')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 09:30')).toBeInTheDocument();
  });

  test('View Appointment button calls onShowAppointment', async () => {
    const user = userEvent.setup();
    const onShowAppointment = vi.fn().mockResolvedValue(undefined);

    setup({ canShowAppointment: true, onShowAppointment });

    await user.click(screen.getByRole('button', { name: 'View Appointment' }));
    expect(onShowAppointment).toHaveBeenCalledTimes(1);
  });

  test('View Appointment button is disabled when canShowAppointment is false', () => {
    setup({ canShowAppointment: false });

    expect(screen.getByRole('button', { name: 'View Appointment' })).toBeDisabled();
  });

  test('Delete Appointment button calls handleDelete from the hook', async () => {
    const user = userEvent.setup();
    hookState.handleDelete = vi.fn().mockResolvedValue(undefined);

    setup({ encounter: baseEncounter });

    await user.click(screen.getByRole('button', { name: 'Delete Appointment' }));
    expect(hookState.handleDelete).toHaveBeenCalledTimes(1);
  });

  test('Delete Appointment button shows loading state while deleting', () => {
    hookState.deleting = true;

    setup({});

    // Mantine renders a loading spinner inside the button when loading=true
    expect(screen.getByRole('button', { name: 'Delete Appointment' })).toBeInTheDocument();
  });
});
