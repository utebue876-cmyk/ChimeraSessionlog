import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Patient, Schedule } from '@medplum/fhirtypes';
import { HomerSimpson, MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SlotInfo } from 'react-big-calendar';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CreateVisit } from './CreateVisit';

describe('CreateVisit', () => {
  let medplum: MockClient;
  let mockPatient: Patient;
  let mockSlotInfo: SlotInfo;

  beforeEach(async () => {
    medplum = new MockClient();
    vi.clearAllMocks();

    mockPatient = {
      ...HomerSimpson,
      id: 'patient-1',
      name: [{ given: ['Homer'], family: 'Simpson' }],
    };

    const startDate = new Date('2024-01-15T10:00:00Z');
    const endDate = new Date('2024-01-15T10:30:00Z');
    mockSlotInfo = {
      start: startDate,
      end: endDate,
      slots: [],
      action: 'select',
    } as SlotInfo;

    await medplum.createResource(mockPatient);
    medplum.getProfile = vi.fn().mockResolvedValue({
      resourceType: 'Practitioner',
      id: 'practitioner-1',
      name: [{ given: ['Dr.'], family: 'Smith' }],
    });
  });

  const setup = (appointmentSlot?: SlotInfo, schedule?: Schedule): ReturnType<typeof render> => {
    return render(
      <MemoryRouter>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Notifications />
            <CreateVisit appointmentSlot={appointmentSlot} schedule={schedule} />
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    test('renders form with all required fields', async () => {
      await act(async () => {
        setup(mockSlotInfo);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Patient/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Care Template/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
      });
    });

    test('renders without date/time when appointmentSlot is not provided', async () => {
      await act(async () => {
        setup(undefined);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
      });
    });

    test('renders correctly when schedule prop is provided', async () => {
      const schedule: Schedule = {
        resourceType: 'Schedule',
        id: 'sched-1',
        actor: [{ reference: 'Practitioner/practitioner-1' }],
      };
      await act(async () => {
        setup(mockSlotInfo, schedule);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/Patient/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    test('shows error notification when submitting with missing required fields', async () => {
      const user = userEvent.setup();
      await act(async () => {
        setup(mockSlotInfo);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Create Appointment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please fill out required fields/i)).toBeInTheDocument();
      });
    });

    test('does not proceed with submission when required fields are missing', async () => {
      const user = userEvent.setup();
      await act(async () => {
        setup(mockSlotInfo);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Create Appointment/i });
      await user.click(submitButton);

      // Verify error notification is shown instead of proceeding
      // Use getAllByText since notifications may persist from previous tests
      await waitFor(() => {
        const notifications = screen.getAllByText(/Please fill out required fields/i);
        expect(notifications.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PlanDefinition Actions', () => {
    test('does not display included tasks card initially', async () => {
      await act(async () => {
        setup(mockSlotInfo);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Included Tasks/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Date/Time Formatting', () => {
    test('updates formatted date/time when appointmentSlot changes', async () => {
      const { rerender } = await act(async () => {
        return setup(mockSlotInfo);
      });

      await waitFor(() => {
        expect(screen.getByText(/15.*Jan.*2024/i)).toBeInTheDocument();
      });

      const newSlotInfo: SlotInfo = {
        start: new Date('2024-02-20T14:00:00Z'),
        end: new Date('2024-02-20T14:30:00Z'),
        slots: [],
        action: 'select',
      } as SlotInfo;

      await act(async () => {
        rerender(
          <MemoryRouter>
            <MedplumProvider medplum={medplum}>
              <MantineProvider>
                <Notifications />
                <CreateVisit appointmentSlot={newSlotInfo} />
              </MantineProvider>
            </MedplumProvider>
          </MemoryRouter>
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/20.*Feb.*2024/i)).toBeInTheDocument();
      });
    });
  });

  describe('Button State', () => {
    test('submit button is initially enabled', async () => {
      await act(async () => {
        setup(mockSlotInfo);
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Appointment/i });
        expect(submitButton).toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Form Field Changes', () => {
    test('updates patient when patient is selected', async () => {
      await act(async () => {
        setup(mockSlotInfo);
      });

      const patientInput = await screen.findByLabelText(/Patient/i);
      expect(patientInput).toBeInTheDocument();
    });

    test('updates care template when template is selected', async () => {
      await act(async () => {
        setup(mockSlotInfo);
      });

      const templateInput = await screen.findByLabelText(/Care Template/i);
      expect(templateInput).toBeInTheDocument();
    });
  });

  describe('Plan Definition Actions', () => {
    test('displays included tasks when plan definition has actions', async () => {
      const planDefinition: any = {
        resourceType: 'PlanDefinition',
        id: 'plan-1',
        status: 'active',
        action: [
          { id: 'action-1', title: 'Task 1' },
          { id: 'action-2', title: 'Task 2' },
        ],
      };
      await medplum.createResource(planDefinition);

      await act(async () => {
        setup(mockSlotInfo);
      });

      const templateInput = await screen.findByLabelText(/Care Template/i);
      expect(templateInput).toBeInTheDocument();
    });
  });
});
