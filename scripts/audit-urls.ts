/**
 * Audits all FHIR resources for string values containing any of the suspect
 * domain patterns listed in PATTERNS below. Outputs a grouped report showing
 * each matched value, which resource it was found in, and the JSON path.
 *
 * Usage:
 *   npx tsx scripts/audit-urls.ts
 *
 * Required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET
 */

import { MedplumClient } from '@medplum/core';
import type { BundleLink, Resource, ResourceType } from '@medplum/fhirtypes';

const BASE_URL = process.env.MEDPLUM_BASE_URL ?? '';
const CLIENT_ID = process.env.MEDPLUM_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET ?? '';

if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET');
  process.exit(1);
}

// Add any additional suspect strings here.
const PATTERNS = [
  'iprsgroup.com',
  // 'handlhealth.com',
  // 'handlhealth.co.uk',
  // 'chimera.health', // catch any non-canonical variants (e.g. https vs http)
];

const RESOURCE_TYPES: ResourceType[] = [
  'EpisodeOfCare',
  'HealthcareService',
  'ServiceRequest',
  'Questionnaire',
  'QuestionnaireResponse',
  'ValueSet',
  'CodeSystem',
  'Task',
  'PlanDefinition',
  'Organization',
  'Patient',
  'Coverage',
  'Appointment',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively walks a parsed JSON object and collects all string leaf values with their paths. */
function collectStrings(node: unknown, path: string, results: { path: string; value: string }[]): void {
  if (typeof node === 'string') {
    results.push({ path, value: node });
  } else if (Array.isArray(node)) {
    node.forEach((item, i) => collectStrings(item, `${path}[${i}]`, results));
  } else if (node !== null && typeof node === 'object') {
    for (const [key, val] of Object.entries(node)) {
      collectStrings(val, path ? `${path}.${key}` : key, results);
    }
  }
}

async function* getAllResources(medplum: MedplumClient, resourceType: ResourceType): AsyncGenerator<Resource> {
  let params = '_count=200';
  while (true) {
    const bundle = await medplum.search(resourceType, params);
    for (const entry of bundle.entry ?? []) {
      if (entry.resource) yield entry.resource;
    }
    const nextLink = bundle.link?.find((l: BundleLink) => l.relation === 'next');
    if (!nextLink?.url) break;
    params = new URL(nextLink.url).search.slice(1);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const medplum = new MedplumClient({ baseUrl: BASE_URL });

// matches[pattern][value] = Set of "ResourceType/id (path)" locations
const matches: Record<string, Record<string, Set<string>>> = {};
for (const p of PATTERNS) matches[p] = {};

async function main(): Promise<void> {
  console.log(`\nURL Audit Script`);
  console.log(`Server  : ${BASE_URL}`);
  console.log(`Patterns: ${PATTERNS.join(', ')}\n`);

  await medplum.startClientLogin(CLIENT_ID, CLIENT_SECRET);
  console.log('Authenticated.\n');

  let totalResources = 0;

  for (const resourceType of RESOURCE_TYPES) {
    let count = 0;
    process.stdout.write(`Scanning ${resourceType.padEnd(24)}`);

    for await (const resource of getAllResources(medplum, resourceType)) {
      count++;
      const strings: { path: string; value: string }[] = [];
      collectStrings(resource, '', strings);

      for (const { path, value } of strings) {
        for (const pattern of PATTERNS) {
          if (value.includes(pattern)) {
            const bucket = matches[pattern];
            if (!bucket[value]) bucket[value] = new Set();
            bucket[value].add(`${resourceType}/${resource.id} (${path})`);
          }
        }
      }
    }

    console.log(`${count} resources`);
    totalResources += count;
  }

  console.log(`\nTotal resources scanned: ${totalResources}`);
  console.log('\n═══════════════════════════════════════\n');

  let found = false;
  for (const pattern of PATTERNS) {
    const bucket = matches[pattern];
    const values = Object.keys(bucket);
    if (values.length === 0) continue;
    found = true;
    console.log(`Pattern: "${pattern}"  (${values.length} distinct value${values.length !== 1 ? 's' : ''})`);
    for (const value of values.sort()) {
      console.log(`  "${value}"`);
      for (const location of bucket[value]) {
        console.log(`    ↳ ${location}`);
      }
    }
    console.log();
  }

  if (!found) {
    console.log('No matches found — the database looks clean.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
