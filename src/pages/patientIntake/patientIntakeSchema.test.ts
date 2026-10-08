import { describe, expect, test } from 'vitest';
import { OPTIMA_HEALTH_NAME } from '../../config/constants';
import {
  buildCoverageAnswers,
  buildPatientIntakeResponse,
  PATIENT_INTAKE_INITIAL_VALUES,
  validatePatientIntakeForm,
  type PatientIntakeFormValues,
} from './patientIntakeSchema';

function validValues(overrides: Partial<PatientIntakeFormValues> = {}): PatientIntakeFormValues {
  return {
    ...PATIENT_INTAKE_INITIAL_VALUES,
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-01-01',
    gender: 'female',
    homeAddressLine1: '1 Main St',
    homeCity: 'Nottingham',
    homePostcode: 'NG1 1AA',
    homePhone: '07700900000',
    healthcareProviderRef: { reference: 'Organization/service-line-1', display: 'Service Line' },
    insuranceProviderRef: { reference: 'Organization/funder-1', display: 'Aviva Health' },
    insurancePlanRef: { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' },
    referralDate: '2026-01-01',
    serviceTypeCode: 'treatment-only',
    serviceTypeDisplay: 'Treatment Only',
    ...overrides,
  };
}

describe('validatePatientIntakeForm', () => {
  test('returns no errors for a fully valid non-Optima submission', () => {
    expect(validatePatientIntakeForm(validValues())).toEqual({});
  });

  test('flags required demographic and address fields when missing', () => {
    const errors = validatePatientIntakeForm(PATIENT_INTAKE_INITIAL_VALUES);

    expect(errors.firstName).toBe('Required');
    expect(errors.lastName).toBe('Required');
    expect(errors.dob).toBe('Required');
    expect(errors.gender).toBe('Required');
    expect(errors.homeAddressLine1).toBe('Required');
    expect(errors.homeCity).toBe('Required');
    expect(errors.homePostcode).toBe('Required');
    expect(errors.homePhone).toBe('Required');
    expect(errors.healthcareProviderRef).toBe('Required');
    expect(errors.insuranceProviderRef).toBe('Required');
    expect(errors.referralDate).toBe('Required');
    expect(errors.serviceTypeCode).toBe('Required');
  });

  test('rejects a date of birth outside the valid range', () => {
    expect(validatePatientIntakeForm(validValues({ dob: '1899-12-31' })).dob).toBe(
      'Date of birth must be between 01/01/1900 and today'
    );
    expect(validatePatientIntakeForm(validValues({ dob: '2999-01-01' })).dob).toBe(
      'Date of birth must be between 01/01/1900 and today'
    );
  });

  test('validates UK postcode format for home and work addresses', () => {
    expect(validatePatientIntakeForm(validValues({ homePostcode: 'not-a-postcode' })).homePostcode).toBe(
      'Please enter a valid UK postcode'
    );
    expect(validatePatientIntakeForm(validValues({ workPostcode: 'not-a-postcode' })).workPostcode).toBe(
      'Please enter a valid UK postcode'
    );
  });

  test('validates email format for home and work emails when provided', () => {
    expect(validatePatientIntakeForm(validValues({ homeEmail: 'not-an-email' })).homeEmail).toBe(
      'Please enter a valid email address'
    );
    expect(validatePatientIntakeForm(validValues({ workEmail: 'not-an-email' })).workEmail).toBe(
      'Please enter a valid email address'
    );
    expect(validatePatientIntakeForm(validValues({ homeEmail: 'jane@example.com' })).homeEmail).toBeUndefined();
  });

  test('requires employer, location and facility when the funder is Optima Health', () => {
    const errors = validatePatientIntakeForm(
      validValues({ insuranceProviderRef: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME } })
    );

    expect(errors.optimaEmployerRef).toBe('Required for Optima Health');
    expect(errors.optimaLocation).toBe('Required for Optima Health');
    expect(errors.optimaFacility).toBe('Required for Optima Health');
  });

  test('does not require Optima fields when the funder is not Optima Health', () => {
    const errors = validatePatientIntakeForm(validValues());

    expect(errors.optimaEmployerRef).toBeUndefined();
    expect(errors.optimaLocation).toBeUndefined();
    expect(errors.optimaFacility).toBeUndefined();
  });

  test('requires an insurance plan when the funder is Aviva or Vitality Health', () => {
    expect(validatePatientIntakeForm(validValues({ insurancePlanRef: null })).insurancePlanRef).toBe('Required');
    expect(
      validatePatientIntakeForm(
        validValues({
          insuranceProviderRef: { reference: 'Organization/vitality', display: 'Vitality Health' },
          insurancePlanRef: null,
        })
      ).insurancePlanRef
    ).toBe('Required');
  });

  test('does not require an insurance plan when the funder is Optima Health', () => {
    const errors = validatePatientIntakeForm(
      validValues({
        insuranceProviderRef: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME },
        insurancePlanRef: null,
        optimaEmployerRef: { reference: 'Organization/employer-1', display: 'Acme Corp' },
        optimaLocation: 'Nottingham',
        optimaFacility: 'Main Site',
      })
    );

    expect(errors.insurancePlanRef).toBeUndefined();
  });

  test('requires a consent date only when consent is given', () => {
    expect(validatePatientIntakeForm(validValues({ consentForTreatment: true, consentDate: '' })).consentDate).toBe(
      'Required when consent is given'
    );
    expect(
      validatePatientIntakeForm(validValues({ consentForTreatment: true, consentDate: '2026-01-01' })).consentDate
    ).toBeUndefined();
    expect(validatePatientIntakeForm(validValues({ consentForTreatment: false })).consentDate).toBeUndefined();
  });
});

describe('buildPatientIntakeResponse', () => {
  test('produces a QuestionnaireResponse with the expected group linkIds', () => {
    const response = buildPatientIntakeResponse(validValues());

    expect(response.resourceType).toBe('QuestionnaireResponse');
    expect(response.status).toBe('completed');
    expect(response.item?.map((item) => item.linkId)).toEqual([
      'patient-demographics',
      'home-contact-details',
      'work-contact-details',
      'coverage-information',
      'case-creation',
      'consent-for-treatment',
    ]);
  });

  test('includes demographic answers with a titleised gender display', () => {
    const response = buildPatientIntakeResponse(validValues());
    const demographics = response.item?.find((item) => item.linkId === 'patient-demographics');

    expect(demographics?.item).toEqual(
      expect.arrayContaining([
        { linkId: 'first-name', answer: [{ valueString: 'Jane' }] },
        { linkId: 'last-name', answer: [{ valueString: 'Doe' }] },
        { linkId: 'dob', answer: [{ valueDate: '1990-01-01' }] },
        {
          linkId: 'gender',
          answer: [
            {
              valueCoding: {
                system: 'http://hl7.org/fhir/administrative-gender',
                code: 'female',
                display: 'Female',
              },
            },
          ],
        },
      ])
    );
  });

  test('omits blank optional fields instead of including empty answers', () => {
    const response = buildPatientIntakeResponse(validValues({ homeAddressLine2: '', workEmail: '' }));
    const homeContact = response.item?.find((item) => item.linkId === 'home-contact-details');
    const workContact = response.item?.find((item) => item.linkId === 'work-contact-details');

    expect(homeContact?.item?.some((item) => item.linkId === 'home-address-line2')).toBe(false);
    expect(workContact?.item?.some((item) => item.linkId === 'work-email')).toBe(false);
  });

  test('includes Optima employer/location/facility references when present', () => {
    const response = buildPatientIntakeResponse(
      validValues({
        optimaEmployerRef: { reference: 'Organization/employer-1', display: 'Acme Corp' },
        optimaLocation: 'Nottingham',
        optimaFacility: 'Main Site',
      })
    );
    const coverage = response.item?.find((item) => item.linkId === 'coverage-information');

    expect(coverage?.item).toEqual(
      expect.arrayContaining([
        {
          linkId: 'optima-employer',
          answer: [{ valueReference: { reference: 'Organization/employer-1', display: 'Acme Corp' } }],
        },
        { linkId: 'optima-location', answer: [{ valueString: 'Nottingham' }] },
        { linkId: 'optima-facility', answer: [{ valueString: 'Main Site' }] },
      ])
    );
  });

  test('includes an insurance plan reference when present', () => {
    const response = buildPatientIntakeResponse(
      validValues({ insurancePlanRef: { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' } })
    );
    const coverage = response.item?.find((item) => item.linkId === 'coverage-information');

    expect(coverage?.item).toEqual(
      expect.arrayContaining([
        {
          linkId: 'insurance-plan',
          answer: [{ valueReference: { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' } }],
        },
      ])
    );
  });

  test('only includes a consent date answer when consent was given', () => {
    const withConsent = buildPatientIntakeResponse(
      validValues({ consentForTreatment: true, consentDate: '2026-01-02' })
    );
    const consentGroup = withConsent.item?.find((item) => item.linkId === 'consent-for-treatment');
    expect(consentGroup?.item).toEqual([
      { linkId: 'consent-for-treatment-signature', answer: [{ valueBoolean: true }] },
      { linkId: 'consent-for-treatment-date', answer: [{ valueDate: '2026-01-02' }] },
    ]);

    const withoutConsent = buildPatientIntakeResponse(validValues({ consentForTreatment: false }));
    const consentGroupWithout = withoutConsent.item?.find((item) => item.linkId === 'consent-for-treatment');
    expect(consentGroupWithout?.item).toEqual([
      { linkId: 'consent-for-treatment-signature', answer: [{ valueBoolean: false }] },
    ]);
  });
});

describe('buildCoverageAnswers', () => {
  test('maps populated fields to their answer shape', () => {
    const answers = buildCoverageAnswers(
      validValues({
        insuranceProviderRef: { reference: 'Organization/funder-1', display: 'Aviva Health' },
        healthcareProviderRef: { reference: 'Organization/service-line-1', display: 'Service Line' },
        subscriberId: '  sub-123  ',
        insurancePlanRef: { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' },
      })
    );

    expect(answers).toEqual({
      'insurance-provider': { valueReference: { reference: 'Organization/funder-1', display: 'Aviva Health' } },
      'healthcare-provider': { valueReference: { reference: 'Organization/service-line-1', display: 'Service Line' } },
      'subscriber-id': { valueString: 'sub-123' },
      'insurance-plan': { valueReference: { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' } },
    });
  });

  test('omits keys for unset fields', () => {
    const answers = buildCoverageAnswers({
      ...PATIENT_INTAKE_INITIAL_VALUES,
      insuranceProviderRef: null,
      healthcareProviderRef: null,
      subscriberId: '',
    });

    expect(answers).toEqual({});
  });
});
