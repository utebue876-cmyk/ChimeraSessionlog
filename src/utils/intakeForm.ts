import type { MedplumClient } from '@medplum/core';
import { addProfileToResource, createReference, getQuestionnaireAnswers } from '@medplum/core';
import type {
  Coverage,
  EpisodeOfCare,
  Organization,
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  Reference,
  ServiceRequest,
} from '@medplum/fhirtypes';
import { PATIENT_IDENTIFIER_URL } from '../config/chimera-urls';
import { getCurrentProjectOrganization, getOrganizationUrlForProject } from '../config/projectOrganization';
import { createAccount } from './account';
import { createEpisodeOfCare } from './episodeOfCare';
import {
  addAssessmentServiceRequest,
  addConsent,
  addCoverage,
  addScheduleAssessmentTask,
  consentCategoryMapping,
  consentPolicyRuleMapping,
  consentScopeMapping,
  convertDateToDateTime,
  getContactDetails,
  getGroupRepeatedAnswers,
  getHumanName,
  getPatientHomeAddress,
  getPatientWorkAddress,
  PROFILE_URLS,
} from './intakeUtils';
import { generateMedicalRecordNumber } from './numbers';

export interface IntakePatientMatchCriteria {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Patient['gender'];
}

export async function searchForMatchingPatients(
  medplum: MedplumClient,
  response: QuestionnaireResponse
): Promise<Patient[]> {
  const criteria = getIntakePatientMatchCriteria(response);
  if (!criteria) {
    return [];
  }

  const candidates = await medplum.searchResources(
    'Patient',
    `birthdate=${encodeURIComponent(criteria.birthDate)}&gender=${encodeURIComponent(criteria.gender!)}&_fields=id,name,birthDate,gender,telecom,identifier&_count=100`
  );

  return candidates.filter((patient) => isExactPatientMatch(patient, criteria));
}

export function getIntakePatientMatchCriteria(response: QuestionnaireResponse): IntakePatientMatchCriteria | undefined {
  const answers = getQuestionnaireAnswers(response);
  const patientName = getHumanName(answers);
  const firstName = patientName?.given?.[0]?.trim();
  const lastName = patientName?.family?.trim();
  const birthDate = answers['dob']?.valueDate;
  const gender = answers['gender']?.valueCoding?.code as Patient['gender'] | undefined;

  if (!firstName || !lastName || !birthDate || !gender) {
    return undefined;
  }

  return {
    firstName,
    lastName,
    birthDate,
    gender,
  };
}

function isExactPatientMatch(patient: Patient, criteria: IntakePatientMatchCriteria): boolean {
  if (patient.birthDate !== criteria.birthDate || patient.gender !== criteria.gender) {
    return false;
  }

  return (
    patient.name?.some((name) => {
      const familyMatches = normalizeMatchValue(name.family) === normalizeMatchValue(criteria.lastName);
      const givenMatches = name.given?.some(
        (given) => normalizeMatchValue(given) === normalizeMatchValue(criteria.firstName)
      );
      return familyMatches && !!givenMatches;
    }) ?? false
  );
}

function normalizeMatchValue(value: string | undefined): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') ?? ''
  );
}

export async function onboardPatient(
  medplum: MedplumClient,
  questionnaire: Questionnaire,
  response: QuestionnaireResponse,
  submissionKey: string
): Promise<Patient> {
  const answers = getQuestionnaireAnswers(response);

  let patient: Patient = {
    resourceType: 'Patient',
  };

  patient = addProfileToResource(patient, PROFILE_URLS.Patient);

  // Handle demographic information
  const patientName = getHumanName(answers);
  if (patientName) {
    patient.name = [patientName];
  }

  if (answers['dob']?.valueDate) {
    patient.birthDate = answers['dob'].valueDate;
  }

  const contactDetails = getContactDetails(answers);
  if (contactDetails) {
    patient.telecom = contactDetails;
  }

  const patientHomeAddress = getPatientHomeAddress(answers);
  if (patientHomeAddress) {
    patient.address = [patientHomeAddress];
  }

  const patientWorkAddress = getPatientWorkAddress(answers);
  if (patientWorkAddress) {
    patient.address = patient.address ? [...patient.address, patientWorkAddress] : [patientWorkAddress];
  }

  if (answers['gender']?.valueCoding?.code) {
    patient.gender = answers['gender'].valueCoding.code as Patient['gender'];
  }

  patient.identifier = [
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
  ];

  // Resolve the current tenant's managing organization from the runtime project config.
  const projectOrg = getCurrentProjectOrganization(medplum);
  const chimera = await medplum.searchOne(
    'Organization',
    `identifier=${getOrganizationUrlForProject(projectOrg.projectId)}|${projectOrg.organizationName}`
  );
  if (chimera) {
    patient.managingOrganization = createReference(chimera);
  }

  // Create the patient resource
  patient = await medplum.createResource(patient);

  response.subject = createReference(patient);
  await medplum.createResource(response);

  // Create coverages first so the subscriberId can be linked to the ServiceRequest...
  const insuranceProviders = getGroupRepeatedAnswers(questionnaire, response, 'coverage-information');
  const coverages: Coverage[] = [];
  for (const provider of insuranceProviders) {
    const coverage = await addCoverage(medplum, patient, provider);
    coverages.push(coverage);
  }

  // Create an episode of care for the patient, linking it to the first coverage if available.
  const episodeOfCare = await createEpisodeOfCare(medplum, patient, getQuestionnaireAnswers(response), coverages[0]);

  // If consent for treatment is given, add the assessment ServiceRequest and consent resource...
  let serviceRequest: ServiceRequest | undefined;
  if (answers['consent-for-treatment-signature']?.valueBoolean) {
    serviceRequest = await addAssessmentServiceRequest(medplum, patient, episodeOfCare, answers);

    await addConsent(
      medplum,
      patient,
      !!answers['consent-for-treatment-signature']?.valueBoolean,
      consentScopeMapping.treatment,
      consentCategoryMapping.med,
      consentPolicyRuleMapping.cric,
      convertDateToDateTime(answers['consent-for-treatment-date']?.valueDate)
    );
  }

  // Create account for the patient...
  const insuranceProviderRef = insuranceProviders[0]?.['insurance-provider']?.valueReference as
    | Reference<Organization>
    | undefined;

  const healthcareProviderRef = answers['healthcare-provider']?.valueReference as Reference<Organization> | undefined;

  const account = await createAccount(medplum, {
    patient,
    submissionKey,
    coverage: coverages[0],
    episodeOfCare,
    insuranceProvider: insuranceProviderRef,
    managingOrganization: chimera,
    healthcareProvider: healthcareProviderRef,
  });

  // Now link the account back to the episode of care...
  await medplum.updateResource<EpisodeOfCare>({
    ...episodeOfCare,
    account: [createReference(account)],
  });

  // Once the account is created, create the task to schedule the patient's assessment.
  if (serviceRequest) {
    await addScheduleAssessmentTask(medplum, patient, episodeOfCare, serviceRequest);
  }

  return patient;
}
