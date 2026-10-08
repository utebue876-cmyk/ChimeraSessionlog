import { showNotification } from '@mantine/notifications';
import type { WithId } from '@medplum/core';
import { createReference, isDefined, normalizeErrorString } from '@medplum/core';
import type { Appointment, Bundle, CodeableConcept, Encounter, Practitioner, Schedule, Slot } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getServiceTypeForAppointment } from '../../utils/appointmentUtils';
import { getServiceTypeReference } from '../../utils/scheduling';

interface UseChangePractitionerModalOptions {
  appointment: Appointment | undefined;
  encounter: Encounter;
  opened: boolean;
  onClose: () => void;
  onSuccess?: (practitioner: Practitioner) => void;
}

export interface UseChangePractitionerModalReturn {
  practitioner: Practitioner | undefined;
  setPractitioner: (p: Practitioner | undefined) => void;
  availablePractitioners: WithId<Practitioner>[];
  isLoadingPractitioners: boolean;
  serviceTypeLabel: string;
  dateLabel: string;
  timeSlotLabel: string;
  isLoading: boolean;
  practitionerError: string | undefined;
  submit: () => Promise<void>;
  handleClose: () => void;
}

export function useChangePractitionerModal({
  appointment,
  encounter,
  opened,
  onClose,
  onSuccess,
}: UseChangePractitionerModalOptions): UseChangePractitionerModalReturn {
  const medplum = useMedplum();

  const [practitioner, setPractitionerRaw] = useState<Practitioner | undefined>();
  const [practitionerError, setPractitionerError] = useState<string | undefined>();
  const [availablePractitioners, setAvailablePractitioners] = useState<WithId<Practitioner>[]>([]);
  const [isLoadingPractitioners, setIsLoadingPractitioners] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedServiceType, setResolvedServiceType] = useState<CodeableConcept | undefined>();

  useEffect(() => {
    if (!appointment) return;
    getServiceTypeForAppointment(medplum, appointment, encounter.serviceType)
      .then((serviceType) => {
        if (serviceType) setResolvedServiceType(serviceType);
      })
      .catch(() => undefined);
  }, [medplum, appointment, encounter.id, encounter.serviceType]);

  const serviceType = resolvedServiceType;

  const serviceTypeLabel = useMemo(
    () => serviceType?.text ?? serviceType?.coding?.[0]?.display ?? serviceType?.coding?.[0]?.code ?? '—',
    [serviceType]
  );

  const dateLabel = useMemo(() => {
    if (!appointment?.start) return '—';
    return new Date(appointment.start).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, [appointment?.start]);

  const timeSlotLabel = useMemo(() => {
    if (!appointment?.start || !appointment?.end) return '—';
    const start = new Date(appointment.start).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const end = new Date(appointment.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${start} - ${end}`;
  }, [appointment?.start, appointment?.end]);

  const setPractitioner = useCallback((p: Practitioner | undefined) => {
    setPractitionerError(undefined);
    setPractitionerRaw(p);
  }, []);

  const handleClose = useCallback(() => {
    setPractitionerRaw(undefined);
    setPractitionerError(undefined);
    onClose();
  }, [onClose]);

  // When the modal opens, load practitioners who have a free slot at the appointment time
  useEffect(() => {
    if (!opened || !appointment?.start || !appointment?.end) return;

    let cancelled = false;
    setAvailablePractitioners([]);
    setIsLoadingPractitioners(true);

    const appointmentStart = new Date(appointment.start);
    const appointmentEnd = new Date(appointment.end);
    const appointmentDate = appointment.start.slice(0, 10); // YYYY-MM-DD

    async function load(): Promise<void> {
      // Fetch all schedules
      const schedules = await medplum.searchResources('Schedule', { _count: '200' });

      // For each schedule, find free slots on the appointment date
      const practitionerResults = await Promise.all(
        schedules.map(async (schedule: Schedule) => {
          try {
            const params = new URLSearchParams({
              start: new Date(`${appointmentDate}T00:00:00`).toISOString(),
              end: new Date(`${appointmentDate}T23:59:59`).toISOString(),
            });

            // Match service type by code only (ignore system) so cross-system codes work.
            // Use THIS schedule's own service type coding to resolve the service-type-reference.
            if (serviceType) {
              const serviceTypeCodes = serviceType.coding?.map((c) => c.code).filter(isDefined) ?? [];
              const matchingScheduleSt = schedule.serviceType?.find((st) =>
                st.coding?.some((c) => serviceTypeCodes.includes(c.code ?? ''))
              );
              if (!matchingScheduleSt) return undefined; // schedule doesn't offer this service type

              const serviceTypeRef = getServiceTypeReference(schedule, matchingScheduleSt);
              if (serviceTypeRef) {
                params.append('service-type-reference', serviceTypeRef);
              } else {
                return undefined;
              }
            }

            params.append('schedule', `Schedule/${schedule.id}`);

            // Add a timestamp to bypass the Medplum client-side GET cache so that
            // slot deletions from a previous practitioner change are reflected immediately.
            params.set('_ts', Date.now().toString());
            const query = params.toString();
            const bundle = await medplum.get<Bundle<Appointment>>(`fhir/R4/Appointment/$find?${query}`);

            const foundAppointments =
              (bundle.entry?.map((e) => e.resource).filter(isDefined) as Appointment[])?.filter(
                (resource): resource is Appointment & { start: string; end: string } =>
                  resource.resourceType === 'Appointment' &&
                  resource.status === 'proposed' &&
                  !!resource.start &&
                  !!resource.end
              ) ?? [];

            // Check if any free slot matches the appointment time window
            const hasMatchingSlot = foundAppointments.some(
              (foundAppointment) =>
                new Date(foundAppointment.start).getTime() === appointmentStart.getTime() &&
                new Date(foundAppointment.end).getTime() === appointmentEnd.getTime()
            );

            if (!hasMatchingSlot) return undefined;

            // Resolve the practitioner actor from the schedule
            const actorRef = schedule.actor?.find((a) => a.reference?.startsWith('Practitioner/'));
            if (!actorRef?.reference) return undefined;

            const practitionerId = actorRef.reference.split('/')[1];
            const p = await medplum.readResource('Practitioner', practitionerId).catch(() => undefined);
            if (!p) return undefined;
            return p;
          } catch {
            return undefined;
          }
        })
      );

      const currentPractitionerId = appointment?.id
        ? (await medplum.readResource('Appointment', appointment.id)).participant
            ?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))
            ?.actor?.reference?.split('/')[1]
        : appointment?.participant
            ?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))
            ?.actor?.reference?.split('/')[1];

      if (!cancelled) {
        const filteredPractitioners = practitionerResults.filter(
          (p): p is WithId<Practitioner> => p !== undefined && p.id !== currentPractitionerId
        );
        setAvailablePractitioners(filteredPractitioners);

        setIsLoadingPractitioners(false);
      }
    }

    load().catch(() => {
      if (!cancelled) setIsLoadingPractitioners(false);
    });

    return () => {
      cancelled = true;
    };
  }, [opened, medplum, appointment?.id, appointment?.participant, appointment?.start, appointment?.end, serviceType]);

  const submit = useCallback(async (): Promise<void> => {
    if (!practitioner) {
      setPractitionerError('Please select a practitioner');
      return;
    }
    if (!appointment?.id || !appointment.start || !appointment.end) return;

    setIsLoading(true);
    try {
      // Find old practitioner's schedule
      const oldPractitionerId = appointment.participant
        ?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))
        ?.actor?.reference?.split('/')[1];

      const oldSchedule = oldPractitionerId
        ? await medplum.searchOne('Schedule', { actor: `Practitioner/${oldPractitionerId}` })
        : undefined;

      // Collect slot IDs to delete — start with any referenced in appointment.slot (busy slots)
      const slotsToDelete = new Set<string>();
      for (const ref of appointment.slot ?? []) {
        const id = ref.reference?.split('/')[1];
        if (id) slotsToDelete.add(id);
      }

      // Also find buffer slots (busy-unavailable) on the old schedule via direct FHIR search.
      // Use a ±2 hour window in ISO datetime format — same pattern as load() uses for $find.
      // buffer slots are NOT in appointment.slot, they must be found via schedule search.
      if (oldSchedule?.id) {
        const windowStart = new Date(new Date(appointment.start).getTime() - 2 * 60 * 60 * 1000).toISOString();
        const windowEnd = new Date(new Date(appointment.end).getTime() + 2 * 60 * 60 * 1000).toISOString();
        const bundle = await medplum.get<Bundle<Slot>>(
          `fhir/R4/Slot?schedule=Schedule/${oldSchedule.id}&start=ge${windowStart}&start=le${windowEnd}&_count=100`
        );
        for (const entry of bundle.entry ?? []) {
          const s = entry.resource;
          if (s?.resourceType === 'Slot' && s.id && s.status !== 'free') {
            slotsToDelete.add(s.id);
          }
        }
      }

      // Patch appointment: new practitioner, remove slot references
      const updatedParticipants = (appointment.participant ?? []).map((p) =>
        p.actor?.reference?.startsWith('Practitioner/') ? { ...p, actor: createReference(practitioner) } : p
      );

      if (appointment.slot?.length) {
        await medplum.patchResource('Appointment', appointment.id, [
          { op: 'replace', path: '/participant', value: updatedParticipants },
          { op: 'remove', path: '/slot' },
        ]);
      } else {
        await medplum.patchResource('Appointment', appointment.id, [
          { op: 'replace', path: '/participant', value: updatedParticipants },
        ]);
      }

      // Delete all old slots after the appointment no longer references them
      await Promise.allSettled([...slotsToDelete].map((id) => medplum.deleteResource('Slot', id)));

      showNotification({ title: 'Success', message: 'Practitioner updated' });
      onSuccess?.(practitioner);
      onClose();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: normalizeErrorString(err) });
    } finally {
      setIsLoading(false);
    }
  }, [medplum, appointment, practitioner, onClose, onSuccess]);

  return {
    practitioner,
    setPractitioner,
    availablePractitioners,
    isLoadingPractitioners,
    serviceTypeLabel,
    dateLabel,
    timeSlotLabel,
    isLoading,
    practitionerError,
    submit,
    handleClose,
  };
}
