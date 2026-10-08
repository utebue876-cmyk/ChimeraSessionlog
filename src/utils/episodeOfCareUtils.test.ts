import { describe, expect, test } from 'vitest';
import { EOC_CASE_STATE_URL } from '../config/chimera-urls';
import { CHIMERA_MSK } from '../config/constants';
import { getCaseIdPrefix, getCaseStatus } from './episodeOfCareUtils';

describe('episodeOfCareUtils', () => {
  test('getCaseStatus returns extension display value when present', () => {
    const result = getCaseStatus({
      resourceType: 'EpisodeOfCare',
      status: 'planned',
      patient: { reference: 'Patient/p1' },
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { display: 'Intake' } }],
    });

    expect(result).toBe('Intake');
  });

  test('getCaseStatus returns N/A when matching extension is missing', () => {
    expect(
      getCaseStatus({
        resourceType: 'EpisodeOfCare',
        status: 'planned',
        patient: { reference: 'Patient/p1' },
        extension: [],
      })
    ).toBe('N/A');
  });

  test('getCaseIdPrefix returns MSK for Chimera MSK and MH otherwise', () => {
    expect(getCaseIdPrefix({ resourceType: 'Organization', id: '1', name: CHIMERA_MSK })).toBe('MSK');
    expect(getCaseIdPrefix({ resourceType: 'Organization', id: '2', name: 'Other Org' })).toBe('MH');
    expect(getCaseIdPrefix(undefined)).toBe('MH');
  });
});
