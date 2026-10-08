//
// patientIntakeSchema.ts
//
// Typed form values, validation, and QuestionnaireResponse builder for the
// new controlled-input Patient Intake form...
//
// onboardPatient() and searchForMatchingPatients() are unchanged — they still
// receive a QuestionnaireResponse produced by buildPatientIntakeResponse()...
//
import type {
  InsurancePlan,
  Organization,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  Reference,
  Resource,
} from '@medplum/fhirtypes';
import { PATIENT_INTAKE_QUESTIONNAIRE_URL } from '../../config/chimera-urls';
import { AVIVA_HEALTH_NAME, OPTIMA_HEALTH_NAME, VITALITY_HEALTH_NAME } from '../../config/constants';
import { isValidEmail, isValidUkPostcode } from '../../utils/emailUtils';

// ---------------------------------------------------------------------------
// Form values...
// ---------------------------------------------------------------------------
export interface PatientIntakeFormValues {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  homeAddressLine1: string;
  homeAddressLine2: string;
  homeCity: string;
  homeCounty: string;
  homePostcode: string;
  homePhone: string;
  homeEmail: string;
  workAddressLine1: string;
  workAddressLine2: string;
  workCity: string;
  workCounty: string;
  workPostcode: string;
  workPhone: string;
  workEmail: string;
  healthcareProviderRef: Reference<Organization> | null;
  insuranceProviderRef: Reference<Organization> | null;
  subscriberId: string;
  referralDate: string;
  serviceTypeCode: string;
  serviceTypeDisplay: string;
  consentForTreatment: boolean;
  consentDate: string;
  optimaEmployerRef: Reference<Organization> | null;
  optimaLocation: string;
  optimaFacility: string;
  insurancePlanRef: Reference<InsurancePlan> | null;
}

export type PatientIntakeFormErrors = Partial<Record<keyof PatientIntakeFormValues, string>>;

export const PATIENT_INTAKE_INITIAL_VALUES: PatientIntakeFormValues = {
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  homeAddressLine1: '',
  homeAddressLine2: '',
  homeCity: '',
  homeCounty: '',
  homePostcode: '',
  homePhone: '',
  homeEmail: '',
  workAddressLine1: '',
  workAddressLine2: '',
  workCity: '',
  workCounty: '',
  workPostcode: '',
  workPhone: '',
  workEmail: '',
  healthcareProviderRef: null,
  insuranceProviderRef: null,
  subscriberId: '',
  referralDate: '',
  serviceTypeCode: '',
  serviceTypeDisplay: '',
  consentForTreatment: false,
  consentDate: '',
  optimaEmployerRef: null,
  optimaLocation: '',
  optimaFacility: '',
  insurancePlanRef: null,
};

// ---------------------------------------------------------------------------
// Validation...
// ---------------------------------------------------------------------------
export function validatePatientIntakeForm(values: PatientIntakeFormValues): PatientIntakeFormErrors {
  const errors: PatientIntakeFormErrors = {};

  if (!values.firstName.trim()) errors.firstName = 'Required';
  if (!values.lastName.trim()) errors.lastName = 'Required';
  if (!values.dob) {
    errors.dob = 'Required';
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (values.dob < '1900-01-01' || values.dob > today) {
      errors.dob = 'Date of birth must be between 01/01/1900 and today';
    }
  }
  if (!values.gender) errors.gender = 'Required';

  if (!values.homeAddressLine1.trim()) errors.homeAddressLine1 = 'Required';
  if (!values.homeCity.trim()) errors.homeCity = 'Required';
  if (!values.homePostcode.trim()) {
    errors.homePostcode = 'Required';
  } else if (!isValidUkPostcode(values.homePostcode)) {
    errors.homePostcode = 'Please enter a valid UK postcode';
  }
  if (!values.homePhone.trim()) errors.homePhone = 'Required';
  if (values.homeEmail.trim() && !isValidEmail(values.homeEmail)) {
    errors.homeEmail = 'Please enter a valid email address';
  }

  if (values.workPostcode.trim() && !isValidUkPostcode(values.workPostcode)) {
    errors.workPostcode = 'Please enter a valid UK postcode';
  }
  if (values.workEmail.trim() && !isValidEmail(values.workEmail)) {
    errors.workEmail = 'Please enter a valid email address';
  }

  if (!values.healthcareProviderRef) errors.healthcareProviderRef = 'Required';
  if (!values.insuranceProviderRef) errors.insuranceProviderRef = 'Required';

  if (!values.referralDate) errors.referralDate = 'Required';
  if (!values.serviceTypeCode) errors.serviceTypeCode = 'Required';

  if (values.insuranceProviderRef?.display === OPTIMA_HEALTH_NAME) {
    if (!values.optimaEmployerRef) errors.optimaEmployerRef = 'Required for Optima Health';
    if (!values.optimaLocation.trim()) errors.optimaLocation = 'Required for Optima Health';
    if (!values.optimaFacility.trim()) errors.optimaFacility = 'Required for Optima Health';
  }

  if (
    values.insuranceProviderRef?.display === AVIVA_HEALTH_NAME ||
    values.insuranceProviderRef?.display === VITALITY_HEALTH_NAME
  ) {
    if (!values.insurancePlanRef) errors.insurancePlanRef = 'Required';
  }

  if (values.consentForTreatment && !values.consentDate) {
    errors.consentDate = 'Required when consent is given';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// QuestionnaireResponse builder
// Produces a response whose linkIds exactly match patientIntakeQuestionnaire.ts
// so that onboardPatient() / searchForMatchingPatients() work unchanged.
// ---------------------------------------------------------------------------
function str(linkId: string, value: string): QuestionnaireResponseItem | null {
  return value.trim() ? { linkId, answer: [{ valueString: value.trim() }] } : null;
}

function date(linkId: string, value: string): QuestionnaireResponseItem | null {
  return value ? { linkId, answer: [{ valueDate: value }] } : null;
}

function bool(linkId: string, value: boolean): QuestionnaireResponseItem {
  return { linkId, answer: [{ valueBoolean: value }] };
}

function ref<T extends Resource>(linkId: string, value: Reference<T> | null): QuestionnaireResponseItem | null {
  return value ? { linkId, answer: [{ valueReference: value }] } : null;
}

function filter<T>(items: (T | null)[]): T[] {
  return items.filter((i): i is T => i !== null);
}

export function buildPatientIntakeResponse(values: PatientIntakeFormValues): QuestionnaireResponse {
  const demographics: QuestionnaireResponseItem[] = filter([
    str('first-name', values.firstName),
    str('last-name', values.lastName),
    date('dob', values.dob),
    values.gender
      ? {
          linkId: 'gender',
          answer: [
            {
              valueCoding: {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: values.gender,
                display: values.gender.charAt(0).toUpperCase() + values.gender.slice(1),
              },
            },
          ],
        }
      : null,
  ]);

  const homeContact: QuestionnaireResponseItem[] = filter([
    str('home-address-line1', values.homeAddressLine1),
    str('home-address-line2', values.homeAddressLine2),
    str('home-city', values.homeCity),
    str('home-county', values.homeCounty),
    str('home-postcode', values.homePostcode),
    str('home-phone', values.homePhone),
    str('home-email', values.homeEmail),
  ]);

  const workContact: QuestionnaireResponseItem[] = filter([
    str('work-address-line1', values.workAddressLine1),
    str('work-address-line2', values.workAddressLine2),
    str('work-city', values.workCity),
    str('work-county', values.workCounty),
    str('work-postcode', values.workPostcode),
    str('work-phone', values.workPhone),
    str('work-email', values.workEmail),
  ]);

  const coverage: QuestionnaireResponseItem[] = filter([
    ref('healthcare-provider', values.healthcareProviderRef),
    ref('insurance-provider', values.insuranceProviderRef),
    str('subscriber-id', values.subscriberId),
    ref('optima-employer', values.optimaEmployerRef),
    str('optima-location', values.optimaLocation),
    str('optima-facility', values.optimaFacility),
    ref('insurance-plan', values.insurancePlanRef),
  ]);

  const caseCreation: QuestionnaireResponseItem[] = filter([
    date('referral-date', values.referralDate),
    values.serviceTypeCode
      ? {
          linkId: 'service-type',
          answer: [
            {
              valueCoding: {
                code: values.serviceTypeCode,
                display: values.serviceTypeDisplay || values.serviceTypeCode,
              },
            },
          ],
        }
      : null,
  ]);

  const consentItems: QuestionnaireResponseItem[] = filter([
    bool('consent-for-treatment-signature', values.consentForTreatment),
    values.consentForTreatment ? date('consent-for-treatment-date', values.consentDate) : null,
  ]);

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: PATIENT_INTAKE_QUESTIONNAIRE_URL,
    item: [
      { linkId: 'patient-demographics', item: demographics },
      { linkId: 'home-contact-details', item: homeContact },
      { linkId: 'work-contact-details', item: workContact },
      { linkId: 'coverage-information', item: coverage },
      { linkId: 'case-creation', item: caseCreation },
      { linkId: 'consent-for-treatment', item: consentItems },
    ],
  };
}

// ---------------------------------------------------------------------------
// Single-entry coverage answers
// Used in place of getGroupRepeatedAnswers since the form has one provider only.
// ---------------------------------------------------------------------------
import type { QuestionnaireResponseItemAnswer } from '@medplum/fhirtypes';

export function buildCoverageAnswers(values: PatientIntakeFormValues): Record<string, QuestionnaireResponseItemAnswer> {
  const answers: Record<string, QuestionnaireResponseItemAnswer> = {};
  if (values.insuranceProviderRef) {
    answers['insurance-provider'] = { valueReference: values.insuranceProviderRef };
  }
  if (values.healthcareProviderRef) {
    answers['healthcare-provider'] = { valueReference: values.healthcareProviderRef };
  }
  if (values.subscriberId.trim()) {
    answers['subscriber-id'] = { valueString: values.subscriberId.trim() };
  }
  if (values.insurancePlanRef) {
    answers['insurance-plan'] = { valueReference: values.insurancePlanRef };
  }
  return answers;
}
