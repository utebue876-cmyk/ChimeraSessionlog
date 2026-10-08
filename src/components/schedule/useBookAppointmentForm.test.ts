import type { Appointment, Bundle, EpisodeOfCare, Patient, Slot } from '@medplum/fhirtypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useBookAppointmentForm } from './useBookAppointmentForm';

const mockMedplum = vi.hoisted(() => ({
  searchResources: vi.fn(),
  readResource: vi.fn(),
  post: vi.fn(),
  fhirUrl: vi.fn(() => 'Appointment/$book'),
  invalidateSearches: vi.fn(),
  updateResource: vi.fn(),
}));

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => mockMedplum,
  };
});

vi.mock('../../utils/encounter', () => ({
  botCreateTaskReplacement: vi.fn(() => Promise.resolve()),
}));

describe('useBookAppointmentForm', () => {
  const slot: Slot = {
    resourceType: 'Slot',
    id: 'slot-1',
    status: 'free',
    schedule: { reference: 'Schedule/s1' },
    start: '2024-07-01T10:00:00Z',
    end: '2024-07-01T10:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMedplum.searchResources.mockResolvedValue([]);
    mockMedplum.readResource.mockResolvedValue({ resourceType: 'Schedule', id: 's1', actor: [] });
    mockMedplum.post.mockResolvedValue({ resourceType: 'Bundle', type: 'collection', entry: [] } as Bundle<
      Appointment | Slot
    >);
  });

  test('loads episodes for selected patient', async () => {
    const episode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      id: 'e1',
      status: 'active',
      patient: { reference: 'Patient/p1' },
    };
    mockMedplum.searchResources.mockResolvedValue([episode]);
    const { result } = renderHook(() => useBookAppointmentForm(slot));

    await act(async () => {
      await result.current.handlePatientChange({ resourceType: 'Patient', id: 'p1' } as Patient);
    });

    expect(mockMedplum.searchResources).toHaveBeenCalled();
    expect(result.current.episodes).toEqual([episode]);
    expect(result.current.selectedEpisode).toEqual(episode);
  });

  test('submits booking when patient is selected', async () => {
    const onSuccess = vi.fn();
    mockMedplum.post.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: { resourceType: 'Appointment', id: 'a1', status: 'booked', participant: [] } }],
    } as Bundle<Appointment | Slot>);

    const { result } = renderHook(() => useBookAppointmentForm(slot, onSuccess));

    await act(async () => {
      await result.current.handlePatientChange({ resourceType: 'Patient', id: 'p1' } as Patient);
    });

    await waitFor(() => {
      expect(result.current.patient?.id).toBe('p1');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(mockMedplum.post).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
