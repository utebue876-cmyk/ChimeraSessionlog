import { MantineProvider } from '@mantine/core';
import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  EOC_CASE_STATE_URL,
  MH_CASE_CONSENT_DATE_URL,
  MH_CASE_CONSENT_SIGNED_URL,
  OPTIMA_EMPLOYER_EXTENSION_URL,
} from '../../config/chimera-urls';
import { CaseDetails } from './CaseDetails';

const medplumState = vi.hoisted(() => ({
  readReference: vi.fn(),
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => medplumState,
}));

describe('CaseDetails', () => {
  const baseEpisode: EpisodeOfCare = {
    resourceType: 'EpisodeOfCare',
    id: 'episode-1',
    status: 'active',
    patient: { reference: 'Patient/patient-1' },
    identifier: [{ value: 'CASE-001' }],
    period: { start: '2026-01-15T00:00:00.000Z' },
    type: [{ text: 'CBT' }],
    managingOrganization: { reference: 'Organization/org-1', display: 'IPRS Health' },
    careManager: { reference: 'Practitioner/pr-1', display: 'Dr Test' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows consent recorded alert when consent extension is true', () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      extension: [
        { url: MH_CASE_CONSENT_SIGNED_URL, valueBoolean: true },
        { url: MH_CASE_CONSENT_DATE_URL, valueDate: '2026-02-01' },
      ],
    };

    render(
      <MantineProvider>
        <CaseDetails episode={episode} appointmentCount={3} onEdit={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText(/Consent recorded/i)).toBeInTheDocument();
  });

  test('reads referral resources and renders insurance data', async () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      referralRequest: [{ reference: 'ServiceRequest/sr-1' }],
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'intake', display: 'Intake' } }],
    };

    medplumState.readReference.mockImplementation(async (ref: { reference?: string }) => {
      if (ref.reference === 'ServiceRequest/sr-1') {
        return {
          resourceType: 'ServiceRequest',
          id: 'sr-1',
          requester: { reference: 'Organization/ins-1', display: 'Acme Insurance' },
          insurance: [{ reference: 'Coverage/cov-1' }],
        };
      }
      if (ref.reference === 'Coverage/cov-1') {
        return {
          resourceType: 'Coverage',
          id: 'cov-1',
          subscriberId: 'POL-12345',
        };
      }
      throw new Error('Unexpected reference');
    });

    render(
      <MantineProvider>
        <CaseDetails
          episode={episode}
          appointmentCount={2}
          onEdit={vi.fn()}
          nextAppointment={{
            resourceType: 'Appointment',
            status: 'booked',
            start: '2099-01-01T10:00:00.000Z',
            end: '2099-01-01T11:00:00.000Z',
            participant: [{ status: 'accepted', actor: { reference: 'Practitioner/pr-2', display: 'Dr Future' } }],
          }}
        />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Insurance')).toBeInTheDocument();
      expect(screen.getByText('POL-12345')).toBeInTheDocument();
    });

    expect(screen.getByText('Dr Future')).toBeInTheDocument();
  });

  test('disables edit button when case status is closed', () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'closed', display: 'Closed' } }],
    };

    render(
      <MantineProvider>
        <CaseDetails episode={episode} appointmentCount={0} onEdit={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByRole('button', { name: /Edit case/i })).toBeDisabled();
  });

  test('calls onEdit with the episode when edit is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'intake', display: 'Intake' } }],
    };

    render(
      <MantineProvider>
        <CaseDetails episode={episode} appointmentCount={1} onEdit={onEdit} />
      </MantineProvider>
    );

    await user.click(screen.getByRole('button', { name: /Edit case/i }));

    expect(onEdit).toHaveBeenCalledWith(episode);
  });

  test('shows N/A for optima fields when no optima extension', () => {
    render(
      <MantineProvider>
        <CaseDetails episode={baseEpisode} appointmentCount={0} onEdit={vi.fn()} />
      </MantineProvider>
    );

    const naTexts = screen.getAllByText('N/A');
    // Employer, Location, Facility should all show N/A
    expect(naTexts.length).toBeGreaterThanOrEqual(3);
  });

  test('shows optima employer, location and facility when extension is present', () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      extension: [
        {
          url: OPTIMA_EMPLOYER_EXTENSION_URL,
          extension: [
            { url: 'employer', valueString: 'Acme Corp' },
            { url: 'location', valueString: 'London' },
            { url: 'facility', valueString: 'Clinic A' },
          ],
        },
      ],
    };

    render(
      <MantineProvider>
        <CaseDetails episode={episode} appointmentCount={0} onEdit={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Clinic A')).toBeInTheDocument();
  });
});
