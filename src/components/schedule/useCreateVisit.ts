import type {
  CodeableConcept,
  EpisodeOfCare,
  Patient,
  PlanDefinition,
  Practitioner,
  Reference,
  Schedule,
  Slot,
} from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppointmentSlots } from '../../hooks/useAppointmentSlots';
import type { Range } from '../../types/scheduling';
import { botCreateTaskReplacement, createAppointment, createEncounter } from '../../utils/encounter';
import { encounterClass } from '../../utils/encounterClass';
import { showErrorNotification } from '../../utils/notifications';
import { createBufferSlots } from '../../utils/scheduling';

interface UseCreateVisitOptions {
  appointmentSlot: Range | undefined;
  practitioner?: Practitioner | Reference<Practitioner>;
  schedule?: Schedule;
}

export interface UseCreateVisitReturn {
  patient: Patient | undefined;
  episodes: EpisodeOfCare[];
  selectedEpisode: EpisodeOfCare | undefined;
  setSelectedEpisode: (ep: EpisodeOfCare | undefined) => void;
  planDefinitionData: PlanDefinition | undefined;
  setPlanDefinitionData: (p: PlanDefinition | undefined) => void;
  serviceTypes: CodeableConcept[];
  selectedServiceTypeIndex: number | undefined;
  setSelectedServiceTypeIndex: (i: number | undefined) => void;
  availableSlots: Slot[];
  selectedSlotId: string | null;
  setSelectedSlotId: (id: string | null) => void;
  selectedServiceType: CodeableConcept | undefined;
  formattedDate: string;
  formattedSlotTime: string;
  isLoading: boolean;
  handlePatientChange: (value: Patient | undefined) => Promise<void>;
  handleSubmit: () => Promise<void>;
}

export function useCreateVisit({
  appointmentSlot,
  practitioner,
  schedule,
}: UseCreateVisitOptions): UseCreateVisitReturn {
  const medplum = useMedplum();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | undefined>();
  const [episodes, setEpisodes] = useState<EpisodeOfCare[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeOfCare | undefined>();
  const [planDefinitionData, setPlanDefinitionData] = useState<PlanDefinition | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const appointmentDate = useMemo(
    () => (appointmentSlot?.start ? new Date(appointmentSlot.start).toISOString().slice(0, 10) : ''),
    [appointmentSlot?.start]
  );

  const {
    serviceTypes,
    selectedServiceTypeIndex,
    setSelectedServiceTypeIndex,
    selectedServiceType,
    availableSlots,
    selectedSlotId,
    setSelectedSlotId,
    selectedSlot,
  } = useAppointmentSlots({ schedule, appointmentDate });

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

  const [formattedDate, formattedSlotTime] = useMemo(() => {
    if (!appointmentSlot) {
      return ['', ''];
    }

    const startDate = new Date(appointmentSlot.start);
    const endDate = new Date(appointmentSlot.end);

    const dateStr = startDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const formattedTime = `${startDate.toLocaleTimeString('en-GB', timeOptions)} – ${endDate.toLocaleTimeString('en-GB', timeOptions)}`;
    return [dateStr, formattedTime];
  }, [appointmentSlot]);

  const handleSubmit = async (): Promise<void> => {
    const start = selectedSlot ? new Date(selectedSlot.start) : appointmentSlot?.start;
    const end = selectedSlot ? new Date(selectedSlot.end) : appointmentSlot?.end;

    if (!patient || !planDefinitionData || !start || !end) {
      return;
    }

    setIsLoading(true);
    try {
      const appointment = await createAppointment(
        medplum,
        start,
        end,
        patient,
        practitioner,
        schedule,
        selectedEpisode
      );

      await botCreateTaskReplacement(medplum, appointment, patient, selectedEpisode);

      if (schedule?.id && selectedServiceTypeIndex !== undefined) {
        await createBufferSlots(medplum, schedule, selectedServiceTypeIndex, start, end);
      }

      const encounter = await createEncounter(
        medplum,
        encounterClass,
        patient,
        planDefinitionData,
        appointment,
        practitioner,
        selectedEpisode
      );

      navigate(`/Patient/${patient.id}/Encounter/${encounter.id}`)?.catch(console.error);
    } catch (err) {
      showErrorNotification(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    patient,
    episodes,
    selectedEpisode,
    setSelectedEpisode,
    planDefinitionData,
    setPlanDefinitionData,
    serviceTypes,
    selectedServiceTypeIndex,
    setSelectedServiceTypeIndex,
    availableSlots,
    selectedSlotId,
    setSelectedSlotId,
    selectedServiceType,
    formattedDate,
    formattedSlotTime,
    isLoading,
    handlePatientChange,
    handleSubmit,
  };
}
