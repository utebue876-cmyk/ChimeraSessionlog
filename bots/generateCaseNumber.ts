/**
 * Medplum Bot: issues the next sequential Chimera case number.
 *
 * Deployment notes:
 *   - Create a Bot resource on each environment and deploy this file as its source.
 *   - Optionally set the Bot secret "case-number-floor" (valueInteger) to this
 *     environment's starting number:
 *       Dev / UAT      -> leave unset (defaults to 0)
 *       PID / pre-prod -> 1000000
 *       Production     -> 2000000
 *   - The counter itself is a single Basic resource (identified below), seeded
 *     to floor - 1 the first time this bot runs in a given project.
 */
import type { BotEvent, MedplumClient, WithId } from '@medplum/core';
import type { Basic, Identifier } from '@medplum/fhirtypes';

const CASE_NUMBER_URL = 'http://fhir.chimera.health/identifier/case-number';
const CASE_NUMBER_PREFIX = 'CR-';
const CASE_NUMBER_DIGITS = 8;

const COUNTER_IDENTIFIER_SYSTEM = 'http://fhir.chimera.health/identifier/case-number-counter';
const COUNTER_IDENTIFIER_VALUE = 'case-number-counter';
const COUNTER_VALUE_EXTENSION_URL = 'http://fhir.chimera.health/StructureDefinition/case-number-counter-value';

const MAX_RETRIES = 5;

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<Identifier> {
  const floor = event.secrets['case-number-floor']?.valueInteger ?? 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const counter = await getOrCreateCounter(medplum, floor);
    const current = getCounterValue(counter);
    const next = current + 1;

    if (next < floor) {
      // Guards against a mis-seeded or accidentally-copied counter (see numbering-strategy rationale).
      throw new Error(
        `Refusing to issue case number ${next} below the configured floor ${floor} for this environment.`
      );
    }

    try {
      await medplum.patchResource('Basic', counter.id, [
        { op: 'test', path: '/extension/0/valueInteger', value: current },
        { op: 'replace', path: '/extension/0/valueInteger', value: next },
      ]);
      return {
        system: CASE_NUMBER_URL,
        value: `${CASE_NUMBER_PREFIX}${String(next).padStart(CASE_NUMBER_DIGITS, '0')}`,
        use: 'official',
      };
    } catch {
      // Another concurrent request incremented the counter first — retry against the latest value.
    }
  }

  throw new Error('Could not allocate a case number after multiple attempts; please retry.');
}

async function getOrCreateCounter(medplum: MedplumClient, floor: number): Promise<WithId<Basic>> {
  // createResourceIfNoneExist is a true conditional create — unlike upsertResource, it never
  // overwrites an existing match, so an already-seeded counter's value is never reset.
  return medplum.createResourceIfNoneExist<Basic>(
    {
      resourceType: 'Basic',
      code: { text: 'Chimera case number counter' },
      identifier: [{ system: COUNTER_IDENTIFIER_SYSTEM, value: COUNTER_IDENTIFIER_VALUE }],
      extension: [{ url: COUNTER_VALUE_EXTENSION_URL, valueInteger: floor - 1 }],
    },
    `identifier=${COUNTER_IDENTIFIER_SYSTEM}|${COUNTER_IDENTIFIER_VALUE}`
  );
}

function getCounterValue(counter: Basic): number {
  return counter.extension?.find((ext) => ext.url === COUNTER_VALUE_EXTENSION_URL)?.valueInteger ?? -1;
}
