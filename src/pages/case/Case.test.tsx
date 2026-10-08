import { MantineProvider } from '@mantine/core';
import type { Appointment, EpisodeOfCare, Patient } from '@medplum/fhirtypes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Case } from './Case';

const activeEpisodeState = vi.hoisted(() => ({
  activeEpisode: undefined as EpisodeOfCare | undefined,
  setActiveEpisode: vi.fn(),
}));

const medplumState = vi.hoisted(() => ({
  searchResources: vi.fn(),
}));

const componentSpies = vi.hoisted(() => ({
  caseDetails: vi.fn(),
  caseNotes: vi.fn(),
  caseModal: vi.fn(),
}));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => activeEpisodeState,
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('./CaseDetails', () => ({
  CaseDetails: (props: any) => {
    componentSpies.caseDetails(props);
    return (
      <button type="button" onClick={() => props.onEdit(props.episode)}>
        Open Edit
      </button>
    );
  },
}));

vi.mock('./CaseNotes', () => ({
  CaseNotes: (props: any) => {
    componentSpies.caseNotes(props);
    return <div>Case Notes Mock</div>;
  },
}));

vi.mock('./CaseModal', () => ({
  CaseModal: (props: any) => {
    componentSpies.caseModal(props);
    return (
      <div>
        <div>Case Modal Opened: {String(props.opened)}</div>
        {props.opened && (
          <button type="button" onClick={() => props.onSaved?.({ resourceType: 'EpisodeOfCare', id: 'saved-episode' })}>
            Save From Modal
          </button>
        )}
      </div>
    );
  },
}));

describe('Case', () => {
  const patient: Patient = {
    resourceType: 'Patient',
    id: 'patient-1',
    name: [{ family: 'Doe', given: ['Jane'] }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    activeEpisodeState.activeEpisode = undefined;
  });

  test('renders no-cases alert when there is no active episode', async () => {
    medplumState.searchResources.mockResolvedValue([]);

    render(
      <MantineProvider>
        <Case patient={patient} />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No cases found for this patient.')).toBeInTheDocument();
    });

    expect(medplumState.searchResources).not.toHaveBeenCalled();
  });

  test('renders an error alert when appointment loading fails', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    medplumState.searchResources.mockRejectedValue(new Error('boom'));

    render(
      <MantineProvider>
        <Case patient={patient} />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load appointment count')).toBeInTheDocument();
    });
  });

  test('passes appointment stats to CaseDetails', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-123',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    const appointments: Appointment[] = [
      {
        resourceType: 'Appointment',
        id: 'appt-past',
        status: 'booked',
        participant: [],
        supportingInformation: [{ reference: 'EpisodeOfCare/ep-123' }],
        start: '2025-01-01T09:00:00.000Z',
      },
      {
        resourceType: 'Appointment',
        id: 'appt-next',
        status: 'booked',
        participant: [],
        supportingInformation: [{ reference: 'EpisodeOfCare/ep-123' }],
        start: '2099-01-01T08:00:00.000Z',
      },
      {
        resourceType: 'Appointment',
        id: 'appt-later',
        status: 'booked',
        participant: [],
        supportingInformation: [{ reference: 'EpisodeOfCare/ep-123' }],
        start: '2099-01-02T08:00:00.000Z',
      },
      {
        resourceType: 'Appointment',
        id: 'appt-other',
        status: 'booked',
        participant: [],
        supportingInformation: [{ reference: 'EpisodeOfCare/another-episode' }],
        start: '2099-01-01T07:00:00.000Z',
      },
    ];
    medplumState.searchResources.mockResolvedValue(appointments);

    render(
      <MantineProvider>
        <Case patient={patient} />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(componentSpies.caseDetails).toHaveBeenCalled();
    });

    const lastCall = componentSpies.caseDetails.mock.calls.at(-1)?.[0];
    expect(lastCall?.appointmentCount).toBe(3);
    expect(lastCall?.nextAppointment?.id).toBe('appt-next');
    expect(componentSpies.caseNotes).toHaveBeenCalled();
  });

  test('opens modal from edit and updates active episode after save', async () => {
    const user = userEvent.setup();
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-5',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    medplumState.searchResources.mockResolvedValue([]);

    render(
      <MantineProvider>
        <Case patient={patient} />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open Edit' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Open Edit' }));

    await waitFor(() => {
      expect(screen.getByText('Case Modal Opened: true')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Save From Modal' }));

    expect(activeEpisodeState.setActiveEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'EpisodeOfCare', id: 'saved-episode' })
    );
  });
});
