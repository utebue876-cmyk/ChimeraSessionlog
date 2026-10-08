import type { WithId } from '@medplum/core';
import type { Appointment, CodeableConcept, Schedule, Slot } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSchedulingStartsAt } from '../../hooks/useSchedulingStartsAt';
import type { Range } from '../../types/scheduling';
import {
  SchedulingTransientIdentifier,
  getAlignmentIntervalMinutesForServiceType,
  getDurationMinutesForServiceType,
  getScheduleAvailabilityForServiceType,
  getSlotServiceType,
  isSlotWithinAvailability,
  serviceTypesFromSchedulingParameters,
} from '../../utils/scheduling';

type UseFindPaneProps = {
  schedule: WithId<Schedule>;
  range: Range;
  blockedSlots?: Slot[];
  onSuccess: (results: { appointments: Appointment[]; slots: Slot[] }) => void;
};

export function useFindPane({ schedule, range, blockedSlots, onSuccess }: UseFindPaneProps): {
  serviceTypes: { codeableConcept: CodeableConcept; id: string }[];
  serviceType: CodeableConcept | undefined;
  setServiceType: (st: CodeableConcept | undefined) => void;
  displaySlots: Slot[];
  chosenSlot: Slot | undefined;
  setChosenSlot: (slot: Slot | undefined) => void;
  handleDismiss: () => void;
  handleBookSuccess: (results: { appointments: Appointment[]; slots: Slot[] }) => void;
} {
  const medplum = useMedplum();

  const serviceTypes = useMemo(
    () =>
      serviceTypesFromSchedulingParameters(schedule).map((codeableConcept) => ({
        codeableConcept,
        id: uuidv4(),
      })),
    [schedule]
  );

  const [serviceType, setServiceType] = useState<CodeableConcept | undefined>(
    serviceTypes.length === 1 ? serviceTypes[0].codeableConcept : undefined
  );

  const [chosenSlot, setChosenSlot] = useState<Slot | undefined>(undefined);

  // Ensure that we are searching for slots in the future by at least 30 minutes.
  const earliestSchedulable = useSchedulingStartsAt({ minimumNoticeMinutes: 30 });

  // Fetch appointments so we can exclude booked times from the generated slot grid.
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const actorRef = schedule.actor?.[0]?.reference;
    if (!actorRef || !serviceType) {
      setAppointments([]);
      return () => {};
    }
    let active = true;
    setAppointments([]);
    medplum
      .searchResources('Appointment', [
        ['_count', '1000'],
        ['actor', actorRef],
        ['date', `ge${range.start.toISOString()}`],
        ['date', `le${range.end.toISOString()}`],
      ])
      .then((apts) => {
        if (active) setAppointments(apts);
      })
      .catch(() => {
        if (active) setAppointments([]);
      });
    return () => {
      active = false;
    };
  }, [medplum, schedule, serviceType, range]);

  // Generate the slot grid directly from the schedule's working hours + slot duration.
  // Buffers are ignored — a slot is free if it doesn't overlap any booked appointment.
  const displaySlots = useMemo<Slot[]>(() => {
    if (!serviceType) return [];

    const availability = getScheduleAvailabilityForServiceType(schedule, serviceType);
    if (availability.windows.length === 0) return [];

    const durationMs = (getDurationMinutesForServiceType(schedule, serviceType) ?? 30) * 60_000;
    const alignmentIntervalMs = getAlignmentIntervalMinutesForServiceType(schedule, serviceType) * 60_000;
    const nowMs = Math.max(Date.now(), earliestSchedulable.getTime());
    const rangeEndMs = range.end.getTime();
    const alignedStart = Math.floor(range.start.getTime() / alignmentIntervalMs) * alignmentIntervalMs;
    const slotServiceType = getSlotServiceType(schedule, serviceType);

    const generated: Slot[] = [];
    for (let t = alignedStart; t < rangeEndMs; t += alignmentIntervalMs) {
      const slotEnd = t + durationMs;
      if (slotEnd <= nowMs) continue;
      if (!isSlotWithinAvailability(t, availability)) continue;
      // Block only slots whose start time falls within a booked appointment's actual
      // duration (apt.start to apt.start+durationMs). Using apt.end directly would
      // incorrectly hide slots when appointments were stored with buffer time baked in.
      const overlapsApt = appointments.some((apt) => {
        if (!apt.start) return false;
        const aptStart = new Date(apt.start).getTime();
        // Treat the appointment as occupying exactly one slot-duration block
        const aptEnd = aptStart + durationMs;
        return t < aptEnd && slotEnd > aptStart;
      });
      if (overlapsApt) continue;
      const overlapsBlock = (blockedSlots ?? []).some((blocked) => {
        const blockStart = new Date(blocked.start).getTime();
        const blockEnd = new Date(blocked.end).getTime();
        return t < blockEnd && slotEnd > blockStart;
      });
      if (overlapsBlock) continue;
      const slot: Slot = {
        resourceType: 'Slot',
        start: new Date(t).toISOString(),
        end: new Date(slotEnd).toISOString(),
        status: 'free',
        schedule: { reference: `Schedule/${schedule.id}` },
        serviceType: [slotServiceType],
      };
      SchedulingTransientIdentifier.set(slot);
      generated.push(slot);
    }
    return generated;
  }, [schedule, serviceType, range, appointments, blockedSlots, earliestSchedulable]);

  const handleDismiss = useCallback(() => {
    setServiceType(undefined);
  }, []);

  const handleBookSuccess = useCallback(
    (results: { appointments: Appointment[]; slots: Slot[] }) => {
      setServiceType(undefined);
      setChosenSlot(undefined);
      onSuccess(results);
    },
    [onSuccess]
  );

  return {
    serviceTypes,
    serviceType,
    setServiceType,
    displaySlots,
    chosenSlot,
    setChosenSlot,
    handleDismiss,
    handleBookSuccess,
  };
}
