import { showNotification } from '@mantine/notifications';
import { formatCodeableConcept, isReference, normalizeErrorString } from '@medplum/core';
import type { Appointment, Bundle, Encounter, EpisodeOfCare, Patient, Practitioner, Slot } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlanDefinitionNameFromEncounter, getServiceTypeForAppointment } from '../../utils/appointmentUtils';

export interface UseAppointmentInfoResult {
  formattedDate: string;
  formattedTimeRange: string;
  practitionerDisplay: string;
  patientDisplay: string;
  caseDisplay: string;
  serviceTypeDisplay: string;
  careTemplateDisplay: string;
  handleDelete: () => Promise<void>;
  deleting: boolean;
}

interface UseAppointmentInfoProps {
  appointment: Appointment;
  encounter?: Encounter;
  onClose: () => void;
  onDelete?: (appointment: Appointment) => void;
}

function getReferenceDisplay(reference: { reference?: string; display?: string } | undefined): string {
  if (!reference) {
    return '—';
  }
  return reference.display ?? reference.reference ?? '—';
}

function formatAppointmentDate(value: string | undefined): string {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAppointmentTimeRange(start: string | undefined, end: string | undefined): string {
  if (!start || !end) {
    return 'N/A';
  }

  const startTime = new Date(start).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endTime = new Date(end).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${startTime} - ${endTime}`;
}

export function useAppointmentInfo({
  appointment,
  encounter,
  onClose,
  onDelete,
}: UseAppointmentInfoProps): UseAppointmentInfoResult {
  const medplum = useMedplum();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      // Collect IDs of busy slots directly referenced by the appointment
      const slotsToDelete = new Set<string>();
      for (const ref of appointment.slot ?? []) {
        const id = ref.reference?.split('/')[1];
        if (id) slotsToDelete.add(id);
      }

      // Also find buffer slots (busy-unavailable) on the practitioner's schedule
      const practitionerId = appointment.participant
        ?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))
        ?.actor?.reference?.split('/')[1];

      if (practitionerId && appointment.start && appointment.end) {
        const schedule = await medplum.searchOne('Schedule', { actor: `Practitioner/${practitionerId}` });
        if (schedule?.id) {
          const windowStart = new Date(new Date(appointment.start).getTime() - 2 * 60 * 60 * 1000).toISOString();
          const windowEnd = new Date(new Date(appointment.end).getTime() + 2 * 60 * 60 * 1000).toISOString();
          const bundle = await medplum.get<Bundle<Slot>>(
            `fhir/R4/Slot?schedule=Schedule/${schedule.id}&start=ge${windowStart}&start=le${windowEnd}&_count=100`
          );
          for (const entry of bundle.entry ?? []) {
            const s = entry.resource;
            if (s?.resourceType === 'Slot' && s.id && s.status !== 'free') {
              slotsToDelete.add(s.id);
            }
          }
        }
      }

      // Delete encounter first, then appointment, then all associated slots
      if (encounter?.id) {
        await medplum.deleteResource('Encounter', encounter.id);
      }
      if (appointment.id) {
        await medplum.deleteResource('Appointment', appointment.id);
      }
      await Promise.allSettled([...slotsToDelete].map((id) => medplum.deleteResource('Slot', id)));

      onDelete?.(appointment);
      onClose();
    } catch (err) {
      showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
    } finally {
      setDeleting(false);
    }
  }, [medplum, appointment, encounter, onClose, onDelete]);
  const participants = appointment.participant?.map((participant) => participant.actor) ?? [];
  const practitionerRef = participants.find((actor) => isReference<Practitioner>(actor, 'Practitioner'));
  const patientRef = participants.find((actor) => isReference<Patient>(actor, 'Patient'));
  const episodeRef = appointment.supportingInformation?.find((ref) => isReference<EpisodeOfCare>(ref, 'EpisodeOfCare'));

  const [caseDisplay, setCaseDisplay] = useState<string>(getReferenceDisplay(episodeRef));
  const [careTemplateDisplay, setCareTemplateDisplay] = useState<string>(getReferenceDisplay(appointment.basedOn?.[0]));
  const [serviceTypeDisplay, setServiceTypeDisplay] = useState<string>('—');

  const appointmentServiceTypeDisplay = useMemo(() => {
    const appointmentTypes = (appointment.serviceType ?? [])
      .map((serviceType) => formatCodeableConcept(serviceType))
      .filter((value): value is string => Boolean(value));

    if (appointmentTypes.length > 0) {
      return appointmentTypes.join(', ');
    }

    return undefined;
  }, [appointment.serviceType]);

  useEffect(() => {
    let active = true;

    if (appointmentServiceTypeDisplay) {
      setServiceTypeDisplay(appointmentServiceTypeDisplay);
      return;
    }

    getServiceTypeForAppointment(medplum, appointment, encounter?.serviceType)
      .then((resolvedServiceType) => {
        if (!active) {
          return;
        }
        setServiceTypeDisplay(formatCodeableConcept(resolvedServiceType) || '—');
      })
      .catch(() => {
        if (active) {
          setServiceTypeDisplay(formatCodeableConcept(encounter?.serviceType) || '—');
        }
      });

    return () => {
      active = false;
    };
  }, [appointment, appointmentServiceTypeDisplay, encounter?.serviceType, medplum]);

  useEffect(() => {
    let active = true;

    if (!episodeRef?.reference) {
      setCaseDisplay('—');
      return;
    }

    medplum
      .readReference(episodeRef)
      .then((episode) => {
        if (!active) {
          return;
        }
        setCaseDisplay(episode.identifier?.[0]?.value ?? episode.id ?? getReferenceDisplay(episodeRef));
      })
      .catch(() => {
        if (active) {
          setCaseDisplay(getReferenceDisplay(episodeRef));
        }
      });

    return () => {
      active = false;
    };
  }, [episodeRef, medplum]);

  useEffect(() => {
    let active = true;

    if (!encounter) {
      setCareTemplateDisplay(getReferenceDisplay(appointment.basedOn?.[0]));
      return;
    }

    getPlanDefinitionNameFromEncounter(medplum, encounter)
      .then((name) => {
        if (active) {
          setCareTemplateDisplay(name ?? getReferenceDisplay(appointment.basedOn?.[0]));
        }
      })
      .catch(() => {
        if (active) {
          setCareTemplateDisplay(getReferenceDisplay(appointment.basedOn?.[0]));
        }
      });

    return () => {
      active = false;
    };
  }, [appointment.basedOn, encounter, medplum]);

  return {
    formattedDate: formatAppointmentDate(appointment.start),
    formattedTimeRange: formatAppointmentTimeRange(appointment.start, appointment.end),
    practitionerDisplay: getReferenceDisplay(practitionerRef),
    patientDisplay: getReferenceDisplay(patientRef),
    caseDisplay,
    serviceTypeDisplay,
    careTemplateDisplay,
    handleDelete,
    deleting,
  };
}
