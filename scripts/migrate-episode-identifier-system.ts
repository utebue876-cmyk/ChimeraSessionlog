/**
 * Fixes EpisodeOfCare.identifier[].system values that were set to bare strings
 * ('MH' or 'MSK') instead of the proper URL.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/migrate-episode-identifier-system.ts
 *   npx tsx scripts/migrate-episode-identifier-system.ts
 *
 * Required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET
 */
import { MedplumClient } from '@medplum/core';
import type { BundleLink, EpisodeOfCare } from '@medplum/fhirtypes';

const DRY_RUN = process.env.DRY_RUN === 'true';
const BASE_URL = process.env.MEDPLUM_BASE_URL ?? '';
const CLIENT_ID = process.env.MEDPLUM_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET ?? '';

if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env vars: MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET');
  process.exit(1);
}

const OLD_SYSTEMS = new Set(['MH', 'MSK']);
const NEW_SYSTEM = 'http://fhir.chimera.health/identifier/case-number';

const medplum = new MedplumClient({ baseUrl: BASE_URL });

async function* getAllEpisodes(): AsyncGenerator<EpisodeOfCare> {
  let params = '_count=200';
  while (true) {
    const bundle = await medplum.search('EpisodeOfCare', params);
    for (const entry of bundle.entry ?? []) {
      if (entry.resource?.resourceType === 'EpisodeOfCare') {
        yield entry.resource as EpisodeOfCare;
      }
    }
    const next = bundle.link?.find((l: BundleLink) => l.relation === 'next');
    if (!next?.url) break;
    params = new URL(next.url).search.slice(1);
  }
}

async function main() {
  console.log(`\nEpisodeOfCare identifier system migration`);
  console.log(`Mode   : ${DRY_RUN ? 'DRY RUN — no writes' : 'LIVE — will update resources'}`);
  console.log(`Server : ${BASE_URL}\n`);

  await medplum.startClientLogin(CLIENT_ID, CLIENT_SECRET);
  console.log('Authenticated.\n');

  let checked = 0;
  let updated = 0;

  for await (const episode of getAllEpisodes()) {
    checked++;

    const affectedIdentifiers = episode.identifier?.filter((id) => id.system && OLD_SYSTEMS.has(id.system));
    if (!affectedIdentifiers?.length) continue;

    updated++;

    if (DRY_RUN) {
      console.log(`[DRY RUN] EpisodeOfCare/${episode.id}`);
      for (const id of affectedIdentifiers) {
        console.log(`  identifier.system: "${id.system}" → "${NEW_SYSTEM}"  (value: ${id.value ?? '(none)'})`);
      }
    } else {
      const patched: EpisodeOfCare = {
        ...episode,
        identifier: episode.identifier!.map((id) =>
          id.system && OLD_SYSTEMS.has(id.system) ? { ...id, system: NEW_SYSTEM } : id
        ),
      };
      try {
        await medplum.updateResource(patched);
        console.log(`Updated EpisodeOfCare/${episode.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`ERROR updating EpisodeOfCare/${episode.id}: ${msg}`);
      }
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`Checked : ${checked}`);
  console.log(`Updated : ${updated}`);
  if (DRY_RUN) console.log('\nRe-run without DRY_RUN=true to apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
