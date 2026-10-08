import type { MedplumClient } from '@medplum/core';
import { createReference, getReferenceString, HTTP_HL7_ORG, HTTP_TERMINOLOGY_HL7_ORG } from '@medplum/core';
import type {
  Address,
  CodeableConcept,
  Coding,
  Consent,
  ContactPoint,
  Coverage,
  EpisodeOfCare,
  Extension,
  HumanName,
  InsurancePlan,
  Organization,
  Patient,
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  QuestionnaireResponseItemAnswer,
  Reference,
  ServiceRequest,
  Task,
} from '@medplum/fhirtypes';
import {
  CASE_SERVICE_IDENTIFIER_URL,
  CASE_TASK_IDENTIFIER_URL,
  COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
  TASK_CODES_CODE_SYSTEM_URL,
  UK_CORE_PATIENT_URL,
} from '../config/chimera-urls';
import { AVIVA_HEALTH_NAME, OPTIMA_HEALTH_NAME, VITALITY_HEALTH_NAME } from '../config/constants';

export const PROFILE_URLS: Record<string, string> = {
  Coverage: `${HTTP_HL7_ORG}/fhir/StructureDefinition/Coverage`,
  Patient: UK_CORE_PATIENT_URL,
};

export const consentScopeMapping: Record<string, CodeableConcept> = {
  adr: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/consentscope',
        code: 'adr',
        display: 'Advanced Care Directive',
      },
    ],
  },
  patientPrivacy: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/consentscope',
        code: 'patient-privacy',
        display: 'Patient Privacy',
      },
    ],
  },
  treatment: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/consentscope',
        code: 'treatment',
        display: 'Treatment',
      },
    ],
  },
};

export const consentCategoryMapping: Record<string, CodeableConcept> = {
  acd: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/consentcategorycodes',
        code: 'acd',
        display: 'Advanced Care Directive',
      },
    ],
  },
  nopp: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/v3-ActCode',
        code: 'nopp',
        display: 'Notice of Privacy Practices',
      },
    ],
  },
  pay: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/v3-ActCode',
        code: 'pay',
        display: 'Payment',
      },
    ],
  },
  med: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/v3-ActCode',
        code: 'med',
        display: 'Medical',
      },
    ],
  },
};

export const consentPolicyRuleMapping: Record<string, CodeableConcept> = {
  hipaaNpp: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/consentpolicycodes',
        code: 'hipaa-npp',
        display: 'HIPAA Notice of Privacy Practices',
      },
    ],
  },
  hipaaSelfPay: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/consentpolicycodes',
        code: 'hipaa-self-pay',
        display: 'HIPAA Self-Pay Restriction',
      },
    ],
  },
  cric: {
    coding: [
      {
        system: HTTP_TERMINOLOGY_HL7_ORG + '/CodeSystem/consentpolicycodes',
        code: 'cric',
        display: 'Common Rule Informed Consent',
      },
    ],
  },
  adr: {
    coding: [
      {
        system: 'http://medplum.com',
        code: 'BasicADR',
        display: 'Advanced Care Directive',
      },
    ],
  },
};

type ExtensionQuestionnaireItemType = 'valueCoding' | 'valueBoolean';

/**
 * Add an extension to a resource
 *
 * @param resource - A FHIR resource that supports extensions (e.g., Patient, EpisodeOfCare)
 * @param url - An URL that identifies the extension
 * @param answerType - The value[x] field where the answer should be stored
 * @param answer - The value to be stored in the extension
 * @param subExtensionKey - A key to identify a sub-extension
 */
export function addExtension<T extends { extension?: Extension[] }>(
  resource: T,
  url: string,
  answerType: ExtensionQuestionnaireItemType,
  answer: QuestionnaireResponseItemAnswer | undefined,
  subExtensionKey?: string
): void {
  let value = answer?.[answerType];

  // Answer to boolean Questionnaire fields will be set as `undefined` if the check mark is not ticked
  // so in this case we should interpret it as `false`.
  if (answerType === 'valueBoolean') {
    value = Boolean(value);
  }

  if (value === undefined) {
    return;
  }

  resource.extension ||= [];

  if (subExtensionKey) {
    const subExtensions = [
      {
        url: subExtensionKey,
        [answerType]: value,
      },
    ];
    if (answerType === 'valueCoding' && (value as Coding).display) {
      subExtensions.push({ url: 'text', valueString: (value as Coding).display as string });
    }
    resource.extension.push({
      url,
      extension: subExtensions,
    });
  } else {
    resource.extension.push({
      url,
      [answerType]: value,
    });
  }
}

/**
 * Adds a Coverage resource
 *
 * @param medplum - The Medplum client
 * @param patient - The patient beneficiary of the coverage
 * @param answers - A list of objects where the keys are the linkIds of the fields used to set up a
 *                  coverage (see getGroupRepeatedAnswers)
 */
export async function addCoverage(
  medplum: MedplumClient,
  patient: Patient,
  answers: Record<string, QuestionnaireResponseItemAnswer>
): Promise<Coverage> {
  const payor = answers['insurance-provider'].valueReference as Reference<Organization>;
  const subscriberId = answers['subscriber-id']?.valueString;

  let extension: Extension[] | undefined;

  if (payor.display === OPTIMA_HEALTH_NAME) {
    const employer = answers['optima-employer']?.valueReference as Reference<Organization> | undefined;
    if (employer?.reference) {
      const insurancePlan = await medplum.searchOne('InsurancePlan', `owned-by=${employer.reference}`);
      if (insurancePlan) {
        extension = [{ url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL, valueReference: createReference(insurancePlan) }];
      }
    }
  }

  if (payor.display === AVIVA_HEALTH_NAME || payor.display === VITALITY_HEALTH_NAME) {
    const insurancePlan = answers['insurance-plan']?.valueReference as Reference<InsurancePlan> | undefined;
    if (insurancePlan) {
      extension = [{ url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL, valueReference: insurancePlan }];
    }
  }

  return medplum.upsertResource(
    {
      resourceType: 'Coverage',
      meta: {
        profile: [PROFILE_URLS.Coverage],
      },
      status: 'active',
      beneficiary: createReference(patient),
      subscriberId: subscriberId,
      payor: [payor],
      ...(extension ? { extension } : {}),
      subscriber: createReference(patient),
      relationship: {
        coding: [
          { system: `${HTTP_TERMINOLOGY_HL7_ORG}/CodeSystem/subscriber-relationship`, code: 'self', display: 'Self' },
        ],
      },
      period: {
        start: new Date().toISOString(),
      },
    },
    {
      beneficiary: getReferenceString(patient),
      payor: getReferenceString(payor),
    }
  );
}

export async function addConsent(
  medplum: MedplumClient,
  patient: Patient,
  consentGiven: boolean,
  scope: CodeableConcept,
  category: CodeableConcept,
  policyRule: CodeableConcept | undefined,
  date: Consent['dateTime']
): Promise<void> {
  await medplum.createResource({
    resourceType: 'Consent',
    patient: createReference(patient),
    status: consentGiven ? 'active' : 'rejected',
    scope: scope,
    category: [category],
    policyRule: policyRule,
    dateTime: date,
    performer: [createReference(medplum.getProfile() ?? patient)],
  });
}

/**
 * Finds a QuestionnaireItem or QuestionnaireResponseItem with the given linkId
 *
 * @param items - The array of objects present in the `.item` attribute of a Questionnaire or QuestionnaireResponse
 * @param linkId - The id to be found
 * @returns - The found item or undefined in case it's not found
 */
export function findQuestionnaireItem<T extends QuestionnaireItem | QuestionnaireResponseItem>(
  items: T[] | undefined,
  linkId: string
): T | undefined {
  if (!items) {
    return undefined;
  }

  return items.reduce((foundItem: T | undefined, currentItem: T | undefined) => {
    // If currentItem is undefined or the item was already found just return it
    if (foundItem || !currentItem) {
      return foundItem;
    }

    if (currentItem.linkId === linkId) {
      return currentItem;
    } else if (currentItem.item) {
      // This enables traversing nested structures
      return findQuestionnaireItem(currentItem.item as T[], linkId);
    }

    return undefined;
  }, undefined);
}

/**
 * Finds the answers to a group of items that can be repeated.
 *
 * @param questionnaire - The Questionnaire resource, used to find the list of linkIds that will compose each group
 * @param response - The QuestionnaireResponse resource where the answers will be extracted
 * @param groupLinkId - The linkId of the group that can be repeated in the questionnaire
 * @returns - An array of objects each containing a set of grouped answers
 */
export function getGroupRepeatedAnswers(
  questionnaire: Questionnaire,
  response: QuestionnaireResponse,
  groupLinkId: string
): Record<string, QuestionnaireResponseItemAnswer>[] {
  // Find the questionnaire item based on groupLinkId
  const questionnaireItem = findQuestionnaireItem(questionnaire.item, groupLinkId) as QuestionnaireItem;

  if (questionnaireItem.type !== 'group' || !questionnaireItem?.item) {
    return [];
  }

  // Get all response items corresponding to the groupLinkId
  const responseGroups = response.item?.filter((item) => item.linkId === groupLinkId);

  if (!responseGroups || responseGroups?.length === 0) {
    return [];
  }

  const groupAnswers = responseGroups.map((responseItem) => {
    const answers: Record<string, any> = {};

    const extractAnswers = (items: QuestionnaireResponseItem[]): void => {
      items.forEach(({ linkId, answer, item }) => {
        if (item) {
          const subGroupAnswers: Record<string, any> = {};
          item.forEach((subItem) => {
            if (subItem.answer) {
              subGroupAnswers[subItem.linkId] = subItem.answer?.[0] ?? {};
            }
          });
          answers[linkId] = subGroupAnswers;
        } else {
          answers[linkId] = answer?.[0] ?? {};
        }
      });
    };

    extractAnswers(responseItem.item || []);
    return answers;
  });

  return groupAnswers;
}

export function convertDateToDateTime(date: string | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  return new Date(date).toISOString();
}

export function getHumanName(
  answers: Record<string, QuestionnaireResponseItemAnswer>,
  prefix: string = ''
): HumanName | undefined {
  const patientName: HumanName = {};

  const givenName = [];
  if (answers[`${prefix}first-name`]?.valueString) {
    givenName.push(answers[`${prefix}first-name`].valueString as string);
  }

  if (givenName.length > 0) {
    patientName.given = givenName;
  }

  if (answers[`${prefix}last-name`]?.valueString) {
    patientName.family = answers[`${prefix}last-name`].valueString;
  }

  return Object.keys(patientName).length > 0 ? patientName : undefined;
}

export function getContactDetails(
  answers: Record<string, QuestionnaireResponseItemAnswer>
): ContactPoint[] | undefined {
  const contactDetails: ContactPoint[] = [];

  if (answers['home-phone']?.valueString) {
    contactDetails.push({ use: 'home', system: 'phone', value: answers['home-phone'].valueString });
  }

  if (answers['home-email']?.valueString) {
    contactDetails.push({ use: 'home', system: 'email', value: answers['home-email'].valueString });
  }

  if (answers['work-phone']?.valueString) {
    contactDetails.push({ use: 'work', system: 'phone', value: answers['work-phone'].valueString });
  }

  if (answers['work-email']?.valueString) {
    contactDetails.push({ use: 'work', system: 'email', value: answers['work-email'].valueString });
  }

  return contactDetails.length > 0 ? contactDetails : undefined;
}

export function getPatientHomeAddress(answers: Record<string, QuestionnaireResponseItemAnswer>): Address | undefined {
  const patientAddress: Address = {};

  if (answers['home-address-line1']?.valueString) {
    patientAddress.line = [answers['home-address-line1'].valueString];
  }

  if (answers['home-address-line2']?.valueString) {
    patientAddress.line = patientAddress.line
      ? [...patientAddress.line, answers['home-address-line2'].valueString]
      : [answers['home-address-line2'].valueString];
  }

  if (answers['home-city']?.valueString) {
    patientAddress.city = answers['home-city'].valueString;
  }

  if (answers['home-county']?.valueString) {
    patientAddress.state = answers['home-county'].valueString;
  }

  if (answers['home-postcode']?.valueString) {
    patientAddress.postalCode = answers['home-postcode'].valueString;
  }

  if (Object.keys(patientAddress).length === 0) {
    return undefined;
  }

  patientAddress.country = 'GB'; // Default to GB

  return { use: 'home', type: 'physical', ...patientAddress };
}

export function getPatientWorkAddress(answers: Record<string, QuestionnaireResponseItemAnswer>): Address | undefined {
  const patientAddress: Address = {};

  if (answers['work-address-line1']?.valueString) {
    patientAddress.line = [answers['work-address-line1'].valueString];
  }

  if (answers['work-address-line2']?.valueString) {
    patientAddress.line = patientAddress.line
      ? [...patientAddress.line, answers['work-address-line2'].valueString]
      : [answers['work-address-line2'].valueString];
  }

  if (answers['work-city']?.valueString) {
    patientAddress.city = answers['work-city'].valueString;
  }

  if (answers['work-county']?.valueString) {
    patientAddress.state = answers['work-county'].valueString;
  }

  if (answers['work-postcode']?.valueString) {
    patientAddress.postalCode = answers['work-postcode'].valueString;
  }

  patientAddress.country = 'GB'; // Default to GB for now, can be updated later if needed

  // To simplify the demo, we're assuming the address is always a work address
  return Object.keys(patientAddress).length > 0 ? { use: 'work', type: 'physical', ...patientAddress } : undefined;
}

export function addAssessmentServiceRequest(
  medplum: MedplumClient,
  patient: Patient,
  episodeOfCare: EpisodeOfCare,
  answers: Record<string, QuestionnaireResponseItemAnswer>
): Promise<ServiceRequest> {
  return medplum.createResource<ServiceRequest>({
    identifier: [
      {
        system: CASE_SERVICE_IDENTIFIER_URL,
        value: `${episodeOfCare.identifier?.[0]?.value}:assessment`,
      },
    ],
    resourceType: 'ServiceRequest',
    reasonCode: [
      {
        text: 'Assessment service',
      },
    ],
    status: 'active',
    intent: 'order',
    subject: createReference(patient),
    authoredOn: new Date().toISOString(),
    category: [
      {
        ...(answers['service-type']?.valueCoding ? { coding: [answers['service-type'].valueCoding] } : {}),
      },
    ],
    supportingInfo: [createReference(episodeOfCare)],
    basedOn: episodeOfCare.referralRequest,
    quantityQuantity: { value: 1, unit: 'session' },
  });
}

/**
 * Creates the "Schedule assessment" Task that kicks off scheduling once a patient has been onboarded.
 *
 * @param medplum - The Medplum client
 * @param patient - The newly onboarded patient
 * @param episodeOfCare - The patient's episode of care, used for its case number and as the task's basedOn
 * @param serviceRequest - The assessment ServiceRequest, used as the task's focus
 */
export function addScheduleAssessmentTask(
  medplum: MedplumClient,
  patient: Patient,
  episodeOfCare: EpisodeOfCare,
  serviceRequest: ServiceRequest
): Promise<Task> {
  return medplum.createResource<Task>({
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: 'routine',
    identifier: [
      {
        system: CASE_TASK_IDENTIFIER_URL,
        value: `${episodeOfCare.identifier?.[0]?.value}:schedule-assessment`,
      },
    ],
    code: {
      coding: [
        {
          system: TASK_CODES_CODE_SYSTEM_URL,
          code: 'schedule-assessment',
          display: 'Schedule assessment',
        },
      ],
    },
    description: 'Schedule assessment',
    focus: createReference(serviceRequest),
    for: createReference(patient),
    basedOn: [createReference(episodeOfCare)],
    authoredOn: new Date().toISOString(),
  });
}
