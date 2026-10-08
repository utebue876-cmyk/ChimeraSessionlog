import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { createReference, EMPTY, getExtension, getReferenceString, isReference, type WithId } from '@medplum/core';
import type {
  Appointment,
  Encounter,
  Practitioner,
  PractitionerRole,
  Reference,
  Schedule,
  Slot,
} from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SlotInfo } from 'react-big-calendar';
import { useNavigate, useParams } from 'react-router';
import { defaultClinicalHours, defaultWorkingWeekHours } from '../../config/constants';
import type { Range } from '../../types/scheduling';
import { showErrorNotification } from '../../utils/notifications';
import type { ScheduleAvailability } from '../../utils/scheduling';
import {
  getScheduleAvailability,
  isSlotWithinAvailability,
  SchedulingTransientIdentifier,
} from '../../utils/scheduling';
import { mergeOverlappingSlots } from '../../utils/slots';

function getPractitionerRoleHours(role: PractitionerRole): { workingWeekHours: number; clinicalHours: number } {
  const workingWeekHours =
    getExtension(role, 'http://fhir.chimera.health/StructureDefinition/practitionerrole-contracted-hours')
      ?.valueQuantity?.value ?? defaultWorkingWeekHours;
  const clinicalHours =
    getExtension(role, 'http://fhir.chimera.health/StructureDefinition/practitionerrole-clinical-hours')?.valueQuantity
      ?.value ?? defaultClinicalHours;
  return { workingWeekHours: Number(workingWeekHours), clinicalHours: Number(clinicalHours) };
}

interface DrawerHandlers {
  open: () => void;
  close: () => void;
}

export type SchedulePageMode = 'book' | 'block';

export interface BlockSelection {
  start: Date;
  end: Date;
  allDay: boolean;
  reason?: string;
}

export interface UseSchedulePageReturn {
  createAppointmentOpened: boolean;
  createAppointmentHandlers: DrawerHandlers;
  appointmentDetailsOpened: boolean;
  appointmentDetailsHandlers: DrawerHandlers;
  appointmentInfoOpened: boolean;
  appointmentInfoHandlers: DrawerHandlers;
  schedule: WithId<Schedule> | undefined;
  range: Range | undefined;
  setRange: (range: Range | undefined) => void;
  slots: Slot[] | undefined;
  appointments: Appointment[] | undefined;
  appointmentSlot: Range | undefined;
  appointmentDetails: Appointment | undefined;
  selectedAppointment: Appointment | undefined;
  selectedAppointmentEncounter: Encounter | undefined;
  canShowSelectedAppointment: boolean;
  practitioner: Reference<Practitioner> | undefined;
  workingWeekHours: number;
  clinicalHours: number;
  availability: ScheduleAvailability | undefined;
  mode: SchedulePageMode;
  setMode: (mode: SchedulePageMode) => void;
  canBlockSelectedSchedule: boolean;
  blockSelection: BlockSelection | undefined;
  setBlockSelection: (selection: BlockSelection | undefined) => void;
  blockError: string | undefined;
  handleConfirmBlock: () => Promise<void>;
  pendingRemoveSlot: Slot | undefined;
  handleConfirmRemove: () => Promise<void>;
  handleCancelRemove: () => void;
  handleSelectInterval: (slot: SlotInfo) => void;
  handleSelectSlot: (slot: Slot) => void;
  handleBookSuccess: (results: { appointments: Appointment[]; slots: Slot[] }) => void;
  handleSelectAppointment: (appointment: Appointment) => Promise<void>;
  handleShowAppointment: () => Promise<void>;
  handleAppointmentUpdate: (updated: Appointment) => void;
  handleDeleteAppointment: (deleted: Appointment) => void;
  handleActorChange: (ref: Reference | undefined) => void;
}

export function useSchedulePage(): UseSchedulePageReturn {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Practitioner;

  const [createAppointmentOpened, createAppointmentHandlers] = useDisclosure(false);
  const [appointmentDetailsOpened, appointmentDetailsHandlers] = useDisclosure(false);
  const [appointmentInfoOpened, appointmentInfoHandlers] = useDisclosure(false);

  const [schedule, setSchedule] = useState<WithId<Schedule> | undefined>();
  const [range, setRange] = useState<Range | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[] | undefined>(undefined);
  const [appointments, setAppointments] = useState<Appointment[] | undefined>(undefined);
  const [appointmentSlot, setAppointmentSlot] = useState<Range>();
  const [appointmentDetails, setAppointmentDetails] = useState<Appointment | undefined>(undefined);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>(undefined);
  const [selectedAppointmentEncounter, setSelectedAppointmentEncounter] = useState<Encounter | undefined>(undefined);
  const [selectedAppointmentPatientRef, setSelectedAppointmentPatientRef] = useState<string | undefined>(undefined);
  const [selectedAppointmentEncounterId, setSelectedAppointmentEncounterId] = useState<string | undefined>(undefined);
  const [workingWeekHours, setWorkingWeekHours] = useState<number>(40);
  const [clinicalHours, setClinicalHours] = useState<number>(25);
  const [mode, _setMode] = useState<SchedulePageMode>('book');
  const [blockSelection, setBlockSelection] = useState<BlockSelection | undefined>(undefined);
  const [blockError, setBlockError] = useState<string | undefined>(undefined);
  const [pendingRemoveSlot, setPendingRemoveSlot] = useState<Slot | undefined>(undefined);

  const isPractitionerProfile = profile?.resourceType === 'Practitioner';
  const profileRef = isPractitionerProfile ? getReferenceString(profile as WithId<Practitioner>) : undefined;

  // If no schedule id is in the URL, load the current user's schedule into local state
  // without changing the route so the sidebar active link remains stable.
  useEffect(() => {
    if (id || !isPractitionerProfile || !profile?.id) {
      return;
    }
    medplum
      .searchOne('Schedule', { actor: getReferenceString(profile as WithId<Practitioner>) })
      .then((foundSchedule) => {
        if (foundSchedule?.id) {
          setSchedule(foundSchedule);
        } else {
          medplum
            .createResource({
              resourceType: 'Schedule',
              actor: [createReference(profile as WithId<Practitioner>)],
              active: true,
            })
            .then((created) => {
              setSchedule(created);
            })
            .catch(showErrorNotification);
        }
      })
      .catch(showErrorNotification);
  }, [id, isPractitionerProfile, profile, medplum]);

  // Load the schedule directly from the URL param
  useEffect(() => {
    if (!id) {
      return;
    }
    setSchedule(undefined);
    medplum.readResource('Schedule', id).then(setSchedule).catch(showErrorNotification);
  }, [id, medplum]);

  // Find slots visible in the current range
  useEffect(() => {
    if (!schedule || !range) {
      return () => {};
    }
    let active = true;

    medplum
      .searchResources('Slot', [
        ['_count', '1000'],
        ['schedule', getReferenceString(schedule)],
        ['start', `ge${range.start.toISOString()}`],
        ['start', `le${range.end.toISOString()}`],
        ['status', 'free,busy-unavailable'],
      ])
      .then((rawSlots) => {
        if (!active) return;
        const merged = mergeOverlappingSlots(rawSlots);
        merged.forEach((slot) => {
          if (slot.status === 'free') {
            SchedulingTransientIdentifier.set(slot);
          }
        });
        setSlots(merged);
      })
      .catch((error: unknown) => active && showErrorNotification(error));

    return () => {
      active = false;
    };
  }, [medplum, schedule, range]);

  // Find appointments visible in the current range
  useEffect(() => {
    const actorRef = schedule?.actor?.[0]?.reference;
    if (!actorRef || !range) {
      return () => {};
    }
    let active = true;

    medplum
      .searchResources('Appointment', [
        ['_count', '1000'],
        ['actor', actorRef],
        ['date', `ge${range.start.toISOString()}`],
        ['date', `le${range.end.toISOString()}`],
      ])
      .then((aptList) => active && setAppointments(aptList))
      .catch((error: unknown) => active && showErrorNotification(error));

    return () => {
      active = false;
    };
  }, [medplum, schedule, range]);

  const practitioner = schedule?.actor?.find((actor) => isReference<Practitioner>(actor, 'Practitioner')) as
    | Reference<Practitioner>
    | undefined;

  useEffect(() => {
    if (!practitioner?.reference) {
      return;
    }

    medplum
      .searchResources('PractitionerRole', {
        practitioner: practitioner.reference,
        active: 'true',
      })
      .then((roles) => {
        const activeRole = roles.find((role) => role.active !== false) ?? roles[0];
        if (!activeRole) {
          return;
        }

        const { workingWeekHours: nextWorkingWeekHours, clinicalHours: nextClinicalHours } =
          getPractitionerRoleHours(activeRole);
        setWorkingWeekHours(nextWorkingWeekHours);
        setClinicalHours(nextClinicalHours);
      })
      .catch(() => undefined);
  }, [medplum, practitioner?.reference]);

  const canBlockSelectedSchedule = useMemo(() => {
    if (!schedule) {
      return false;
    }

    if (!isPractitionerProfile) {
      return true;
    }

    const selectedPractitionerRef = schedule.actor?.find((actor) =>
      actor.reference?.startsWith('Practitioner/')
    )?.reference;
    return !!selectedPractitionerRef && !!profileRef && selectedPractitionerRef === profileRef;
  }, [isPractitionerProfile, profileRef, schedule]);

  const availability = useMemo(() => (schedule ? getScheduleAvailability(schedule) : undefined), [schedule]);

  const displaySlots = useMemo<Slot[] | undefined>(() => {
    if (!slots) {
      return slots;
    }

    // Preserve server-provided free slots when available.
    if (slots.some((slot) => slot.status === 'free')) {
      return slots;
    }

    if (!schedule || !range || !availability?.windows.length) {
      return slots;
    }

    const alignmentIntervalMs = 30 * 60_000;
    const durationMs = 30 * 60_000;
    const nowMs = Date.now();
    const rangeEndMs = range.end.getTime();
    const alignedStart = Math.floor(range.start.getTime() / alignmentIntervalMs) * alignmentIntervalMs;
    const nonFreeSlots = slots.filter((slot) => slot.status !== 'free');

    const generated: Slot[] = [];
    for (let t = alignedStart; t < rangeEndMs; t += alignmentIntervalMs) {
      const slotEnd = t + durationMs;
      if (slotEnd <= nowMs) continue;
      if (!isSlotWithinAvailability(t, availability)) continue;

      const overlapsApt = (appointments ?? []).some((appointment) => {
        if (!appointment.start) {
          return false;
        }
        const aptStart = new Date(appointment.start).getTime();
        const aptEnd = appointment.end ? new Date(appointment.end).getTime() : aptStart + durationMs;
        return t < aptEnd && slotEnd > aptStart;
      });
      if (overlapsApt) continue;

      const overlapsBlocked = nonFreeSlots.some((blocked) => {
        if (blocked.status !== 'busy-unavailable') {
          return false;
        }
        const blockStart = new Date(blocked.start).getTime();
        const blockEnd = new Date(blocked.end).getTime();
        return t < blockEnd && slotEnd > blockStart;
      });
      if (overlapsBlocked) continue;

      const slot: Slot = {
        resourceType: 'Slot',
        start: new Date(t).toISOString(),
        end: new Date(slotEnd).toISOString(),
        status: 'free',
        schedule: createReference(schedule),
      };
      SchedulingTransientIdentifier.set(slot);
      generated.push(slot);
    }

    return [...generated, ...nonFreeSlots];
  }, [appointments, availability, range, schedule, slots]);

  const createBlockedSlot = useCallback(
    async (start: Date, end: Date, comment?: string): Promise<void> => {
      if (!schedule) {
        showErrorNotification('No schedule selected');
        return;
      }

      if (!canBlockSelectedSchedule) {
        showErrorNotification('You can only block your own calendar');
        return;
      }

      if (end <= start) {
        showErrorNotification('Invalid slot range selected');
        return;
      }

      const blockedSlot = await medplum.createResource<Slot>({
        resourceType: 'Slot',
        start: start.toISOString(),
        end: end.toISOString(),
        schedule: createReference(schedule),
        status: 'busy-unavailable',
        comment: comment || 'Other',
      });

      setSlots((state) => mergeOverlappingSlots([...(state ?? []), blockedSlot]));
      showNotification({ title: 'Availability blocked', message: 'Selected time has been blocked' });
    },
    [canBlockSelectedSchedule, medplum, schedule]
  );

  const removeBlockedSlotsInRange = useCallback(
    async (start: Date, end: Date): Promise<void> => {
      if (!schedule) {
        showErrorNotification('No schedule selected');
        return;
      }

      if (!canBlockSelectedSchedule) {
        showErrorNotification('You can only unblock your own calendar');
        return;
      }

      const scheduleReference = getReferenceString(schedule);
      if (!scheduleReference) {
        showErrorNotification('Invalid schedule reference');
        return;
      }

      const blockedSlots = await medplum.searchResources('Slot', [
        ['_count', '1000'],
        ['schedule', scheduleReference],
        ['status', 'busy-unavailable'],
        ['start', `ge${start.toISOString()}`],
        ['start', `le${end.toISOString()}`],
      ]);

      const blockedSlotsToDelete = blockedSlots.filter((slot) => !!slot.id);
      if (blockedSlotsToDelete.length === 0) {
        showNotification({ title: 'No blocked slot found', message: 'There are no blocked slots in this range' });
        return;
      }

      await Promise.allSettled(blockedSlotsToDelete.map((slot) => medplum.deleteResource('Slot', slot.id as string)));

      const deletedIds = new Set(blockedSlotsToDelete.map((slot) => slot.id as string));
      setSlots((state) => (state ?? []).filter((slot) => !slot.id || !deletedIds.has(slot.id)));
      showNotification({ title: 'Block removed', message: 'Selected blocked time has been removed' });
    },
    [canBlockSelectedSchedule, medplum, schedule]
  );

  const setBlockDraft = useCallback((selection: BlockSelection | undefined): void => {
    setBlockError(undefined);
    setBlockSelection(selection);
  }, []);

  const setBlockDraftFromRange = useCallback(
    (start: Date, end: Date, allDay: boolean = false): void => {
      _setMode('block');
      setBlockDraft({ start, end, allDay });
    },
    [setBlockDraft]
  );

  // Exposed setMode: switching to block auto-initialises today's all-day selection.
  const setMode = useCallback(
    (newMode: SchedulePageMode): void => {
      if (newMode === 'block') {
        _setMode('block');
        setBlockDraft({ start: startOfDay(new Date()), end: endOfDay(new Date()), allDay: true });
      } else {
        _setMode(newMode);
      }
    },
    [setBlockDraft]
  );

  const handleSelectInterval = useCallback(
    (slot: SlotInfo) => {
      if (mode === 'block') {
        setBlockDraftFromRange(slot.start as Date, slot.end as Date, false);
        return;
      }

      if (!practitioner) {
        showErrorNotification("Can't create visit without associated Practitioner");
        return;
      }
      createAppointmentHandlers.open();
      setAppointmentSlot(slot);
    },
    [createAppointmentHandlers, mode, practitioner, setBlockDraftFromRange]
  );

  const handleSelectSlot = useCallback(
    (slot: Slot) => {
      if (mode === 'block') {
        if (slot.status === 'busy-unavailable') {
          setPendingRemoveSlot(slot);
          return;
        }
        setBlockDraftFromRange(new Date(slot.start), new Date(slot.end), false);
        return;
      }

      if (!practitioner) {
        showErrorNotification("Can't create visit without associated Practitioner");
        return;
      }
      if (slot.status === 'free') {
        createAppointmentHandlers.open();
        setAppointmentSlot({ start: new Date(slot.start), end: new Date(slot.end) });
      }
    },
    [createAppointmentHandlers, mode, practitioner, setBlockDraftFromRange]
  );

  const handleConfirmRemove = useCallback(async (): Promise<void> => {
    if (!pendingRemoveSlot) return;
    await removeBlockedSlotsInRange(new Date(pendingRemoveSlot.start), new Date(pendingRemoveSlot.end)).catch(
      showErrorNotification
    );
    setPendingRemoveSlot(undefined);
  }, [pendingRemoveSlot, removeBlockedSlotsInRange]);

  const handleCancelRemove = useCallback((): void => {
    setPendingRemoveSlot(undefined);
  }, []);

  const handleConfirmBlock = useCallback(async (): Promise<void> => {
    if (!blockSelection) {
      setBlockError('Select a date or range to block first');
      return;
    }

    const start = blockSelection.allDay ? startOfDay(blockSelection.start) : blockSelection.start;
    const end = blockSelection.allDay ? endOfDay(blockSelection.end) : blockSelection.end;

    if (end <= start) {
      setBlockError('End time must be after start time');
      return;
    }

    const conflictingAppointment = (appointments ?? []).find((appointment) => {
      if (!appointment.start || !appointment.end) {
        return false;
      }

      const appointmentStart = new Date(appointment.start).getTime();
      const appointmentEnd = new Date(appointment.end).getTime();
      return appointmentStart < end.getTime() && appointmentEnd > start.getTime();
    });

    if (conflictingAppointment) {
      const message =
        'This range contains booked appointments. Remove the booking or change the practitioner before trying again.';
      setBlockError(message);
      showErrorNotification(message);
      return;
    }

    await createBlockedSlot(start, end, blockSelection.reason);
    // Reset to today so the pane is immediately ready for the next block.
    setBlockDraft({ start: startOfDay(new Date()), end: endOfDay(new Date()), allDay: true });
  }, [appointments, blockSelection, createBlockedSlot, setBlockDraft]);

  const handleBookSuccess = useCallback(
    (results: { appointments: Appointment[]; slots: Slot[] }) => {
      setAppointments((state) => results.appointments.concat(state ?? EMPTY));
      setAppointmentDetails(results.appointments[0]);
      appointmentDetailsHandlers.open();
      setSlots((state) => results.slots.filter((slot) => slot.status !== 'busy').concat(state ?? EMPTY));
    },
    [appointmentDetailsHandlers]
  );

  const handleSelectAppointment = useCallback(
    async (appointment: Appointment) => {
      setSelectedAppointment(appointment);
      setSelectedAppointmentEncounter(undefined);
      setSelectedAppointmentPatientRef(undefined);
      setSelectedAppointmentEncounterId(undefined);

      const reference = getReferenceString(appointment);
      if (!reference) {
        showErrorNotification("Can't navigate to unsaved appointment");
        return;
      }

      try {
        const encounters = await medplum.searchResources('Encounter', [
          ['appointment', reference],
          ['_count', '1'],
        ]);

        const selectedEncounter = encounters?.[0];
        const patient = selectedEncounter?.subject;
        setSelectedAppointmentEncounter(selectedEncounter);
        setSelectedAppointmentPatientRef(patient?.reference);
        setSelectedAppointmentEncounterId(selectedEncounter?.id);
        appointmentInfoHandlers.open();
      } catch (error) {
        showErrorNotification(error);
      }
    },
    [appointmentInfoHandlers, medplum]
  );

  const handleShowAppointment = useCallback(async (): Promise<void> => {
    if (!selectedAppointmentPatientRef || !selectedAppointmentEncounterId) {
      return;
    }
    await navigate(`/${selectedAppointmentPatientRef}/Encounter/${selectedAppointmentEncounterId}`);
    appointmentInfoHandlers.close();
  }, [appointmentInfoHandlers, navigate, selectedAppointmentEncounterId, selectedAppointmentPatientRef]);

  const handleAppointmentUpdate = useCallback((updated: Appointment) => {
    setAppointments((state) => (state ?? []).map((existing) => (existing.id === updated.id ? updated : existing)));
    setAppointmentDetails((existing) => (existing?.id === updated.id ? updated : existing));
  }, []);

  const handleDeleteAppointment = useCallback((deleted: Appointment) => {
    setAppointments((state) => (state ?? []).filter((a) => a.id !== deleted.id));
    const deletedSlotIds = new Set((deleted.slot ?? []).map((ref) => ref.reference?.split('/')[1]).filter(Boolean));
    if (deletedSlotIds.size > 0) {
      setSlots((state) => (state ?? []).filter((s) => !s.id || !deletedSlotIds.has(s.id)));
    }
  }, []);

  const handleActorChange = useCallback(
    (ref: Reference | undefined) => {
      if (!ref?.reference) {
        setSchedule(undefined);
        setSlots(undefined);
        setAppointments(undefined);
        return;
      }
      medplum
        .searchOne('Schedule', { actor: ref.reference })
        .then((foundSchedule) => {
          if (foundSchedule?.id) {
            setSchedule(foundSchedule);
            setSlots(undefined);
            setAppointments(undefined);
          } else {
            setSchedule(undefined);
            setSlots(undefined);
            setAppointments(undefined);
          }
        })
        .catch(showErrorNotification);
    },
    [medplum]
  );

  return {
    createAppointmentOpened,
    createAppointmentHandlers,
    appointmentDetailsOpened,
    appointmentDetailsHandlers,
    appointmentInfoOpened,
    appointmentInfoHandlers,
    schedule,
    range,
    setRange,
    slots: displaySlots,
    appointments,
    appointmentSlot,
    appointmentDetails,
    selectedAppointment,
    selectedAppointmentEncounter,
    canShowSelectedAppointment: Boolean(selectedAppointmentPatientRef && selectedAppointmentEncounterId),
    practitioner,
    workingWeekHours,
    clinicalHours,
    availability,
    mode,
    setMode,
    canBlockSelectedSchedule,
    blockSelection,
    setBlockSelection: setBlockDraft,
    blockError,
    handleConfirmBlock,
    pendingRemoveSlot,
    handleConfirmRemove,
    handleCancelRemove,
    handleSelectInterval,
    handleSelectSlot,
    handleBookSuccess,
    handleSelectAppointment,
    handleShowAppointment,
    handleAppointmentUpdate,
    handleDeleteAppointment,
    handleActorChange,
  };
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}
