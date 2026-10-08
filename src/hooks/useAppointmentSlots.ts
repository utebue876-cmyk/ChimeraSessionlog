import { isDefined } from '@medplum/core';
import type { Appointment, Bundle, CodeableConcept, Schedule, Slot } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useMemo, useState } from 'react';
import {
  SchedulingTransientIdentifier,
  getServiceTypeReference,
  serviceTypesFromSchedulingParameters,
} from '../utils/scheduling';

interface UseAppointmentSlotsOptions {
  schedule: Schedule | undefined;
  /** ISO date string (YYYY-MM-DD) for the day to fetch slots */
  appointmentDate: string;
}

export interface UseAppointmentSlotsReturn {
  serviceTypes: CodeableConcept[];
  selectedServiceTypeIndex: number | undefined;
  setSelectedServiceTypeIndex: (i: number | undefined) => void;
  selectedServiceType: CodeableConcept | undefined;
  availableSlots: Slot[];
  selectedSlotId: string | null;
  setSelectedSlotId: (id: string | null) => void;
  selectedSlot: Slot | undefined;
}

export function useAppointmentSlots({
  schedule,
  appointmentDate,
}: UseAppointmentSlotsOptions): UseAppointmentSlotsReturn {
  const medplum = useMedplum();

  const serviceTypes = useMemo<CodeableConcept[]>(
    () => (schedule ? serviceTypesFromSchedulingParameters(schedule) : []),
    [schedule]
  );
  const [selectedServiceTypeIndex, setSelectedServiceTypeIndex] = useState<number | undefined>();
  const selectedServiceType =
    selectedServiceTypeIndex !== undefined ? serviceTypes[selectedServiceTypeIndex] : undefined;

  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const selectedSlot = availableSlots.find((s) => SchedulingTransientIdentifier.get(s) === selectedSlotId);

  // Auto-select when there is exactly one service type; reset when schedule changes
  useEffect(() => {
    setSelectedServiceTypeIndex(serviceTypes.length === 1 ? 0 : undefined);
  }, [schedule?.id, serviceTypes.length]);

  // Load available slots for the selected date, schedule, and service type via Appointment/$find.
  // $find returns proposed Appointment resources; we convert them to synthetic Slot objects so
  // the rest of the UI (CreateVisit, EncounterModal) can work with start/end times as before.
  useEffect(() => {
    setAvailableSlots([]);
    setSelectedSlotId(null);

    if (!schedule?.id || !selectedServiceType || !appointmentDate) {
      return;
    }

    const serviceTypeReference = getServiceTypeReference(schedule, selectedServiceType);
    if (!serviceTypeReference) {
      // Schedule not migrated to new scheduling parameters — cannot use $find
      return;
    }

    const dayStart = new Date(`${appointmentDate}T00:00:00`);
    const dayEnd = new Date(`${appointmentDate}T23:59:59`);
    const params = new URLSearchParams({
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
      'service-type-reference': serviceTypeReference,
      schedule: `Schedule/${schedule.id}`,
    });

    const url = `fhir/R4/Appointment/$find?${params}`;

    let cancelled = false;
    medplum
      .get<Bundle<Appointment>>(url)
      .then((bundle) => {
        if (cancelled) return;
        // $find returns proposed Appointments; convert to synthetic Slot objects for display
        const slots: Slot[] = (bundle.entry?.map((e) => e.resource).filter(isDefined) ?? [])
          .filter(
            (r): r is Appointment & { start: string; end: string } =>
              r.resourceType === 'Appointment' && r.status === 'proposed' && !!r.start && !!r.end
          )
          .map((apt) => ({
            resourceType: 'Slot' as const,
            start: apt.start,
            end: apt.end,
            status: 'free' as const,
            serviceType: apt.serviceType,
            schedule: { reference: `Schedule/${schedule.id}` },
          }));
        slots.forEach((s) => SchedulingTransientIdentifier.set(s));
        setAvailableSlots(slots);
        if (slots.length === 1) {
          setSelectedSlotId(SchedulingTransientIdentifier.get(slots[0]) ?? null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAvailableSlots([]);
          console.error('[useAppointmentSlots] $find failed:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [medplum, schedule, schedule?.id, selectedServiceType, appointmentDate]);

  return {
    serviceTypes,
    selectedServiceTypeIndex,
    setSelectedServiceTypeIndex,
    selectedServiceType,
    availableSlots,
    selectedSlotId,
    setSelectedSlotId,
    selectedSlot,
  };
}
