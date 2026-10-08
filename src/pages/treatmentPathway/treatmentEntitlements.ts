import type { MedplumClient } from '@medplum/core';
import type { Account, CarePlan, Coding, Coverage, EpisodeOfCare, InsurancePlan, Reference } from '@medplum/fhirtypes';
import {
  COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
  COVERAGE_TYPE_CODE_SYSTEM_URL,
  EOC_ENTITLEMENT_USAGE_EXTENSION_URL,
  MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL,
} from '../../config/chimera-urls';

const WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL = 'http://hl7.org/fhir/StructureDefinition/workflow-episodeOfCare';

export interface TreatmentLimits {
  delegated?: number;
  standard?: number;
}

export interface AuthorisedServiceRow {
  service: string;
  tier: string;
  authorised: number;
  used: number;
  remaining: number;
}

export function getTreatmentLimits(
  insurancePlan: InsurancePlan,
  pathway: Coding
): { blockCode: string; limits: TreatmentLimits } {
  const treatmentBlocks = (insurancePlan.coverage ?? []).filter((block) =>
    block.type.coding?.some((coding) => coding.code?.startsWith('mh-treatment-'))
  );
  if (treatmentBlocks.length === 0) {
    throw new Error('InsurancePlan has no treatment coverage block');
  }
  const block = treatmentBlocks.find((candidate) =>
    candidate.benefit?.some((benefit) =>
      benefit.type.coding?.some((coding) => coding.system === pathway.system && coding.code === pathway.code)
    )
  );
  if (!block) {
    throw new Error('InsurancePlan has no treatment benefit matching the selected pathway');
  }
  const benefit = block.benefit.find((candidate) =>
    candidate.type.coding?.some((coding) => coding.system === pathway.system && coding.code === pathway.code)
  )!;
  const header = block.benefit.find((candidate) =>
    candidate.type.coding?.some((coding) => coding.system === COVERAGE_TYPE_CODE_SYSTEM_URL)
  );
  if (!benefit.limit?.length && !header) {
    throw new Error('Treatment coverage block has no pool header benefit');
  }
  const limits: TreatmentLimits = {};
  for (const limit of benefit.limit?.length ? benefit.limit : (header?.limit ?? [])) {
    const tier = limit.code?.coding?.[0]?.code;
    if (tier !== 'delegated-authority-sessions' && tier !== 'standard-sessions') continue;
    const count = limit.value?.value;
    if (count === undefined || !Number.isFinite(count) || count < 0) {
      throw new Error(`InsurancePlan limit ${tier} has no valid session count`);
    }
    limits[tier === 'delegated-authority-sessions' ? 'delegated' : 'standard'] = count;
  }
  const blockCode = block.type.coding!.find((coding) => coding.code?.startsWith('mh-treatment-'))!.code!;
  return { blockCode, limits };
}

export function allocateUsage(usedTotal: number, limits: TreatmentLimits): { delegated: number; standard: number } {
  // Provisional tier rule: consume delegated authority first, then allocate overflow to standard.
  const total = Math.max(0, usedTotal);
  const delegated = Math.min(total, limits.delegated ?? 0);
  return { delegated, standard: total - delegated };
}

export function getEntitlementUsage(episode: EpisodeOfCare, blockCode: string): number {
  const usage = episode.extension?.find(
    (extension) =>
      extension.url === EOC_ENTITLEMENT_USAGE_EXTENSION_URL &&
      extension.extension?.some((child) => child.url === 'block' && child.valueCoding?.code === blockCode)
  );
  return usage?.extension?.find((child) => child.url === 'used')?.valueInteger ?? 0;
}

export async function loadCarePlanPathway(
  medplum: MedplumClient,
  episode: EpisodeOfCare
): Promise<{ coding: Coding; label: string }> {
  if (!episode.id || !episode.patient.reference) {
    throw new Error('EpisodeOfCare has no case or patient reference');
  }
  const carePlans: CarePlan[] = [];
  for await (const page of medplum.searchResourcePages('CarePlan', {
    patient: episode.patient.reference,
    status: 'active',
    _sort: '-_lastUpdated',
  })) {
    carePlans.push(
      ...page.filter(
        (plan) =>
          plan.status === 'active' &&
          plan.extension?.some(
            (extension) =>
              extension.url === WORKFLOW_EPISODE_OF_CARE_EXTENSION_URL &&
              extension.valueReference?.reference === `EpisodeOfCare/${episode.id}`
          )
      )
    );
  }
  if (!carePlans.length) throw new Error('EpisodeOfCare has no active CarePlan');
  const updatedTime = (plan: CarePlan): number => Date.parse(plan.meta?.lastUpdated ?? '') || 0;
  carePlans.sort((a, b) => updatedTime(b) - updatedTime(a));
  if (carePlans.length > 1) {
    console.warn(`Multiple active CarePlans for EpisodeOfCare/${episode.id}; using the most recently updated`);
  }
  const coding = carePlans[0].category?.[0]?.coding?.find(
    (candidate) => candidate.system === MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL && candidate.code
  );
  if (!coding) throw new Error('Active CarePlan has no treatment pathway coding');
  let label = coding.display;
  if (!label) {
    const codeSystem = await medplum.searchOne('CodeSystem', { url: MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL });
    label = codeSystem?.concept?.find((concept) => concept.code === coding.code)?.display;
  }
  if (!label) throw new Error('Selected pathway has no display in CarePlan or CodeSystem');
  return { coding, label };
}

export async function loadAuthorisedServices(
  medplum: MedplumClient,
  episode: EpisodeOfCare,
  pathway: Coding,
  label: string
): Promise<AuthorisedServiceRow[]> {
  const accountRef = episode.account?.[0];
  if (!accountRef?.reference) throw new Error('EpisodeOfCare has no account link');
  const account = await medplum.readReference(accountRef as Reference<Account>).catch(() => {
    throw new Error('Unable to read the linked Account');
  });
  const coverageRef = account.coverage?.[0]?.coverage;
  if (!coverageRef?.reference) throw new Error('Account has no coverage link');
  const coverage = await medplum.readReference(coverageRef as Reference<Coverage>).catch(() => {
    throw new Error('Unable to read the linked Coverage');
  });
  const planRef = coverage.extension?.find(
    (extension) => extension.url === COVERAGE_INSURANCE_PLAN_EXTENSION_URL
  )?.valueReference;
  if (!planRef?.reference) throw new Error('Coverage has no insurance plan link');
  const insurancePlan = await medplum.readReference(planRef as Reference<InsurancePlan>).catch(() => {
    throw new Error('Unable to read the linked InsurancePlan');
  });
  const { blockCode, limits } = getTreatmentLimits(insurancePlan, pathway);
  const usage = allocateUsage(getEntitlementUsage(episode, blockCode), limits);
  const rows: AuthorisedServiceRow[] = [];
  for (const [key, tier] of [
    ['delegated', 'Delegated authority'],
    ['standard', 'Standard'],
  ] as const) {
    const authorised = limits[key];
    if (authorised !== undefined) {
      rows.push({ service: label, tier, authorised, used: usage[key], remaining: authorised - usage[key] });
    }
  }
  return rows;
}
