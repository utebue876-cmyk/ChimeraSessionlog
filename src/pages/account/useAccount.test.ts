import type { EpisodeOfCare, Patient } from '@medplum/fhirtypes';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAccount } from './useAccount';

const medplumState = vi.hoisted(() => ({
  searchResources: vi.fn(),
  readReference: vi.fn(),
}));

const activeEpisodeState = vi.hoisted(() => ({
  activeEpisode: undefined as EpisodeOfCare | undefined,
}));

const patientState = vi.hoisted(() => ({
  patient: { resourceType: 'Patient', id: 'p1' } as Patient | undefined,
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
  useMedplumProfile: () => undefined,
}));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => activeEpisodeState,
}));

vi.mock('../../hooks/usePatient', () => ({
  usePatient: () => patientState.patient,
}));

describe('useAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeEpisodeState.activeEpisode = undefined;
    patientState.patient = { resourceType: 'Patient', id: 'p1' };
  });

  const appointments: Record<string, unknown> = {
    'Appointment/app-1': {
      resourceType: 'Appointment',
      id: 'app-1',
      start: '2026-01-02T10:00:00Z',
      end: '2026-01-02T10:30:00Z',
      status: 'fulfilled',
    },
    'Appointment/app-2': {
      resourceType: 'Appointment',
      id: 'app-2',
      start: '2026-01-03T10:00:00Z',
      end: '2026-01-03T10:30:00Z',
      status: 'fulfilled',
    },
    'Appointment/app-3': {
      resourceType: 'Appointment',
      id: 'app-3',
      start: '2026-01-04T10:00:00Z',
      end: '2026-01-04T10:30:00Z',
      status: 'noshow',
    },
  };

  const encounters: Record<string, unknown> = {
    'Encounter/enc-1': {
      resourceType: 'Encounter',
      id: 'enc-1',
      status: 'finished',
      appointment: [{ reference: 'Appointment/app-1' }],
    },
    'Encounter/enc-2': {
      resourceType: 'Encounter',
      id: 'enc-2',
      status: 'finished',
      appointment: [{ reference: 'Appointment/app-2' }],
    },
  };

  function mockReads(): void {
    medplumState.readReference.mockImplementation(async (reference: { reference?: string }) => {
      const resource = appointments[reference.reference ?? ''] ?? encounters[reference.reference ?? ''];
      if (!resource) {
        throw new Error(`not found: ${reference.reference}`);
      }
      return resource;
    });
  }

  test('loads charges by account and groups them by appointment', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'case-1',
      status: 'active',
      patient: { reference: 'Patient/p1' },
      identifier: [{ value: 'CASE-1' }],
      period: { start: '2026-01-01' },
      account: [{ reference: 'Account/acc-1' }],
    };
    mockReads();

    medplumState.searchResources.mockImplementation(async (resourceType: string, query: any) => {
      if (resourceType === 'ChargeItem') {
        // One search, by account. Never by encounter.
        expect(query).toEqual([
          ['account', 'Account/acc-1'],
          ['_count', '1000'],
        ]);
        return [
          // Raised by a charge Bot: context is the case, appointment in supportingInformation.
          {
            resourceType: 'ChargeItem',
            id: 'ch-1',
            context: { reference: 'EpisodeOfCare/case-1' },
            account: [{ reference: 'Account/acc-1' }],
            supportingInformation: [{ reference: 'Appointment/app-1' }],
            code: {
              coding: [
                {
                  system: 'http://fhir.chimera.health/CodeSystem/mh-treatment-service',
                  code: 'mh-initial-assessment',
                  display: 'MH Initial Assessment',
                },
              ],
            },
            priceOverride: { value: 50 },
          },
          // Added in the encounter chart: context is the Encounter, appointment found through it.
          {
            resourceType: 'ChargeItem',
            id: 'ch-2',
            context: { reference: 'Encounter/enc-2' },
            account: [{ reference: 'Account/acc-1' }],
            code: { coding: [{ system: 'http://www.ama-assn.org/go/cpt', code: '99213' }] },
            priceOverride: { value: 100 },
          },
          {
            resourceType: 'ChargeItem',
            id: 'ch-3',
            context: { reference: 'Encounter/enc-2' },
            account: [{ reference: 'Account/acc-1' }],
            code: { coding: [{ system: 'http://www.ama-assn.org/go/cpt', code: '99406' }] },
            priceOverride: { value: 25 },
            extension: [
              {
                url: 'http://hl7.org/fhir/StructureDefinition/chargeitem-modifier',
                valueCodeableConcept: { text: '25' },
              },
            ],
          },
          // A missed appointment: charged, but there is no Encounter at all.
          {
            resourceType: 'ChargeItem',
            id: 'ch-4',
            context: { reference: 'EpisodeOfCare/case-1' },
            account: [{ reference: 'Account/acc-1' }],
            supportingInformation: [{ reference: 'Appointment/app-3' }],
            code: { text: 'DNA fee' },
            priceOverride: { value: 20 },
          },
        ];
      }

      if (resourceType === 'Encounter') {
        // Only the appointments whose Encounter is not already known from ChargeItem.context.
        expect(query).toEqual([
          ['appointment', 'Appointment/app-1,Appointment/app-3'],
          ['_count', '1000'],
        ]);
        return [encounters['Encounter/enc-1']];
      }

      return [];
    });

    const { result } = renderHook(() => useAccount());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.caseId).toBe('CASE-1');
    expect(result.current.sections).toHaveLength(3);

    const [bot, chart, dna] = result.current.sections;
    expect(bot.appointment?.id).toBe('app-1');
    expect(bot.encounter?.id).toBe('enc-1');
    expect(bot.encounterStatus).toBe('finished');
    expect(bot.appointmentSummary).toContain('Encounter: enc-1');
    expect(bot.rows).toHaveLength(1);
    expect(bot.rows[0].cptCode).toBe('MH Initial Assessment');

    expect(chart.appointment?.id).toBe('app-2');
    expect(chart.encounter?.id).toBe('enc-2');
    expect(chart.rows).toHaveLength(2);
    expect(chart.calculatedCost).toBe('£125.00');

    expect(dna.appointment?.id).toBe('app-3');
    expect(dna.encounter).toBeUndefined();
    expect(dna.encounterStatus).toBe('N/A');
    expect(dna.rows[0].cptCode).toBe('DNA fee');

    expect(result.current.totalBill).toBe('£195.00');
  });

  test('shows nothing, and searches for nothing, when the case has no account', async () => {
    activeEpisodeState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'case-1',
      status: 'active',
      patient: { reference: 'Patient/p1' },
      identifier: [{ value: 'CASE-1' }],
    };
    medplumState.searchResources.mockResolvedValue([]);

    const { result } = renderHook(() => useAccount());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.caseId).toBe('CASE-1');
    expect(result.current.sections).toEqual([]);
    expect(medplumState.searchResources).not.toHaveBeenCalled();
  });

  test('falls back to the first episode when no active case is set', async () => {
    medplumState.searchResources.mockImplementation(async (resourceType: string) => {
      if (resourceType === 'EpisodeOfCare') {
        return [
          {
            resourceType: 'EpisodeOfCare',
            id: 'case-2',
            identifier: [{ value: 'CASE-2' }],
            period: { start: '2026-01-01' },
            account: [{ reference: 'Account/acc-2' }],
          },
        ];
      }
      return [];
    });

    const { result } = renderHook(() => useAccount());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.caseId).toBe('CASE-2');
    expect(result.current.sections).toEqual([]);
    expect(result.current.totalBill).toBe('£0.00');
  });
});
