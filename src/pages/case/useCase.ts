import { useDisclosure } from '@mantine/hooks';
import { getReferenceString } from '@medplum/core';
import type { Appointment, EpisodeOfCare, Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useState } from 'react';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';

export interface UseCaseResult {
  activeEpisode: EpisodeOfCare | undefined;
  appointmentCount: number;
  nextAppointment: Appointment | undefined;
  loading: boolean;
  error: string | undefined;
  editingEpisode: EpisodeOfCare | undefined;
  modalOpened: boolean;
  handleEdit: (episode: EpisodeOfCare) => void;
  handleCloseModal: () => void;
  handleSavedCase: (episode: EpisodeOfCare) => void;
  handleActiveEpisodeUpdated: (episode: EpisodeOfCare) => void;
}

export function useCase(patient: Patient): UseCaseResult {
  const medplum = useMedplum();
  const { activeEpisode, setActiveEpisode } = useActiveEpisode();
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<Appointment | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editingEpisode, setEditingEpisode] = useState<EpisodeOfCare | undefined>();
  const [modalOpened, { open, close }] = useDisclosure(false);

  const loadAppointmentCount = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    const episodeId = activeEpisode?.id;
    const patientRef = getReferenceString(patient);

    if (!episodeId || !patientRef) {
      setLoading(false);
      return;
    }

    try {
      const appointments = await medplum.searchResources('Appointment', [
        ['_count', '1000'],
        ['actor', patientRef],
      ]);

      const episodeAppointments = appointments.filter((appointment) =>
        appointment.supportingInformation?.some((ref) => ref.reference === `EpisodeOfCare/${episodeId}`)
      );

      setAppointmentCount(episodeAppointments.length);

      const now = new Date().toISOString();
      const next = episodeAppointments
        .filter((a) => a.start && a.start >= now)
        .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))[0];
      setNextAppointment(next);
    } catch {
      setError('Failed to load appointment count');
    } finally {
      setLoading(false);
    }
  }, [medplum, patient, activeEpisode?.id]);

  useEffect(() => {
    loadAppointmentCount().catch(() => {
      setError('Failed to load appointment count');
      setLoading(false);
    });
  }, [loadAppointmentCount]);

  const handleEdit = useCallback(
    (episode: EpisodeOfCare): void => {
      setEditingEpisode(episode);
      open();
    },
    [open]
  );

  const handleCloseModal = useCallback((): void => {
    close();
    setEditingEpisode(undefined);
  }, [close]);

  const handleSavedCase = useCallback(
    (episode: EpisodeOfCare): void => {
      setActiveEpisode(episode);
      handleCloseModal();
    },
    [handleCloseModal, setActiveEpisode]
  );

  const handleActiveEpisodeUpdated = useCallback(
    (episode: EpisodeOfCare): void => {
      setActiveEpisode(episode);
    },
    [setActiveEpisode]
  );

  return {
    activeEpisode,
    appointmentCount,
    nextAppointment,
    loading,
    error,
    editingEpisode,
    modalOpened,
    handleEdit,
    handleCloseModal,
    handleSavedCase,
    handleActiveEpisodeUpdated,
  };
}
