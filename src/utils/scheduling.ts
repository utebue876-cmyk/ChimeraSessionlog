import type { MedplumClient } from '@medplum/core';
import {
  createReference,
  getExtension,
  getExtensionValue,
  getIdentifier,
  isDefined,
  setIdentifier,
} from '@medplum/core';
import type { CodeableConcept, HealthcareService, Identifier, Resource, Schedule } from '@medplum/fhirtypes';
import { v4 as uuidv4 } from 'uuid';

const SchedulingParametersURI = 'https://medplum.com/fhir/StructureDefinition/SchedulingParameters';
const MedplumSchedulingTransientIdentifierURI = 'https://medplum.com/fhir/scheduling-transient-id';

export const SchedulingTransientIdentifier = {
  set(resource: Resource & { identifier?: Identifier[] }) {
    setIdentifier(resource, MedplumSchedulingTransientIdentifierURI, uuidv4(), { use: 'temp' });
  },

  get(resource: Resource) {
    return getIdentifier(resource, MedplumSchedulingTransientIdentifierURI);
  },

  remove(resource: Resource & { identifier?: Identifier[] }) {
    resource.identifier = resource.identifier?.filter(
      (identifier) => identifier.system !== MedplumSchedulingTransientIdentifierURI
    );
  },
};

export function serviceTypesFromSchedulingParameters(schedule: Schedule): CodeableConcept[] {
  const extensions = schedule?.extension?.filter((ext) => ext.url === SchedulingParametersURI) ?? [];
  const serviceTypes = extensions.map((ext) => getExtensionValue(ext, 'serviceType') as CodeableConcept | undefined);
  return serviceTypes.filter(isDefined);
}

// Returns the HealthcareService reference string for the given service type by
// reading the `service-type-reference` extension from Schedule.serviceType[] first,
// then falling back to the `service` sub-extension in SchedulingParameters.
// Returns undefined if the Schedule has not yet been migrated.
export function getServiceTypeReference(schedule: Schedule, serviceType: CodeableConcept): string | undefined {
  const ServiceTypeReferenceURI = 'https://medplum.com/fhir/service-type-reference';

  const codingMatches = (a: CodeableConcept, b: CodeableConcept): boolean =>
    !!a.coding?.some((ac) => b.coding?.some((bc) => bc.code === ac.code && (bc.system ?? '') === (ac.system ?? '')));

  // Primary: Schedule.serviceType[].extension[service-type-reference]
  const matchingSt = schedule.serviceType?.find((st) => codingMatches(st, serviceType));
  if (matchingSt) {
    const ref = matchingSt.extension?.find((e) => e.url === ServiceTypeReferenceURI)?.valueReference;
    if (ref?.reference) return ref.reference;
  }

  // Fallback: SchedulingParameters.service sub-extension
  const extensions = schedule?.extension?.filter((ext) => ext.url === SchedulingParametersURI) ?? [];
  for (const ext of extensions) {
    const st = getExtensionValue(ext, 'serviceType') as CodeableConcept | undefined;
    if (st && codingMatches(st, serviceType)) {
      const serviceRef = getExtensionValue(ext, 'service') as { reference?: string } | undefined;
      if (serviceRef?.reference) return serviceRef.reference;
    }
  }
  return undefined;
}

export function hasSchedulingParameters(resource: Schedule | HealthcareService): boolean {
  return !!getExtension(resource, SchedulingParametersURI);
}

// Returns the slot duration in minutes for the given service type, read from
// the matching SchedulingParameters extension. Returns undefined if not found.
export function getDurationMinutesForServiceType(schedule: Schedule, serviceType: CodeableConcept): number | undefined {
  const extensions = schedule?.extension?.filter((ext) => ext.url === SchedulingParametersURI) ?? [];
  for (const ext of extensions) {
    const st = getExtensionValue(ext, 'serviceType') as CodeableConcept | undefined;
    if (!st) continue;
    const matches = serviceType.coding?.some((c) => st.coding?.some((ec) => ec.code === c.code));
    if (matches) {
      return (getExtensionValue(ext, 'duration') as { value?: number } | undefined)?.value;
    }
  }
  return undefined;
}

// Returns the alignmentInterval in minutes for the given service type, read from
// the matching SchedulingParameters extension. Defaults to the slot duration
// (i.e. one slot per duration block) when not explicitly configured.
export function getAlignmentIntervalMinutesForServiceType(
  schedule: Schedule,
  serviceType: CodeableConcept | undefined
): number {
  if (!serviceType) return getDurationMinutesForServiceType(schedule, serviceType as never) ?? 30;
  const codes = new Set(serviceType.coding?.map((c) => c.code).filter(isDefined) ?? []);
  const extensions = schedule?.extension?.filter((ext) => ext.url === SchedulingParametersURI) ?? [];
  for (const ext of extensions) {
    const st = getExtensionValue(ext, 'serviceType') as CodeableConcept | undefined;
    if (st?.coding?.some((c) => c.code && codes.has(c.code))) {
      const raw = getExtensionValue(ext, 'alignmentInterval') as { value?: number; unit?: string } | undefined;
      if (raw?.value) {
        const unit = raw.unit ?? 'min';
        if (unit === 'h') return raw.value * 60;
        if (unit === 'd') return raw.value * 60 * 24;
        return raw.value;
      }
      // Not explicitly set — default to duration so slots appear at every slot-length boundary
      return getDurationMinutesForServiceType(schedule, serviceType) ?? 30;
    }
  }
  return getDurationMinutesForServiceType(schedule, serviceType) ?? 30;
}

// Returns bufferBefore and bufferAfter durations in minutes for a given
// SchedulingParameters entry (identified by its index within the schedule's extensions).
export function getBufferDurationsMinutes(
  schedule: Schedule,
  serviceTypeIndex: number
): { bufferBefore: number; bufferAfter: number } {
  const extensions = schedule?.extension?.filter((ext) => ext.url === SchedulingParametersURI) ?? [];
  const ext = extensions[serviceTypeIndex];
  if (!ext) return { bufferBefore: 0, bufferAfter: 0 };
  const bufferBefore = (getExtensionValue(ext, 'bufferBefore') as { value?: number } | undefined)?.value ?? 0;
  const bufferAfter = (getExtensionValue(ext, 'bufferAfter') as { value?: number } | undefined)?.value ?? 0;
  return { bufferBefore, bufferAfter };
}

// Returns bufferBefore and bufferAfter durations in minutes for a given service type
// by matching against the schedule's SchedulingParameters extensions.
export function getBufferDurationsForServiceType(
  schedule: Schedule,
  serviceType: CodeableConcept | undefined
): { bufferBefore: number; bufferAfter: number } {
  if (!serviceType) return { bufferBefore: 0, bufferAfter: 0 };
  const codes = new Set(serviceType.coding?.map((c) => c.code).filter(isDefined) ?? []);
  const extensions = schedule?.extension?.filter((ext) => ext.url === SchedulingParametersURI) ?? [];
  for (const ext of extensions) {
    const st = getExtensionValue(ext, 'serviceType') as CodeableConcept | undefined;
    if (st?.coding?.some((c) => c.code && codes.has(c.code))) {
      const bufferBefore = (getExtensionValue(ext, 'bufferBefore') as { value?: number } | undefined)?.value ?? 0;
      const bufferAfter = (getExtensionValue(ext, 'bufferAfter') as { value?: number } | undefined)?.value ?? 0;
      return { bufferBefore, bufferAfter };
    }
  }
  return { bufferBefore: 0, bufferAfter: 0 };
}

// Creates busy-unavailable buffer slots before and/or after an appointment
// based on the SchedulingParameters for the given service type index.
export async function createBufferSlots(
  medplum: MedplumClient,
  schedule: Schedule,
  serviceTypeIndex: number,
  start: Date,
  end: Date
): Promise<void> {
  const { bufferBefore, bufferAfter } = getBufferDurationsMinutes(schedule, serviceTypeIndex);
  if (bufferBefore > 0) {
    await medplum.createResource({
      resourceType: 'Slot',
      start: new Date(start.getTime() - bufferBefore * 60000).toISOString(),
      end: start.toISOString(),
      schedule: createReference(schedule),
      status: 'busy-unavailable',
    });
  }
  if (bufferAfter > 0) {
    await medplum.createResource({
      resourceType: 'Slot',
      start: end.toISOString(),
      end: new Date(end.getTime() + bufferAfter * 60000).toISOString(),
      schedule: createReference(schedule),
      status: 'busy-unavailable',
    });
  }
}

// One availability window parsed from a SchedulingParameters extension...
export interface ScheduleAvailabilityWindow {
  days: string[]; // 'mon', 'tue', …
  startMinutes: number; // minutes from midnight (wall-clock in schedule's timezone)
  endMinutes: number;
}

export interface ScheduleAvailability {
  windows: ScheduleAvailabilityWindow[];
  timezone: string;
}

// Parses the availability windows for the given service type from the Schedule's
// SchedulingParameters extensions.  Returns empty windows (= no constraint) when
// the service type cannot be matched.
export function getScheduleAvailabilityForServiceType(
  schedule: Schedule,
  serviceType: CodeableConcept
): ScheduleAvailability {
  const codes = new Set(serviceType.coding?.map((c) => c.code).filter(isDefined) ?? []);

  const paramExt = schedule.extension?.find((ext) => {
    if (ext.url !== SchedulingParametersURI) return false;
    const stConceptExt = ext.extension?.find((e) => e.url === 'serviceType');
    return stConceptExt?.valueCodeableConcept?.coding?.some((c) => c.code && codes.has(c.code)) ?? false;
  });

  if (!paramExt) return { windows: [], timezone: 'UTC' };

  const timezone = paramExt.extension?.find((e) => e.url === 'timezone')?.valueCode ?? 'UTC';
  const windows: ScheduleAvailabilityWindow[] = [];

  for (const availExt of paramExt.extension?.filter((e) => e.url === 'availability') ?? []) {
    for (const atExt of availExt.extension?.filter((e) => e.url === 'availableTime') ?? []) {
      const days = (atExt.extension
        ?.filter((e) => e.url === 'daysOfWeek')
        .map((e) => e.valueCode)
        .filter(isDefined) ?? []) as string[];
      const startTime = atExt.extension?.find((e) => e.url === 'availableStartTime')?.valueTime;
      const endTime = atExt.extension?.find((e) => e.url === 'availableEndTime')?.valueTime;
      if (startTime && endTime && days.length > 0) {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        windows.push({ days, startMinutes: sh * 60 + sm, endMinutes: eh * 60 + em });
      }
    }
  }

  return { windows, timezone };
}

// Aggregates availability windows from ALL SchedulingParameters on the schedule,
// regardless of service type. Used for personal practitioner schedule views where
// no specific service type is selected. A slot is available if it falls within
// any window across any service type.
export function getScheduleAvailability(schedule: Schedule): ScheduleAvailability {
  const schedulingParamExts = schedule.extension?.filter((ext) => ext.url === SchedulingParametersURI) ?? [];
  if (schedulingParamExts.length === 0) return { windows: [], timezone: 'UTC' };

  let timezone = 'UTC';
  const windows: ScheduleAvailabilityWindow[] = [];

  for (const paramExt of schedulingParamExts) {
    timezone = paramExt.extension?.find((e) => e.url === 'timezone')?.valueCode ?? timezone;
    for (const availExt of paramExt.extension?.filter((e) => e.url === 'availability') ?? []) {
      for (const atExt of availExt.extension?.filter((e) => e.url === 'availableTime') ?? []) {
        const days = (atExt.extension
          ?.filter((e) => e.url === 'daysOfWeek')
          .map((e) => e.valueCode)
          .filter(isDefined) ?? []) as string[];
        const startTime = atExt.extension?.find((e) => e.url === 'availableStartTime')?.valueTime;
        const endTime = atExt.extension?.find((e) => e.url === 'availableEndTime')?.valueTime;
        if (startTime && endTime && days.length > 0) {
          const [sh, sm] = startTime.split(':').map(Number);
          const [eh, em] = endTime.split(':').map(Number);
          windows.push({ days, startMinutes: sh * 60 + sm, endMinutes: eh * 60 + em });
        }
      }
    }
  }

  return { windows, timezone };
}

// Returns true if slotStartMs falls within any of the availability windows
// (evaluated in the schedule's own timezone).  Always returns true when no
// windows are defined.
export function isSlotWithinAvailability(slotStartMs: number, availability: ScheduleAvailability): boolean {
  const { windows, timezone } = availability;
  if (windows.length === 0) return true;

  const date = new Date(slotStartMs);

  const dayName = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, weekday: 'long' }).format(date);
  const day = dayName.slice(0, 3).toLowerCase(); // 'monday' → 'mon'

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const minuteOfDay = hour * 60 + minute;

  return windows.some((w) => w.days.includes(day) && minuteOfDay >= w.startMinutes && minuteOfDay < w.endMinutes);
}

// Returns the serviceType CodeableConcept to embed in generated slots.
// $book requires the serviceType to carry the 'service-type-reference' extension so it can
// resolve the HealthcareService. Looks for the entry in Schedule.serviceType[] first (which
// already carries the extension), then falls back to constructing it from SchedulingParameters.
export function getSlotServiceType(schedule: Schedule, serviceType: CodeableConcept): CodeableConcept {
  const ST_REF_URI = 'https://medplum.com/fhir/service-type-reference';
  const codes = new Set(serviceType.coding?.map((c) => c.code).filter(isDefined) ?? []);

  // Path 1: Schedule.serviceType[] already carries the service-type-reference extension
  const scheduleSt = schedule.serviceType?.find((st) => st.coding?.some((c) => c.code && codes.has(c.code)));
  if (scheduleSt) return scheduleSt;

  // Path 2: Construct from SchedulingParameters.service sub-extension
  for (const ext of schedule.extension ?? []) {
    if (ext.url !== SchedulingParametersURI) continue;
    const stConcept = ext.extension?.find((e) => e.url === 'serviceType')?.valueCodeableConcept;
    if (stConcept?.coding?.some((c) => c.code && codes.has(c.code))) {
      const svcRef = ext.extension?.find((e) => e.url === 'service')?.valueReference?.reference;
      if (svcRef) {
        return {
          ...serviceType,
          extension: [{ url: ST_REF_URI, valueReference: { reference: svcRef } }],
        };
      }
    }
  }

  return serviceType;
}
