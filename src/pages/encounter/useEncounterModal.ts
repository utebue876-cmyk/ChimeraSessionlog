import { showNotification } from '@mantine/notifications';
import { isResource } from '@medplum/core';
import type { CodeableConcept, EpisodeOfCare, PlanDefinition, Practitioner, Schedule, Slot, Task } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import { useAppointmentSlots } from '../../hooks/useAppointmentSlots';
import type { FieldErrors } from '../../hooks/useFieldErrors';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { usePatient } from '../../hooks/usePatient';
import { botCreateTaskReplacement, createAppointment, createEncounter } from '../../utils/encounter';
import { encounterClass } from '../../utils/encounterClass';
import { recordPatientActivity } from '../../utils/patientActivity';
import { isRequestedScheduleAssessmentTask } from '../../utils/scheduleAssessmentTask';
import { createBufferSlots } from '../../utils/scheduling';

export type EncounterModalField = 'practitioner' | 'serviceType' | 'selectedSlot' | 'planDefinitionData';

interface UseEncounterModalOptions {
  episodeOfCare?: EpisodeOfCare;
  opened?: boolean;
  onClose?: () => void;
  /** The requested "schedule assessment" task that opened this modal, completed once the appointment is created. */
  scheduleAssessmentTask?: Task;
}

export interface UseEncounterModalReturn {
  isOpen: boolean;
  handleClose: () => void;
  todayStr: string;
  practitioner: Practitioner | undefined;
  setPractitioner: (p: Practitioner | undefined) => void;
  serviceTypes: CodeableConcept[];
  selectedServiceTypeIndex: number | undefined;
  setSelectedServiceTypeIndex: (i: number | undefined) => void;
  selectedServiceType: CodeableConcept | undefined;
  appointmentDate: string;
  setAppointmentDate: (d: string) => void;
  availableSlots: Slot[];
  selectedSlotId: string | null;
  setSelectedSlotId: (id: string | null) => void;
  selectedSlot: Slot | undefined;
  planDefinitionData: PlanDefinition | undefined;
  setPlanDefinitionData: (p: PlanDefinition | undefined) => void;
  isLoading: boolean;
  fieldErrors: FieldErrors<EncounterModalField>;
  submit: () => Promise<void>;
}

export function useEncounterModal({
  episodeOfCare: episodeOfCareProp,
  opened,
  onClose,
  scheduleAssessmentTask,
}: UseEncounterModalOptions): UseEncounterModalReturn {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const patient = usePatient();
  const { activeEpisode } = useActiveEpisode();
  const episodeOfCare = episodeOfCareProp ?? activeEpisode;
  const { fieldErrors, setFieldErrors, clearFieldError } = useFieldErrors<EncounterModalField>();
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = opened ?? internalOpen;
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [appointmentDate, setAppointmentDate] = useState<string>(todayStr);
  const [practitioner, setPractitionerRaw] = useState<Practitioner | undefined>(() => {
    const profile = medplum.getProfile();
    if (isResource<Practitioner>(profile, 'Practitioner')) {
      return profile;
    }
    return undefined;
  });
  const [schedule, setSchedule] = useState<Schedule | undefined>();

  // Load the practitioner's Schedule whenever the practitioner changes
  useEffect(() => {
    if (!practitioner?.id) {
      setSchedule(undefined);
      return;
    }
    medplum
      .searchOne('Schedule', { actor: `Practitioner/${practitioner.id}` })
      .then(setSchedule)
      .catch(() => setSchedule(undefined));
  }, [medplum, practitioner?.id]);

  const {
    serviceTypes,
    selectedServiceTypeIndex,
    setSelectedServiceTypeIndex: setSelectedServiceTypeIndexRaw,
    selectedServiceType,
    availableSlots,
    selectedSlotId,
    setSelectedSlotId: setSelectedSlotIdRaw,
    selectedSlot,
  } = useAppointmentSlots({ schedule, appointmentDate });

  const [planDefinitionData, setPlanDefinitionDataRaw] = useState<PlanDefinition | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const setPractitioner = useCallback(
    (p: Practitioner | undefined) => {
      clearFieldError('practitioner');
      setPractitionerRaw(p);
    },
    [clearFieldError]
  );

  const setSelectedServiceTypeIndex = useCallback(
    (i: number | undefined) => {
      clearFieldError('serviceType');
      setSelectedServiceTypeIndexRaw(i);
    },
    [clearFieldError, setSelectedServiceTypeIndexRaw]
  );

  const setSelectedSlotId = useCallback(
    (id: string | null) => {
      clearFieldError('selectedSlot');
      setSelectedSlotIdRaw(id);
    },
    [clearFieldError, setSelectedSlotIdRaw]
  );

  const setPlanDefinitionData = useCallback(
    (p: PlanDefinition | undefined) => {
      clearFieldError('planDefinitionData');
      setPlanDefinitionDataRaw(p);
    },
    [clearFieldError]
  );

  const handleClose = (): void => {
    if (onClose) {
      onClose();
      return;
    }
    navigate(-1)?.catch(console.error);
    setInternalOpen(false);
  };

  const submit = async (): Promise<void> => {
    const errors: FieldErrors<EncounterModalField> = {};
    if (!practitioner) errors.practitioner = 'Required';
    if (serviceTypes.length > 0 && selectedServiceTypeIndex === undefined) errors.serviceType = 'Required';
    if (!selectedSlot) errors.selectedSlot = 'Required';
    if (!planDefinitionData) errors.planDefinitionData = 'Required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showNotification({
        color: 'yellow',
        title: 'Missing required fields',
        message: 'Please fill out all required fields.',
      });
      return;
    }

    if (!patient) {
      return;
    }

    // TypeScript narrowing guards — guaranteed non-undefined by the error check above
    if (!selectedSlot || !planDefinitionData) {
      return;
    }
    const start = new Date(selectedSlot.start);
    const end = new Date(selectedSlot.end);
    setIsLoading(true);
    try {
      const appointment = await createAppointment(medplum, start, end, patient, practitioner, schedule, episodeOfCare);
      await botCreateTaskReplacement(medplum, appointment, patient, episodeOfCare);

      // Create busy-unavailable slots for buffer times if configured
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
        episodeOfCare
      );

      // Complete the "schedule assessment" task (if any) that opened this modal, now that its
      // appointment has been booked.
      if (scheduleAssessmentTask && isRequestedScheduleAssessmentTask(scheduleAssessmentTask)) {
        await medplum.updateResource({ ...scheduleAssessmentTask, status: 'completed' });
      }

      navigate(`/Patient/${patient.id}/Encounter/${encounter.id}`)?.catch(console.error);
      recordPatientActivity(medplum, patient.id);
      showNotification({ title: 'Success', message: 'Appointment created' });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isOpen,
    handleClose,
    todayStr,
    practitioner,
    setPractitioner,
    serviceTypes,
    selectedServiceTypeIndex,
    setSelectedServiceTypeIndex,
    selectedServiceType,
    appointmentDate,
    setAppointmentDate,
    availableSlots,
    selectedSlotId,
    setSelectedSlotId,
    selectedSlot,
    planDefinitionData,
    setPlanDefinitionData,
    isLoading,
    fieldErrors,
    submit,
  };
}
