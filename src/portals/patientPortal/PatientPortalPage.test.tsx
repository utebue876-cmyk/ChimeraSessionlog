import type { Appointment, Task } from '@medplum/fhirtypes';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '../../testUtils/render';
import { PatientPortalPage } from './PatientPortalPage';
import type { PatientPortalData } from './usePatientPortalPage';
import { usePatientPortalPage } from './usePatientPortalPage';

vi.mock('./usePatientPortalPage', async () => {
  const actual = await vi.importActual('./usePatientPortalPage');
  return { ...actual, usePatientPortalPage: vi.fn() };
});

const baseData: PatientPortalData = {
  loading: false,
  patientFirstName: 'Alice',
  nextAppointment: undefined,
  appointmentSubLabel: '',
  practitionerName: undefined,
  practitionerRole: undefined,
  tasks: [],
  documents: [],
};

const mockAppointment: Appointment = {
  resourceType: 'Appointment',
  id: 'appt-1',
  status: 'booked',
  start: '2099-06-15T10:30:00.000Z',
  minutesDuration: 60,
  serviceType: [{ text: 'Video appointment' }],
  participant: [],
};

describe('PatientPortalPage', () => {
  beforeEach(() => {
    vi.mocked(usePatientPortalPage).mockReturnValue(baseData);
  });

  test('shows welcome greeting with patient first name', () => {
    render(<PatientPortalPage />);
    expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument();
  });

  test('shows subtitle text', () => {
    render(<PatientPortalPage />);
    expect(screen.getByText(/here's what you need to know about your care/i)).toBeInTheDocument();
  });

  test('shows loading skeletons while data is loading', () => {
    vi.mocked(usePatientPortalPage).mockReturnValue({ ...baseData, loading: true });
    const { container } = render(<PatientPortalPage />);
    expect(container.querySelectorAll('.mantine-Skeleton-root').length).toBeGreaterThan(0);
  });

  test('shows "No upcoming appointments" when none found', () => {
    render(<PatientPortalPage />);
    expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument();
  });

  test('shows appointment date when appointment is found', () => {
    vi.mocked(usePatientPortalPage).mockReturnValue({
      ...baseData,
      nextAppointment: mockAppointment,
      appointmentSubLabel: 'Video appointment · 60 minutes',
    });

    render(<PatientPortalPage />);
    // formatAppointmentDateTime output should contain the date
    expect(screen.getByText(/june/i)).toBeInTheDocument();
    expect(screen.getByText(/video appointment · 60 minutes/i)).toBeInTheDocument();
  });

  test('shows practitioner name and initials when present', () => {
    vi.mocked(usePatientPortalPage).mockReturnValue({
      ...baseData,
      nextAppointment: mockAppointment,
      practitionerName: 'Sarah Jones',
      practitionerRole: 'Your CBT therapist',
    });

    render(<PatientPortalPage />);
    expect(screen.getByText('SJ')).toBeInTheDocument();
    expect(screen.getByText('Sarah Jones')).toBeInTheDocument();
    expect(screen.getByText('Your CBT therapist')).toBeInTheDocument();
  });

  test('shows Appointment details button when appointment is present', () => {
    vi.mocked(usePatientPortalPage).mockReturnValue({
      ...baseData,
      nextAppointment: mockAppointment,
    });

    render(<PatientPortalPage />);
    expect(screen.getByRole('button', { name: /appointment details/i })).toBeInTheDocument();
  });

  test('always renders Before Your Appointment section', () => {
    render(<PatientPortalPage />);
    // Use exact text to avoid matching the empty-state sentence
    expect(screen.getByText('Before your appointment')).toBeInTheDocument();
  });

  test('shows tasks in Before Your Appointment when present', () => {
    const tasks: Task[] = [
      {
        resourceType: 'Task',
        id: 't1',
        status: 'requested',
        intent: 'order',
        description: 'Complete wellbeing questionnaire',
      },
      { resourceType: 'Task', id: 't2', status: 'requested', intent: 'order', description: 'Read preparation guide' },
    ];
    vi.mocked(usePatientPortalPage).mockReturnValue({ ...baseData, tasks });

    render(<PatientPortalPage />);
    expect(screen.getByText('Complete wellbeing questionnaire')).toBeInTheDocument();
    expect(screen.getByText('Read preparation guide')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start|read/i })).toHaveLength(2);
  });

  test('shows empty state in Before Your Appointment when no tasks', () => {
    render(<PatientPortalPage />);
    expect(screen.getByText(/no tasks have been assigned/i)).toBeInTheDocument();
  });

  test('always renders Information for You section', () => {
    render(<PatientPortalPage />);
    expect(screen.getByText(/information for you/i)).toBeInTheDocument();
  });

  test('shows empty state in Information for You when no documents', () => {
    render(<PatientPortalPage />);
    expect(screen.getByText(/no documents have been shared/i)).toBeInTheDocument();
  });

  test('always renders Need Help section', () => {
    render(<PatientPortalPage />);
    expect(screen.getByText(/need help/i)).toBeInTheDocument();
    expect(screen.getByText('0300 000 0000')).toBeInTheDocument();
    expect(screen.getByText('0300 000 0001')).toBeInTheDocument();
  });

  test('does not show greeting when patientFirstName is undefined', () => {
    vi.mocked(usePatientPortalPage).mockReturnValue({ ...baseData, patientFirstName: undefined });
    render(<PatientPortalPage />);
    expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
  });
});
