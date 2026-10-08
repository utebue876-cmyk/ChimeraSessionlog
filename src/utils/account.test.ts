import type { CodeSystem, Patient } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  ACCOUNT_TYPE_CODE_SYSTEM_URL,
  INTAKE_SUBMISSION_IDENTIFIER_URL,
  PATIENT_IDENTIFIER_URL,
} from '../config/chimera-urls';
import { OPTIMA_HEALTH_NAME } from '../config/constants';
import { createAccount } from './account';

const accountTypeCodeSystem: CodeSystem = {
  resourceType: 'CodeSystem',
  status: 'draft',
  content: 'complete',
  url: ACCOUNT_TYPE_CODE_SYSTEM_URL,
  concept: [
    { code: 'fee-for-service', display: 'Fee for Service' },
    { code: 'block-contract', display: 'Block Contract' },
  ],
};

const patient: Patient = {
  resourceType: 'Patient',
  id: 'patient-1',
  identifier: [{ system: PATIENT_IDENTIFIER_URL, value: 'MRN123' }],
};

describe('createAccount', () => {
  beforeEach(() => {
    vi.spyOn(MockClient.prototype, 'searchOne').mockImplementation((async (resourceType: any) =>
      resourceType === 'CodeSystem' ? accountTypeCodeSystem : undefined) as any);
  });

  test('derives a block-contract account for Optima Health with no guarantor', async () => {
    const medplum = new MockClient();
    const upsertSpy = vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);
    vi.spyOn(medplum, 'readReference').mockResolvedValue({ resourceType: 'Organization', type: [] } as any);

    const account = await createAccount(medplum, {
      patient,
      submissionKey: 'submission-1',
      insuranceProvider: { reference: 'Organization/optima', display: OPTIMA_HEALTH_NAME },
      episodeOfCare: { resourceType: 'EpisodeOfCare', status: 'planned', period: { start: '2026-01-01' } } as any,
      coverage: { resourceType: 'Coverage', id: 'coverage-1', status: 'active', beneficiary: {} } as any,
      managingOrganization: { resourceType: 'Organization', id: 'org-1', name: 'IPRS Health' } as any,
    });

    expect(account.identifier).toEqual([{ system: INTAKE_SUBMISSION_IDENTIFIER_URL, value: 'submission-1' }]);
    expect(account.status).toBe('active');
    expect(account.type).toEqual({
      coding: [{ system: ACCOUNT_TYPE_CODE_SYSTEM_URL, code: 'block-contract', display: 'Block Contract' }],
    });
    expect(account.name).toBe('MRN123 · Optima Health MH Block Contract');
    expect(account.subject).toEqual([{ reference: 'Patient/patient-1' }]);
    expect(account.owner).toEqual({ reference: 'Organization/org-1', display: 'IPRS Health' });
    expect(account.servicePeriod).toEqual({ start: '2026-01-01' });
    expect(account.coverage).toEqual([{ coverage: { reference: 'Coverage/coverage-1' }, priority: 1 }]);
    expect(account.guarantor).toBeUndefined();
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'Account' }),
      `identifier=${INTAKE_SUBMISSION_IDENTIFIER_URL}|submission-1`
    );
  });

  test('derives a fee-for-service account with a guarantor on PMI routes', async () => {
    const medplum = new MockClient();
    vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);
    vi.spyOn(medplum, 'readReference').mockResolvedValue({
      resourceType: 'Organization',
      type: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'pay' }] }],
    } as any);

    const account = await createAccount(medplum, {
      patient,
      submissionKey: 'submission-2',
      insuranceProvider: { reference: 'Organization/aviva', display: 'Aviva Health' },
    });

    expect(account.type?.coding?.[0].code).toBe('fee-for-service');
    expect(account.name).toBe('MRN123 · Aviva Health MH Fee for Service');
    expect(account.guarantor).toEqual([{ party: { reference: 'Patient/patient-1' } }]);
  });

  test('omits guarantor when the referenced organization cannot be resolved', async () => {
    const medplum = new MockClient();
    vi.spyOn(medplum, 'upsertResource').mockImplementation(async (resource: any) => resource);
    vi.spyOn(medplum, 'readReference').mockRejectedValue(new Error('not found'));

    const account = await createAccount(medplum, {
      patient,
      submissionKey: 'submission-3',
      insuranceProvider: { reference: 'Organization/deleted', display: 'Deleted Org' },
    });

    expect(account.guarantor).toBeUndefined();
  });
});
