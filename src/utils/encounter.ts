import type { MedplumClient, WithId } from '@medplum/core';
import {
  createReference,
  formatHumanName,
  getExtension,
  getReferenceString,
  HTTP_HL7_ORG,
  isResource,
} from '@medplum/core';
import type {
  Appointment,
  ChargeItem,
  ClinicalImpression,
  Coding,
  Encounter,
  EpisodeOfCare,
  Patient,
  PlanDefinition,
  Practitioner,
  Reference,
  Schedule,
  ServiceRequest,
  Task,
} from '@medplum/fhirtypes';
import { TASK_CODES_CODE_SYSTEM_URL } from '../config/chimera-urls';

export async function createAppointment(
  medplum: MedplumClient,
  start: Date,
  end: Date,
  patient: Patient,
  practitioner?: Practitioner | Reference<Practitioner>,
  schedule?: Schedule,
  episodeOfCare?: EpisodeOfCare
): Promise<WithId<Appointment>> {
  const resolvedPractitioner = practitioner ?? (medplum.getProfile() as Practitioner);
  const practitionerRef = isResource(resolvedPractitioner)
    ? createReference(resolvedPractitioner)
    : resolvedPractitioner;

  const appointment = await medplum.createResource({
    resourceType: 'Appointment',
    status: 'booked',
    start: start.toISOString(),
    end: end.toISOString(),
    participant: [
      {
        actor: createReference(patient),
        status: 'accepted',
      },
      {
        actor: practitionerRef,
        status: 'accepted',
      },
    ],
    ...(episodeOfCare ? { supportingInformation: [createReference(episodeOfCare)] } : {}),
  });

  // If we have a schedule reference, add a busy slot to prevent future
  // scheduling operations (such as $find or $book) from thinking this
  // time is free.
  if (schedule) {
    await medplum.createResource({
      resourceType: 'Slot',
      start: start.toISOString(),
      end: end.toISOString(),
      schedule: createReference(schedule),
      status: 'busy',
    });
  }

  return appointment;
}

export async function botCreateTaskReplacement(
  medplum: MedplumClient,
  appointment: WithId<Appointment>,
  patient: Patient,
  episodeOfCare?: EpisodeOfCare
): Promise<Task> {
  const patientParticipant = appointment.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'));
  const practitionerParticipant = appointment.participant?.find((p) => p.actor?.reference?.startsWith('Practitioner/'));

  const patientName = patient.name?.[0] ? formatHumanName(patient.name[0]) : 'Unknown';
  const appointmentDate = appointment.start
    ? new Date(appointment.start).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  // Resolve practitioner display name for the owner reference
  let practitionerDisplay: string | undefined;
  if (practitionerParticipant?.actor?.reference) {
    const practitionerId = practitionerParticipant.actor.reference.split('/')[1];
    try {
      const practitionerResource = await medplum.readResource('Practitioner', practitionerId);
      practitionerDisplay = practitionerResource.name?.[0] ? formatHumanName(practitionerResource.name[0]) : undefined;
    } catch {
      // leave display undefined if lookup fails
    }
  }

  // Resolve patient display name for the for reference
  let patientDisplay: string | undefined = patient.name?.[0] ? formatHumanName(patient.name[0]) : undefined;
  if (!patientDisplay && patientParticipant?.actor?.reference) {
    const patientId = patientParticipant.actor.reference.split('/')[1];
    try {
      const patientResource = await medplum.readResource('Patient', patientId);
      patientDisplay = patientResource.name?.[0] ? formatHumanName(patientResource.name[0]) : undefined;
    } catch {
      // leave display undefined if lookup fails
    }
  }

  return medplum.createResource<Task>({
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: 'routine',
    code: {
      coding: [
        {
          display: 'New appointment scheduled',
          code: 'appointment',
          system: TASK_CODES_CODE_SYSTEM_URL,
        },
      ],
    },
    description: `New appointment scheduled: ${patientName} on ${appointmentDate}`,
    for: patientParticipant?.actor
      ? { reference: patientParticipant.actor.reference, display: patientDisplay }
      : createReference(patient),
    ...(practitionerParticipant?.actor
      ? {
          owner: { reference: practitionerParticipant.actor.reference, display: practitionerDisplay },
        }
      : {}),
    requester: createReference(medplum.getProfile() as Practitioner),
    ...(episodeOfCare ? { focus: createReference(episodeOfCare) } : {}),
    basedOn: [{ reference: `Appointment/${appointment.id}` }],
    authoredOn: new Date().toISOString(),
    restriction: {
      period: {
        end: appointment.start,
      },
    },
  });
}

export async function createEncounter(
  medplum: MedplumClient,
  classification: Coding,
  patient: Patient,
  planDefinition: PlanDefinition,
  appointment: Appointment,
  practitioner?: Practitioner | Reference<Practitioner>,
  episodeOfCare?: EpisodeOfCare
): Promise<Encounter> {
  const resolvedPractitioner = practitioner ?? (medplum.getProfile() as Practitioner);
  const practitionerRef = isResource(resolvedPractitioner)
    ? createReference(resolvedPractitioner)
    : resolvedPractitioner;

  const encounter: Encounter = await medplum.createResource({
    resourceType: 'Encounter',
    status: 'planned',
    statusHistory: [],
    classHistory: [],
    class: classification,
    subject: createReference(patient),
    appointment: [createReference(appointment)],
    ...(episodeOfCare ? { episodeOfCare: [createReference(episodeOfCare)] } : {}),
    participant: [
      {
        individual: practitionerRef,
      },
    ],
  });

  const clinicalImpressionData: ClinicalImpression = {
    resourceType: 'ClinicalImpression',
    status: 'in-progress',
    description: 'Initial clinical impression',
    subject: createReference(patient),
    encounter: createReference(encounter),
    date: new Date().toISOString(),
  };

  await medplum.createResource(clinicalImpressionData);

  await medplum.post(medplum.fhirUrl('PlanDefinition', planDefinition.id as string, '$apply'), {
    resourceType: 'Parameters',
    parameter: [
      { name: 'subject', valueString: getReferenceString(patient) },
      { name: 'encounter', valueString: getReferenceString(encounter) },
      { name: 'practitioner', valueString: getReferenceString(medplum.getProfile() as Practitioner) },
    ],
  });

  await createChargeItemFromPlanDefinition(medplum, encounter, patient, planDefinition);
  await handleChargeItemsFromTasks(medplum, encounter, patient);

  return encounter;
}

async function createChargeItemFromPlanDefinition(
  medplum: MedplumClient,
  encounter: Encounter,
  patient: Patient,
  planDefinition: PlanDefinition
): Promise<void> {
  const serviceBillingCodeExtension = getExtension(
    planDefinition,
    `${HTTP_HL7_ORG}/fhir/uv/order-catalog/StructureDefinition/ServiceBillingCode`
  );

  const chargeDefinitionExtension = getExtension(
    planDefinition,
    'http://medplum.com/fhir/StructureDefinition/applicable-charge-definition'
  );

  if (!serviceBillingCodeExtension?.valueCodeableConcept || !chargeDefinitionExtension?.valueCanonical) {
    console.log('PlanDefinition missing required extensions for charge item creation');
    return;
  }

  const cptCoding = serviceBillingCodeExtension.valueCodeableConcept.coding?.find(
    (coding) => coding.system === 'http://www.ama-assn.org/go/cpt'
  );

  if (!cptCoding) {
    return;
  }

  const chargeItem: ChargeItem = {
    resourceType: 'ChargeItem',
    status: 'planned',
    subject: createReference(patient),
    context: createReference(encounter),
    occurrenceDateTime: new Date().toISOString(),
    code: serviceBillingCodeExtension.valueCodeableConcept,
    extension: [serviceBillingCodeExtension],
    quantity: {
      value: 1,
    },
    definitionCanonical: [chargeDefinitionExtension.valueCanonical],
  };

  await medplum.createResource(chargeItem);
}

async function handleChargeItemsFromTasks(
  medplum: MedplumClient,
  encounter: Encounter,
  patient: Patient
): Promise<void> {
  const tasks = await medplum.search('Task', {
    encounter: getReferenceString(encounter),
  });

  if (!tasks.entry?.length) {
    return;
  }

  await Promise.all(
    tasks.entry.map(async (entry) => {
      const task = entry.resource as Task;
      const serviceRequestRef = task.focus?.reference;

      if (!serviceRequestRef?.startsWith('ServiceRequest/')) {
        return;
      }

      try {
        const serviceRequest: ServiceRequest = await medplum.readReference({
          reference: serviceRequestRef,
        });
        await createChargeItemFromServiceRequest(medplum, patient, serviceRequest);
      } catch (err) {
        console.error(`Error processing ServiceRequest ${serviceRequestRef}:`, err);
      }
    })
  );
}

async function createChargeItemFromServiceRequest(
  medplum: MedplumClient,
  patient: Patient,
  serviceRequest: ServiceRequest
): Promise<void> {
  const chargeDefinitionExtension = getExtension(
    serviceRequest,
    'http://medplum.com/fhir/StructureDefinition/applicable-charge-definition'
  );

  if (
    !chargeDefinitionExtension?.valueCanonical ||
    !serviceRequest.code?.coding?.find((c) => c.system === 'http://www.ama-assn.org/go/cpt')
  ) {
    return;
  }

  const canonicalUrl = chargeDefinitionExtension?.valueCanonical;
  const definitionCanonical = canonicalUrl ? [canonicalUrl] : [];

  const chargeItem: ChargeItem = {
    resourceType: 'ChargeItem',
    status: 'planned',
    supportingInformation: [
      {
        reference: `ServiceRequest/${serviceRequest.id}`,
      },
    ],
    subject: createReference(patient),
    context: serviceRequest.encounter,
    occurrenceDateTime: serviceRequest.occurrenceDateTime || new Date().toISOString(),
    code: serviceRequest.code || { coding: [] },
    quantity: {
      value: 1,
    },
    definitionCanonical: definitionCanonical,
  };

  await medplum.createResource(chargeItem);
}

export async function updateEncounterStatus(
  medplum: MedplumClient,
  encounter: WithId<Encounter>,
  appointment: WithId<Appointment> | undefined,
  newStatus: Encounter['status']
): Promise<WithId<Encounter>> {
  const updatedEncounter: WithId<Encounter> = {
    ...encounter,
    status: newStatus,
    ...(newStatus === 'in-progress' &&
      !encounter.period?.start && {
        period: {
          ...encounter.period,
          start: new Date().toISOString(),
        },
      }),
    ...(newStatus === 'finished' &&
      !encounter.period?.end && {
        period: {
          ...encounter.period,
          end: new Date().toISOString(),
        },
      }),
  };

  if (appointment) {
    let newAppointmentStatus: Appointment['status'] | undefined;
    switch (newStatus) {
      case 'cancelled':
        newAppointmentStatus = 'cancelled';
        break;
      case 'finished':
        newAppointmentStatus = 'fulfilled';
        break;
      case 'in-progress':
        newAppointmentStatus = 'checked-in';
        break;
      case 'arrived':
        newAppointmentStatus = 'arrived';
        break;
      default:
        break;
    }
    if (newAppointmentStatus) {
      await medplum.patchResource('Appointment', appointment.id, [
        { op: 'replace', path: '/status', value: newAppointmentStatus },
      ]);
    }
  }

  return medplum.updateResource(updatedEncounter);
}
