import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
  COVERAGE_TYPE_CODE_SYSTEM_URL,
  EOC_ENTITLEMENT_USAGE_EXTENSION_URL,
  MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
} from '../../config/chimera-urls';
import { useTreatmentCareplan } from './useTreatmentCareplan';
import type { ConfirmedTreatmentPathway } from './useTreatmentPathway';

const valueSetExpand = vi.hoisted(() => vi.fn());
const searchResourcePages = vi.hoisted(() => vi.fn());
const searchOne = vi.hoisted(() => vi.fn());
const readReference = vi.hoisted(() => vi.fn());
const activeEpisodeState = vi.hoisted(() => ({ activeEpisode: undefined as any }));
// A stable object reference is required: a new object literal on every useMedplum() call would change
// the identity of `medplum`, and effects depending on `[medplum]` would re-run on every render forever.
const medplumMock = vi.hoisted(() => ({
  valueSetExpand: (...args: unknown[]) => valueSetExpand(...args),
  searchResourcePages: (...args: unknown[]) => searchResourcePages(...args),
  searchOne: (...args: unknown[]) => searchOne(...args),
  readReference: (...args: unknown[]) => readReference(...args),
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumMock,
}));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => activeEpisodeState,
}));

const blockCode = 'mh-treatment-talking-therapies';
function carePlan(overrides: any = {}): any {
  return {
    resourceType: 'CarePlan',
    id: 'careplan-1',
    status: 'active',
    category: [{ coding: [{ system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual', display: 'CBT' }] }],
    extension: [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare',
        valueReference: { reference: 'EpisodeOfCare/episode-1' },
      },
    ],
    ...overrides,
  };
}

function chain(): Record<string, any> {
  return {
    'Account/account-1': { resourceType: 'Account', coverage: [{ coverage: { reference: 'Coverage/coverage-1' } }] },
    'Coverage/coverage-1': {
      resourceType: 'Coverage',
      extension: [
        { url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL, valueReference: { reference: 'InsurancePlan/plan-1' } },
      ],
    },
    'InsurancePlan/plan-1': {
      resourceType: 'InsurancePlan',
      coverage: [
        {
          type: { coding: [{ code: blockCode }] },
          benefit: [
            { type: { coding: [{ system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual' }] } },
            {
              type: { coding: [{ system: COVERAGE_TYPE_CODE_SYSTEM_URL, code: blockCode }] },
              limit: [
                { code: { coding: [{ code: 'standard-sessions' }] }, value: { value: 6 } },
                { code: { coding: [{ code: 'delegated-authority-sessions' }] }, value: { value: 3 } },
              ],
            },
          ],
        },
      ],
    },
  };
}

function buildConfirmedPathway(overrides?: Partial<ConfirmedTreatmentPathway>): ConfirmedTreatmentPathway {
  return {
    pathwayLabel: 'CBT',
    sessionsAuthorised: 4,
    authorisationReference: 'AUTH-1',
    startedDate: '2026-01-01',
    caseLabel: 'CASE-001',
    funderLabel: 'Aviva Health',
    ...overrides,
  };
}

describe('useTreatmentCareplan', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'episode-1',
      status: 'active',
      patient: { reference: 'Patient/patient-1' },
      account: [{ reference: 'Account/account-1' }],
    };
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    searchResourcePages.mockImplementation(async function* () {
      yield [carePlan()];
    });
    readReference.mockImplementation(async (ref: { reference: string }) => chain()[ref.reference]);
  });

  test('builds an initial session log with blank dates, no outcome, and the pathway service', async () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));

    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));

    expect(result.current.sessionLog).toHaveLength(3);
    expect(result.current.sessionLog).toEqual([
      { id: '1', date: '', service: 'CBT', outcome: null },
      { id: '2', date: '', service: 'CBT', outcome: null },
      { id: '3', date: '', service: 'CBT', outcome: null },
    ]);
    expect(result.current.startedDate).toBe('01/01/2026');
  });

  test('shows only up to the authorised session count when fewer than 3 are authorised', () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway({ sessionsAuthorised: 2 })));

    expect(result.current.sessionLog).toHaveLength(2);
  });

  test('setSessionOutcome updates only the targeted row', () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));

    act(() => {
      result.current.setSessionOutcome('2', 'late-cancelled');
    });

    expect(result.current.sessionLog.find((row) => row.id === '2')?.outcome).toBe('late-cancelled');
    expect(result.current.sessionLog.find((row) => row.id === '1')?.outcome).toBe(null);
  });

  test('setSessionDate updates only the targeted row', () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));

    act(() => {
      result.current.setSessionDate('2', '2026-02-10');
    });

    expect(result.current.sessionLog.find((row) => row.id === '2')?.date).toBe('2026-02-10');
    expect(result.current.sessionLog.find((row) => row.id === '1')?.date).toBe('');
  });

  test('countsTowardsAuthorisation is false for a blank outcome, and excludes in-notice cancellations', () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));

    expect(result.current.countsTowardsAuthorisation(null)).toBe(false);
    expect(result.current.countsTowardsAuthorisation('attended')).toBe(true);
    expect(result.current.countsTowardsAuthorisation('dna')).toBe(true);
    expect(result.current.countsTowardsAuthorisation('late-cancelled')).toBe(true);
    expect(result.current.countsTowardsAuthorisation('cancelled-in-notice')).toBe(false);
    expect(result.current.countsTowardsAuthorisation('cancelled-by-clinician')).toBe(false);
  });

  test('canAddSession is false once the session log reaches the authorised count, blocking addSession', () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway({ sessionsAuthorised: 3 })));

    expect(result.current.canAddSession).toBe(false);

    act(() => {
      result.current.addSession();
    });

    expect(result.current.sessionLog).toHaveLength(3);
  });

  test('addSession appends a new blank row with the pathway service when under the authorised count', async () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway({ sessionsAuthorised: 4 })));

    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));

    expect(result.current.canAddSession).toBe(true);

    act(() => {
      result.current.addSession();
    });

    expect(result.current.sessionLog).toHaveLength(4);
    expect(result.current.sessionLog[3]).toMatchObject({ id: '4', date: '', service: 'CBT', outcome: null });
    expect(result.current.canAddSession).toBe(false);
  });

  test('loads closure reason options from the MhClosureReason ValueSet', async () => {
    valueSetExpand.mockResolvedValue({
      expansion: { contains: [{ code: 'condition-resolved', display: 'Condition resolved' }] },
    });

    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));

    await waitFor(() => expect(result.current.closureReasonOptionsLoading).toBe(false));

    expect(result.current.closureReasonOptions).toEqual([{ value: 'condition-resolved', label: 'Condition resolved' }]);
    expect(result.current.closureReason).toBeNull();
  });

  test('setClosureReason updates the selected closure reason', async () => {
    valueSetExpand.mockResolvedValue({ expansion: { contains: [{ code: 'condition-resolved' }] } });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(result.current.closureReasonOptionsLoading).toBe(false));

    act(() => {
      result.current.setClosureReason('condition-resolved');
    });

    expect(result.current.closureReason).toBe('condition-resolved');
  });

  test('loads Aviva limits and labels every existing and added session from the saved CarePlan', async () => {
    searchResourcePages.mockImplementation(async function* () {
      yield [
        carePlan({
          category: [
            { coding: [{ system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual', display: 'Virtual CBT' }] },
          ],
        }),
      ];
    });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway({ pathwayLabel: 'Stale label' })));
    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));
    expect(result.current.authorisedServices).toEqual([
      { service: 'Virtual CBT', tier: 'Delegated authority', authorised: 3, used: 0, remaining: 3 },
      { service: 'Virtual CBT', tier: 'Standard', authorised: 6, used: 0, remaining: 6 },
    ]);
    act(() => result.current.addSession());
    expect(result.current.sessionLog.every((row) => row.service === 'Virtual CBT')).toBe(true);
    expect(readReference.mock.calls.map(([ref]) => ref.reference)).toEqual([
      'Account/account-1',
      'Coverage/coverage-1',
      'InsurancePlan/plan-1',
    ]);
    expect(searchOne).not.toHaveBeenCalled();
  });

  test('uses the newest active CarePlan across pages, ignores other cases and inactive plans, and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    searchResourcePages.mockImplementation(async function* () {
      yield [carePlan({ meta: { lastUpdated: '2026-10-01T12:00:00Z' } })];
      yield [
        carePlan({
          meta: { lastUpdated: '2026-10-08T12:00:00Z' },
          category: [{ coding: [{ system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'cbt-virtual' }] }],
        }),
        carePlan({ status: 'completed', meta: { lastUpdated: '2026-10-09T12:00:00Z' } }),
        carePlan({ extension: [], meta: { lastUpdated: '2026-10-10T12:00:00Z' } }),
      ];
    });
    searchOne.mockResolvedValue({ concept: [{ code: 'cbt-virtual', display: 'Virtual CBT' }] });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(result.current.pathwayLabel).toBe('Virtual CBT'));
    expect(warn).toHaveBeenCalledOnce();
    expect(searchOne).toHaveBeenCalledWith('CodeSystem', { url: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL });
    warn.mockRestore();
  });

  test('allocates usage only from the matched block', async () => {
    activeEpisodeState.activeEpisode.extension = ['other-block', blockCode].map((code, index) => ({
      url: EOC_ENTITLEMENT_USAGE_EXTENSION_URL,
      extension: [
        { url: 'block', valueCoding: { code } },
        { url: 'used', valueInteger: index ? 5 : 99 },
      ],
    }));
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));
    expect(result.current.authorisedServices.map(({ used, remaining }) => ({ used, remaining }))).toEqual([
      { used: 3, remaining: 0 },
      { used: 2, remaining: 4 },
    ]);
  });

  test.each([
    ['account', 'EpisodeOfCare has no account link'],
    ['coverage', 'Account has no coverage link'],
    ['plan', 'Coverage has no insurance plan link'],
    ['block', 'InsurancePlan has no treatment coverage block'],
    ['benefit', 'InsurancePlan has no treatment benefit matching the selected pathway'],
  ])('names a missing %s link without rendering fallback figures', async (missing, message) => {
    const resources = chain();
    if (missing === 'account') activeEpisodeState.activeEpisode.account = [];
    if (missing === 'coverage') resources['Account/account-1'].coverage = [];
    if (missing === 'plan') resources['Coverage/coverage-1'].extension = [];
    if (missing === 'block') resources['InsurancePlan/plan-1'].coverage = [];
    if (missing === 'benefit') resources['InsurancePlan/plan-1'].coverage[0].benefit = [];
    readReference.mockImplementation(async (ref: { reference: string }) => resources[ref.reference]);
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));
    expect(result.current.authorisedServicesError).toBe(`Authorised services unavailable: ${message}`);
    expect(result.current.authorisedServices).toEqual([]);
    expect(result.current.sessionLog[0].service).toBe('CBT');
  });

  test('omits an absent standard tier and renders zero delegated authority', async () => {
    const resources = chain();
    resources['InsurancePlan/plan-1'].coverage[0].benefit[0].limit = [
      { code: { coding: [{ code: 'delegated-authority-sessions' }] }, value: { value: 0 } },
    ];
    readReference.mockImplementation(async (ref: { reference: string }) => resources[ref.reference]);
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));
    expect(result.current.authorisedServices).toEqual([
      { service: 'CBT', tier: 'Delegated authority', authorised: 0, used: 0, remaining: 0 },
    ]);
  });

  test('switches case and pathway to another block without displaying the previous limits', async () => {
    const resources = chain();
    resources['Account/account-2'] = { coverage: [{ coverage: { reference: 'Coverage/coverage-2' } }] };
    resources['Coverage/coverage-2'] = {
      extension: [
        { url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL, valueReference: { reference: 'InsurancePlan/plan-2' } },
      ],
    };
    resources['InsurancePlan/plan-2'] = {
      coverage: [
        {
          type: { coding: [{ code: 'mh-treatment-counselling' }] },
          benefit: [
            {
              type: { coding: [{ system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL, code: 'counselling-virtual' }] },
              limit: [{ code: { coding: [{ code: 'standard-sessions' }] }, value: { value: 8 } }],
            },
          ],
        },
      ],
    };
    searchResourcePages.mockImplementation(async function* () {
      yield [
        activeEpisodeState.activeEpisode.id === 'episode-1'
          ? carePlan()
          : carePlan({
              category: [
                {
                  coding: [
                    {
                      system: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
                      code: 'counselling-virtual',
                      display: 'Virtual Counselling',
                    },
                  ],
                },
              ],
              extension: [
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare',
                  valueReference: { reference: 'EpisodeOfCare/episode-2' },
                },
              ],
            }),
      ];
    });
    readReference.mockImplementation(async (ref: { reference: string }) => resources[ref.reference]);
    const { result, rerender } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));
    expect(result.current.authorisedServices).toHaveLength(2);
    activeEpisodeState.activeEpisode = {
      ...activeEpisodeState.activeEpisode,
      id: 'episode-2',
      account: [{ reference: 'Account/account-2' }],
    };
    rerender();
    expect(result.current.authorisedServices).toEqual([]);
    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));
    expect(result.current.authorisedServices).toEqual([
      { service: 'Virtual Counselling', tier: 'Standard', authorised: 8, used: 0, remaining: 8 },
    ]);
    expect(result.current.sessionLog.every((row) => row.service === 'Virtual Counselling')).toBe(true);
  });

  test('does not replace a new case with an older in-flight lookup', async () => {
    let finishOldRead!: (value: any) => void;
    const oldRead = new Promise((resolve) => {
      finishOldRead = resolve;
    });
    readReference.mockImplementation((ref: { reference: string }) =>
      ref.reference === 'Account/account-1' ? oldRead : Promise.resolve(chain()[ref.reference])
    );
    const { result, rerender } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(readReference).toHaveBeenCalled());
    activeEpisodeState.activeEpisode = { ...activeEpisodeState.activeEpisode, account: [] };
    rerender();
    await waitFor(() => expect(result.current.authorisedServicesError).toContain('no account link'));
    await act(async () => {
      finishOldRead(chain()['Account/account-1']);
      await oldRead;
    });
    expect(result.current.authorisedServices).toEqual([]);
    expect(result.current.authorisedServicesError).toContain('no account link');
  });

  test('shows a lookup error when no active CarePlan exists', async () => {
    searchResourcePages.mockImplementation(async function* () {
      yield [];
    });
    const { result } = renderHook(() => useTreatmentCareplan(buildConfirmedPathway()));
    await waitFor(() => expect(result.current.authorisedServicesLoading).toBe(false));
    expect(result.current.authorisedServicesError).toContain('no active CarePlan');
    expect(result.current.authorisedServices).toEqual([]);
    expect(readReference).not.toHaveBeenCalled();
  });
});
