import type { EpisodeOfCare, InsurancePlan, InsurancePlanCoverageBenefitLimit } from '@medplum/fhirtypes';
import { describe, expect, test } from 'vitest';
import {
  COVERAGE_TYPE_CODE_SYSTEM_URL,
  EOC_ENTITLEMENT_USAGE_EXTENSION_URL,
  MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
} from '../../config/chimera-urls';
import { allocateUsage, getEntitlementUsage, getTreatmentLimits } from './treatmentEntitlements';

const pathway = { system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual' };
const blockCode = 'mh-treatment-talking-therapies';
const limit = (code: string, count: number): InsurancePlanCoverageBenefitLimit => ({
  code: { coding: [{ code }] },
  value: { value: count, unit: 'session' },
});

function plan(pathwayLimits?: InsurancePlanCoverageBenefitLimit[]): InsurancePlan {
  return {
    resourceType: 'InsurancePlan',
    coverage: [
      {
        type: { coding: [{ system: COVERAGE_TYPE_CODE_SYSTEM_URL, code: blockCode }] },
        benefit: [
          { type: { coding: [pathway] }, limit: pathwayLimits },
          {
            type: { coding: [{ system: COVERAGE_TYPE_CODE_SYSTEM_URL, code: blockCode }] },
            limit: [
              limit('standard-sessions', 6),
              limit('maximum-sessions', 8),
              limit('delegated-authority-sessions', 3),
            ],
          },
        ],
      },
    ],
  };
}

describe('getTreatmentLimits', () => {
  test('uses pathway limits instead of the pool header, regardless of limit order', () => {
    expect(
      getTreatmentLimits(plan([limit('standard-sessions', 5), limit('delegated-authority-sessions', 2)]), pathway)
    ).toEqual({ blockCode, limits: { delegated: 2, standard: 5 } });
  });

  test.each([undefined, []])('uses header limits when pathway limits are %s', (limits) => {
    expect(getTreatmentLimits(plan(limits), pathway)).toEqual({ blockCode, limits: { delegated: 3, standard: 6 } });
  });

  test('does not fill an absent tier from the header when any pathway limits exist', () => {
    expect(getTreatmentLimits(plan([limit('standard-sessions', 4)]), pathway).limits).toEqual({ standard: 4 });
    expect(getTreatmentLimits(plan([limit('delegated-authority-sessions', 2)]), pathway).limits).toEqual({
      delegated: 2,
    });
  });

  test('preserves delegated authority of zero', () => {
    expect(getTreatmentLimits(plan([limit('delegated-authority-sessions', 0)]), pathway).limits).toEqual({
      delegated: 0,
    });
  });

  test('ignores maximum-sessions without falling back to header tiers', () => {
    expect(getTreatmentLimits(plan([limit('maximum-sessions', 9)]), pathway).limits).toEqual({});
  });

  test('skips assessments and matches both the pathway system and code in the right block', () => {
    const insurancePlan = plan();
    insurancePlan.coverage!.unshift(
      {
        type: { coding: [{ code: 'mh-assessment' }] },
        benefit: [{ type: { coding: [pathway] }, limit: [limit('standard-sessions', 99)] }],
      },
      {
        type: { coding: [{ code: 'mh-treatment-other' }] },
        benefit: [
          { type: { coding: [{ ...pathway, system: 'other-system' }] }, limit: [limit('standard-sessions', 88)] },
        ],
      }
    );
    expect(getTreatmentLimits(insurancePlan, pathway)).toEqual({ blockCode, limits: { delegated: 3, standard: 6 } });
  });

  test('switches to the block containing the new pathway', () => {
    const insurancePlan = plan();
    const otherPathway = { ...pathway, code: 'counselling-virtual' };
    insurancePlan.coverage!.push({
      type: { coding: [{ code: 'mh-treatment-counselling' }] },
      benefit: [{ type: { coding: [otherPathway] }, limit: [limit('standard-sessions', 12)] }],
    });
    expect(getTreatmentLimits(insurancePlan, otherPathway)).toEqual({
      blockCode: 'mh-treatment-counselling',
      limits: { standard: 12 },
    });
  });

  test('names missing blocks, benefits and pool headers', () => {
    expect(() => getTreatmentLimits({ resourceType: 'InsurancePlan' }, pathway)).toThrow('no treatment coverage block');
    expect(() => getTreatmentLimits(plan(), { ...pathway, code: 'absent' })).toThrow('no treatment benefit');
    const insurancePlan = plan();
    insurancePlan.coverage![0].benefit.pop();
    expect(() => getTreatmentLimits(insurancePlan, pathway)).toThrow('no pool header benefit');
  });

  test('does not invent a count for a configured tier without a Quantity value', () => {
    expect(() => getTreatmentLimits(plan([{ code: { coding: [{ code: 'standard-sessions' }] } }]), pathway)).toThrow(
      'no valid session count'
    );
  });
});

describe('allocateUsage', () => {
  test.each([
    [0, { delegated: 0, standard: 0 }],
    [2, { delegated: 2, standard: 0 }],
    [3, { delegated: 3, standard: 0 }],
    [5, { delegated: 3, standard: 2 }],
    [12, { delegated: 3, standard: 9 }],
  ])('allocates a block total of %s delegated first without dropping overuse', (total, expected) => {
    expect(allocateUsage(total, { delegated: 3, standard: 6 })).toEqual(expected);
  });

  test('allocates all usage to standard with missing or zero delegated authority', () => {
    expect(allocateUsage(4, { standard: 6 })).toEqual({ delegated: 0, standard: 4 });
    expect(allocateUsage(4, { delegated: 0, standard: 6 })).toEqual({ delegated: 0, standard: 4 });
  });
});

describe('getEntitlementUsage', () => {
  test('uses only the extension for the matched block', () => {
    const episode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      status: 'active',
      patient: { reference: 'Patient/1' },
      extension: ['mh-treatment-other', blockCode].map((code, index) => ({
        url: EOC_ENTITLEMENT_USAGE_EXTENSION_URL,
        extension: [
          { url: 'block', valueCoding: { code } },
          { url: 'used', valueInteger: index ? 5 : 99 },
        ],
      })),
    };
    expect(getEntitlementUsage(episode, blockCode)).toBe(5);
    expect(getEntitlementUsage(episode, 'missing')).toBe(0);
  });
});
