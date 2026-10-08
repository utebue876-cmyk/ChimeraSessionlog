import { afterEach, describe, expect, test, vi } from 'vitest';
import { recordPatientActivity } from './patientActivity';

describe('recordPatientActivity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('creates an AuditEvent when patient and profile are available', () => {
    const createResource = vi.fn().mockResolvedValue({ resourceType: 'AuditEvent', id: 'ae-1' });
    const medplum = {
      getProfile: vi.fn().mockReturnValue({ resourceType: 'Practitioner', id: 'prac-1' }),
      createResource,
    } as any;

    recordPatientActivity(medplum, 'patient-1');

    expect(createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'AuditEvent',
        agent: [{ who: { reference: 'Practitioner/prac-1' }, requestor: true }],
        source: { observer: { reference: 'Practitioner/prac-1' } },
        entity: [{ what: { reference: 'Patient/patient-1' } }],
      })
    );
  });

  test('does nothing when patientId is missing or profile is incomplete', () => {
    const createResource = vi.fn();
    const medplumNoProfile = { getProfile: vi.fn().mockReturnValue(undefined), createResource } as any;
    const medplumBadProfile = {
      getProfile: vi.fn().mockReturnValue({ resourceType: 'Practitioner' }),
      createResource,
    } as any;

    recordPatientActivity(medplumNoProfile, 'patient-1');
    recordPatientActivity(medplumBadProfile, 'patient-1');
    recordPatientActivity(medplumNoProfile, undefined);

    expect(createResource).not.toHaveBeenCalled();
  });
});
