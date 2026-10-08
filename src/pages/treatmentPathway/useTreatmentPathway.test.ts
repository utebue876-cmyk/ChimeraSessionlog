import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
  MH_DIAGNOSIS_CODE_SYSTEM_URL,
  MH_DIAGNOSIS_VALUESET_URL,
  MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
} from '../../config/chimera-urls';
import { useProjectOrganizationStore } from '../../store/projectOrganizationStore';
import { useTreatmentPathway } from './useTreatmentPathway';

const valueSetExpand = vi.hoisted(() => vi.fn());
const readReference = vi.hoisted(() => vi.fn());
const createResource = vi.hoisted(() => vi.fn());
const updateResource = vi.hoisted(() => vi.fn());
const searchOne = vi.hoisted(() => vi.fn());
const searchResources = vi.hoisted(() => vi.fn());
const getProfile = vi.hoisted(() => vi.fn());
const activeEpisodeState = vi.hoisted(() => ({ activeEpisode: undefined as any }));
const setActiveEpisode = vi.hoisted(() => vi.fn());
const showNotification = vi.hoisted(() => vi.fn());

// A stable object reference is required: a new object literal on every useMedplum() call would change
// the identity of `medplum`, and effects depending on `[medplum]` would re-run on every render forever.
const medplumMock = vi.hoisted(() => ({
  valueSetExpand: (...args: unknown[]) => valueSetExpand(...args),
  readReference: (...args: unknown[]) => readReference(...args),
  createResource: (...args: unknown[]) => createResource(...args),
  updateResource: (...args: unknown[]) => updateResource(...args),
  searchOne: (...args: unknown[]) => searchOne(...args),
  searchResources: (...args: unknown[]) => searchResources(...args),
  getProfile: (...args: unknown[]) => getProfile(...args),
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumMock,
}));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => ({ activeEpisode: activeEpisodeState.activeEpisode, setActiveEpisode }),
}));

// Resolves the referral ServiceRequest -> Coverage -> InsurancePlan chain (for pathwayOptions) plus the
// funder Organization (for the authorisation reference identifier), merged with any test-specific refs.
function buildReferralChainReader(extra: Record<string, any> = {}): (ref: { reference: string }) => Promise<any> {
  return async (ref: { reference: string }) => {
    if (extra[ref.reference]) {
      return extra[ref.reference];
    }
    if (ref.reference === 'ServiceRequest/referral-1') {
      return {
        resourceType: 'ServiceRequest',
        id: 'referral-1',
        requester: { reference: 'Organization/aviva' },
        insurance: [{ reference: 'Coverage/cov-1' }],
      };
    }
    if (ref.reference === 'Coverage/cov-1') {
      return {
        resourceType: 'Coverage',
        extension: [
          { url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL, valueReference: { reference: 'InsurancePlan/plan-1' } },
        ],
      };
    }
    if (ref.reference === 'InsurancePlan/plan-1') {
      return {
        resourceType: 'InsurancePlan',
        coverage: [
          {
            benefit: [
              {
                type: {
                  coding: [{ system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'pathway-a', display: 'Pathway A' }],
                },
              },
            ],
          },
        ],
      };
    }
    if (ref.reference === 'Organization/aviva') {
      return {
        resourceType: 'Organization',
        id: 'aviva',
        identifier: [
          { system: 'http://fhir.chimera.health/identifier/iprs-health/organization', value: 'aviva-health' },
        ],
      };
    }
    throw new Error(`Unexpected reference: ${ref.reference}`);
  };
}

vi.mock('@mantine/notifications', () => ({ showNotification }));

describe('useTreatmentPathway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
    // Default treatment-service lookup for 'pathway-a' used across the confirmPathway tests below.
    searchOne.mockResolvedValue({
      resourceType: 'CodeSystem',
      url: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
      concept: [
        {
          code: 'pathway-a',
          property: [
            {
              code: 'service',
              valueCoding: { system: 'http://fhir.chimera.health/CodeSystem/mh-treatment-service', code: 'svc-a' },
            },
            {
              code: 'modality',
              valueCoding: { system: 'http://fhir.chimera.health/CodeSystem/mh-therapy-modality', code: 'cbt' },
            },
          ],
        },
      ],
    });
    // Default ServiceRequest/CarePlan lookups find an already-linked resource (update path), so the
    // diagnosis-focused confirmPathway tests only need to reason about Condition create/update calls.
    searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'ServiceRequest') {
        return [
          {
            resourceType: 'ServiceRequest',
            id: 'existing-sr',
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare',
                valueReference: { reference: 'EpisodeOfCare/episode-1' },
              },
            ],
          },
        ];
      }
      if (resourceType === 'CarePlan') {
        return [
          {
            resourceType: 'CarePlan',
            id: 'existing-careplan',
            activity: [{ reference: { reference: 'ServiceRequest/existing-sr' } }],
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare',
                valueReference: { reference: 'EpisodeOfCare/episode-1' },
              },
            ],
          },
        ];
      }
      return [];
    });
    getProfile.mockReturnValue({ resourceType: 'Practitioner', id: 'practitioner-1' });
  });

  test('has no pathway options and shows N/A labels when no episode is active', async () => {
    activeEpisodeState.activeEpisode = undefined;
    valueSetExpand.mockResolvedValue({ expansion: { contains: [{ code: 'a', display: 'Pathway A' }] } });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(valueSetExpand).toHaveBeenCalledWith({ url: MH_DIAGNOSIS_VALUESET_URL });
    expect(result.current.diagnosisOptions).toEqual([{ value: 'a', label: 'Pathway A' }]);
    expect(result.current.pathwayOptions).toEqual([]);
    expect(result.current.caseLabel).toBe('N/A');
    expect(result.current.funderLabel).toBe('N/A');
  });

  test('resolves pathway options from the InsurancePlan linked via the Coverage extension', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      identifier: [{ value: 'CASE-001' }],
      careManager: { display: 'Dr. Smith' },
      referralRequest: [{ reference: 'ServiceRequest/sr-1' }],
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    readReference.mockImplementation(async (ref: { reference: string }) => {
      if (ref.reference === 'ServiceRequest/sr-1') {
        return {
          resourceType: 'ServiceRequest',
          requester: { reference: 'Organization/vitality', display: 'Vitality Health' },
          insurance: [{ reference: 'Coverage/cov-1' }],
        };
      }
      if (ref.reference === 'Coverage/cov-1') {
        return {
          resourceType: 'Coverage',
          subscriberId: 'POLICY-123',
          extension: [
            {
              url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
              valueReference: { reference: 'InsurancePlan/plan-1' },
            },
          ],
        };
      }
      if (ref.reference === 'InsurancePlan/plan-1') {
        return {
          resourceType: 'InsurancePlan',
          coverage: [
            {
              benefit: [
                {
                  type: {
                    coding: [
                      {
                        system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
                        code: 'guided-self-help-cbt',
                        display: 'Guided Self-help CBT',
                      },
                    ],
                  },
                },
                {
                  type: {
                    coding: [
                      { system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual', display: 'Virtual CBT' },
                    ],
                  },
                },
                {
                  type: {
                    coding: [{ system: 'http://fhir.chimera.health/CodeSystem/coverage-type', code: 'other' }],
                  },
                },
              ],
            },
          ],
        };
      }
      throw new Error(`Unexpected reference: ${ref.reference}`);
    });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pathwayOptions).toEqual([
      {
        value: 'guided-self-help-cbt',
        label: 'Guided Self-help CBT',
        coding: {
          system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
          code: 'guided-self-help-cbt',
          display: 'Guided Self-help CBT',
        },
      },
      {
        value: 'cbt-virtual',
        label: 'Virtual CBT',
        coding: { system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual', display: 'Virtual CBT' },
      },
    ]);
    expect(result.current.caseLabel).toBe('CASE-001');
    expect(result.current.funderLabel).toBe('Vitality Health');
    expect(result.current.policyLabel).toBe('POLICY-123');
    expect(result.current.assessingClinicianLabel).toBe('Dr. Smith');
  });

  test('resolves the PHQ-9 and GAD-7 scores/interpretations for the earliest (initial) assessment, via EpisodeOfCare -> Encounter -> Observation', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    searchResources.mockImplementation(async (resourceType: string, query: unknown) => {
      if (resourceType === 'Encounter') {
        return [{ resourceType: 'Encounter', id: 'enc-1' }];
      }
      if (resourceType === 'Observation') {
        const params = query as [string, string][];
        const encounterParam = params.find(([key]) => key === 'encounter')?.[1];
        expect(encounterParam).toBe('Encounter/enc-1');
        // The server is asked to sort ascending by date, so the earliest Observation per code comes
        // first — the hook must pick that one even though a later re-assessment also exists.
        const sortParam = params.find(([key]) => key === '_sort')?.[1];
        expect(sortParam).toBe('date');
        return [
          {
            resourceType: 'Observation',
            id: 'obs-phq9-initial',
            code: { coding: [{ system: 'http://loinc.org', code: '44261-6' }] },
            effectiveDateTime: '2026-01-01T00:00:00.000Z',
            valueInteger: 16,
            interpretation: [{ text: 'Moderately severe depression (15-19)' }],
          },
          {
            resourceType: 'Observation',
            id: 'obs-gad7-initial',
            code: { coding: [{ system: 'http://loinc.org', code: '70274-6' }] },
            effectiveDateTime: '2026-01-01T00:00:00.000Z',
            valueInteger: 12,
            interpretation: [{ text: 'Moderate anxiety (10-14)' }],
          },
          {
            resourceType: 'Observation',
            id: 'obs-phq9-later',
            code: { coding: [{ system: 'http://loinc.org', code: '44261-6' }] },
            effectiveDateTime: '2026-03-01T00:00:00.000Z',
            valueInteger: 5,
            interpretation: [{ text: 'Mild depression (5-9)' }],
          },
          {
            resourceType: 'Observation',
            id: 'obs-gad7-later',
            code: { coding: [{ system: 'http://loinc.org', code: '70274-6' }] },
            effectiveDateTime: '2026-03-01T00:00:00.000Z',
            valueInteger: 3,
            interpretation: [{ text: 'Minimal anxiety (0-4)' }],
          },
        ];
      }
      return [];
    });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.phq9Score).toBe(16);
    expect(result.current.phq9InterpretationLabel).toBe('Moderately severe depression (15-19)');
    expect(result.current.gad7Score).toBe(12);
    expect(result.current.gad7InterpretationLabel).toBe('Moderate anxiety (10-14)');
  });

  test('falls back to N/A for PHQ-9 and GAD-7 when no Observation is found', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    searchResources.mockResolvedValue([]);

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.phq9Score).toBeNull();
    expect(result.current.phq9InterpretationLabel).toBe('N/A');
    expect(result.current.gad7Score).toBeNull();
    expect(result.current.gad7InterpretationLabel).toBe('N/A');
  });

  test('has no pathway options when the Coverage has no linked InsurancePlan extension', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      referralRequest: [{ reference: 'ServiceRequest/sr-1' }],
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    readReference.mockImplementation(async (ref: { reference: string }) => {
      if (ref.reference === 'ServiceRequest/sr-1') {
        return {
          resourceType: 'ServiceRequest',
          insurance: [{ reference: 'Coverage/cov-1' }],
        };
      }
      if (ref.reference === 'Coverage/cov-1') {
        return { resourceType: 'Coverage' };
      }
      throw new Error(`Unexpected reference: ${ref.reference}`);
    });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pathwayOptions).toEqual([]);
  });

  test('pre-populates primary and secondary diagnosis from the episode-linked Conditions', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      diagnosis: [
        { condition: { reference: 'Condition/primary-1' }, rank: 1 },
        { condition: { reference: 'Condition/secondary-1' }, rank: 2 },
      ],
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    readReference.mockImplementation(async (ref: { reference: string }) => {
      if (ref.reference === 'Condition/primary-1') {
        return {
          resourceType: 'Condition',
          id: 'primary-1',
          code: { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'depression' }] },
        };
      }
      if (ref.reference === 'Condition/secondary-1') {
        return {
          resourceType: 'Condition',
          id: 'secondary-1',
          code: { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'generalised-anxiety-disorder' }] },
        };
      }
      throw new Error(`Unexpected reference: ${ref.reference}`);
    });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.values.primaryDiagnosis).toBe('depression');
    expect(result.current.values.secondaryDiagnosis).toBe('generalised-anxiety-disorder');
  });

  test('only pre-populates primary diagnosis when no secondary diagnosis is linked', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      diagnosis: [{ condition: { reference: 'Condition/primary-1' }, rank: 1 }],
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    readReference.mockResolvedValue({
      resourceType: 'Condition',
      id: 'primary-1',
      code: { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'depression' }] },
    });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.values.primaryDiagnosis).toBe('depression');
    expect(result.current.values.secondaryDiagnosis).toBeNull();
  });

  test('leaves diagnosis values blank when the episode has no linked diagnosis', async () => {
    activeEpisodeState.activeEpisode = { resourceType: 'EpisodeOfCare', id: 'episode-1', status: 'active' };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(readReference).not.toHaveBeenCalled();
    expect(result.current.values.primaryDiagnosis).toBeNull();
    expect(result.current.values.secondaryDiagnosis).toBeNull();
  });

  test('pre-populates pathway, sessions, authorisation reference and rationale from the existing treatment ServiceRequest/CarePlan', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'ServiceRequest') {
        return [
          {
            resourceType: 'ServiceRequest',
            id: 'existing-sr',
            quantityQuantity: { value: 8, unit: 'session' },
            identifier: [
              {
                system: 'http://fhir.chimera.health/identifier/aviva-health/authorisation-reference',
                value: 'AUTH-999',
              },
            ],
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare',
                valueReference: { reference: 'EpisodeOfCare/episode-1' },
              },
            ],
          },
        ];
      }
      if (resourceType === 'CarePlan') {
        return [
          {
            resourceType: 'CarePlan',
            id: 'existing-careplan',
            activity: [{ reference: { reference: 'ServiceRequest/existing-sr' } }],
            category: [
              { coding: [{ system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual' }] },
              { coding: [{ system: 'http://fhir.chimera.health/CodeSystem/mh-therapy-modality', code: 'cbt' }] },
            ],
            note: [{ text: 'Previously entered rationale' }],
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare',
                valueReference: { reference: 'EpisodeOfCare/episode-1' },
              },
            ],
          },
        ];
      }
      return [];
    });

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.values.pathway).toBe('cbt-virtual');
    expect(result.current.values.sessionsAuthorised).toBe(8);
    expect(result.current.values.authorisationReference).toBe('AUTH-999');
    expect(result.current.values.clinicalRationale).toBe('Previously entered rationale');
  });

  test('leaves pathway/sessions/authorisation/rationale at defaults when no treatment ServiceRequest is linked yet', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    searchResources.mockImplementation(async () => []);

    const { result } = renderHook(() => useTreatmentPathway());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.values.pathway).toBeNull();
    expect(result.current.values.sessionsAuthorised).toBe(6);
    expect(result.current.values.authorisationReference).toBe('');
    expect(result.current.values.clinicalRationale).toBe('');
  });

  test('validate blocks submission and notifies when required fields are missing', async () => {
    activeEpisodeState.activeEpisode = undefined;
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });

    const { result } = renderHook(() => useTreatmentPathway());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.set('sessionsAuthorised', '');
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.primaryDiagnosis).toBe('Required');
    expect(result.current.errors.pathway).toBe('Required');
    expect(result.current.errors.sessionsAuthorised).toBe('Required');
    expect(result.current.errors.clinicalRationale).toBe('Required');
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ color: 'red', autoClose: false }));
  });

  test('validate passes and set() clears a field error once corrected', async () => {
    activeEpisodeState.activeEpisode = undefined;
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });

    const { result } = renderHook(() => useTreatmentPathway());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.set('primaryDiagnosis', 'depression');
      result.current.set('pathway', 'pathway-a');
      result.current.set('authorisationReference', 'AUTH-1');
      result.current.set('clinicalRationale', 'Clinically indicated');
    });

    let isValid = false;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  test('confirmPathway saves the diagnosis Conditions and returns true on success', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
      referralRequest: [{ reference: 'ServiceRequest/referral-1' }],
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [{ code: 'depression', display: 'Depression' }] } });
    createResource.mockImplementation(async (resource: any) => ({ ...resource, id: 'condition-1' }));
    updateResource.mockImplementation(async (resource: any) => resource);
    readReference.mockImplementation(buildReferralChainReader());

    const { result } = renderHook(() => useTreatmentPathway());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.set('primaryDiagnosis', 'depression');
      result.current.set('pathway', 'pathway-a');
      result.current.set('authorisationReference', 'AUTH-1');
      result.current.set('clinicalRationale', 'Clinically indicated');
    });

    let saved = false;
    await act(async () => {
      saved = await result.current.confirmPathway();
    });

    expect(saved).toBe(true);
    expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Condition' }));
    expect(updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        diagnosis: [{ condition: expect.objectContaining({ reference: 'Condition/condition-1' }), rank: 1 }],
      })
    );
    expect(setActiveEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        diagnosis: [{ condition: expect.objectContaining({ reference: 'Condition/condition-1' }), rank: 1 }],
      })
    );
  });

  test('confirming again after the active episode store is refreshed updates rather than re-creates the Condition', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
      referralRequest: [{ reference: 'ServiceRequest/referral-1' }],
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [{ code: 'depression', display: 'Depression' }] } });
    createResource.mockImplementation(async (resource: any) => ({ ...resource, id: 'condition-1' }));
    updateResource.mockImplementation(async (resource: any) => resource);
    readReference.mockImplementation(
      buildReferralChainReader({
        'Condition/condition-1': {
          resourceType: 'Condition',
          id: 'condition-1',
          subject: { reference: 'Patient/patient-1' },
        },
      })
    );

    const { result, rerender } = renderHook(() => useTreatmentPathway());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.set('primaryDiagnosis', 'depression');
      result.current.set('pathway', 'pathway-a');
      result.current.set('authorisationReference', 'AUTH-1');
      result.current.set('clinicalRationale', 'Clinically indicated');
    });

    await act(async () => {
      await result.current.confirmPathway();
    });

    expect(createResource).toHaveBeenCalledTimes(1);

    // Simulate the store actually being updated with what setActiveEpisode was called with, then re-render.
    activeEpisodeState.activeEpisode = setActiveEpisode.mock.calls[0][0];
    rerender();

    await act(async () => {
      await result.current.confirmPathway();
    });

    expect(createResource).toHaveBeenCalledTimes(1);
    expect(updateResource).toHaveBeenCalledWith(expect.objectContaining({ id: 'condition-1' }));
  });

  test('confirmPathway returns false and notifies when the save fails', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [{ code: 'depression', display: 'Depression' }] } });
    createResource.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useTreatmentPathway());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.set('primaryDiagnosis', 'depression');
      result.current.set('pathway', 'pathway-a');
      result.current.set('authorisationReference', 'AUTH-1');
      result.current.set('clinicalRationale', 'Clinically indicated');
    });

    let saved = true;
    await act(async () => {
      saved = await result.current.confirmPathway();
    });

    expect(saved).toBe(false);
    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', message: 'Failed to save the treatment pathway.' })
    );
  });
});
