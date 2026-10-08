import { createReference, type MedplumClient } from '@medplum/core';
import type {
  CarePlan,
  CodeableConcept,
  CodeSystemConcept,
  Coding,
  Condition,
  EpisodeOfCare,
  EpisodeOfCareDiagnosis,
  Extension,
  Identifier,
  Organization,
  Reference,
  ServiceRequest,
} from '@medplum/fhirtypes';
import {
  CASE_STATE_CODE_SYSTEM_URL,
  EOC_CASE_STATE_URL,
  MH_DIAGNOSIS_CODE_SYSTEM_URL,
  MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
} from '../../config/chimera-urls';
import { getOrganizationUrlForProject } from '../../config/projectOrganization';
import type { PathwayOption, TreatmentPathwayValues } from './useTreatmentPathway';

// Standard HL7 extension, not Chimera-specific, so kept local rather than in chimera-urls.ts.
const WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL = 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare';
const IN_TREATMENT_CASE_STATE_CODE = 'in-treatment';

export interface DiagnosisOption {
  value: string;
  label: string;
}

// Diagnosis codes are the same mh-diagnosis codes used to populate the picker (not SNOMED CT).
function buildDiagnosisCode(code: string, diagnosisOptions: DiagnosisOption[]): CodeableConcept {
  const label = diagnosisOptions.find((o) => o.value === code)?.label ?? code;
  return { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code, display: label }], text: label };
}

// Updates the existing rank's Condition if one is already linked on the episode, otherwise creates a
// new one, so re-confirming never creates more than one Condition per rank (max 2 overall).
async function upsertDiagnosisCondition(
  medplum: MedplumClient,
  episode: EpisodeOfCare,
  rank: 1 | 2,
  code: string,
  diagnosisOptions: DiagnosisOption[]
): Promise<Condition> {
  const codeableConcept = buildDiagnosisCode(code, diagnosisOptions);
  const existingRef = episode.diagnosis?.find((d) => d.rank === rank)?.condition;

  if (existingRef) {
    const existingCondition = await medplum.readReference(existingRef as Reference<Condition>);
    return medplum.updateResource({ ...existingCondition, code: codeableConcept });
  }

  return medplum.createResource({
    resourceType: 'Condition',
    subject: episode.patient,
    code: codeableConcept,
  });
}

// Merges the new primary (rank 1) / secondary (rank 2) diagnosis entries onto the episode, preserving
// any other pre-existing diagnosis entries untouched.
function buildEpisodeDiagnosis(
  episode: EpisodeOfCare,
  primaryCondition: Condition,
  secondaryCondition: Condition | undefined
): EpisodeOfCareDiagnosis[] {
  const otherDiagnosis = (episode.diagnosis ?? []).filter((d) => d.rank !== 1 && d.rank !== 2);
  return [
    ...otherDiagnosis,
    { condition: createReference(primaryCondition), rank: 1 },
    ...(secondaryCondition ? [{ condition: createReference(secondaryCondition), rank: 2 }] : []),
  ];
}

// Looks up the mh-treatment-pathway concept for the selected code, the single source for the service,
// modality and delivery-mode mappings used by both the ServiceRequest and the CarePlan categories.
async function fetchPathwayConcept(medplum: MedplumClient, pathwayCode: string): Promise<CodeSystemConcept> {
  const codeSystem = await medplum.searchOne('CodeSystem', `url=${MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL}`);
  const concept = codeSystem?.concept?.find((c) => c.code === pathwayCode);

  if (!concept) {
    throw new Error(`No mh-treatment-pathway concept found for pathway "${pathwayCode}"`);
  }

  return concept;
}

function findConceptPropertyCoding(concept: CodeSystemConcept, propertyCode: string): Coding | undefined {
  return concept.property?.find((property) => property.code === propertyCode)?.valueCoding;
}

// The concept's service property becomes ServiceRequest.code - not a CarePlan category.
function buildTreatmentServiceCode(concept: CodeSystemConcept, pathwayCode: string): CodeableConcept {
  const valueCoding = findConceptPropertyCoding(concept, 'service');

  if (!valueCoding) {
    throw new Error(`No mh-treatment-service mapping found for pathway "${pathwayCode}"`);
  }

  return { coding: [valueCoding] };
}

// One CodeableConcept per axis (pathway, modality, delivery-mode) - not multiple codings in one, since
// codings inside a CodeableConcept are translations of the same concept. Delivery mode is omitted where
// the concept doesn't carry one (e.g. guided self-help).
function buildCarePlanCategories(
  pathwayCoding: Coding,
  concept: CodeSystemConcept,
  pathwayCode: string
): CodeableConcept[] {
  const modalityCoding = findConceptPropertyCoding(concept, 'modality');
  if (!modalityCoding) {
    throw new Error(`No modality mapping found for pathway "${pathwayCode}"`);
  }
  const deliveryModeCoding = findConceptPropertyCoding(concept, 'delivery-mode');

  return [
    { coding: [pathwayCoding] },
    { coding: [modalityCoding] },
    ...(deliveryModeCoding ? [{ coding: [deliveryModeCoding] }] : []),
  ];
}

// No custom SearchParameter exists for the workflow-episodeOfCare extension, so candidates are found by
// patient (a standard search param) and then filtered client-side by the extension's target reference.
export async function findExistingTreatmentServiceRequest(
  medplum: MedplumClient,
  episode: EpisodeOfCare
): Promise<ServiceRequest | undefined> {
  if (!episode.patient?.reference || !episode.id) {
    return undefined;
  }

  const episodeReference = `EpisodeOfCare/${episode.id}`;
  const candidates = await medplum.searchResources('ServiceRequest', `patient=${episode.patient.reference}`);
  return candidates.find((sr) =>
    sr.extension?.some(
      (ext) => ext.url === WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL && ext.valueReference?.reference === episodeReference
    )
  );
}

// The funder organisation is the requester on the episode's referral ServiceRequest.
async function resolveFunderOrganization(
  medplum: MedplumClient,
  episode: EpisodeOfCare
): Promise<Organization | undefined> {
  const referralRef = episode.referralRequest?.[0];
  if (!referralRef) {
    return undefined;
  }

  const referral = await medplum.readReference(referralRef as Reference<ServiceRequest>);
  const funderRef = referral.requester as Reference<Organization> | undefined;
  if (!funderRef) {
    return undefined;
  }

  return medplum.readReference(funderRef);
}

// The authorisation-reference identifier system is namespaced per funder: the "aviva-health" segment is
// that funder's own organisation identifier value, not a fixed constant.
async function buildAuthorisationReferenceIdentifier(
  medplum: MedplumClient,
  episode: EpisodeOfCare,
  authorisationReference: string
): Promise<Identifier | undefined> {
  if (!authorisationReference) {
    return undefined;
  }

  const funderOrganization = await resolveFunderOrganization(medplum, episode);
  if (!funderOrganization) {
    throw new Error('Could not resolve the funder organisation to build the authorisation reference identifier');
  }

  const funderCode = funderOrganization.identifier?.find(
    (identifier) => identifier.system === getOrganizationUrlForProject()
  )?.value;
  if (!funderCode) {
    throw new Error('Funder organisation has no organisation identifier to build the authorisation reference system');
  }

  return {
    system: `http://fhir.chimera.health/identifier/${funderCode}/authorisation-reference`,
    value: authorisationReference,
    assigner: createReference(funderOrganization),
  };
}

// Creates the treatment ServiceRequest for the authorised service, or updates the one already linked to
// this episode (via the workflow-episodeOfCare extension) so re-confirming doesn't raise duplicate orders.
async function upsertTreatmentServiceRequest(
  medplum: MedplumClient,
  episode: EpisodeOfCare,
  values: TreatmentPathwayValues,
  concept: CodeSystemConcept
): Promise<ServiceRequest> {
  if (!values.pathway) {
    throw new Error('Pathway is required');
  }
  if (values.sessionsAuthorised === '') {
    throw new Error('Sessions authorised is required');
  }

  const [existing, authorisationIdentifier] = await Promise.all([
    findExistingTreatmentServiceRequest(medplum, episode),
    buildAuthorisationReferenceIdentifier(medplum, episode, values.authorisationReference),
  ]);

  const otherExtensions =
    existing?.extension?.filter((ext) => ext.url !== WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL) ?? [];
  const otherIdentifiers =
    existing?.identifier?.filter((identifier) => identifier.system !== authorisationIdentifier?.system) ?? [];
  const serviceRequest: ServiceRequest = {
    ...existing,
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    subject: episode.patient,
    code: buildTreatmentServiceCode(concept, values.pathway),
    quantityQuantity: { value: values.sessionsAuthorised, unit: 'session' },
    ...(authorisationIdentifier ? { identifier: [...otherIdentifiers, authorisationIdentifier] } : {}),
    extension: [
      ...otherExtensions,
      { url: WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL, valueReference: createReference(episode) },
    ],
  };

  return existing ? medplum.updateResource(serviceRequest) : medplum.createResource(serviceRequest);
}

// No custom SearchParameter exists for the workflow-episodeOfCare extension, so candidates are found by
// patient (a standard search param) and then filtered client-side by the extension's target reference.
export async function findExistingCarePlan(
  medplum: MedplumClient,
  episode: EpisodeOfCare
): Promise<CarePlan | undefined> {
  if (!episode.patient?.reference || !episode.id) {
    return undefined;
  }

  const episodeReference = `EpisodeOfCare/${episode.id}`;
  const candidates = await medplum.searchResources('CarePlan', `patient=${episode.patient.reference}`);
  return candidates.find((carePlan) =>
    carePlan.extension?.some(
      (ext) => ext.url === WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL && ext.valueReference?.reference === episodeReference
    )
  );
}

// Creates the CarePlan for the confirmed pathway, or updates the one already linked (via the
// workflow-episodeOfCare extension) so re-confirming doesn't raise a duplicate plan.
async function upsertCarePlan(
  medplum: MedplumClient,
  episode: EpisodeOfCare,
  values: TreatmentPathwayValues,
  pathwayOption: PathwayOption,
  concept: CodeSystemConcept,
  treatmentServiceRequest: ServiceRequest
): Promise<CarePlan> {
  const existing = await findExistingCarePlan(medplum, episode);

  const otherExtensions =
    existing?.extension?.filter((ext) => ext.url !== WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL) ?? [];
  const practitioner = medplum.getProfile();
  const carePlan: CarePlan = {
    ...existing,
    resourceType: 'CarePlan',
    status: 'active',
    intent: 'plan',
    subject: episode.patient,
    category: buildCarePlanCategories(pathwayOption.coding, concept, pathwayOption.value),
    activity: [{ reference: createReference(treatmentServiceRequest) }],
    note: [
      {
        text: values.clinicalRationale,
        ...(practitioner ? { authorReference: createReference(practitioner) } : {}),
        time: new Date().toISOString(),
      },
    ],
    extension: [
      ...otherExtensions,
      { url: WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL, valueReference: createReference(episode) },
    ],
  };

  return existing ? medplum.updateResource(carePlan) : medplum.createResource(carePlan);
}

// Forward-only: the case-state ordinal spine requires a write only where the new ordinal is strictly
// greater than the current one. A missing ordinal (no existing case-state, or a non-spine state like
// on-hold) must never be compared numerically, so this exits without writing in that case too.
async function buildAdvancedCaseStateExtension(
  medplum: MedplumClient,
  episode: EpisodeOfCare
): Promise<Extension | undefined> {
  const currentCode = episode.extension?.find((ext) => ext.url === EOC_CASE_STATE_URL)?.valueCoding?.code;
  if (!currentCode) {
    return undefined;
  }

  const codeSystem = await medplum.searchOne('CodeSystem', `url=${CASE_STATE_CODE_SYSTEM_URL}`);
  const concepts = codeSystem?.concept ?? [];
  const currentOrdinal = concepts
    .find((concept) => concept.code === currentCode)
    ?.property?.find((property) => property.code === 'ordinal')?.valueInteger;
  const targetConcept = concepts.find((concept) => concept.code === IN_TREATMENT_CASE_STATE_CODE);
  const targetOrdinal = targetConcept?.property?.find((property) => property.code === 'ordinal')?.valueInteger;

  if (currentOrdinal === undefined || targetOrdinal === undefined || currentOrdinal >= targetOrdinal) {
    return undefined;
  }

  return {
    url: EOC_CASE_STATE_URL,
    valueCoding: {
      system: CASE_STATE_CODE_SYSTEM_URL,
      code: IN_TREATMENT_CASE_STATE_CODE,
      display: targetConcept?.display ?? 'In treatment',
    },
  };
}

// First step of the treatment pathway "Confirm" save: create (or update, if one already exists for
// this episode) the primary/secondary diagnosis Conditions and link them onto EpisodeOfCare.diagnosis.
// Further save steps (pathway, sessions, care plan) will be added to this module incrementally.
export async function confirmTreatmentPathway(
  medplum: MedplumClient,
  episode: EpisodeOfCare,
  values: TreatmentPathwayValues,
  diagnosisOptions: DiagnosisOption[],
  pathwayOptions: PathwayOption[]
): Promise<EpisodeOfCare> {
  if (!values.primaryDiagnosis) {
    throw new Error('Primary diagnosis is required');
  }
  if (!values.pathway) {
    throw new Error('Pathway is required');
  }

  const pathwayOption = pathwayOptions.find((option) => option.value === values.pathway);
  if (!pathwayOption) {
    throw new Error(`No pathway option found for "${values.pathway}"`);
  }

  const primaryCondition = await upsertDiagnosisCondition(
    medplum,
    episode,
    1,
    values.primaryDiagnosis,
    diagnosisOptions
  );

  let secondaryCondition: Condition | undefined;
  if (values.secondaryDiagnosis) {
    secondaryCondition = await upsertDiagnosisCondition(
      medplum,
      episode,
      2,
      values.secondaryDiagnosis,
      diagnosisOptions
    );
  }

  const concept = await fetchPathwayConcept(medplum, values.pathway);
  const treatmentServiceRequest = await upsertTreatmentServiceRequest(medplum, episode, values, concept);
  await upsertCarePlan(medplum, episode, values, pathwayOption, concept, treatmentServiceRequest);

  const caseStateExtension = await buildAdvancedCaseStateExtension(medplum, episode);
  const extension = caseStateExtension
    ? [...(episode.extension ?? []).filter((ext) => ext.url !== EOC_CASE_STATE_URL), caseStateExtension]
    : episode.extension;

  return medplum.updateResource({
    ...episode,
    diagnosis: buildEpisodeDiagnosis(episode, primaryCondition, secondaryCondition),
    extension,
  });
}
