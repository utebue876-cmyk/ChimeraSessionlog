/**
 * URL migration script — iprsgroup.com → fhir.chimera.health
 *
 * Iterates all relevant FHIR resource types and replaces old URL strings embedded
 * in extension urls, coding systems, identifier systems, and questionnaire urls.
 *
 * Usage:
 *   # Preview — no writes
 *   DRY_RUN=true node scripts/migrate-urls.mjs
 *
 *   # Apply
 *   node scripts/migrate-urls.mjs
 *
 * Required env vars:
 *   MEDPLUM_BASE_URL      e.g. https://api.medplum.com/
 *   MEDPLUM_CLIENT_ID     ClientApplication resource ID
 *   MEDPLUM_CLIENT_SECRET ClientApplication secret
 */

import { MedplumClient } from '@medplum/core';
import type { BundleLink, Resource, ResourceType } from '@medplum/fhirtypes';

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN === 'true';
const BASE_URL = process.env.MEDPLUM_BASE_URL ?? '';
const CLIENT_ID = process.env.MEDPLUM_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET ?? '';

if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET');
  process.exit(1);
}

/**
 * URL substitutions. Applied in order — more specific rules first so they don't
 * get partially matched by a broader rule.
 */
const REPLACEMENTS = [
  // CASE_NUMBER_URL: different host and path structure
  // {
  //   old: 'https://iprsgroup.com/fhir/StructureDefinition/mh-case-state',
  //   new: 'http://fhir.chimera.health/StructureDefinition/episodeofcare-case-state',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/ValueSet/mh-case-state',
  //   new: 'http://fhir.chimera.health/ValueSet/case-state',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/StructureDefinition/mh-case-note',
  //   new: 'http://fhir.chimera.health/StructureDefinition/case-note',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/CodeSystem/mh-service',
  //   new: 'http://fhir.chimera.health/CodeSystem/mh-service',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/ValueSet/mh-service',
  //   new: 'http://fhir.chimera.health/ValueSet/mh-service',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/ValueSet/mh-service-vitality',
  //   new: 'http://fhir.chimera.health/ValueSet/mh-service-vitality',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/ValueSet/mh-service-aviva',
  //   new: 'http://fhir.chimera.health/ValueSet/mh-service-aviva',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/Questionnaire/patient-intake',
  //   new: 'http://fhir.chimera.health/Questionnaire/patient-intake',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/StructureDefinition/mh-case-consent-signed',
  //   new: 'http://fhir.chimera.health/StructureDefinition/mh-case-consent-signed',
  // },
  // {
  //   old: 'https://iprsgroup.com/fhir/StructureDefinition/mh-case-consent-date',
  //   new: 'http://fhir.chimera.health/StructureDefinition/mh-case-consent-date',
  // },
  // {
  //   old: 'https://chimera.health/Questionnaire/mh-awg-intake-assessment',
  //   new: 'http://fhir.chimera.health/Questionnaire/mh-awg-intake-assessment',
  // },
  // {
  //   old: 'https://chimera.health/organisations',
  //   new: 'http://fhir.chimera.health/organisations',
  // },
  // {
  //   old: 'https://iprsgroup.com/case-state',
  //   new: 'http://fhir.chimera.health/CodeSystem/case-state',
  // },
  // {
  //   old: 'https://chimera.health/fhir/CodeSystem/task-codes',
  //   new: 'http://fhir.chimera.health/CodeSystem/task-codes',
  // },
  // {
  //   old: 'http://iprsgroup.com/fhir/CodeSystem/task-codes',
  //   new: 'http://fhir.chimera.health/CodeSystem/task-codes',
  // },
  {
    old: 'http://hl7.org/fhir/sid/us-ssn',
    new: 'http://fhir.chimera.health/identifier/iprs-health/mrn',
  },
  // {
  //   old: 'https://chimera.health/organisations',
  //   new: 'http://fhir.chimera.health/identifier/iprs-health/organization',
  // },
  // All remaining iprsgroup.com URLs: just swap the host
  // {
  //   old: 'https://iprsgroup.com',
  //   new: 'https://fhir.chimera.health',
  // },
];

/**
 * Resource types that may contain these URLs.
 * EpisodeOfCare — extension urls, valueCoding systems, identifier systems
 * HealthcareService / ServiceRequest — type/code coding systems
 * Questionnaire — url field (the canonical URL of the stored resource)
 * QuestionnaireResponse — questionnaire field (references the Questionnaire canonical)
 * Task / PlanDefinition — may reference coding systems via action/input definitions
 */
const RESOURCE_TYPES: ResourceType[] = [
  'EpisodeOfCare', // extension urls, valueCoding systems, identifier systems, type codings
  'HealthcareService', // type coding systems (if seeded with iprsgroup.com URLs)
  'ServiceRequest', // code/type coding systems
  'Questionnaire', // canonical url field, answerValueSet references
  'QuestionnaireResponse', // questionnaire field (references Questionnaire canonical)
  'ValueSet', // url field, compose.include[].system (mh-service valuesets)
  'CodeSystem', // url field (mh-service codesystem)
  'Task', // may reference coding systems
  'PlanDefinition', // may reference coding systems
  'Organization', // identifier.system (case-number)
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyReplacements(json: string): string {
  let result = json;
  for (const { old, new: next } of REPLACEMENTS) {
    // Append `"` so the match is exact within the JSON string value and won't
    // accidentally match longer URLs that share the same prefix (e.g. mh-service-vitality).
    result = result.replaceAll(`${old}"`, `${next}"`);
  }
  return result;
}

/**
 * Fetches all resources of a given type using Bundle pagination.
 * Assumes <1000 resources per type which is safe for pilot data.
 * If the dataset grows, the pagination loop handles it automatically.
 */
async function* getAllResources(medplum: MedplumClient, resourceType: ResourceType): AsyncGenerator<Resource> {
  let params = '_count=200';

  while (true) {
    const bundle = await medplum.search(resourceType, params);
    const entries = bundle.entry ?? [];

    for (const entry of entries) {
      if (entry.resource) yield entry.resource;
    }

    const nextLink = bundle.link?.find((l: BundleLink) => l.relation === 'next');
    if (!nextLink?.url) break;

    // Extract only the query string portion for the next page
    params = new URL(nextLink.url).search.slice(1); // strip leading '?'
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const medplum = new MedplumClient({ baseUrl: BASE_URL });

async function main() {
  console.log(`\nURL Migration Script`);
  console.log(`Mode   : ${DRY_RUN ? 'DRY RUN — no writes will be made' : 'LIVE — resources will be updated'}`);
  console.log(`Server : ${BASE_URL}\n`);

  await medplum.startClientLogin(CLIENT_ID, CLIENT_SECRET);
  console.log('Authenticated.\n');

  let totalChecked = 0;
  let totalChanged = 0;

  for (const resourceType of RESOURCE_TYPES) {
    let checked = 0;
    let changed = 0;

    process.stdout.write(`${resourceType.padEnd(24)}`);

    for await (const resource of getAllResources(medplum, resourceType)) {
      checked++;
      const original = JSON.stringify(resource);
      const migrated = applyReplacements(original);

      if (migrated !== original) {
        changed++;
        if (DRY_RUN) {
          console.log(`\n  [DRY RUN] ${resourceType}/${resource.id}`);
          // Show a diff of changed keys for review
          const origObj = JSON.parse(original);
          const newObj = JSON.parse(migrated);
          printDiff(origObj, newObj, '  ');
        } else {
          try {
            await medplum.updateResource(JSON.parse(migrated));
            process.stdout.write('.');
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`\n  ERROR updating ${resourceType}/${resource.id}: ${msg}`);
          }
        }
      }
    }

    console.log(`  checked=${checked}, updated=${changed}`);
    totalChecked += checked;
    totalChanged += changed;
  }

  console.log('\n─────────────────────────────────────');
  console.log(`Total checked : ${totalChecked}`);
  console.log(`Total updated : ${totalChanged}`);

  if (DRY_RUN) {
    console.log('\nThis was a DRY RUN. Run without DRY_RUN=true to apply changes.');
  } else {
    console.log('\nMigration complete.');
    console.log('Next step: update chimera-urls.ts to use the new URL constants.');
  }
}

/**
 * Walks two objects and prints only the leaf values that differ.
 * Used in dry-run mode to give a readable preview of each change.
 */
function printDiff(orig: unknown, updated: unknown, indent = ''): void {
  const origStr = JSON.stringify(orig);
  const updStr = JSON.stringify(updated);
  if (origStr === updStr) return;

  if (typeof orig !== 'object' || orig === null) {
    console.log(`${indent}  - ${JSON.stringify(orig)}`);
    console.log(`${indent}  + ${JSON.stringify(updated)}`);
    return;
  }

  const o = orig as Record<string, unknown>;
  const u = updated as Record<string, unknown>;
  const keys = new Set([...Object.keys(o), ...Object.keys(u)]);
  for (const key of keys) {
    if (JSON.stringify(o[key]) !== JSON.stringify(u[key])) {
      if (typeof o[key] === 'object' && o[key] !== null) {
        console.log(`${indent}  ${key}:`);
        printDiff(o[key], u[key], indent + '  ');
      } else {
        console.log(`${indent}  ${key}:`);
        console.log(`${indent}    - ${JSON.stringify(o[key])}`);
        console.log(`${indent}    + ${JSON.stringify(u[key])}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
