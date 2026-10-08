import type { Questionnaire, QuestionnaireResponse, QuestionnaireResponseItemAnswer } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useProjectOrganizationStore } from '../store/projectOrganizationStore';

const createEpisodeOfCareMock = vi.hoisted(() => vi.fn());

vi.mock('./episodeOfCare', () => ({
  createEpisodeOfCare: createEpisodeOfCareMock,
}));

const mockAnswers = {
  'first-name': { valueString: 'Jamie' },
  'last-name': { valueString: 'Doe' },
  dob: { valueDate: '1990-01-01' },
  phone: { valueString: '555-5555' },
  ssn: { valueString: '123-45-6789' },
  street: { valueString: '1 Main St' },
  city: { valueString: 'Springfield' },
  state: { valueCoding: { code: 'CA' } },
  zip: { valueString: '90210' },
  'consent-for-treatment-signature': { valueBoolean: true },
  'consent-for-treatment-date': { valueDate: '2024-01-01' },
  'agreement-to-pay-for-treatment-help': { valueBoolean: true },
  'agreement-to-pay-for-treatment-date': { valueDate: '2024-01-02' },
  'notice-of-privacy-practices-signature': { valueBoolean: true },
  'notice-of-privacy-practices-date': { valueDate: '2024-01-03' },
  'acknowledgement-for-advance-directives-signature': { valueBoolean: true },
  'acknowledgement-for-advance-directives-date': { valueDate: '2024-01-04' },
  'preferred-pharmacy-reference': { valueReference: { reference: 'Organization/pharmacy-1' } },
} satisfies Record<string, QuestionnaireResponseItemAnswer>;

const mockIntakeUtils = vi.hoisted(() => ({
  addAssessmentServiceRequest: vi.fn(),
  addConsent: vi.fn(),
  addCoverage: vi.fn(),
  addExtension: vi.fn(),
  consentCategoryMapping: {
    med: { coding: [] },
    pay: { coding: [] },
    nopp: { coding: [] },
    acd: { coding: [] },
  },
  consentPolicyRuleMapping: {
    cric: { coding: [] },
    hipaaSelfPay: { coding: [] },
    hipaaNpp: { coding: [] },
    adr: { coding: [] },
  },
  consentScopeMapping: {
    treatment: { coding: [] },
    patientPrivacy: { coding: [] },
    adr: { coding: [] },
  },
  convertDateToDateTime: vi.fn((date?: string) => (date ? `${date}T00:00:00Z` : undefined)),
  getGroupRepeatedAnswers: vi.fn((_, __, groupId) => {
    if (groupId === 'coverage-information') {
      return [
        {
          'insurance-provider': { valueReference: { reference: 'Organization/org-1' } },
          'subscriber-id': { valueString: 'sub-1' },
          'relationship-to-subscriber': { valueCoding: { code: 'self' } },
        },
      ];
    }
    if (groupId === 'allergies') {
      return [{ 'allergy-substance': { valueCoding: { code: 'peanut' } } }];
    }
    return [];
  }),
  getContactDetails: vi.fn(() => [{ system: 'phone', use: 'home', value: '555-5555' }]),
  getHumanName: vi.fn(() => ({ given: ['Jamie'], family: 'Doe' })),
  getPatientHomeAddress: vi.fn(() => ({ line: ['1 Main St'] })),
  getPatientWorkAddress: vi.fn(() => undefined),
  observationCategoryMapping: {
    socialHistory: { coding: [] },
    sdoh: { coding: [] },
  },
  observationCodeMapping: {
    sexualOrientation: { coding: [] },
    housingStatus: { coding: [] },
    educationLevel: { coding: [] },
    smokingStatus: { coding: [] },
    pregnancyStatus: { coding: [] },
    estimatedDeliveryDate: { coding: [] },
  },
  PROFILE_URLS: {
    Patient: 'patient-profile',
    ObservationSexualOrientation: 'obs-profile',
  },
  upsertObservation: vi.fn(),
}));

vi.mock('./intakeUtils', () => mockIntakeUtils);

import { onboardPatient } from './intakeForm';

describe('onboardPatient', () => {
  let medplum: MockClient;

  beforeEach(() => {
    medplum = new MockClient();
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
    vi.clearAllMocks();
  });

  test('creates patient and invokes onboarding helpers', async () => {
    const createSpy = vi.spyOn(medplum, 'createResource').mockImplementation(async (resource: any) => {
      if (resource.resourceType === 'Patient') {
        return { ...resource, id: 'patient-1' };
      }
      return resource;
    });
    const updateSpy = vi.spyOn(medplum, 'updateResource').mockImplementation(async (resource: any) => resource);
    createEpisodeOfCareMock.mockResolvedValue({
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'planned',
      patient: { reference: 'Patient/patient-1' },
    });

    const questionnaire = { resourceType: 'Questionnaire' } as Questionnaire;
    const response = buildResponseFromAnswers(mockAnswers);

    const patient = await onboardPatient(medplum, questionnaire, response, 'submission-key-1');

    expect(patient.id).toBe('patient-1');
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Patient' }));
    expect(mockIntakeUtils.addCoverage).toHaveBeenCalledWith(medplum, patient, expect.any(Object));
    expect(createEpisodeOfCareMock).toHaveBeenCalledWith(medplum, patient, expect.any(Object), undefined);
    expect(mockIntakeUtils.addConsent).toHaveBeenCalled();
    expect(mockIntakeUtils.getContactDetails).toHaveBeenCalled();
    expect(mockIntakeUtils.getPatientHomeAddress).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'EpisodeOfCare',
        id: 'episode-1',
        account: [expect.objectContaining({ reference: expect.stringMatching(/^Account\//) })],
      })
    );
  });
});

function buildResponseFromAnswers(answers: Record<string, QuestionnaireResponseItemAnswer>): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    item: Object.entries(answers).map(([linkId, answer]) => ({
      linkId,
      answer: [answer],
    })),
  };
}
