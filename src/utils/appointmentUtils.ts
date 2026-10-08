import { getReferenceString, MedplumClient } from '@medplum/core';
import { Appointment, CodeableConcept, Encounter, Task } from '@medplum/fhirtypes';
import { serviceTypesFromSchedulingParameters } from './scheduling';

export const getPlanDefinitionNameFromEncounter = async (
  medplum: MedplumClient,
  reference: Encounter
): Promise<string | undefined> => {
  async function fetchTasks(): Promise<Task[]> {
    const tasks = await medplum.searchResources('Task', `encounter=${getReferenceString(reference)}`, {
      cache: 'no-cache',
    });
    return tasks;
  }

  const tasks = await fetchTasks().catch((err) => console.log(err));
  const planDefinitionName = tasks?.[0]?.basedOn?.[0]?.display ?? 'Unknown Plan Definition';

  return planDefinitionName;
};

// Resolve service type: appointment.serviceType[0] → encounter.serviceType → schedule SchedulingParameters
export const getServiceTypeForAppointment = async (
  medplum: MedplumClient,
  appointment: Appointment,
  encounterServiceType: CodeableConcept | undefined
): Promise<CodeableConcept | undefined> => {
  const fromAppointment = appointment?.serviceType?.[0];
  const fromEncounter = encounterServiceType;

  if (fromAppointment ?? fromEncounter) {
    return fromAppointment ?? fromEncounter;
  }

  // Fall back: fetch the current practitioner's schedule and read service types from it
  const practitionerRef = appointment?.participant?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))?.actor
    ?.reference;

  if (!practitionerRef) return undefined;

  const practitionerId = practitionerRef.split('/')[1];

  const schedule = await medplum
    .searchOne('Schedule', { actor: `Practitioner/${practitionerId}` })
    .catch(() => undefined);

  if (schedule) {
    const types = serviceTypesFromSchedulingParameters(schedule);
    return types[0];
  }

  return undefined;
};
