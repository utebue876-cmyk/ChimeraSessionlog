import type { WithId } from '@medplum/core';
import { getReferenceString, isDefined } from '@medplum/core';
import type { Appointment, CodeableConcept, Encounter, Practitioner, Schedule, Slot } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import dayjs from 'dayjs';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { PractitionerSchedule } from '../../components/calendar/CalendarSchedule';
import type { Range } from '../../types/scheduling';
import { showErrorNotification } from '../../utils/notifications';
import {
  SchedulingTransientIdentifier,
  getAlignmentIntervalMinutesForServiceType,
  getDurationMinutesForServiceType,
  getScheduleAvailabilityForServiceType,
  getSlotServiceType,
  isSlotWithinAvailability,
  serviceTypesFromSchedulingParameters,
} from '../../utils/scheduling';

export interface ServiceTypeOption {
  key: string;
  label: string;
  codeableConcept: CodeableConcept;
}

export interface UseServiceSchedulePageReturn {
  serviceTypeOptions: ServiceTypeOption[];
  selectedServiceTypeKey: string | null;
  setSelectedServiceTypeKey: (key: string | null) => void;
  practitioners: WithId<Practitioner>[];
  practitionersLoading: boolean;
  selectedPractitioner: WithId<Practitioner> | undefined;
  selectedSchedule: WithId<Schedule> | undefined;
  selectPractitioner: (practitioner: WithId<Practitioner>) => void;
  clearPractitioner: () => void;
  slotsLoading: boolean;
  slots: Slot[];
  appointments: Appointment[];
  slotPropGetter: (date: Date) => { style?: React.CSSProperties };
  handleRangeChange: (range: Range) => void;
  startLoading: () => void;
  bookingSlot: Slot | undefined;
  bookingDrawerOpen: boolean;
  setBookingDrawerOpen: (open: boolean) => void;
  handleSelectSlot: (slot: Slot) => void;
  handleBookSuccess: (results: { appointments: Appointment[]; slots: Slot[] }) => void;
  appointmentDetails: Appointment | undefined;
  appointmentDetailsOpen: boolean;
  setAppointmentDetailsOpen: (open: boolean) => void;
  selectedAppointment: Appointment | undefined;
  selectedAppointmentEncounter: Encounter | undefined;
  appointmentInfoOpen: boolean;
  setAppointmentInfoOpen: (open: boolean) => void;
  canShowSelectedAppointment: boolean;
  handleSelectAppointment: (appointment: Appointment) => void;
  handleShowAppointment: () => Promise<void>;
  handleAppointmentUpdate: (updated: Appointment) => void;
  handleDeleteAppointment: (deleted: Appointment) => void;
  dayScheduleMode: boolean;
  dayScheduleDate: Date;
  handleDaySchedule: () => void;
  exitDaySchedule: () => void;
  handleDayScheduleDate: (date: Date) => void;
  practitionerSchedules: PractitionerSchedule[];
  allPractitionersMode: boolean;
  handleAllPractitioners: () => void;
  dayScheduleLoading: boolean;
}

export function useServiceSchedulePage(): UseServiceSchedulePageReturn {
  const medplum = useMedplum();
  const navigate = useNavigate();

  // ---- State declarations ----
  const [allSchedules, setAllSchedules] = useState<WithId<Schedule>[]>([]);
  const [selectedServiceTypeKey, setSelectedServiceTypeKeyState] = useState<string | null>(null);
  const [practitioners, setPractitioners] = useState<WithId<Practitioner>[] | undefined>(undefined);
  const [practitionerScheduleMap, setPractitionerScheduleMap] = useState<Map<string, WithId<Schedule>>>(new Map());
  const [selectedPractitioner, setSelectedPractitioner] = useState<WithId<Practitioner> | undefined>();
  const [selectedSchedule, setSelectedSchedule] = useState<WithId<Schedule> | undefined>();
  const [range, setRange] = useState<Range | undefined>();
  const [appointments, setAppointments] = useState<Appointment[] | undefined>();
  const [blockedSlots, setBlockedSlots] = useState<Slot[] | undefined>();
  const [bookingSlot, setBookingSlot] = useState<Slot | undefined>();
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<Appointment | undefined>();
  const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();
  const [selectedAppointmentEncounter, setSelectedAppointmentEncounter] = useState<Encounter | undefined>();
  const [selectedAppointmentPatientRef, setSelectedAppointmentPatientRef] = useState<string | undefined>(undefined);
  const [selectedAppointmentEncounterId, setSelectedAppointmentEncounterId] = useState<string | undefined>(undefined);
  const [appointmentInfoOpen, setAppointmentInfoOpen] = useState(false);
  const [dayScheduleMode, setDayScheduleMode] = useState(false);
  const [dayScheduleDate, setDayScheduleDate] = useState<Date>(() => new Date());
  const [dayScheduleAppointments, setDayScheduleAppointments] = useState<Map<string, Appointment[]> | undefined>(
    undefined
  );
  const [dayScheduleBlockedSlots, setDayScheduleBlockedSlots] = useState<Map<string, Slot[]> | undefined>(undefined);
  const [allPractitionersMode, setAllPractitionersMode] = useState(false);

  useEffect(() => {
    medplum
      .searchResources('Schedule', [
        ['_count', '200'],
        ['active', 'true'],
      ])
      .then((results) => setAllSchedules(results as WithId<Schedule>[]))
      .catch(showErrorNotification);
  }, [medplum]);

  // ---- Aggregate unique service types across all schedules (de-duplicate by code only) ----
  const serviceTypeOptions = useMemo<ServiceTypeOption[]>(() => {
    const map = new Map<string, { label: string; codeableConcept: CodeableConcept }>();
    for (const schedule of allSchedules) {
      const types = [...serviceTypesFromSchedulingParameters(schedule), ...(schedule.serviceType ?? [])];
      for (const st of types) {
        const key =
          st.coding
            ?.map((c) => c.code ?? '')
            .filter(Boolean)
            .sort()
            .join(',') ??
          st.text ??
          '';
        if (!key) continue;
        const label = st.coding?.find((c) => c.display)?.display ?? st.text;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, { label: label ?? key, codeableConcept: st });
        } else if (label && existing.label === key) {
          // Upgrade the label if we previously only had the bare code...
          map.set(key, { label, codeableConcept: existing.codeableConcept });
        }
      }
    }
    return [...map.entries()]
      .map(([key, { label, codeableConcept }]) => ({ key, label, codeableConcept }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allSchedules]);

  const setSelectedServiceTypeKey = useCallback((key: string | null) => {
    setSelectedServiceTypeKeyState(key);
    setPractitioners(key ? undefined : []);
    setPractitionerScheduleMap(new Map());
    setSelectedPractitioner(undefined);
    setSelectedSchedule(undefined);
    setAppointments(undefined);
    setBlockedSlots(undefined);
    setDayScheduleMode(false);
    setAllPractitionersMode(false);
    setDayScheduleBlockedSlots(undefined);
  }, []);

  const selectedServiceType = useMemo(
    () => serviceTypeOptions.find((o) => o.key === selectedServiceTypeKey)?.codeableConcept,
    [serviceTypeOptions, selectedServiceTypeKey]
  );

  // ---- Load practitioners when service type key changes ----
  useEffect(() => {
    if (!selectedServiceType) return;

    const matchingSchedules = allSchedules.filter((schedule) => {
      const types = [...serviceTypesFromSchedulingParameters(schedule), ...(schedule.serviceType ?? [])];
      return types.some((st) =>
        st.coding?.some((ac) => ac.code && selectedServiceType.coding?.some((bc) => bc.code === ac.code))
      );
    });

    const refToSchedule = new Map<string, WithId<Schedule>>();
    for (const schedule of matchingSchedules) {
      for (const actor of schedule.actor ?? []) {
        if (actor.reference?.startsWith('Practitioner/')) {
          refToSchedule.set(actor.reference, schedule);
        }
      }
    }

    const ids = [...refToSchedule.keys()].map((ref) => ref.split('/')[1]).filter(isDefined);
    Promise.all(ids.map((id) => medplum.readResource('Practitioner', id)))
      .then((results) => {
        setPractitioners(results as WithId<Practitioner>[]);
        setPractitionerScheduleMap(refToSchedule);
      })
      .catch(showErrorNotification);
  }, [selectedServiceType, allSchedules, medplum]);

  // ---- Selecting a practitioner resolves their schedule ----
  const selectPractitioner = useCallback(
    (practitioner: WithId<Practitioner>) => {
      const ref = getReferenceString(practitioner);
      const schedule = practitionerScheduleMap.get(ref);
      setSelectedPractitioner(practitioner);
      setSelectedSchedule(schedule);
      setAppointments(undefined);
      setBlockedSlots(undefined);
      setDayScheduleMode(false);
      setAllPractitionersMode(false);
    },
    [practitionerScheduleMap]
  );

  const clearPractitioner = useCallback(() => {
    setSelectedPractitioner(undefined);
    setSelectedSchedule(undefined);
    setAppointments(undefined);
    setBlockedSlots(undefined);
  }, []);

  const handleDaySchedule = useCallback(() => {
    setDayScheduleAppointments(undefined);
    setDayScheduleBlockedSlots(undefined);
    setDayScheduleDate(new Date());
    setDayScheduleMode(true);
  }, []);

  const exitDaySchedule = useCallback(() => {
    setDayScheduleMode(false);
    setAllPractitionersMode(false);
  }, []);

  const handleDayScheduleDate = useCallback((date: Date) => {
    setDayScheduleAppointments(undefined);
    setDayScheduleBlockedSlots(undefined);
    setDayScheduleDate(date);
  }, []);

  const handleAllPractitioners = useCallback(() => {
    setDayScheduleAppointments(undefined);
    setDayScheduleBlockedSlots(undefined);
    setDayScheduleDate(new Date());
    setDayScheduleMode(true);
    setAllPractitionersMode(true);
    setSelectedPractitioner(undefined);
    setSelectedSchedule(undefined);
    setAppointments(undefined);
  }, []);

  const startLoading = useCallback(() => {
    if (selectedSchedule?.id && selectedServiceType) {
      setAppointments(undefined);
      setBlockedSlots(undefined);
    }
  }, [selectedSchedule?.id, selectedServiceType]);

  // ---- Load appointments for the selected schedule + visible calendar range ----
  useEffect(() => {
    const actorRef = selectedSchedule?.actor?.[0]?.reference;
    if (!actorRef || !range || !selectedServiceType) {
      setAppointments(undefined);
      return () => {};
    }
    let active = true;
    const loadStart = Date.now();
    setAppointments(undefined);
    medplum
      .searchResources('Appointment', [
        ['_count', '1000'],
        ['actor', actorRef],
        ['date', `ge${range.start.toISOString()}`],
        ['date', `le${range.end.toISOString()}`],
      ])
      .then((results) => {
        if (!active) return;
        // Ensure the loader is visible for at least 300ms so it never flashes
        // invisible on cache hits.
        const elapsed = Date.now() - loadStart;
        const delay = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          if (active) setAppointments(results);
        }, delay);
      })
      .catch((err: unknown) => {
        if (active) {
          setAppointments([]);
          showErrorNotification(err);
        }
      });
    return () => {
      active = false;
    };
  }, [medplum, selectedSchedule, selectedServiceType, range]);

  // ---- Load blocked slots for the selected schedule + visible calendar range ----
  useEffect(() => {
    const scheduleRef = selectedSchedule ? getReferenceString(selectedSchedule) : undefined;
    if (!scheduleRef || !range) {
      setBlockedSlots(undefined);
      return () => {};
    }
    let active = true;
    setBlockedSlots(undefined);
    medplum
      .searchResources('Slot', [
        ['_count', '1000'],
        ['schedule', scheduleRef],
        ['start', `le${range.end.toISOString()}`],
        ['status', 'busy-unavailable'],
      ])
      .then((results) => {
        if (!active) return;
        const rangeStartMs = range.start.getTime();
        const rangeEndMs = range.end.getTime();
        const visibleBlockedSlots = results.filter((slot) => {
          if (!slot.start || !slot.end) return false;
          const blockStart = new Date(slot.start).getTime();
          const blockEnd = new Date(slot.end).getTime();
          return blockStart < rangeEndMs && blockEnd > rangeStartMs;
        });
        setBlockedSlots(visibleBlockedSlots);
      })
      .catch((err: unknown) => {
        if (active) {
          setBlockedSlots([]);
          showErrorNotification(err);
        }
      });
    return () => {
      active = false;
    };
  }, [medplum, selectedSchedule, range]);

  // ---- Fetch per-practitioner appointments for day schedule view ----
  useEffect(() => {
    if (!dayScheduleMode || !practitioners?.length) return () => {};
    let active = true;
    const loadStart = Date.now();
    setDayScheduleAppointments(undefined);
    const dayStart = dayjs(dayScheduleDate).startOf('day').toISOString();
    const dayEnd = dayjs(dayScheduleDate).endOf('day').toISOString();
    Promise.all(
      practitioners.map(async (p) => {
        const apts = await medplum.searchResources('Appointment', [
          ['_count', '100'],
          ['actor', getReferenceString(p)],
          ['date', `ge${dayStart}`],
          ['date', `le${dayEnd}`],
        ]);
        return [p.id!, apts] as [string, Appointment[]];
      })
    )
      .then((results) => {
        if (!active) return;
        // Ensure the loader is visible for at least 300ms so it never flashes
        // invisible on cache hits.
        const elapsed = Date.now() - loadStart;
        const delay = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          if (active) setDayScheduleAppointments(new Map(results));
        }, delay);
      })
      .catch((err: unknown) => {
        if (active) {
          setDayScheduleAppointments(new Map());
          showErrorNotification(err);
        }
      });
    return () => {
      active = false;
    };
  }, [dayScheduleMode, dayScheduleDate, practitioners, medplum]);

  // ---- Fetch per-practitioner blocked slots for day schedule view ----
  useEffect(() => {
    if (!dayScheduleMode || !practitioners?.length) return () => {};
    let active = true;
    setDayScheduleBlockedSlots(undefined);
    const dayStart = dayjs(dayScheduleDate).startOf('day').toISOString();
    const dayEnd = dayjs(dayScheduleDate).endOf('day').toISOString();
    Promise.all(
      practitioners.map(async (p) => {
        const schedule = practitionerScheduleMap.get(getReferenceString(p));
        const scheduleRef = schedule ? getReferenceString(schedule) : undefined;
        if (!scheduleRef) {
          return [p.id!, []] as [string, Slot[]];
        }
        const slots = await medplum.searchResources('Slot', [
          ['_count', '1000'],
          ['schedule', scheduleRef],
          ['start', `le${dayEnd}`],
          ['status', 'busy-unavailable'],
        ]);
        const dayStartMs = new Date(dayStart).getTime();
        const dayEndMs = new Date(dayEnd).getTime();
        const visibleBlockedSlots = slots.filter((slot) => {
          if (!slot.start || !slot.end) return false;
          const blockStart = new Date(slot.start).getTime();
          const blockEnd = new Date(slot.end).getTime();
          return blockStart < dayEndMs && blockEnd > dayStartMs;
        });
        return [p.id!, visibleBlockedSlots] as [string, Slot[]];
      })
    )
      .then((results) => {
        if (active) setDayScheduleBlockedSlots(new Map(results));
      })
      .catch((err: unknown) => {
        if (active) {
          setDayScheduleBlockedSlots(new Map());
          showErrorNotification(err);
        }
      });
    return () => {
      active = false;
    };
  }, [dayScheduleMode, dayScheduleDate, practitioners, practitionerScheduleMap, medplum]);

  // ---- Booking handlers ----
  const handleSelectSlot = useCallback((slot: Slot) => {
    if (slot.status === 'free') {
      setBookingSlot(slot);
      setBookingDrawerOpen(true);
    }
  }, []);

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

        const selectedEncounter = encounters[0];
        const patient = selectedEncounter?.subject;
        setSelectedAppointmentEncounter(selectedEncounter);
        setSelectedAppointmentPatientRef(patient?.reference);
        setSelectedAppointmentEncounterId(selectedEncounter?.id);
        setAppointmentInfoOpen(true);
      } catch (error) {
        showErrorNotification(error);
      }
    },
    [medplum]
  );

  const handleShowAppointment = useCallback(async (): Promise<void> => {
    if (!selectedAppointmentPatientRef || !selectedAppointmentEncounterId) {
      return;
    }
    await navigate(`/${selectedAppointmentPatientRef}/Encounter/${selectedAppointmentEncounterId}`);
    setAppointmentInfoOpen(false);
  }, [navigate, selectedAppointmentEncounterId, selectedAppointmentPatientRef]);

  const handleBookSuccess = useCallback((results: { appointments: Appointment[]; slots: Slot[] }) => {
    // Adding the new appointment to state causes displaySlots to recompute,
    // automatically removing the slot that was just booked.
    setAppointments((state) => results.appointments.concat(state ?? []));
    setBookingDrawerOpen(false);
    setBookingSlot(undefined);
    setAppointmentDetails(results.appointments[0]);
    setAppointmentDetailsOpen(true);
  }, []);

  const handleAppointmentUpdate = useCallback((updated: Appointment) => {
    setAppointments((state) => (state ?? []).map((a) => (a.id === updated.id ? updated : a)));
    setAppointmentDetails((existing) => (existing?.id === updated.id ? updated : existing));
  }, []);

  const handleDeleteAppointment = useCallback((deleted: Appointment) => {
    setAppointments((state) => (state ?? []).filter((a) => a.id !== deleted.id));
    setAppointmentInfoOpen(false);
  }, []);

  // ---- Generate per-practitioner slot grids for day schedule view ----
  const practitionerSchedules = useMemo<PractitionerSchedule[]>(() => {
    if (!dayScheduleMode || !selectedServiceType) return [];
    const dayStart = dayjs(dayScheduleDate).startOf('day').toDate();
    const dayEnd = dayjs(dayScheduleDate).endOf('day').toDate();
    return (practitioners ?? []).map((practitioner) => {
      const ref = getReferenceString(practitioner);
      const schedule = practitionerScheduleMap.get(ref);
      const aptList = dayScheduleAppointments?.get(practitioner.id!) ?? [];
      const blockedList = dayScheduleBlockedSlots?.get(practitioner.id!) ?? [];
      if (!schedule) return { practitioner, appointments: aptList, slots: blockedList, availability: null };
      const availability = getScheduleAvailabilityForServiceType(schedule, selectedServiceType);
      if (availability.windows.length === 0)
        return { practitioner, appointments: aptList, slots: blockedList, availability: null };
      const durationMs = (getDurationMinutesForServiceType(schedule, selectedServiceType) ?? 30) * 60_000;
      const alignmentIntervalMs = getAlignmentIntervalMinutesForServiceType(schedule, selectedServiceType) * 60_000;
      const nowMs = Date.now();
      const alignedStart = Math.floor(dayStart.getTime() / alignmentIntervalMs) * alignmentIntervalMs;
      const slotServiceType = getSlotServiceType(schedule, selectedServiceType);
      const slots: Slot[] = [];
      for (let t = alignedStart; t < dayEnd.getTime(); t += alignmentIntervalMs) {
        const slotEnd = t + durationMs;
        if (slotEnd <= nowMs) continue;
        if (!isSlotWithinAvailability(t, availability)) continue;
        const overlapsApt = aptList.some((apt) => {
          if (!apt.start) return false;
          const aptStart = new Date(apt.start).getTime();
          const aptEnd = apt.end ? new Date(apt.end).getTime() : aptStart + durationMs;
          return t < aptEnd && slotEnd > aptStart;
        });
        if (overlapsApt) continue;
        const overlapsBlock = blockedList.some((blocked) => {
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
        slots.push(slot);
      }
      return { practitioner, appointments: aptList, slots: [...slots, ...blockedList], availability };
    });
  }, [
    dayScheduleMode,
    dayScheduleDate,
    practitioners,
    practitionerScheduleMap,
    selectedServiceType,
    dayScheduleAppointments,
    dayScheduleBlockedSlots,
  ]);

  // Generate the slot grid directly from the schedule's working hours + slot duration.
  // Each 30-min (or configured) slot within working hours is free unless an appointment
  // is booked at that time. Buffer zones are completely ignored.
  const displaySlots = useMemo<Slot[]>(() => {
    if (
      !selectedSchedule?.id ||
      !selectedServiceType ||
      !range ||
      appointments === undefined ||
      blockedSlots === undefined
    )
      return [];

    const availability = getScheduleAvailabilityForServiceType(selectedSchedule, selectedServiceType);
    if (availability.windows.length === 0) return [];

    const durationMs = (getDurationMinutesForServiceType(selectedSchedule, selectedServiceType) ?? 30) * 60_000;
    const alignmentIntervalMs =
      getAlignmentIntervalMinutesForServiceType(selectedSchedule, selectedServiceType) * 60_000;
    const nowMs = Date.now();
    const rangeEndMs = range.end.getTime();
    // Align start to the nearest alignment-interval boundary at or before range.start
    const alignedStart = Math.floor(range.start.getTime() / alignmentIntervalMs) * alignmentIntervalMs;

    // Resolve the serviceType entry from the Schedule so it carries the
    // service-type-reference extension that $book needs to find the HealthcareService.
    const slotServiceType = getSlotServiceType(selectedSchedule, selectedServiceType);

    const generated: Slot[] = [];
    for (let t = alignedStart; t < rangeEndMs; t += alignmentIntervalMs) {
      const slotEnd = t + durationMs;
      if (slotEnd <= nowMs) continue;
      if (!isSlotWithinAvailability(t, availability)) continue;
      const overlapsApt = appointments.some((apt) => {
        if (!apt.start) return false;
        const aptStart = new Date(apt.start).getTime();
        const aptEnd = apt.end ? new Date(apt.end).getTime() : aptStart + durationMs;
        return t < aptEnd && slotEnd > aptStart;
      });
      if (overlapsApt) continue;
      const overlapsBlock = blockedSlots.some((blocked) => {
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
        schedule: { reference: `Schedule/${selectedSchedule.id}` },
        serviceType: [slotServiceType],
      };
      SchedulingTransientIdentifier.set(slot);
      generated.push(slot);
    }
    return [...generated, ...blockedSlots];
  }, [selectedSchedule, selectedServiceType, range, appointments, blockedSlots]);

  const slotsLoading =
    (appointments === undefined || blockedSlots === undefined) &&
    !!selectedSchedule?.id &&
    !!selectedServiceType &&
    !!range;
  const practitionersLoading = practitioners === undefined && !!selectedServiceTypeKey;
  const dayScheduleLoading =
    dayScheduleMode &&
    !!practitioners?.length &&
    (dayScheduleAppointments === undefined || dayScheduleBlockedSlots === undefined);

  const freeSlotRanges = useMemo(
    () =>
      displaySlots
        .filter((slot) => slot.status === 'free')
        .map((slot) => ({ start: new Date(slot.start).getTime(), end: new Date(slot.end).getTime() })),
    [displaySlots]
  );

  const _availability = useMemo(
    () =>
      selectedSchedule && selectedServiceType
        ? getScheduleAvailabilityForServiceType(selectedSchedule, selectedServiceType)
        : null,
    [selectedSchedule, selectedServiceType]
  );

  const slotPropGetter = useCallback(
    (date: Date): { style?: React.CSSProperties } => {
      const dateMs = date.getTime();
      if (dateMs < Date.now()) return {};

      const isFreeCell = freeSlotRanges.some((slot) => dateMs >= slot.start && dateMs < slot.end);
      if (isFreeCell) {
        return { style: { cursor: 'pointer' } };
      }

      return { style: { backgroundColor: 'var(--mantine-color-gray-0)', cursor: 'default' } };
    },
    [freeSlotRanges]
  );

  return {
    serviceTypeOptions,
    selectedServiceTypeKey,
    setSelectedServiceTypeKey,
    practitioners: practitioners ?? [],
    practitionersLoading,
    selectedPractitioner,
    selectedSchedule,
    selectPractitioner,
    clearPractitioner,
    slotsLoading,
    slots: displaySlots,
    appointments: appointments ?? [],
    slotPropGetter,
    handleRangeChange: setRange,
    startLoading,
    bookingSlot,
    bookingDrawerOpen,
    setBookingDrawerOpen,
    handleSelectSlot,
    handleSelectAppointment,
    handleShowAppointment,
    handleBookSuccess,
    appointmentDetails,
    appointmentDetailsOpen,
    setAppointmentDetailsOpen,
    selectedAppointment,
    selectedAppointmentEncounter,
    appointmentInfoOpen,
    setAppointmentInfoOpen,
    canShowSelectedAppointment: Boolean(selectedAppointmentPatientRef && selectedAppointmentEncounterId),
    handleAppointmentUpdate,
    handleDeleteAppointment,
    dayScheduleMode,
    dayScheduleDate,
    handleDaySchedule,
    exitDaySchedule,
    handleDayScheduleDate,
    practitionerSchedules,
    allPractitionersMode,
    handleAllPractitioners,
    dayScheduleLoading,
  };
}
