import { describe, expect, test } from 'vitest';
import {
  buildMhAwgIntakeResponse,
  buildSelfReferralResponse,
  SELF_REFERRAL_INITIAL_VALUES,
  validateSelfReferralPersonal,
} from './selfReferralSchema';

describe('selfReferralSchema', () => {
  test('validateSelfReferralPersonal returns errors for invalid required fields', () => {
    const errors = validateSelfReferralPersonal(SELF_REFERRAL_INITIAL_VALUES);
    expect(errors.firstName).toBe('Required');
    expect(errors.postcode).toBe('Required');
    expect(errors.consentDataProcessing).toBe('You must agree to proceed');
  });

  test('buildSelfReferralResponse includes optional payment and appointment groups', () => {
    const values = {
      ...SELF_REFERRAL_INITIAL_VALUES,
      firstName: 'Jane',
      lastName: 'Doe',
      addressLine1: '1 High Street',
      town: 'Norwich',
      county: 'Norfolk',
      postcode: 'NR1 1AA',
      dob: '1990-01-01',
      gender: 'female',
      phone: '0123456789',
      email: 'jane@example.com',
      consentDataProcessing: true,
      consentShareAlliance: true,
      consentShareAnglianWater: true,
      riskOfHarm: 'false',
      triggeringFactors: ['work'],
    };

    const response = buildSelfReferralResponse(values, {
      billingAddress: {
        line1: '2 Billing Road',
        town: 'Norwich',
        county: 'Norfolk',
        postcode: 'NR2 2BB',
      },
      appointmentStartIso: '2026-01-01T09:00:00Z',
    });

    expect(response.resourceType).toBe('QuestionnaireResponse');
    const linkIds = (response.item ?? []).map((i) => i.linkId);
    expect(linkIds).toContain('payment-details');
    expect(linkIds).toContain('appointment-details');
    expect(linkIds).toContain('consent');
  });

  test('buildMhAwgIntakeResponse includes triggering factor display values', () => {
    const response = buildMhAwgIntakeResponse({
      ...SELF_REFERRAL_INITIAL_VALUES,
      riskOfHarm: 'false',
      triggeringFactors: ['work'],
    });
    const triggerItem = response.item?.find((i) => i.linkId === 'triggering-factors');
    expect(triggerItem?.answer?.[0]?.valueString).toBe('Work');
  });
});
