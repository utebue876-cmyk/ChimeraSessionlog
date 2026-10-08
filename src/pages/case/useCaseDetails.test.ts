import type { Appointment, EpisodeOfCare } from '@medplum/fhirtypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  EOC_CASE_STATE_URL,
  MH_CASE_CONSENT_DATE_URL,
  MH_CASE_CONSENT_SIGNED_URL,
  OPTIMA_EMPLOYER_EXTENSION_URL,
} from '../../config/chimera-urls';
import { useCaseDetails } from './useCaseDetails';

const medplumState = vi.hoisted(() => ({
  readReference: vi.fn(),
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => medplumState,
}));

describe('useCaseDetails', () => {
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

  test('derives case status from the case-state extension', () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'intake', display: 'Intake' } }],
    };

    const { result } = renderHook(() => useCaseDetails(episode));

    expect(result.current.caseStatus).toBe('Intake');
  });

  test('derives consentSigned and a formatted consent date from extensions', () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      extension: [
        { url: MH_CASE_CONSENT_SIGNED_URL, valueBoolean: true },
        { url: MH_CASE_CONSENT_DATE_URL, valueDate: '2026-02-01' },
      ],
    };

    const { result } = renderHook(() => useCaseDetails(episode));

    expect(result.current.consentSigned).toBe(true);
    expect(result.current.consentDateFormatted).toBe('1 February 2026');
  });

  test('reads the referral ServiceRequest and its Coverage to derive insuranceProvider/coverage', async () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      referralRequest: [{ reference: 'ServiceRequest/sr-1' }],
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
        return { resourceType: 'Coverage', id: 'cov-1', subscriberId: 'POL-12345' };
      }
      throw new Error('Unexpected reference');
    });

    const { result } = renderHook(() => useCaseDetails(episode));

    await waitFor(() => expect(result.current.insuranceProvider?.display).toBe('Acme Insurance'));
    expect(result.current.coverage?.subscriberId).toBe('POL-12345');
  });

  test('clears serviceRequest/coverage when there is no referral request', () => {
    const { result } = renderHook(() => useCaseDetails(baseEpisode));

    expect(result.current.insuranceProvider).toBeUndefined();
    expect(result.current.coverage).toBeUndefined();
    expect(medplumState.readReference).not.toHaveBeenCalled();
  });

  test('clears serviceRequest/coverage when the referral read fails', async () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      referralRequest: [{ reference: 'ServiceRequest/sr-1' }],
    };
    medplumState.readReference.mockRejectedValue(new Error('not found'));

    const { result, rerender } = renderHook(({ ep }) => useCaseDetails(ep), { initialProps: { ep: episode } });

    await waitFor(() => expect(medplumState.readReference).toHaveBeenCalled());
    rerender({ ep: episode });

    expect(result.current.insuranceProvider).toBeUndefined();
    expect(result.current.coverage).toBeUndefined();
  });

  test('derives optima employer/location/facility from the optima extension', () => {
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

    const { result } = renderHook(() => useCaseDetails(episode));

    expect(result.current.optimaEmployerDisplay).toBe('Acme Corp');
    expect(result.current.optimaLocation).toBe('London');
    expect(result.current.optimaFacility).toBe('Clinic A');
  });

  test('falls back to the reference id when the employer extension has no display/string', () => {
    const episode: EpisodeOfCare = {
      ...baseEpisode,
      extension: [
        {
          url: OPTIMA_EMPLOYER_EXTENSION_URL,
          extension: [{ url: 'employer', valueReference: { reference: 'Organization/employer-1' } }],
        },
      ],
    };

    const { result } = renderHook(() => useCaseDetails(episode));

    expect(result.current.optimaEmployerDisplay).toBe('employer-1');
  });

  test('returns null optima fields when there is no optima extension', () => {
    const { result } = renderHook(() => useCaseDetails(baseEpisode));

    expect(result.current.optimaEmployerDisplay).toBeNull();
    expect(result.current.optimaLocation).toBeNull();
    expect(result.current.optimaFacility).toBeNull();
  });

  test('derives nextAppointmentText and practitioner from the next appointment', () => {
    const nextAppointment: Appointment = {
      resourceType: 'Appointment',
      status: 'booked',
      start: '2099-01-01T10:00:00.000Z',
      end: '2099-01-01T11:00:00.000Z',
      participant: [{ status: 'accepted', actor: { reference: 'Practitioner/pr-2', display: 'Dr Future' } }],
    };

    const { result } = renderHook(() => useCaseDetails(baseEpisode, nextAppointment));

    expect(result.current.practitioner).toBe('Dr Future');
    expect(result.current.nextAppointmentText).not.toBe('N/A');
  });

  test('returns N/A for nextAppointmentText and practitioner when there is no next appointment', () => {
    const { result } = renderHook(() => useCaseDetails(baseEpisode));

    expect(result.current.nextAppointmentText).toBe('N/A');
    expect(result.current.practitioner).toBe('N/A');
  });

  test('re-reads the referral when the episode changes', async () => {
    const episode1: EpisodeOfCare = { ...baseEpisode, referralRequest: [{ reference: 'ServiceRequest/sr-1' }] };
    const episode2: EpisodeOfCare = {
      ...baseEpisode,
      id: 'episode-2',
      referralRequest: [{ reference: 'ServiceRequest/sr-2' }],
    };

    medplumState.readReference.mockImplementation(async (ref: { reference?: string }) => ({
      resourceType: 'ServiceRequest',
      id: ref.reference?.replace('ServiceRequest/', ''),
      requester: { display: ref.reference },
    }));

    const { result, rerender } = renderHook(({ ep }) => useCaseDetails(ep), { initialProps: { ep: episode1 } });
    await waitFor(() => expect(result.current.insuranceProvider?.display).toBe('ServiceRequest/sr-1'));

    act(() => {
      rerender({ ep: episode2 });
    });

    await waitFor(() => expect(result.current.insuranceProvider?.display).toBe('ServiceRequest/sr-2'));
  });
});
