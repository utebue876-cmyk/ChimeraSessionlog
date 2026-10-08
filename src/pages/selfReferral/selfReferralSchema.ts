import type { QuestionnaireResponse, QuestionnaireResponseItem } from '@medplum/fhirtypes';
import { MH_AWG_INTAKE_ASSESSMENT_URL } from '../../config/chimera-urls';
import { selfReferralQuestionnaire } from '../../questionnaires/selfReferralQuestionnaire';
import { isValidEmail, isValidUkPostcode } from '../../utils/emailUtils';

export const TRIGGERING_FACTOR_OPTIONS = [
  { value: 'financial', label: 'Financial' },
  { value: 'housing', label: 'Housing' },
  { value: 'elderly-relatives', label: 'Elderly relatives' },
  { value: 'other', label: 'Other' },
  { value: 'work', label: 'Work' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'bereavement', label: 'Bereavement' },
  { value: 'career', label: 'Career' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'general-health-wellbeing', label: 'General health and wellbeing' },
];

export interface SelfReferralFormValues {
  riskOfHarm: string;
  protectiveFactors: string;
  triggeringFactors: string[];
  substanceUse: string;
  pastPsychologicalProblems: string;
  pastTherapy: string;
  mentalHealthMedication: string;
  mainProblem: string;
  problemStart: string;
  problemAspectsSymptoms: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  county: string;
  postcode: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  consentDataProcessing: boolean;
  consentShareAlliance: boolean;
  consentShareAnglianWater: boolean;
}

export type SelfReferralFormErrors = Partial<Record<keyof SelfReferralFormValues, string>>;

export const SELF_REFERRAL_INITIAL_VALUES: SelfReferralFormValues = {
  riskOfHarm: '',
  protectiveFactors: '',
  triggeringFactors: [],
  substanceUse: '',
  pastPsychologicalProblems: '',
  pastTherapy: '',
  mentalHealthMedication: '',
  mainProblem: '',
  problemStart: '',
  problemAspectsSymptoms: '',
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  town: '',
  county: '',
  postcode: '',
  dob: '',
  gender: '',
  phone: '',
  email: '',
  consentDataProcessing: false,
  consentShareAlliance: false,
  consentShareAnglianWater: false,
};

export function validateSelfReferralPersonal(values: SelfReferralFormValues): SelfReferralFormErrors {
  const errors: SelfReferralFormErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'Required';
  if (!values.lastName.trim()) errors.lastName = 'Required';
  if (!values.addressLine1.trim()) errors.addressLine1 = 'Required';
  if (!values.town.trim()) errors.town = 'Required';
  if (!values.county.trim()) errors.county = 'Required';
  if (!values.postcode.trim()) {
    errors.postcode = 'Required';
  } else if (!isValidUkPostcode(values.postcode)) {
    errors.postcode = 'Please enter a valid UK postcode';
  }
  if (!values.dob) {
    errors.dob = 'Required';
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (values.dob < '1900-01-01' || values.dob > today) {
      errors.dob = 'Date of birth must be between 01/01/1900 and today';
    }
  }
  if (!values.gender) errors.gender = 'Required';
  if (!values.phone.trim()) errors.phone = 'Required';
  if (!values.email.trim()) {
    errors.email = 'Required';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }
  if (!values.consentDataProcessing) errors.consentDataProcessing = 'You must agree to proceed';
  if (!values.consentShareAlliance) errors.consentShareAlliance = 'You must agree to proceed';
  if (!values.consentShareAnglianWater) errors.consentShareAnglianWater = 'You must agree to proceed';
  return errors;
}

function strItem(linkId: string, value: string): QuestionnaireResponseItem | null {
  return value.trim() ? { linkId, answer: [{ valueString: value.trim() }] } : null;
}

function boolItem(linkId: string, value: string): QuestionnaireResponseItem | null {
  return value !== '' ? { linkId, answer: [{ valueBoolean: value === 'true' }] } : null;
}

export interface SelfReferralResponseExtras {
  billingAddress?: {
    line1: string;
    line2?: string;
    town: string;
    county: string;
    postcode: string;
  };
  appointmentStartIso?: string;
}

export function buildSelfReferralResponse(
  values: SelfReferralFormValues,
  extras?: SelfReferralResponseExtras
): QuestionnaireResponse {
  const clinical: QuestionnaireResponseItem[] = [
    boolItem('risk-of-harm', values.riskOfHarm),
    strItem('protective-factors', values.protectiveFactors),
    values.triggeringFactors.length > 0
      ? {
          linkId: 'triggering-factors',
          answer: values.triggeringFactors.map((code) => ({
            valueCoding: {
              code,
              display: TRIGGERING_FACTOR_OPTIONS.find((o) => o.value === code)?.label ?? code,
            },
          })),
        }
      : null,
    boolItem('substance-use', values.substanceUse),
    boolItem('past-psychological-problems', values.pastPsychologicalProblems),
    boolItem('past-therapy', values.pastTherapy),
    boolItem('mental-health-medication', values.mentalHealthMedication),
    strItem('main-problem', values.mainProblem),
    strItem('problem-start', values.problemStart),
    strItem('problem-aspects-symptoms', values.problemAspectsSymptoms),
  ].filter((i): i is QuestionnaireResponseItem => i !== null);

  const personal: QuestionnaireResponseItem[] = [
    strItem('first-name', values.firstName),
    strItem('surname', values.lastName),
    strItem('address-line1', values.addressLine1),
    strItem('address-line2', values.addressLine2),
    strItem('town', values.town),
    strItem('county', values.county),
    strItem('postcode', values.postcode),
    values.dob ? { linkId: 'dob', answer: [{ valueDate: values.dob }] } : null,
    values.gender
      ? {
          linkId: 'gender',
          answer: [
            {
              valueCoding: {
                code: values.gender,
                display: values.gender.charAt(0).toUpperCase() + values.gender.slice(1),
              },
            },
          ],
        }
      : null,
    strItem('preferred-contact-number', values.phone),
    strItem('email', values.email),
  ].filter((i): i is QuestionnaireResponseItem => i !== null);

  const consent: QuestionnaireResponseItem[] = [
    { linkId: 'consent-data-processing', answer: [{ valueBoolean: values.consentDataProcessing }] },
    { linkId: 'consent-share-alliance', answer: [{ valueBoolean: values.consentShareAlliance }] },
    { linkId: 'consent-share-anglian-water', answer: [{ valueBoolean: values.consentShareAnglianWater }] },
  ];

  const payment: QuestionnaireResponseItem[] = extras?.billingAddress
    ? [
        strItem('billing-address-line1', extras.billingAddress.line1),
        strItem('billing-address-line2', extras.billingAddress.line2 ?? ''),
        strItem('billing-town', extras.billingAddress.town),
        strItem('billing-county', extras.billingAddress.county),
        strItem('billing-postcode', extras.billingAddress.postcode),
      ].filter((i): i is QuestionnaireResponseItem => i !== null)
    : [];

  const appointment: QuestionnaireResponseItem[] = extras?.appointmentStartIso
    ? [{ linkId: 'appointment-datetime', answer: [{ valueDateTime: extras.appointmentStartIso }] }]
    : [];

  const groups: QuestionnaireResponseItem[] = [
    { linkId: 'clinical-questions', item: clinical },
    { linkId: 'personal-details', item: personal },
    ...(payment.length > 0 ? [{ linkId: 'payment-details', item: payment }] : []),
    ...(appointment.length > 0 ? [{ linkId: 'appointment-details', item: appointment }] : []),
    { linkId: 'consent', item: consent },
  ];

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: selfReferralQuestionnaire.url,
    item: groups,
  };
}

export function buildMhAwgIntakeResponse(values: SelfReferralFormValues): QuestionnaireResponse {
  const items: QuestionnaireResponseItem[] = [
    boolItem('risk-of-harm', values.riskOfHarm),
    strItem('protective-factors', values.protectiveFactors),
    values.triggeringFactors.length > 0
      ? {
          linkId: 'triggering-factors',
          answer: values.triggeringFactors.map((code) => ({
            valueString: TRIGGERING_FACTOR_OPTIONS.find((o) => o.value === code)?.label ?? code,
          })),
        }
      : null,
    boolItem('substance-use', values.substanceUse),
    boolItem('past-psychological-problems', values.pastPsychologicalProblems),
    boolItem('past-therapy', values.pastTherapy),
    boolItem('mental-health-medication', values.mentalHealthMedication),
    strItem('main-problem', values.mainProblem),
    strItem('problem-start', values.problemStart),
    strItem('problem-aspects-symptoms', values.problemAspectsSymptoms),
  ].filter((i): i is QuestionnaireResponseItem => i !== null);

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: MH_AWG_INTAKE_ASSESSMENT_URL,
    item: items,
  };
}
