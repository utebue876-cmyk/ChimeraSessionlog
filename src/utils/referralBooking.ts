// ---------------------------------------------------------------------------
// referralBooking.ts
//
// Generic booking service for all self-referral journeys (Anglian Water, Vitality, Aviva, etc.).
//
// Each referral type:
//   1. Maps its own form values to `ReferralPatient` and `ReferralConsentDetails`
//   2. Builds its own `QuestionnaireResponse` (via a per-referral schema file)
//   3. Calls `bookReferral(medplum, options)` — nothing else needs to know about FHIR internals
//
// This keeps FHIR creation logic in one place so changes (identifiers, episode state
// coding, org lookup) propagate to every referral type automatically.
// ---------------------------------------------------------------------------
import type { MedplumClient, WithId } from '@medplum/core';
import { createReference, formatHumanName } from '@medplum/core';
import type {
  Appointment,
  ClinicalImpression,
  CodeableConcept,
  Encounter,
  EpisodeOfCare,
  Organization,
  Patient,
  PlanDefinition,
  Practitioner,
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  Reference,
  ServiceRequest,
  Task,
} from '@medplum/fhirtypes';
import {
  CASE_STATE_CODE_SYSTEM_URL,
  EOC_CASE_STATE_URL,
  getOrganizationUrlForProject,
  MH_CASE_CONSENT_DATE_URL,
  MH_CASE_CONSENT_SIGNED_URL,
  PATIENT_IDENTIFIER_URL,
} from '../config/chimera-urls';
import { getCurrentOrganisationName } from '../config/projectOrganization';
import { generateCaseNumber } from './caseNumber';
import { mapCaseStateToEpisodeStatus } from './episodeOfCare';
import { generateMedicalRecordNumber } from './numbers';

// ---------------------------------------------------------------------------
// Shared patient demographics — referral-type-agnostic...
// ---------------------------------------------------------------------------
export interface ReferralPatient {
  firstName: string;
  lastName: string;
  dob: string;
  gender: Patient['gender'];
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  town: string;
  county: string;
  postcode: string;
  country?: string;
}

// ---------------------------------------------------------------------------
// Consent flags — each flag name is generic; referral types map their own
// field names to these when calling bookReferral()...
// ---------------------------------------------------------------------------
export interface ReferralConsentDetails {
  dataProcessing: boolean;
  sharePartner?: boolean;
  shareReferrer?: boolean;
}

// ---------------------------------------------------------------------------
// Booking call options...
// ---------------------------------------------------------------------------
export interface ReferralBookingOptions {
  patient: ReferralPatient;
  consent: ReferralConsentDetails;
  questionnaireResponse: QuestionnaireResponse;
  additionalQuestionnaireResponses?: QuestionnaireResponse[];
  planDefinitionIdentifier?: string;
  appointmentStartIso: string;
  appointmentDurationMinutes?: number;
  practitionerRef?: string | null;
  appointmentServiceType?: CodeableConcept | null;
  managingOrganizationIdentifier?: string;
}

// ---------------------------------------------------------------------------
// Result...
// ---------------------------------------------------------------------------
export interface ReferralBookingResult {
  patient: WithId<Patient>;
  caseReference: string;
  appointment: WithId<Appointment>;
}

function buildQuestionTextMap(
  items: QuestionnaireItem[] | undefined,
  map = new Map<string, string>()
): Map<string, string> {
  for (const item of items ?? []) {
    if (item.linkId && item.text) {
      map.set(item.linkId, item.text);
    }
    if (item.item) {
      buildQuestionTextMap(item.item, map);
    }
  }
  return map;
}

function applyQuestionTextToResponseItems(
  items: QuestionnaireResponseItem[] | undefined,
  questionTextMap: Map<string, string>
): { items: QuestionnaireResponseItem[] | undefined; changed: boolean } {
  if (!items) {
    return { items, changed: false };
  }

  let changed = false;

  const hydratedItems = items.map((item) => {
    const nextItem: QuestionnaireResponseItem = { ...item };

    if (!item.text && item.linkId) {
      const text = questionTextMap.get(item.linkId);
      if (text) {
        nextItem.text = text;
        changed = true;
      }
    }

    if (item.item) {
      const childResult = applyQuestionTextToResponseItems(item.item, questionTextMap);
      if (childResult.changed) {
        nextItem.item = childResult.items;
        changed = true;
      }
    }

    return nextItem;
  });

  return { items: hydratedItems, changed };
}

function hydrateQuestionnaireResponseText(
  questionnaireResponse: QuestionnaireResponse,
  questionnaire: Questionnaire
): QuestionnaireResponse {
  const questionTextMap = buildQuestionTextMap(questionnaire.item);
  const hydrated = applyQuestionTextToResponseItems(questionnaireResponse.item, questionTextMap);

  if (!hydrated.changed) {
    return questionnaireResponse;
  }

  return {
    ...questionnaireResponse,
    item: hydrated.items,
  };
}

// ---------------------------------------------------------------------------
// Core service...
// ---------------------------------------------------------------------------
export async function bookReferral(
  medplum: MedplumClient,
  options: ReferralBookingOptions
): Promise<ReferralBookingResult> {
  const {
    patient: pd,
    consent,
    questionnaireResponse,
    additionalQuestionnaireResponses = [],
    planDefinitionIdentifier,
    appointmentStartIso,
    appointmentDurationMinutes = 30,
    practitionerRef,
    appointmentServiceType,
    managingOrganizationIdentifier = getCurrentOrganisationName(medplum),
  } = options;

  const organizationUrl = getOrganizationUrlForProject();

  // Resolve managing organisation (non-fatal if not found)...
  const org = (await medplum
    .searchOne('Organization', `identifier=${organizationUrl}|${managingOrganizationIdentifier}`)
    .catch(() => undefined)) as WithId<Organization> | undefined;

  // Resolve practitioner display name (non-fatal if not found)...
  let practitionerDisplay: string | undefined;
  if (practitionerRef) {
    try {
      const parts = practitionerRef.split('/');
      if (parts.length === 2 && parts[0] === 'Practitioner') {
        const practitioner = (await medplum.readResource('Practitioner', parts[1] as string)) as Practitioner;
        practitionerDisplay = formatHumanName(practitioner.name?.[0]) || undefined;
      }
    } catch {
      // non-fatal — display will just be absent...
    }
  }

  // ---------------------------------------------------------------------------
  // Create Patient (with MRN)...
  // ---------------------------------------------------------------------------
  const patientResource: Patient = {
    resourceType: 'Patient',
    identifier: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
            },
          ],
        },
        system: PATIENT_IDENTIFIER_URL,
        value: generateMedicalRecordNumber(),
      },
    ],
    name: [{ given: [pd.firstName], family: pd.lastName }],
    birthDate: pd.dob,
    gender: pd.gender,
    telecom: [
      { use: 'home', system: 'phone', value: pd.phone },
      { use: 'home', system: 'email', value: pd.email },
    ],
    address: [
      {
        line: [pd.addressLine1, pd.addressLine2].filter(Boolean) as string[],
        city: pd.town,
        district: pd.county,
        postalCode: pd.postcode,
        country: pd.country ?? 'GB',
      },
    ],
    ...(org ? { managingOrganization: createReference(org) } : {}),
  };
  const createdPatient = await medplum.createResource<Patient>(patientResource);

  // ---------------------------------------------------------------------------
  // Save QuestionnaireResponse(s) linked to the patient...
  // ---------------------------------------------------------------------------
  await medplum.createResource<QuestionnaireResponse>({
    ...questionnaireResponse,
    subject: createReference(createdPatient),
  });
  const createdAdditionalQrs: Array<QuestionnaireResponse & { id: string }> = [];
  for (const additionalQr of additionalQuestionnaireResponses) {
    const created = await medplum.createResource<QuestionnaireResponse>({
      ...additionalQr,
      subject: createReference(createdPatient),
    });
    createdAdditionalQrs.push(created as QuestionnaireResponse & { id: string });
  }

  // ---------------------------------------------------------------------------
  // Create ServiceRequest (the referral request itself)...
  // ---------------------------------------------------------------------------
  const serviceRequest = await medplum.createResource<ServiceRequest>({
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    subject: createReference(createdPatient),
    reasonCode: [{ text: 'Patient self-referral via online form' }],
  });

  // ---------------------------------------------------------------------------
  // Create EpisodeOfCare with a generated case identifier...
  // ---------------------------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);
  const caseNumberIdentifier = await generateCaseNumber(medplum);

  const episodeOfCare: EpisodeOfCare = {
    resourceType: 'EpisodeOfCare',
    status: mapCaseStateToEpisodeStatus('accepted-awaiting-booking'),
    patient: createReference(createdPatient),
    period: { start: today },
    referralRequest: [createReference(serviceRequest)],
    identifier: [caseNumberIdentifier],
    extension: [
      {
        url: EOC_CASE_STATE_URL,
        valueCoding: {
          system: CASE_STATE_CODE_SYSTEM_URL,
          code: 'accepted-awaiting-booking',
          display: 'Accepted, awaiting booking',
        },
      },
      { url: MH_CASE_CONSENT_SIGNED_URL, valueBoolean: consent.dataProcessing },
      ...(consent.dataProcessing ? [{ url: MH_CASE_CONSENT_DATE_URL, valueDate: today }] : []),
    ],
    ...(org ? { managingOrganization: createReference(org) } : {}),
  };
  const createdEpisodeOfCare = await medplum.createResource<EpisodeOfCare>(episodeOfCare);

  // ---------------------------------------------------------------------------
  // Create Appointment...
  // ---------------------------------------------------------------------------
  const start = new Date(appointmentStartIso);
  const end = new Date(start.getTime() + appointmentDurationMinutes * 60_000);
  const createdAppointment = await medplum.createResource<Appointment>({
    resourceType: 'Appointment',
    status: 'booked',
    start: start.toISOString(),
    end: end.toISOString(),
    ...(appointmentServiceType ? { serviceType: [appointmentServiceType] } : {}),
    supportingInformation: [createReference(createdEpisodeOfCare)],
    participant: [
      { actor: createReference(createdPatient), status: 'accepted' },
      ...(practitionerRef
        ? [
            {
              actor: { reference: practitionerRef, ...(practitionerDisplay ? { display: practitionerDisplay } : {}) },
              status: 'accepted' as const,
            },
          ]
        : []),
    ],
  });

  // ---------------------------------------------------------------------------
  // Create Encounter linked to patient, episode, and appointment...
  // ---------------------------------------------------------------------------
  const createdEncounter = await medplum.createResource<Encounter>({
    resourceType: 'Encounter',
    status: 'planned',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    subject: createReference(createdPatient),
    episodeOfCare: [createReference(createdEpisodeOfCare)],
    appointment: [createReference(createdAppointment)],
    ...(appointmentServiceType ? { serviceType: appointmentServiceType } : {}),
    ...(practitionerRef
      ? {
          participant: [
            {
              individual: {
                reference: practitionerRef,
                ...(practitionerDisplay ? { display: practitionerDisplay } : {}),
              },
            },
          ],
        }
      : {}),
    period: {
      start: new Date(appointmentStartIso).toISOString(),
      end: new Date(new Date(appointmentStartIso).getTime() + appointmentDurationMinutes * 60_000).toISOString(),
    },
  });

  // ---------------------------------------------------------------------------
  // Apply ClinicalImpression to encounter (creates Notes that surface in the
  // chart)...
  // ---------------------------------------------------------------------------
  const clinicalImpressionData: ClinicalImpression = {
    resourceType: 'ClinicalImpression',
    status: 'in-progress',
    description: 'Initial clinical impression',
    subject: createReference(createdPatient),
    encounter: createReference(createdEncounter),
    date: new Date().toISOString(),
  };

  await medplum.createResource(clinicalImpressionData);

  // ---------------------------------------------------------------------------
  // Apply PlanDefinition to encounter (creates Tasks that surface the QR)...
  // ---------------------------------------------------------------------------
  if (planDefinitionIdentifier) {
    const planDefinition = (await medplum
      .searchOne('PlanDefinition', `identifier=${getOrganizationUrlForProject()}|${planDefinitionIdentifier}`)
      .catch(() => undefined)) as PlanDefinition | undefined;

    if (planDefinition?.id) {
      await medplum.post(medplum.fhirUrl('PlanDefinition', planDefinition.id, '$apply'), {
        resourceType: 'Parameters',
        parameter: [
          { name: 'subject', valueString: `Patient/${createdPatient.id}` },
          { name: 'encounter', valueString: `Encounter/${createdEncounter.id}` },
        ],
      });

      // Link pre-created QRs to the Tasks that $apply just created, so the
      // EncounterChart renders them pre-filled rather than as empty forms.
      if (createdAdditionalQrs.length > 0) {
        const qrByUrl: Record<string, QuestionnaireResponse & { id: string }> = {};
        for (const qr of createdAdditionalQrs) {
          if (qr.questionnaire) {
            qrByUrl[qr.questionnaire] = qr;
          }
        }

        const encounterTasks = await medplum
          .searchResources('Task', `encounter=Encounter/${createdEncounter.id}`)
          .catch(() => [] as Task[]);

        for (const task of encounterTasks) {
          if (task.output && task.output.length > 0) continue;
          const questionnaireRef = task.input?.[0]?.valueReference as Reference<Questionnaire> | undefined;
          if (!questionnaireRef?.reference) continue;
          try {
            const q = (await medplum.readReference(questionnaireRef)) as Questionnaire;
            const matchingQr = q.url ? qrByUrl[q.url] : undefined;
            if (matchingQr) {
              const hydratedQr = hydrateQuestionnaireResponseText(matchingQr, q);
              const qrToAttach =
                hydratedQr !== matchingQr
                  ? ((await medplum.updateResource<QuestionnaireResponse>(hydratedQr)) as QuestionnaireResponse & {
                      id: string;
                    })
                  : matchingQr;

              await medplum.updateResource<Task>({
                ...task,
                status: 'completed',
                output: [{ type: { text: 'QuestionnaireResponse' }, valueReference: createReference(qrToAttach) }],
              });
            }
          } catch {
            // non-fatal — Task will show an empty form instead
          }
        }
      }
    }
  }

  return {
    patient: createdPatient,
    caseReference: caseNumberIdentifier.value as string,
    appointment: createdAppointment,
  };
}
