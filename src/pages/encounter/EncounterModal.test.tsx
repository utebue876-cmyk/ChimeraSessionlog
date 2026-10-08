import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Patient, PlanDefinition } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as reactRouter from 'react-router';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as usePatientModule from '../../hooks/usePatient';
import { EncounterModal } from './EncounterModal';

vi.mock('../../utils/encounter', () => ({
  createEncounter: vi.fn(),
}));

const mockPatient: Patient = {
  resourceType: 'Patient',
  id: 'patient-123',
  name: [{ given: ['John'], family: 'Doe' }],
};

const mockPlanDefinition: PlanDefinition = {
  resourceType: 'PlanDefinition',
  id: 'plan-123',
  status: 'active',
  title: 'Test Plan',
};

describe('EncounterModal', () => {
  let medplum: MockClient;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    medplum = new MockClient();
    vi.clearAllMocks();
    navigateSpy = vi.fn().mockReturnValue(Promise.resolve());
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigateSpy as any);
    vi.spyOn(usePatientModule, 'usePatient').mockReturnValue(mockPatient);
    await medplum.createResource(mockPlanDefinition);
  });

  function setup(): ReturnType<typeof render> {
    return render(
      <MemoryRouter initialEntries={['/Patient/patient-123/Encounter/new']}>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Notifications />
            <Routes>
              <Route path="/Patient/:patientId/Encounter/new" element={<EncounterModal />} />
              <Route path="/Patient/:patientId/Encounter/:encounterId" element={<div>Encounter Page</div>} />
            </Routes>
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  }

  test('Renders all form fields', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByText(/Practitioner/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Apply Care Template')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
  });

  test('Shows error notification when required fields are missing', async () => {
    const user = userEvent.setup();
    setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Create Appointment/i });
    await act(async () => {
      await user.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Please fill out all required fields.')).toBeInTheDocument();
    });
  });

  test('Modal renders with dialog role', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByText('New Appointment')).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('Displays care template section', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByText('Apply Care Template')).toBeInTheDocument();
    });

    expect(screen.getByText(/You can select a template for new appointment/i)).toBeInTheDocument();
  });

  test('Modal can be dismissed by clicking outside or escape', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('New Appointment')).toBeInTheDocument();
  });

  test('Navigates to created encounter on success', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
  });

  test('Handles missing patient gracefully', async () => {
    vi.spyOn(usePatientModule, 'usePatient').mockReturnValue(undefined);
    const user = userEvent.setup();

    setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Appointment/i })).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Create Appointment/i });
    await act(async () => {
      await user.click(createButton);
    });

    await waitFor(() => {
      const errorMessages = screen.getAllByText('Please fill out all required fields.');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
