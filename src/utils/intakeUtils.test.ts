import type {
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseItemAnswer,
} from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { COVERAGE_INSURANCE_PLAN_EXTENSION_URL } from '../config/chimera-urls';
import { AVIVA_HEALTH_NAME, OPTIMA_HEALTH_NAME } from '../config/constants';
import {
  addCoverage,
  addExtension,
  convertDateToDateTime,
  findQuestionnaireItem,
  getGroupRepeatedAnswers,
  getHumanName,
  getPatientHomeAddress,
} from './intakeUtils';

describe('intake utils', () => {
  let patient: Patient;

  beforeEach(() => {
    patient = { resourceType: 'Patient', id: 'patient-1' };
  });

  describe('addExtension', () => {
    test('adds coded extension with sub extension text', () => {
      const answer: QuestionnaireResponseItemAnswer = {
        valueCoding: { system: 'http://example.com', code: 'code', display: 'Display' },
      };

      addExtension(patient, 'http://example.com/ext', 'valueCoding', answer, 'ombCategory');

      expect(patient.extension).toEqual([
        {
          url: 'http://example.com/ext',
          extension: [
            {
              url: 'ombCategory',
              valueCoding: { system: 'http://example.com', code: 'code', display: 'Display' },
            },
            {
              url: 'text',
              valueString: 'Display',
            },
          ],
        },
      ]);
    });

    test('adds boolean extension and interprets undefined as false', () => {
      addExtension(patient, 'http://example.com/bool', 'valueBoolean', {});

      expect(patient.extension).toEqual([
        expect.objectContaining({
          url: 'http://example.com/bool',
          valueBoolean: false,
        }),
      ]);
    });

    test('adds extension without sub extension', () => {
      const answer: QuestionnaireResponseItemAnswer = {
        valueCoding: { system: 'http://example.com', code: 'code' },
      };

      addExtension(patient, 'http://example.com/ext', 'valueCoding', answer);

      expect(patient.extension).toEqual([
        {
          url: 'http://example.com/ext',
          valueCoding: { system: 'http://example.com', code: 'code' },
        },
      ]);
    });

    test('adds extension with sub extension but no display text when display is missing', () => {
      const answer: QuestionnaireResponseItemAnswer = {
        valueCoding: { system: 'http://example.com', code: 'code' },
      };

      addExtension(patient, 'http://example.com/ext', 'valueCoding', answer, 'ombCategory');

      expect(patient.extension).toEqual([
        {
          url: 'http://example.com/ext',
          extension: [
            {
              url: 'ombCategory',
              valueCoding: { system: 'http://example.com', code: 'code' },
            },
          ],
        },
      ]);
    });

    test('returns early when value is undefined', () => {
      const initialExtensions = patient.extension;
      addExtension(patient, 'http://example.com/ext', 'valueCoding', undefined);
      expect(patient.extension).toBe(initialExtensions);
    });

    test('adds boolean extension with true value', () => {
      addExtension(patient, 'http://example.com/bool', 'valueBoolean', { valueBoolean: true });
      expect(patient.extension).toEqual([
        expect.objectContaining({
          url: 'http://example.com/bool',
          valueBoolean: true,
        }),
      ]);
    });
  });

  describe('questionnaire helpers', () => {
    test('getHumanName builds full name', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'first-name': { valueString: 'Ada' },
        'middle-name': { valueString: 'M.' },
        'last-name': { valueString: 'Lovelace' },
      };
      expect(getHumanName(answers)).toEqual({ given: ['Ada'], family: 'Lovelace' });
    });

    test('getHumanName builds name with prefix', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'related-person-first-name': { valueString: 'John' },
        'related-person-last-name': { valueString: 'Doe' },
      };
      expect(getHumanName(answers, 'related-person-')).toEqual({ given: ['John'], family: 'Doe' });
    });

    test('getHumanName returns undefined when no name fields present', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {};
      expect(getHumanName(answers)).toBeUndefined();
    });

    test('getHumanName builds name with only first name', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'first-name': { valueString: 'Ada' },
      };
      expect(getHumanName(answers)).toEqual({ given: ['Ada'] });
    });

    test('getHumanName builds name with only last name', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'last-name': { valueString: 'Lovelace' },
      };
      expect(getHumanName(answers)).toEqual({ family: 'Lovelace' });
    });

    test('getPatientAddress builds address', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'home-address-line1': { valueString: '1 Main St' },
        'home-city': { valueString: 'Springfield' },
        'home-county': { valueString: 'CA' },
        'home-postcode': { valueString: '12345' },
      };
      expect(getPatientHomeAddress(answers)).toEqual(
        expect.objectContaining({ city: 'Springfield', state: 'CA', postalCode: '12345', use: 'home' })
      );
    });

    test('getPatientAddress returns undefined when no address fields present', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {};
      expect(getPatientHomeAddress(answers)).toBeUndefined();
    });

    test('getPatientAddress builds partial address', () => {
      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'home-city': { valueString: 'Springfield' },
      };
      expect(getPatientHomeAddress(answers)).toEqual(
        expect.objectContaining({ city: 'Springfield', use: 'home', type: 'physical' })
      );
    });

    test('findQuestionnaireItem finds nested item', () => {
      const questionnaire: Questionnaire = {
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'group',
            type: 'group',
            item: [{ linkId: 'nested', type: 'string' }],
          },
        ],
        status: 'active',
      };
      const result = findQuestionnaireItem(questionnaire.item, 'nested');
      expect(result?.linkId).toBe('nested');
    });

    test('getGroupRepeatedAnswers flattens repeating groups', () => {
      const questionnaire: Questionnaire = {
        status: 'active',
        resourceType: 'Questionnaire',
        item: [{ linkId: 'allergies', type: 'group', item: [{ linkId: 'allergy-substance', type: 'string' }] }],
      };
      const response: QuestionnaireResponse = {
        status: 'completed',
        resourceType: 'QuestionnaireResponse',
        item: [
          {
            linkId: 'allergies',
            item: [{ linkId: 'allergy-substance', answer: [{ valueString: 'Peanuts' }] }],
          },
          {
            linkId: 'allergies',
            item: [{ linkId: 'allergy-substance', answer: [{ valueString: 'Shellfish' }] }],
          },
        ],
      };

      const answers = getGroupRepeatedAnswers(questionnaire, response, 'allergies');
      expect(answers).toEqual([
        { 'allergy-substance': { valueString: 'Peanuts' } },
        { 'allergy-substance': { valueString: 'Shellfish' } },
      ]);
    });

    test('getGroupRepeatedAnswers returns empty array when no response groups found', () => {
      const questionnaire: Questionnaire = {
        status: 'active',
        resourceType: 'Questionnaire',
        item: [{ linkId: 'allergies', type: 'group', item: [{ linkId: 'allergy-substance', type: 'string' }] }],
      };
      const response: QuestionnaireResponse = {
        status: 'completed',
        resourceType: 'QuestionnaireResponse',
        item: [],
      };

      // When no response items match the groupLinkId, returns empty array
      const answers = getGroupRepeatedAnswers(questionnaire, response, 'allergies');
      expect(answers).toEqual([]);
    });

    test('getGroupRepeatedAnswers returns empty array when questionnaire item is not a group', () => {
      const questionnaire: Questionnaire = {
        status: 'active',
        resourceType: 'Questionnaire',
        item: [{ linkId: 'allergies', type: 'string' }],
      };
      const response: QuestionnaireResponse = {
        status: 'completed',
        resourceType: 'QuestionnaireResponse',
        item: [{ linkId: 'allergies' }],
      };

      const answers = getGroupRepeatedAnswers(questionnaire, response, 'allergies');
      expect(answers).toEqual([]);
    });

    test('getGroupRepeatedAnswers handles nested subgroups', () => {
      const questionnaire: Questionnaire = {
        status: 'active',
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'group',
            type: 'group',
            item: [
              { linkId: 'field1', type: 'string' },
              {
                linkId: 'subgroup',
                type: 'group',
                item: [{ linkId: 'subfield1', type: 'string' }],
              },
            ],
          },
        ],
      };
      const response: QuestionnaireResponse = {
        status: 'completed',
        resourceType: 'QuestionnaireResponse',
        item: [
          {
            linkId: 'group',
            item: [
              { linkId: 'field1', answer: [{ valueString: 'value1' }] },
              {
                linkId: 'subgroup',
                item: [{ linkId: 'subfield1', answer: [{ valueString: 'subvalue1' }] }],
              },
            ],
          },
        ],
      };

      const answers = getGroupRepeatedAnswers(questionnaire, response, 'group');
      expect(answers).toEqual([
        {
          field1: { valueString: 'value1' },
          subgroup: { subfield1: { valueString: 'subvalue1' } },
        },
      ]);
    });

    test('findQuestionnaireItem returns undefined when item not found', () => {
      const questionnaire: Questionnaire = {
        resourceType: 'Questionnaire',
        item: [{ linkId: 'other', type: 'string' }],
        status: 'active',
      };
      const result = findQuestionnaireItem(questionnaire.item, 'not-found');
      expect(result).toBeUndefined();
    });

    test('findQuestionnaireItem returns undefined when items is undefined', () => {
      const result = findQuestionnaireItem(undefined, 'any');
      expect(result).toBeUndefined();
    });

    test('findQuestionnaireItem handles undefined currentItem in reduce', () => {
      const questionnaire: Questionnaire = {
        resourceType: 'Questionnaire',
        item: [undefined as any, { linkId: 'found', type: 'string' }],
        status: 'active',
      };
      const result = findQuestionnaireItem(questionnaire.item, 'found');
      expect(result?.linkId).toBe('found');
    });
  });

  describe('convertDateToDateTime', () => {
    test('converts date to ISO string', () => {
      expect(convertDateToDateTime('2020-01-01')).toContain('2020-01-01T00:00:00');
      expect(convertDateToDateTime(undefined)).toBeUndefined();
    });
  });

  describe('getGroupRepeatedAnswers edge cases', () => {
    test('handles items with nested subgroups and answers', () => {
      const questionnaire: Questionnaire = {
        status: 'active',
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'group',
            type: 'group',
            item: [
              { linkId: 'field1', type: 'string' },
              {
                linkId: 'subgroup',
                type: 'group',
                item: [{ linkId: 'subfield1', type: 'string' }],
              },
            ],
          },
        ],
      };
      const response: QuestionnaireResponse = {
        status: 'completed',
        resourceType: 'QuestionnaireResponse',
        item: [
          {
            linkId: 'group',
            item: [
              { linkId: 'field1', answer: [{ valueString: 'value1' }] },
              {
                linkId: 'subgroup',
                item: [{ linkId: 'subfield1', answer: [{ valueString: 'subvalue1' }] }],
              },
            ],
          },
        ],
      };

      const answers = getGroupRepeatedAnswers(questionnaire, response, 'group');
      expect(answers).toEqual([
        {
          field1: { valueString: 'value1' },
          subgroup: { subfield1: { valueString: 'subvalue1' } },
        },
      ]);
    });

    test('handles items without answers in nested subgroups', () => {
      const questionnaire: Questionnaire = {
        status: 'active',
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'group',
            type: 'group',
            item: [
              {
                linkId: 'subgroup',
                type: 'group',
                item: [{ linkId: 'subfield1', type: 'string' }],
              },
            ],
          },
        ],
      };
      const response: QuestionnaireResponse = {
        status: 'completed',
        resourceType: 'QuestionnaireResponse',
        item: [
          {
            linkId: 'group',
            item: [
              {
                linkId: 'subgroup',
                item: [{ linkId: 'subfield1' }], // No answer
              },
            ],
          },
        ],
      };

      const answers = getGroupRepeatedAnswers(questionnaire, response, 'group');
      // When there's no answer, it returns an empty object
      expect(answers).toEqual([
        {
          subgroup: {},
        },
      ]);
    });

    test('handles items with empty answer arrays', () => {
      const questionnaire: Questionnaire = {
        status: 'active',
        resourceType: 'Questionnaire',
        item: [
          {
            linkId: 'group',
            type: 'group',
            item: [{ linkId: 'field1', type: 'string' }],
          },
        ],
      };
      const response: QuestionnaireResponse = {
        status: 'completed',
        resourceType: 'QuestionnaireResponse',
        item: [
          {
            linkId: 'group',
            item: [{ linkId: 'field1', answer: [] }],
          },
        ],
      };

      const answers = getGroupRepeatedAnswers(questionnaire, response, 'group');
      expect(answers).toEqual([
        {
          field1: {},
        },
      ]);
    });
  });

  describe('addCoverage', () => {
    test('adds the coverage-insurance-plan extension when the funder is Optima Health', async () => {
      const medplum = new MockClient();
      const upsertSpy = vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);
      vi.spyOn(medplum, 'searchOne').mockResolvedValue({ resourceType: 'InsurancePlan', id: 'plan-1' } as any);

      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'insurance-provider': { valueReference: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME } },
        'optima-employer': { valueReference: { reference: 'Organization/employer-1', display: 'Acme Corp' } },
      };

      const coverage = await addCoverage(medplum, patient, answers);

      expect(medplum.searchOne).toHaveBeenCalledWith('InsurancePlan', 'owned-by=Organization/employer-1');
      expect(coverage.extension).toEqual([
        { url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL, valueReference: { reference: 'InsurancePlan/plan-1' } },
      ]);
      expect(upsertSpy).toHaveBeenCalled();
    });

    test('omits the extension when no InsurancePlan is owned by the selected employer', async () => {
      const medplum = new MockClient();
      vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);
      vi.spyOn(medplum, 'searchOne').mockResolvedValue(undefined);

      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'insurance-provider': { valueReference: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME } },
        'optima-employer': { valueReference: { reference: 'Organization/employer-1', display: 'Acme Corp' } },
      };

      const coverage = await addCoverage(medplum, patient, answers);

      expect(coverage.extension).toBeUndefined();
    });

    test('does not add the extension for non-Optima funders without a selected insurance plan', async () => {
      const medplum = new MockClient();
      const searchOneSpy = vi.spyOn(medplum, 'searchOne');
      vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);

      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'insurance-provider': { valueReference: { reference: 'Organization/aviva', display: 'Aviva Health' } },
      };

      const coverage = await addCoverage(medplum, patient, answers);

      expect(searchOneSpy).not.toHaveBeenCalled();
      expect(coverage.extension).toBeUndefined();
    });

    test('adds the coverage-insurance-plan extension from the selected plan for Aviva/Vitality funders', async () => {
      const medplum = new MockClient();
      const searchOneSpy = vi.spyOn(medplum, 'searchOne');
      vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);

      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'insurance-provider': { valueReference: { reference: 'Organization/aviva', display: AVIVA_HEALTH_NAME } },
        'insurance-plan': { valueReference: { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' } },
      };

      const coverage = await addCoverage(medplum, patient, answers);

      expect(searchOneSpy).not.toHaveBeenCalled();
      expect(coverage.extension).toEqual([
        {
          url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
          valueReference: { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' },
        },
      ]);
    });

    test('does not add the extension when Optima Health has no employer selected', async () => {
      const medplum = new MockClient();
      const searchOneSpy = vi.spyOn(medplum, 'searchOne');
      vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);

      const answers: Record<string, QuestionnaireResponseItemAnswer> = {
        'insurance-provider': { valueReference: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME } },
      };

      const coverage = await addCoverage(medplum, patient, answers);

      expect(searchOneSpy).not.toHaveBeenCalled();
      expect(coverage.extension).toBeUndefined();
    });
  });
});
