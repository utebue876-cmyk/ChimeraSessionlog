import type { QuestionnaireResponseItemAnswer } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { describe, expect, test, vi } from 'vitest';
import { MH_SERVICE_CODE_SYSTEM_URL } from '../config/chimera-urls';
import { createEpisodeOfCare, mapCaseStateToEpisodeStatus } from './episodeOfCare';

vi.mock('./caseNumber', () => ({
  generateCaseNumber: vi.fn().mockResolvedValue({
    system: 'http://fhir.chimera.health/identifier/case-number',
    value: 'CR-0000001',
    use: 'official',
  }),
}));

describe('mapCaseStateToEpisodeStatus', () => {
  test.each([
    ['awaiting-acceptance', 'planned'],
    ['accepted-awaiting-booking', 'waitlist'],
    ['awaiting-assessment', 'active'],
    ['awaiting-treatment-decision', 'active'],
    ['in-treatment', 'active'],
    ['awaiting-discharge-report', 'active'],
    ['on-hold', 'onhold'],
    ['discharged', 'finished'],
    ['cancelled', 'cancelled'],
  ])('maps case-state code "%s" to EpisodeOfCare.status "%s"', (caseStateCode, expectedStatus) => {
    expect(mapCaseStateToEpisodeStatus(caseStateCode)).toBe(expectedStatus);
  });

  test('returns the fallback when the code is undefined', () => {
    expect(mapCaseStateToEpisodeStatus(undefined)).toBe('planned');
    expect(mapCaseStateToEpisodeStatus(undefined, 'onhold')).toBe('onhold');
  });

  test('returns the fallback when the code is unrecognized', () => {
    expect(mapCaseStateToEpisodeStatus('some-unknown-code')).toBe('planned');
    expect(mapCaseStateToEpisodeStatus('some-unknown-code', 'active')).toBe('active');
  });
});

describe('createEpisodeOfCare service type rules', () => {
  test('keeps selected service type for Aviva Health', async () => {
    const medplum = new MockClient();
    const createSpy = vi.spyOn(medplum, 'createResource').mockImplementation(async (resource: any) => resource);

    const answers = {
      'service-type': {
        valueCoding: {
          system: MH_SERVICE_CODE_SYSTEM_URL,
          code: 'treatment-only',
          display: 'Treatment Only',
        },
      },
      'insurance-provider': {
        valueReference: {
          reference: 'Organization/aviva-id',
          display: 'Aviva Health',
        },
      },
    } as Record<string, QuestionnaireResponseItemAnswer>;

    await createEpisodeOfCare(medplum, { resourceType: 'Patient', id: 'patient-1' }, answers);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'EpisodeOfCare',
        type: [
          {
            coding: [
              expect.objectContaining({
                code: 'treatment-only',
                display: 'Treatment Only',
              }),
            ],
          },
        ],
      })
    );
  });

  test('keeps selected service type for Vitality Health', async () => {
    const medplum = new MockClient();
    const createSpy = vi.spyOn(medplum, 'createResource').mockImplementation(async (resource: any) => resource);

    const answers = {
      'service-type': {
        valueCoding: {
          system: MH_SERVICE_CODE_SYSTEM_URL,
          code: 'treatment-only',
          display: 'Treatment Only',
        },
      },
      'insurance-provider': {
        valueReference: {
          reference: 'Organization/vitality-id',
          display: 'Vitality Health',
        },
      },
    } as Record<string, QuestionnaireResponseItemAnswer>;

    await createEpisodeOfCare(medplum, { resourceType: 'Patient', id: 'patient-1' }, answers);

    expect(createSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resourceType: 'EpisodeOfCare',
        type: [
          {
            coding: [
              expect.objectContaining({
                code: 'treatment-only',
                display: 'Treatment Only',
              }),
            ],
          },
        ],
      })
    );
  });
});

describe('createEpisodeOfCare case-state -> status mapping', () => {
  test('sets status to "planned" when consent has not been signed (awaiting-acceptance)', async () => {
    const medplum = new MockClient();
    const createSpy = vi.spyOn(medplum, 'createResource').mockImplementation(async (resource: any) => resource);

    await createEpisodeOfCare(
      medplum,
      { resourceType: 'Patient', id: 'patient-1' },
      {} as Record<string, QuestionnaireResponseItemAnswer>
    );

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'planned' }));
  });

  test('sets status to "waitlist" when consent has been signed (accepted-awaiting-booking)', async () => {
    const medplum = new MockClient();
    const createSpy = vi.spyOn(medplum, 'createResource').mockImplementation(async (resource: any) => resource);

    const answers = {
      'consent-for-treatment-signature': { valueBoolean: true },
    } as Record<string, QuestionnaireResponseItemAnswer>;

    await createEpisodeOfCare(medplum, { resourceType: 'Patient', id: 'patient-1' }, answers);

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'waitlist' }));
  });
});
