import type { Appointment, EpisodeOfCare, Patient } from '@medplum/fhirtypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useCase } from './useCase';

const activeEpisodeState = vi.hoisted(() => ({
  activeEpisode: undefined as EpisodeOfCare | undefined,
  setActiveEpisode: vi.fn(),
}));

const medplumState = vi.hoisted(() => ({
  searchResources: vi.fn(),
}));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => activeEpisodeState,
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

describe('useCase', () => {
  const patient: Patient = { resourceType: 'Patient', id: 'patient-1', name: [{ family: 'Doe', given: ['Jane'] }] };

  beforeEach(() => {
    vi.clearAllMocks();
    activeEpisodeState.activeEpisode = undefined;
  });

  test('stops loading without searching when there is no active episode', async () => {
    const { result } = renderHook(() => useCase(patient));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(medplumState.searchResources).not.toHaveBeenCalled();
    expect(result.current.appointmentCount).toBe(0);
    expect(result.current.nextAppointment).toBeUndefined();
  });

  test('sets an error when appointment loading fails', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    medplumState.searchResources.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useCase(patient));

    await waitFor(() => expect(result.current.error).toBe('Failed to load appointment count'));
    expect(result.current.loading).toBe(false);
  });

  test('computes appointment count and next appointment scoped to the active episode', async () => {
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
        id: 'appt-other',
        status: 'booked',
        participant: [],
        supportingInformation: [{ reference: 'EpisodeOfCare/another-episode' }],
        start: '2099-01-01T07:00:00.000Z',
      },
    ];
    medplumState.searchResources.mockResolvedValue(appointments);

    const { result } = renderHook(() => useCase(patient));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.appointmentCount).toBe(2);
    expect(result.current.nextAppointment?.id).toBe('appt-next');
  });

  test('handleEdit opens the modal with the given episode, and handleCloseModal resets it', async () => {
    const { result } = renderHook(() => useCase(patient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const episode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-edit',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    act(() => {
      result.current.handleEdit(episode);
    });

    expect(result.current.modalOpened).toBe(true);
    expect(result.current.editingEpisode).toBe(episode);

    act(() => {
      result.current.handleCloseModal();
    });

    expect(result.current.modalOpened).toBe(false);
    expect(result.current.editingEpisode).toBeUndefined();
  });

  test('handleSavedCase updates the active episode and closes the modal', async () => {
    const { result } = renderHook(() => useCase(patient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const episode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-saved',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    act(() => {
      result.current.handleEdit(episode);
      result.current.handleSavedCase(episode);
    });

    expect(activeEpisodeState.setActiveEpisode).toHaveBeenCalledWith(episode);
    expect(result.current.modalOpened).toBe(false);
    expect(result.current.editingEpisode).toBeUndefined();
  });

  test('handleActiveEpisodeUpdated forwards the episode to setActiveEpisode', async () => {
    const { result } = renderHook(() => useCase(patient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const episode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-updated',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    act(() => {
      result.current.handleActiveEpisodeUpdated(episode);
    });

    expect(activeEpisodeState.setActiveEpisode).toHaveBeenCalledWith(episode);
  });
});
