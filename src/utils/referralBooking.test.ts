import type { Organization } from '@medplum/fhirtypes';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CHIMERA_MSK } from '../config/constants';
import { useProjectOrganizationStore } from '../store/projectOrganizationStore';
import { bookReferral } from './referralBooking';

vi.mock('./numbers', () => ({
  generateMedicalRecordNumber: vi.fn().mockReturnValue('MRN-000001'),
}));

vi.mock('./caseNumber', () => ({
  generateCaseNumber: vi.fn().mockResolvedValue({
    system: 'http://fhir.chimera.health/identifier/case-number',
    value: 'CR-0000001',
    use: 'official',
  }),
}));

describe('bookReferral', () => {
  beforeEach(() => {
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
  });

  test('creates core referral resources and returns booking result', async () => {
    const createResource = vi.fn().mockImplementation(async (resource: any) => ({
      ...resource,
      id: `${resource.resourceType.toLowerCase()}-1`,
    }));

    const medplum = {
      searchOne: vi.fn().mockResolvedValue(undefined),
      createResource,
      readResource: vi.fn(),
      post: vi.fn(),
      fhirUrl: vi.fn(),
      searchResources: vi.fn(),
      readReference: vi.fn(),
      updateResource: vi.fn(),
    } as any;

    const result = await bookReferral(medplum, {
      patient: {
        firstName: 'Jane',
        lastName: 'Doe',
        dob: '1990-01-01',
        gender: 'female',
        phone: '5551112222',
        email: 'jane@example.com',
        addressLine1: '1 Main St',
        town: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
      },
      consent: { dataProcessing: true },
      questionnaireResponse: { resourceType: 'QuestionnaireResponse', status: 'completed' },
      appointmentStartIso: '2026-07-08T10:00:00.000Z',
      appointmentDurationMinutes: 45,
    });

    expect(result.caseReference).toBe('CR-0000001');
    expect(result.patient.resourceType).toBe('Patient');
    expect(result.appointment.resourceType).toBe('Appointment');

    const createdTypes = createResource.mock.calls.map((c: any[]) => c[0].resourceType);
    expect(createdTypes).toEqual([
      'Patient',
      'QuestionnaireResponse',
      'ServiceRequest',
      'EpisodeOfCare',
      'Appointment',
      'Encounter',
      'ClinicalImpression',
    ]);

    const appointmentCall = createResource.mock.calls.find((c: any[]) => c[0].resourceType === 'Appointment');
    expect(appointmentCall).toBeDefined();
    const appointmentPayload = appointmentCall![0];
    expect(appointmentPayload.start).toBe('2026-07-08T10:00:00.000Z');
    expect(appointmentPayload.end).toBe('2026-07-08T10:45:00.000Z');
  });

  test('sets managing organization when it is Chimera MSK', async () => {
    const org: Organization = {
      resourceType: 'Organization',
      id: 'org-1',
      name: CHIMERA_MSK,
    };

    const createResource = vi.fn().mockImplementation(async (resource: any) => ({
      ...resource,
      id: `${resource.resourceType.toLowerCase()}-1`,
    }));

    const medplum = {
      searchOne: vi.fn().mockResolvedValue(org),
      createResource,
      readResource: vi.fn(),
      post: vi.fn(),
      fhirUrl: vi.fn(),
      searchResources: vi.fn(),
      readReference: vi.fn(),
      updateResource: vi.fn(),
    } as any;

    const result = await bookReferral(medplum, {
      patient: {
        firstName: 'Jane',
        lastName: 'Doe',
        dob: '1990-01-01',
        gender: 'female',
        phone: '5551112222',
        email: 'jane@example.com',
        addressLine1: '1 Main St',
        town: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
      },
      consent: { dataProcessing: false },
      questionnaireResponse: { resourceType: 'QuestionnaireResponse', status: 'completed' },
      appointmentStartIso: '2026-07-08T10:00:00.000Z',
    });

    expect(result.caseReference).toBe('CR-0000001');
    const patientCall = createResource.mock.calls.find((c: any[]) => c[0].resourceType === 'Patient');
    expect(patientCall).toBeDefined();
    const patientPayload = patientCall![0];
    expect(patientPayload.managingOrganization).toEqual({ reference: 'Organization/org-1', display: 'Chimera MSK' });
  });
});
