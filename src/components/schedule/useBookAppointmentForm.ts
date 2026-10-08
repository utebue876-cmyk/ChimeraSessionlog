import { createReference, EMPTY, isDefined } from '@medplum/core';
import type { Appointment, Bundle, EpisodeOfCare, Patient, Reference, Schedule, Slot } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useState } from 'react';
import { botCreateTaskReplacement } from '../../utils/encounter';
import { showErrorNotification } from '../../utils/notifications';
import { getBufferDurationsForServiceType, SchedulingTransientIdentifier } from '../../utils/scheduling';

export interface UseBookAppointmentFormReturn {
  patient: Patient | undefined;
  loading: boolean;
  episodes: EpisodeOfCare[];
  selectedEpisode: EpisodeOfCare | undefined;
  setSelectedEpisode: (ep: EpisodeOfCare | undefined) => void;
  handlePatientChange: (value: Patient | undefined) => Promise<void>;
  handleSubmit: () => Promise<void>;
}

export function useBookAppointmentForm(
  slot: Slot,
  onSuccess?: (result: { appointments: Appointment[]; slots: Slot[] }) => void
): UseBookAppointmentFormReturn {
  const medplum = useMedplum();
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<EpisodeOfCare[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeOfCare | undefined>();

  const handlePatientChange = useCallback(
    async (value: Patient | undefined): Promise<void> => {
      setPatient(value);
      setSelectedEpisode(undefined);
      setEpisodes([]);

      if (!value?.id) {
        return;
      }

      try {
        const results = await medplum.searchResources('EpisodeOfCare', [
          ['patient', `Patient/${value.id}`],
          ['_count', '100'],
          ['_sort', '-_lastUpdated'],
        ]);
        setEpisodes(results);
        if (results.length === 1) {
          setSelectedEpisode(results[0]);
        }
      } catch {
        // leave episodes empty on failure
      }
    },
    [medplum]
  );

  const bookSlot = useCallback(
    async (patient: Patient) => {
      setLoading(true);

      // Remove any transient identifiers we added for use in the UI before submitting
      const cleanSlot = { ...slot };
      SchedulingTransientIdentifier.remove(cleanSlot);

      try {
        // Fetch the schedule to get actor (practitioner) references and buffer durations
        let scheduleActors: Appointment['participant'] = [];
        const containedSlots: Slot[] = [{ ...cleanSlot, status: 'busy' }];
        if (cleanSlot.schedule?.reference) {
          try {
            const scheduleId = cleanSlot.schedule.reference.split('/')[1];
            const schedule = (await medplum.readResource('Schedule', scheduleId)) as Schedule;
            scheduleActors = (schedule.actor ?? []).map((actor: Reference) => ({
              actor: actor as Appointment['participant'][number]['actor'],
              required: 'required' as const,
              status: 'needs-action' as const,
            }));

            // The server validates that buffer slots are present as contained resources
            const { bufferBefore, bufferAfter } = getBufferDurationsForServiceType(
              schedule,
              cleanSlot.serviceType?.[0]
            );
            const slotStart = new Date(cleanSlot.start as string);
            const slotEnd = new Date(cleanSlot.end as string);
            if (bufferBefore > 0) {
              containedSlots.push({
                resourceType: 'Slot',
                status: 'busy-unavailable',
                start: new Date(slotStart.getTime() - bufferBefore * 60_000).toISOString(),
                end: cleanSlot.start as string,
                schedule: cleanSlot.schedule,
                serviceType: cleanSlot.serviceType,
              });
            }
            if (bufferAfter > 0) {
              containedSlots.push({
                resourceType: 'Slot',
                status: 'busy-unavailable',
                start: cleanSlot.end as string,
                end: new Date(slotEnd.getTime() + bufferAfter * 60_000).toISOString(),
                schedule: cleanSlot.schedule,
                serviceType: cleanSlot.serviceType,
              });
            }
          } catch {
            // proceed with just the busy slot if schedule load fails
          }
        }

        // Build the proposed Appointment for $book
        const appointment: Appointment = {
          resourceType: 'Appointment',
          status: 'proposed',
          serviceType: cleanSlot.serviceType,
          start: cleanSlot.start,
          end: cleanSlot.end,
          participant: [
            ...scheduleActors,
            { actor: createReference(patient), required: 'required', status: 'accepted' },
          ],
          contained: containedSlots,
          ...(selectedEpisode ? { supportingInformation: [createReference(selectedEpisode)] } : {}),
        };

        const data = await medplum.post<Bundle<Appointment | Slot>>(medplum.fhirUrl('Appointment', '$book'), {
          resourceType: 'Parameters',
          parameter: [{ name: 'appointment', resource: appointment }],
        });
        medplum.invalidateSearches('Appointment');
        medplum.invalidateSearches('Slot');

        const resources = data.entry?.map((entry) => entry.resource).filter(isDefined) ?? EMPTY;
        const slots = resources.filter((obj: Slot | Appointment): obj is Slot => obj.resourceType === 'Slot');
        const appointments = resources.filter(
          (obj: Slot | Appointment): obj is Appointment => obj.resourceType === 'Appointment'
        );

        // $book does not store our supporting-information parameter in Appointment.supportingInformation,
        // so we patch each returned appointment to include the EpisodeOfCare reference ourselves.
        // This ensures AppointmentDetails can read it back when creating the Encounter.
        let finalAppointments = appointments;
        if (selectedEpisode) {
          const episodeRefStr = `EpisodeOfCare/${selectedEpisode.id}`;
          finalAppointments = await Promise.all(
            appointments.map(async (apt) => {
              const alreadyHasEpisode = apt.supportingInformation?.some((ref) => ref.reference === episodeRefStr);
              if (alreadyHasEpisode) {
                return apt;
              }
              return medplum.updateResource({
                ...apt,
                supportingInformation: [...(apt.supportingInformation ?? []), createReference(selectedEpisode)],
              });
            })
          );
        }

        onSuccess?.({ appointments: finalAppointments, slots });

        await Promise.all(
          finalAppointments
            .filter((apt): apt is typeof apt & { id: string } => !!apt.id)
            .map((apt) => botCreateTaskReplacement(medplum, apt, patient, selectedEpisode))
        );
      } finally {
        setLoading(false);
      }
    },
    [medplum, slot, onSuccess, selectedEpisode]
  );

  const handleSubmit = useCallback(async () => {
    if (!patient) {
      return;
    }
    try {
      await bookSlot(patient);
    } catch (error) {
      showErrorNotification(error);
    }
  }, [patient, bookSlot]);

  return {
    patient,
    loading,
    episodes,
    selectedEpisode,
    setSelectedEpisode,
    handlePatientChange,
    handleSubmit,
  };
}
