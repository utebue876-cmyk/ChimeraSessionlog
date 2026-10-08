import type { EpisodeOfCare } from '@medplum/fhirtypes';
import { describe, expect, test, vi } from 'vitest';
import {
  CASE_STATE_CODE_SYSTEM_URL,
  EOC_CASE_STATE_URL,
  MH_DIAGNOSIS_CODE_SYSTEM_URL,
  MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
} from '../../config/chimera-urls';
import { useProjectOrganizationStore } from '../../store/projectOrganizationStore';
import { confirmTreatmentPathway } from './confirmTreatmentPathway';
import type { TreatmentPathwayValues } from './useTreatmentPathway';

const WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL = 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare';
const TREATMENT_SERVICE_CODING = {
  system: 'http://fhir.chimera.health/CodeSystem/mh-treatment-service',
  code: 'cbt-virtual-treatment',
  display: 'CBT Virtual Treatment',
};
const MODALITY_CODING = {
  system: 'http://fhir.chimera.health/CodeSystem/mh-therapy-modality',
  code: 'cbt',
  display: 'CBT',
};
const DELIVERY_MODE_CODING = {
  system: 'http://fhir.chimera.health/CodeSystem/mh-delivery-mode',
  code: 'virtual',
  display: 'Virtual',
};
const PATHWAY_CODING = {
  system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
  code: 'pathway-a',
  version: '0.5.0',
  display: 'Virtual CBT',
};
const PRACTITIONER = { resourceType: 'Practitioner', id: 'practitioner-1', name: [{ text: 'Dr. Who' }] };
const FUNDER_ORGANIZATION = {
  resourceType: 'Organization',
  id: 'aviva',
  name: 'Aviva Health',
  // Matches what beforeEach configures via useProjectOrganizationStore - must stay in sync with it.
  identifier: [{ system: 'http://fhir.chimera.health/identifier/iprs-health/organization', value: 'aviva-health' }],
};

const diagnosisOptions = [
  { value: 'depression', label: 'Depression' },
  { value: 'generalised-anxiety-disorder', label: 'Generalised Anxiety Disorder (GAD)' },
];
const pathwayOptions = [{ value: 'pathway-a', label: 'Virtual CBT', coding: PATHWAY_CODING }];

function buildValues(overrides?: Partial<TreatmentPathwayValues>): TreatmentPathwayValues {
  return {
    primaryDiagnosis: 'depression',
    secondaryDiagnosis: null,
    pathway: 'pathway-a',
    sessionsAuthorised: 6,
    authorisationReference: 'AUTH-1',
    clinicalRationale: 'Clinically indicated',
    ...overrides,
  };
}

function buildEpisode(overrides?: Partial<EpisodeOfCare>): EpisodeOfCare {
  return {
    resourceType: 'EpisodeOfCare',
    id: 'episode-1',
    status: 'active',
    patient: { reference: 'Patient/patient-1' },
    referralRequest: [{ reference: 'ServiceRequest/referral-1' }],
    ...overrides,
  };
}

function buildPathwayCodeSystem(): any {
  return {
    resourceType: 'CodeSystem',
    url: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
    version: '0.5.0',
    concept: [
      {
        code: 'pathway-a',
        property: [
          { code: 'service', valueCoding: TREATMENT_SERVICE_CODING },
          { code: 'modality', valueCoding: MODALITY_CODING },
          { code: 'delivery-mode', valueCoding: DELIVERY_MODE_CODING },
        ],
      },
    ],
  };
}

function buildExistingTreatmentServiceRequest(episodeId = 'episode-1'): any {
  return {
    resourceType: 'ServiceRequest',
    id: 'existing-sr',
    status: 'active',
    intent: 'order',
    subject: { reference: 'Patient/patient-1' },
    quantityQuantity: { value: 4, unit: 'session' },
    extension: [
      { url: WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL, valueReference: { reference: `EpisodeOfCare/${episodeId}` } },
    ],
  };
}

function buildExistingCarePlan(episodeId = 'episode-1'): any {
  return {
    resourceType: 'CarePlan',
    id: 'existing-careplan',
    status: 'active',
    intent: 'plan',
    subject: { reference: 'Patient/patient-1' },
    activity: [{ reference: { reference: 'ServiceRequest/existing-sr' } }],
    extension: [
      { url: WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL, valueReference: { reference: `EpisodeOfCare/${episodeId}` } },
    ],
  };
}

function buildCaseStateCodeSystem(): any {
  return {
    resourceType: 'CodeSystem',
    url: CASE_STATE_CODE_SYSTEM_URL,
    concept: [
      {
        code: 'awaiting-treatment-decision',
        display: 'Awaiting treatment decision',
        property: [{ code: 'ordinal', valueInteger: 40 }],
      },
      { code: 'in-treatment', display: 'In treatment', property: [{ code: 'ordinal', valueInteger: 50 }] },
      {
        code: 'awaiting-discharge-report',
        display: 'Awaiting discharge report',
        property: [{ code: 'ordinal', valueInteger: 60 }],
      },
      { code: 'on-hold', display: 'On hold', property: [] },
    ],
  };
}

// Resolves the referral ServiceRequest -> funder Organization chain used to find the authorisation
// reference identifier's system, merged with any resource-specific references a test also needs.
function buildFunderChainReader(extra: Record<string, any> = {}): (ref: { reference: string }) => Promise<any> {
  return async (ref: { reference: string }) => {
    if (extra[ref.reference]) {
      return extra[ref.reference];
    }
    if (ref.reference === 'ServiceRequest/referral-1') {
      return { resourceType: 'ServiceRequest', id: 'referral-1', requester: { reference: 'Organization/aviva' } };
    }
    if (ref.reference === 'Organization/aviva') {
      return FUNDER_ORGANIZATION;
    }
    throw new Error(`Unexpected reference: ${ref.reference}`);
  };
}

// Diagnosis-focused tests only care about Condition create/update calls, so the treatment ServiceRequest
// and CarePlan lookups default to finding an already-linked resource (update path) to keep those counts
// stable; resourceType-aware so overriding one doesn't silently affect the other.
function buildMedplum(overrides: Record<string, any>): any {
  return {
    searchOne: vi.fn(async (resourceType: string, query: string) => {
      if (resourceType === 'CodeSystem' && query.includes(CASE_STATE_CODE_SYSTEM_URL)) {
        return buildCaseStateCodeSystem();
      }
      return buildPathwayCodeSystem();
    }),
    searchResources: vi.fn(async (resourceType: string) => {
      if (resourceType === 'ServiceRequest') return [buildExistingTreatmentServiceRequest()];
      if (resourceType === 'CarePlan') return [buildExistingCarePlan()];
      return [];
    }),
    readReference: vi.fn(buildFunderChainReader()),
    getProfile: vi.fn(() => PRACTITIONER),
    ...overrides,
  };
}

describe('confirmTreatmentPathway', () => {
  beforeEach(() => {
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
  });

  test('creates a Condition for the primary diagnosis and sets it as rank 1', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: 'condition-1' }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    const updated = await confirmTreatmentPathway(
      medplum,
      buildEpisode(),
      buildValues(),
      diagnosisOptions,
      pathwayOptions
    );

    expect(createResource).toHaveBeenCalledTimes(1);
    expect(createResource).toHaveBeenCalledWith({
      resourceType: 'Condition',
      subject: { reference: 'Patient/patient-1' },
      code: {
        coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'depression', display: 'Depression' }],
        text: 'Depression',
      },
    });
    expect(updated.diagnosis).toEqual([
      { condition: expect.objectContaining({ reference: 'Condition/condition-1' }), rank: 1 },
    ]);
  });

  test('also creates a secondary diagnosis Condition as rank 2 when provided', async () => {
    let nextId = 1;
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `condition-${nextId++}` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    const values = buildValues({ secondaryDiagnosis: 'generalised-anxiety-disorder' });
    const updated = await confirmTreatmentPathway(medplum, buildEpisode(), values, diagnosisOptions, pathwayOptions);

    expect(createResource).toHaveBeenCalledTimes(2);
    expect(updated.diagnosis).toEqual([
      { condition: expect.objectContaining({ reference: 'Condition/condition-1' }), rank: 1 },
      { condition: expect.objectContaining({ reference: 'Condition/condition-2' }), rank: 2 },
    ]);
  });

  test('preserves any existing diagnosis entries that are not rank 1 or 2', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: 'condition-1' }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    const existingDiagnosis = [{ condition: { reference: 'Condition/other' }, rank: 3 }];
    const updated = await confirmTreatmentPathway(
      medplum,
      buildEpisode({ diagnosis: existingDiagnosis }),
      buildValues(),
      diagnosisOptions,
      pathwayOptions
    );

    expect(updated.diagnosis).toEqual([
      { condition: { reference: 'Condition/other' }, rank: 3 },
      { condition: expect.objectContaining({ reference: 'Condition/condition-1' }), rank: 1 },
    ]);
  });

  test('updates both existing rank 1/2 Conditions on re-save instead of creating new ones', async () => {
    const readReference = vi.fn(
      buildFunderChainReader({
        'Condition/old-primary': {
          resourceType: 'Condition',
          id: 'old-primary',
          subject: { reference: 'Patient/patient-1' },
          code: { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'old-primary-code' }] },
        },
        'Condition/old-secondary': {
          resourceType: 'Condition',
          id: 'old-secondary',
          subject: { reference: 'Patient/patient-1' },
          code: { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'old-secondary-code' }] },
        },
      })
    );
    const createResource = vi.fn();
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource, readReference });

    const existingDiagnosis = [
      { condition: { reference: 'Condition/old-primary' }, rank: 1 },
      { condition: { reference: 'Condition/old-secondary' }, rank: 2 },
    ];
    const values = buildValues({ secondaryDiagnosis: 'generalised-anxiety-disorder' });
    const updated = await confirmTreatmentPathway(
      medplum,
      buildEpisode({ diagnosis: existingDiagnosis }),
      values,
      diagnosisOptions,
      pathwayOptions
    );

    expect(createResource).not.toHaveBeenCalled();
    expect(updateResource).toHaveBeenCalledWith(expect.objectContaining({ id: 'old-primary' }));
    expect(updateResource).toHaveBeenCalledWith(expect.objectContaining({ id: 'old-secondary' }));
    expect(updated.diagnosis).toEqual([
      { condition: expect.objectContaining({ reference: 'Condition/old-primary' }), rank: 1 },
      { condition: expect.objectContaining({ reference: 'Condition/old-secondary' }), rank: 2 },
    ]);
  });

  test('updates the existing primary Condition instead of creating a new one when rank 1 already exists', async () => {
    const readReference = vi.fn(
      buildFunderChainReader({
        'Condition/old-primary': {
          resourceType: 'Condition',
          id: 'old-primary',
          subject: { reference: 'Patient/patient-1' },
          code: { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'generalised-anxiety-disorder' }] },
        },
      })
    );
    const createResource = vi.fn();
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource, readReference });

    const existingDiagnosis = [{ condition: { reference: 'Condition/old-primary' }, rank: 1 }];
    const updated = await confirmTreatmentPathway(
      medplum,
      buildEpisode({ diagnosis: existingDiagnosis }),
      buildValues(),
      diagnosisOptions,
      pathwayOptions
    );

    expect(createResource).not.toHaveBeenCalled();
    expect(updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'old-primary',
        code: {
          coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'depression', display: 'Depression' }],
          text: 'Depression',
        },
      })
    );
    expect(updated.diagnosis).toEqual([
      { condition: expect.objectContaining({ reference: 'Condition/old-primary' }), rank: 1 },
    ]);
  });

  test('creates the secondary Condition but updates the existing primary when only rank 1 already exists', async () => {
    const readReference = vi.fn(
      buildFunderChainReader({
        'Condition/old-primary': {
          resourceType: 'Condition',
          id: 'old-primary',
          subject: { reference: 'Patient/patient-1' },
          code: { coding: [{ system: MH_DIAGNOSIS_CODE_SYSTEM_URL, code: 'depression' }] },
        },
      })
    );
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: 'condition-new-secondary' }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource, readReference });

    const existingDiagnosis = [{ condition: { reference: 'Condition/old-primary' }, rank: 1 }];
    const values = buildValues({ secondaryDiagnosis: 'generalised-anxiety-disorder' });
    const updated = await confirmTreatmentPathway(
      medplum,
      buildEpisode({ diagnosis: existingDiagnosis }),
      values,
      diagnosisOptions,
      pathwayOptions
    );

    expect(createResource).toHaveBeenCalledTimes(1);
    expect(updateResource).toHaveBeenCalledWith(expect.objectContaining({ id: 'old-primary' }));
    expect(updated.diagnosis).toEqual([
      { condition: expect.objectContaining({ reference: 'Condition/old-primary' }), rank: 1 },
      { condition: expect.objectContaining({ reference: 'Condition/condition-new-secondary' }), rank: 2 },
    ]);
  });

  test('throws when primary diagnosis is missing', async () => {
    const medplum = { createResource: vi.fn(), updateResource: vi.fn() } as any;

    await expect(
      confirmTreatmentPathway(
        medplum,
        buildEpisode(),
        buildValues({ primaryDiagnosis: null }),
        diagnosisOptions,
        pathwayOptions
      )
    ).rejects.toThrow('Primary diagnosis is required');
  });

  test('creates a new treatment ServiceRequest carrying the mapped service code, quantity and episode link', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource, searchResources: vi.fn(async () => []) });

    await confirmTreatmentPathway(medplum, buildEpisode(), buildValues(), diagnosisOptions, pathwayOptions);

    expect(createResource).toHaveBeenCalledWith({
      resourceType: 'ServiceRequest',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/patient-1' },
      code: { coding: [TREATMENT_SERVICE_CODING] },
      quantityQuantity: { value: 6, unit: 'session' },
      identifier: [
        {
          system: 'http://fhir.chimera.health/identifier/aviva-health/authorisation-reference',
          value: 'AUTH-1',
          assigner: expect.objectContaining({ reference: 'Organization/aviva' }),
        },
      ],
      extension: [
        {
          url: WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL,
          valueReference: { reference: 'EpisodeOfCare/episode-1' },
        },
      ],
    });
  });

  test('updates the existing treatment ServiceRequest linked via the workflow-episodeOfCare extension', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: 'condition-1' }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const searchResources = vi.fn(async (resourceType: string) =>
      resourceType === 'ServiceRequest' ? [buildExistingTreatmentServiceRequest()] : [buildExistingCarePlan()]
    );
    const medplum = buildMedplum({ createResource, updateResource, searchResources });

    await confirmTreatmentPathway(
      medplum,
      buildEpisode(),
      buildValues({ sessionsAuthorised: 10 }),
      diagnosisOptions,
      pathwayOptions
    );

    expect(updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-sr',
        quantityQuantity: { value: 10, unit: 'session' },
        extension: [
          {
            url: WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL,
            valueReference: { reference: 'EpisodeOfCare/episode-1' },
          },
        ],
      })
    );
  });

  test('throws when the selected pathway has no mh-treatment-service mapping', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: 'condition-1' }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({
      createResource,
      updateResource,
      searchOne: vi.fn(async () => ({
        resourceType: 'CodeSystem',
        url: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
        concept: [{ code: 'pathway-a', property: [] }],
      })),
    });

    await expect(
      confirmTreatmentPathway(medplum, buildEpisode(), buildValues(), diagnosisOptions, pathwayOptions)
    ).rejects.toThrow('No mh-treatment-service mapping found for pathway "pathway-a"');
  });

  test('adds the authorisation reference identifier, namespaced by the funder organisation code', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource, searchResources: vi.fn(async () => []) });

    await confirmTreatmentPathway(
      medplum,
      buildEpisode(),
      buildValues({ authorisationReference: 'AUTH-123' }),
      diagnosisOptions,
      pathwayOptions
    );

    expect(createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'ServiceRequest',
        identifier: [
          {
            system: 'http://fhir.chimera.health/identifier/aviva-health/authorisation-reference',
            value: 'AUTH-123',
            assigner: expect.objectContaining({ reference: 'Organization/aviva' }),
          },
        ],
      })
    );
  });

  test('replaces, rather than duplicates, an existing authorisation reference identifier on re-save', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const existingServiceRequest = {
      ...buildExistingTreatmentServiceRequest(),
      identifier: [
        {
          system: 'http://fhir.chimera.health/identifier/aviva-health/authorisation-reference',
          value: 'OLD-REF',
          assigner: { reference: 'Organization/aviva' },
        },
        { system: 'http://some-other-system', value: 'keep-me' },
      ],
    };
    const medplum = buildMedplum({
      createResource,
      updateResource,
      searchResources: vi.fn(async () => [existingServiceRequest]),
    });

    await confirmTreatmentPathway(
      medplum,
      buildEpisode(),
      buildValues({ authorisationReference: 'NEW-REF' }),
      diagnosisOptions,
      pathwayOptions
    );

    expect(updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: [
          { system: 'http://some-other-system', value: 'keep-me' },
          {
            system: 'http://fhir.chimera.health/identifier/aviva-health/authorisation-reference',
            value: 'NEW-REF',
            assigner: expect.objectContaining({ reference: 'Organization/aviva' }),
          },
        ],
      })
    );
  });

  test('does not add an authorisation reference identifier when none is entered', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource, searchResources: vi.fn(async () => []) });

    await confirmTreatmentPathway(
      medplum,
      buildEpisode(),
      buildValues({ authorisationReference: '' }),
      diagnosisOptions,
      pathwayOptions
    );

    expect(createResource).toHaveBeenCalledWith(expect.not.objectContaining({ identifier: expect.anything() }));
  });

  test('throws when the funder organisation cannot be resolved for the authorisation reference', async () => {
    const createResource = vi.fn();
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    await expect(
      confirmTreatmentPathway(
        medplum,
        buildEpisode({ referralRequest: undefined }),
        buildValues({ authorisationReference: 'AUTH-1' }),
        diagnosisOptions,
        pathwayOptions
      )
    ).rejects.toThrow('Could not resolve the funder organisation to build the authorisation reference identifier');
  });

  test('creates a new CarePlan with pathway/modality/delivery-mode categories, one activity and a note', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({
      createResource,
      updateResource,
      searchResources: vi.fn(async () => []),
    });

    await confirmTreatmentPathway(medplum, buildEpisode(), buildValues(), diagnosisOptions, pathwayOptions);

    expect(createResource).toHaveBeenCalledWith({
      resourceType: 'CarePlan',
      status: 'active',
      intent: 'plan',
      subject: { reference: 'Patient/patient-1' },
      category: [{ coding: [PATHWAY_CODING] }, { coding: [MODALITY_CODING] }, { coding: [DELIVERY_MODE_CODING] }],
      activity: [{ reference: expect.objectContaining({ reference: 'ServiceRequest/ServiceRequest-new' }) }],
      note: [
        {
          text: 'Clinically indicated',
          authorReference: expect.objectContaining({ reference: 'Practitioner/practitioner-1' }),
          time: expect.any(String),
        },
      ],
      extension: [
        {
          url: WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL,
          valueReference: expect.objectContaining({ reference: 'EpisodeOfCare/episode-1' }),
        },
      ],
    });
  });

  test('omits category[2] when the pathway concept has no delivery-mode property', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({
      createResource,
      updateResource,
      searchResources: vi.fn(async () => []),
      searchOne: vi.fn(async () => ({
        resourceType: 'CodeSystem',
        url: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
        concept: [
          {
            code: 'pathway-a',
            property: [
              { code: 'service', valueCoding: TREATMENT_SERVICE_CODING },
              { code: 'modality', valueCoding: MODALITY_CODING },
            ],
          },
        ],
      })),
    });

    await confirmTreatmentPathway(medplum, buildEpisode(), buildValues(), diagnosisOptions, pathwayOptions);

    expect(createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'CarePlan',
        category: [{ coding: [PATHWAY_CODING] }, { coding: [MODALITY_CODING] }],
      })
    );
  });

  test('updates the existing CarePlan linked via the workflow-episodeOfCare extension', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    await confirmTreatmentPathway(
      medplum,
      buildEpisode(),
      buildValues({ clinicalRationale: 'Updated rationale' }),
      diagnosisOptions,
      pathwayOptions
    );

    expect(updateResource).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing-careplan',
        resourceType: 'CarePlan',
        activity: [{ reference: expect.objectContaining({ reference: 'ServiceRequest/existing-sr' }) }],
        note: [expect.objectContaining({ text: 'Updated rationale' })],
      })
    );
  });

  test('throws when the pathway concept has no modality mapping', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({
      createResource,
      updateResource,
      searchOne: vi.fn(async () => ({
        resourceType: 'CodeSystem',
        url: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
        concept: [{ code: 'pathway-a', property: [{ code: 'service', valueCoding: TREATMENT_SERVICE_CODING }] }],
      })),
    });

    await expect(
      confirmTreatmentPathway(medplum, buildEpisode(), buildValues(), diagnosisOptions, pathwayOptions)
    ).rejects.toThrow('No modality mapping found for pathway "pathway-a"');
  });

  test('throws when no pathway option is found for the selected pathway code', async () => {
    const medplum = buildMedplum({ createResource: vi.fn(), updateResource: vi.fn(async (r: any) => r) });

    await expect(confirmTreatmentPathway(medplum, buildEpisode(), buildValues(), diagnosisOptions, [])).rejects.toThrow(
      'No pathway option found for "pathway-a"'
    );
  });

  test('advances the case-state extension to in-treatment when the current state is behind it on the spine', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    const episode = buildEpisode({
      extension: [
        { url: EOC_CASE_STATE_URL, valueCoding: { code: 'awaiting-treatment-decision' } },
        { url: 'http://some-other-extension', valueString: 'keep-me' },
      ],
    });

    const updated = await confirmTreatmentPathway(medplum, episode, buildValues(), diagnosisOptions, pathwayOptions);

    expect(updated.extension).toEqual([
      { url: 'http://some-other-extension', valueString: 'keep-me' },
      {
        url: EOC_CASE_STATE_URL,
        valueCoding: { system: CASE_STATE_CODE_SYSTEM_URL, code: 'in-treatment', display: 'In treatment' },
      },
    ]);
  });

  test('does not advance the case-state when it is already at or past in-treatment', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    const existingExtension = [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'awaiting-discharge-report' } }];
    const episode = buildEpisode({ extension: existingExtension });

    const updated = await confirmTreatmentPathway(medplum, episode, buildValues(), diagnosisOptions, pathwayOptions);

    expect(updated.extension).toEqual(existingExtension);
  });

  test('does not touch the case-state when the current state has no ordinal (e.g. on-hold)', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    const existingExtension = [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'on-hold' } }];
    const episode = buildEpisode({ extension: existingExtension });

    const updated = await confirmTreatmentPathway(medplum, episode, buildValues(), diagnosisOptions, pathwayOptions);

    expect(updated.extension).toEqual(existingExtension);
  });

  test('does not add a case-state extension when the episode has none yet', async () => {
    const createResource = vi.fn(async (resource: any) => ({ ...resource, id: `${resource.resourceType}-new` }));
    const updateResource = vi.fn(async (resource: any) => resource);
    const medplum = buildMedplum({ createResource, updateResource });

    const updated = await confirmTreatmentPathway(
      medplum,
      buildEpisode(),
      buildValues(),
      diagnosisOptions,
      pathwayOptions
    );

    expect(updated.extension).toBeUndefined();
  });
});
