import type { MedplumClient } from '@medplum/core';
import type { Identifier } from '@medplum/fhirtypes';

// Looked up by identifier (not id) so the same call works across environments, where each has its own Bot resource.
const GENERATE_CASE_NUMBER_BOT_IDENTIFIER: Identifier = {
  system: 'http://fhir.chimera.health/identifier/bot',
  value: 'generate-case-number',
};

export async function generateCaseNumber(medplum: MedplumClient): Promise<Identifier> {
  return medplum.executeBot(GENERATE_CASE_NUMBER_BOT_IDENTIFIER, {});
}
