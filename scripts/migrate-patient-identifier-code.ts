/**
 * For each Patient, makes two fixes to identifier entries that carry an SSN-style code:
 *   1. identifier[].type.coding[].code: 'SS' → 'MR'  (system: v2-0203)
 *   2. identifier[].system: 'http://hl7.org/fhir/sid/us-ssn' → chimera MRN URL
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/migrate-patient-identifier-code.ts
 *   npx tsx scripts/migrate-patient-identifier-code.ts
 *
 * Required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET
 */
import { MedplumClient } from '@medplum/core';
import type { BundleLink, Patient } from '@medplum/fhirtypes';

const DRY_RUN = process.env.DRY_RUN === 'true';
const BASE_URL = process.env.MEDPLUM_BASE_URL ?? '';
const CLIENT_ID = process.env.MEDPLUM_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET ?? '';

if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET');
  process.exit(1);
}

const IDENTIFIER_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v2-0203';
const OLD_CODE = 'SS';
const NEW_CODE = 'MR';

const OLD_ID_SYSTEM = 'http://hl7.org/fhir/sid/us-ssn';
const NEW_ID_SYSTEM = 'http://fhir.chimera.health/identifier/iprs-health/mrn';

const medplum = new MedplumClient({ baseUrl: BASE_URL });

async function* getAllPatients(): AsyncGenerator<Patient> {
  let params = '_count=200';
  while (true) {
    const bundle = await medplum.search('Patient', params);
    for (const entry of bundle.entry ?? []) {
      if (entry.resource?.resourceType === 'Patient') {
        yield entry.resource as Patient;
      }
    }
    const next = bundle.link?.find((l: BundleLink) => l.relation === 'next');
    if (!next?.url) break;
    params = new URL(next.url).search.slice(1);
  }
}

function needsMigration(patient: Patient): boolean {
  return (patient.identifier ?? []).some(
    (id) =>
      (id.type?.coding ?? []).some((c) => c.system === IDENTIFIER_SYSTEM && c.code === OLD_CODE) ||
      id.system === OLD_ID_SYSTEM
  );
}

function migratePatient(patient: Patient): Patient {
  return {
    ...patient,
    identifier: (patient.identifier ?? []).map((id) => ({
      ...id,
      ...(id.system === OLD_ID_SYSTEM ? { system: NEW_ID_SYSTEM } : {}),
      type: id.type
        ? {
            ...id.type,
            coding: (id.type.coding ?? []).map((c) =>
              c.system === IDENTIFIER_SYSTEM && c.code === OLD_CODE ? { ...c, code: NEW_CODE } : c
            ),
          }
        : id.type,
    })),
  };
}

async function main() {
  console.log(`\nPatient identifier migration`);
  console.log(`  code   : '${OLD_CODE}' → '${NEW_CODE}'  (type coding system: ${IDENTIFIER_SYSTEM})`);
  console.log(`  system : '${OLD_ID_SYSTEM}'`);
  console.log(`         → '${NEW_ID_SYSTEM}'`);
  console.log(`Mode     : ${DRY_RUN ? 'DRY RUN — no writes' : 'LIVE — will update resources'}`);
  console.log(`Server   : ${BASE_URL}\n`);

  await medplum.startClientLogin(CLIENT_ID, CLIENT_SECRET);
  console.log('Authenticated.\n');

  let checked = 0;
  let updated = 0;
  let errors = 0;

  for await (const patient of getAllPatients()) {
    checked++;

    if (!needsMigration(patient)) continue;

    console.log(`  Patient ${patient.id} — needs update`);

    if (!DRY_RUN) {
      try {
        await medplum.updateResource(migratePatient(patient));
        updated++;
        console.log(`    ✓ updated`);
      } catch (err) {
        errors++;
        console.error(`    ✗ failed: ${err}`);
      }
    } else {
      updated++;
    }
  }

  console.log(`\nDone.`);
  console.log(`  Checked : ${checked}`);
  console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}  : ${updated}`);
  if (errors > 0) console.log(`  Errors  : ${errors}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
