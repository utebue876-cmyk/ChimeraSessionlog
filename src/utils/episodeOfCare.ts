import type { MedplumClient } from '@medplum/core';
import { createReference } from '@medplum/core';
import type {
  Coverage,
  EpisodeOfCare,
  Extension,
  Organization,
  Patient,
  QuestionnaireResponseItemAnswer,
  Reference,
  ServiceRequest,
} from '@medplum/fhirtypes';
import {
  CASE_STATE_CODE_SYSTEM_URL,
  EOC_CASE_STATE_URL,
  MH_CASE_CONSENT_DATE_URL,
  MH_CASE_CONSENT_SIGNED_URL,
  OPTIMA_EMPLOYER_EXTENSION_URL,
} from '../config/chimera-urls';
import { generateCaseNumber } from './caseNumber';

// Maps each mh-case-state code (the EOC_CASE_STATE_URL extension's valueCoding.code) to the
// EpisodeOfCare.status it corresponds to — values are the standard HL7 codes from
// http://hl7.org/fhir/episode-of-care-status, not Chimera-specific.
const CASE_STATE_TO_EPISODE_STATUS: Record<string, EpisodeOfCare['status']> = {
  'awaiting-acceptance': 'planned',
  'accepted-awaiting-booking': 'waitlist',
  'awaiting-assessment': 'active',
  'awaiting-treatment-decision': 'active',
  'in-treatment': 'active',
  'awaiting-discharge-report': 'active',
  'on-hold': 'onhold',
  discharged: 'finished',
  cancelled: 'cancelled',
};

/**
 * Maps an mh-case-state code to its corresponding EpisodeOfCare.status, so the two always stay in
 * sync whenever the case-state changes (e.g. from `createEpisodeOfCare` or the Case edit modal).
 *
 * @param caseStateCode - The mh-case-state code (EOC_CASE_STATE_URL extension's valueCoding.code).
 * @param fallback - Status to use when the code is missing or unrecognized. Defaults to 'planned'.
 * @returns The EpisodeOfCare.status that corresponds to the given case-state code.
 */
export function mapCaseStateToEpisodeStatus(
  caseStateCode: string | undefined,
  fallback: EpisodeOfCare['status'] = 'planned'
): EpisodeOfCare['status'] {
  if (!caseStateCode) {
    return fallback;
  }
  return CASE_STATE_TO_EPISODE_STATUS[caseStateCode] ?? fallback;
}

export const createEpisodeOfCare = async (
  medplum: MedplumClient,
  patient: Patient,
  answers: Record<string, QuestionnaireResponseItemAnswer>,
  coverage?: Coverage
): Promise<EpisodeOfCare> => {
  const consentSigned = answers['consent-for-treatment-signature']?.valueBoolean ?? false;

  const caseStateCoding = {
    system: CASE_STATE_CODE_SYSTEM_URL,
    code: consentSigned ? 'accepted-awaiting-booking' : 'awaiting-acceptance',
    display: consentSigned ? 'Accepted, awaiting booking' : 'Awaiting acceptance',
  };

  const episodeOfCare: EpisodeOfCare = {
    resourceType: 'EpisodeOfCare',
    status: mapCaseStateToEpisodeStatus(caseStateCoding.code),
    patient: createReference(patient),
  };

  if (answers['referral-date']?.valueDate) {
    episodeOfCare.period = { start: answers['referral-date'].valueDate };
  }

  if (answers['service-type']?.valueCoding) {
    episodeOfCare.type = [
      {
        coding: [answers['service-type'].valueCoding],
      },
    ];
  }

  // Add as extension for detailed data (using valueCoding to preserve display text)
  episodeOfCare.extension = episodeOfCare.extension || [];
  episodeOfCare.extension.push({
    url: EOC_CASE_STATE_URL,
    valueCoding: caseStateCoding,
  });

  episodeOfCare.extension.push({ url: MH_CASE_CONSENT_SIGNED_URL, valueBoolean: consentSigned });
  if (consentSigned && answers['consent-for-treatment-date']?.valueDate) {
    episodeOfCare.extension.push({
      url: MH_CASE_CONSENT_DATE_URL,
      valueDate: answers['consent-for-treatment-date'].valueDate,
    });
  }

  const healthcareProvider = answers['healthcare-provider']?.valueReference as Reference<Organization>;
  if (healthcareProvider) {
    episodeOfCare.managingOrganization = healthcareProvider;
  }

  const insuranceProvider = answers['insurance-provider']?.valueReference as Reference<Organization> | undefined;

  // Create a ServiceRequest with the insurance provider as the requester and Coverage as insurance
  const serviceRequest: ServiceRequest = await medplum.createResource<ServiceRequest>({
    resourceType: 'ServiceRequest',
    reasonCode: [
      {
        text: 'Patient intake via online form',
      },
    ],
    status: 'active',
    intent: 'order',
    subject: createReference(patient),
    ...(insuranceProvider ? { requester: insuranceProvider } : {}),
    ...(coverage ? { insurance: [createReference(coverage)] } : {}),
    authoredOn: new Date().toISOString(),
    category: [
      {
        ...(answers['service-type']?.valueCoding ? { coding: [answers['service-type'].valueCoding] } : {}),
      },
    ],
  });

  // Link the ServiceRequest to the EpisodeOfCare via referralRequest
  episodeOfCare.referralRequest = [createReference(serviceRequest)];

  const optimaEmployer = answers['optima-employer']?.valueReference;
  const optimaLocation = answers['optima-location']?.valueString;
  const optimaFacility = answers['optima-facility']?.valueString;
  if (optimaEmployer ?? optimaLocation ?? optimaFacility) {
    const optimaExtension: Extension = {
      url: OPTIMA_EMPLOYER_EXTENSION_URL,
      extension: [
        ...(optimaEmployer ? [{ url: 'employer', valueReference: optimaEmployer }] : []),
        ...(optimaLocation ? [{ url: 'location', valueString: optimaLocation }] : []),
        ...(optimaFacility ? [{ url: 'facility', valueString: optimaFacility }] : []),
      ],
    };
    episodeOfCare.extension = [...(episodeOfCare.extension ?? []), optimaExtension];
  }

  episodeOfCare.identifier = [await generateCaseNumber(medplum)];

  return medplum.createResource(episodeOfCare);
};
