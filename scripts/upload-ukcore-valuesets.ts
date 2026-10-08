/**
 * Uploads UK Core ValueSets required by the UKCore-Patient profile to the
 * Medplum server so that ResourceForm can expand them for dropdowns.
 *
 * Run once per environment. Safe to re-run — uses createResourceIfNoneExist.
 *
 * Usage:
 *   MEDPLUM_BASE_URL=https://api.medplum.com/ \
 *   MEDPLUM_CLIENT_ID=<id> \
 *   MEDPLUM_CLIENT_SECRET=<secret> \
 *   npx tsx scripts/upload-ukcore-valuesets.ts
 */

import { MedplumClient } from '@medplum/core';
import type { CodeSystem, StructureDefinition, ValueSet } from '@medplum/fhirtypes';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.MEDPLUM_BASE_URL ?? '';
const CLIENT_ID = process.env.MEDPLUM_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET ?? '';

if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET');
  process.exit(1);
}

const VALUESET_FILES = [
  'ValueSet-UKCore-BirthSex.json',
  'ValueSet-UKCore-DeathNotificationStatus.json',
  'ValueSet-UKCore-EthnicCategory.json',
  'ValueSet-UKCore-NHSNumberUnavailableReason.json',
  'ValueSet-UKCore-PersonMaritalStatusCode.json',
  'ValueSet-UKCore-PersonRelationshipType.json',
  'ValueSet-UKCore-PreferredContactMethod.json',
  'ValueSet-UKCore-PreferredWrittenCommunicationFormat.json',
  'ValueSet-UKCore-NHSNumberVerificationStatus.json',
  'ValueSet-UKCore-ResidentialStatus.json',
  'ValueSet-patient-fetalstatus.json',
];

const CODESYSTEM_FILES = [
  'CodeSystem-patient-fetalstatus.json',
  'CodeSystem-UKCore-DeathNotificationStatus.json',
  'CodeSystem-UKCore-EthnicCategoryEngland.json',
  'CodeSystem-UKCore-NHSNumberVerificationStatusEngland.json',
  'CodeSystem-UKCore-NHSNumberVerificationStatusWales.json',
  'CodeSystem-UKCore-PreferredContactMethod.json',
  'CodeSystem-UKCore-PreferredWrittenCommunicationFormat.json',
  'CodeSystem-UKCore-ResidentialStatus.json',
];

const STRUCTUREDEFINITION_FILES = [
  'Extension-UKCore-BirthSex.json',
  'Extension-UKCore-ContactPreference.json',
  'Extension-UKCore-ContactRank.json',
  'Extension-UKCore-CopyCorrespondenceIndicator.json',
  'Extension-UKCore-DeathNotificationStatus.json',
  'Extension-UKCore-EthnicCategory.json',
  'Extension-UKCore-NHSNumberUnavailableReason.json',
  'Extension-UKCore-NHSNumberVerificationStatus.json',
  'Extension-UKCore-PatientFetalStatus.json',
  'Extension-UKCore-ResidentialStatus.json',
  'patient-birthPlace.json',
  'patient-cadavericDonor.json',
  'patient-interpreterRequired.json',
  'patient-proficiency.json',
];

const FHIR_DIR = resolve(import.meta.dirname, '../src/config/fhir');

async function main(): Promise<void> {
  const medplum = new MedplumClient({ baseUrl: BASE_URL });
  await medplum.startClientLogin(CLIENT_ID, CLIENT_SECRET);

  for (const filename of STRUCTUREDEFINITION_FILES) {
    const raw = readFileSync(resolve(FHIR_DIR, filename), 'utf8').replace(/^\uFEFF/, '');
    const sd = JSON.parse(raw) as StructureDefinition;
    delete sd.id;
    await medplum.createResourceIfNoneExist(sd, `url=${sd.url}`);
    console.log(`Uploaded StructureDefinition: ${sd.url}`);
  }

  for (const filename of CODESYSTEM_FILES) {
    const raw = readFileSync(resolve(FHIR_DIR, filename), 'utf8').replace(/^\uFEFF/, '');
    const cs = JSON.parse(raw) as CodeSystem;
    delete cs.id;
    await medplum.createResourceIfNoneExist(cs, `url=${cs.url}`);
    console.log(`Uploaded CodeSystem: ${cs.url}`);
  }

  for (const filename of VALUESET_FILES) {
    const raw = readFileSync(resolve(FHIR_DIR, filename), 'utf8').replace(/^\uFEFF/, '');
    const vs = JSON.parse(raw) as ValueSet;
    delete vs.id;
    await medplum.createResourceIfNoneExist(vs, `url=${vs.url}`);
    console.log(`Uploaded ValueSet: ${vs.url}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
