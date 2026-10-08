import type { MedplumClient, WithId } from '@medplum/core';
import { createReference, getReferenceString } from '@medplum/core';
import type { ChargeItem, Encounter } from '@medplum/fhirtypes';

/**
 * Standalone function to fetch and apply ChargeItemDefinition to charge item
 * @param medplum - Medplum client instance
 * @param chargeItem - Current charge item
 * @returns Promise with updated charge items
 */
export async function applyChargeItemDefinition(
  medplum: MedplumClient,
  chargeItem: WithId<ChargeItem>
): Promise<WithId<ChargeItem>> {
  if (!chargeItem.definitionCanonical || chargeItem.definitionCanonical.length === 0) {
    return chargeItem;
  }

  const searchResult = await medplum.searchResources(
    'ChargeItemDefinition',
    `url=${chargeItem.definitionCanonical[0]}`
  );

  if (searchResult.length === 0) {
    return chargeItem;
  }

  const chargeItemDefinition = searchResult[0];
  const applyResult = await medplum.post(medplum.fhirUrl('ChargeItemDefinition', chargeItemDefinition.id, '$apply'), {
    resourceType: 'Parameters',
    parameter: [
      {
        name: 'chargeItem',
        valueReference: createReference(chargeItem),
      },
    ],
  });

  return applyResult as WithId<ChargeItem>;
}

export async function getChargeItemsForEncounter(
  medplum: MedplumClient,
  encounter: Encounter
): Promise<WithId<ChargeItem>[]> {
  if (!encounter) {
    return [];
  }

  const chargeItems = await medplum.searchResources('ChargeItem', `context=${getReferenceString(encounter)}`);
  const updatedChargeItems = await Promise.all(
    chargeItems.map((chargeItem) => applyChargeItemDefinition(medplum, chargeItem))
  );
  return updatedChargeItems;
}

/**
 * Every ChargeItem posted to the given Accounts, exactly as stored.
 *
 * Read only on purpose. Unlike getChargeItemsForEncounter this does not call
 * ChargeItemDefinition/$apply, because $apply saves a recalculated price back
 * onto the ChargeItem. A statement must show the price that was charged, not
 * re-price history every time someone opens the page.
 *
 * Searching by account (not by context) also finds charges whose context is
 * the EpisodeOfCare and charges with no Encounter at all, such as a DNA fee.
 * @param medplum - Medplum client instance
 * @param accountReferences - Account references, e.g. "Account/123"
 * @returns The charge items on those accounts
 */
export async function getChargeItemsForAccounts(
  medplum: MedplumClient,
  accountReferences: string[]
): Promise<WithId<ChargeItem>[]> {
  if (accountReferences.length === 0) {
    return [];
  }

  // A comma separated value is an OR in FHIR search: charges on any of these accounts.
  // _count=1000 stops the default page size (20) silently dropping charges on a long case.
  return medplum.searchResources('ChargeItem', [
    ['account', accountReferences.join(',')],
    ['_count', '1000'],
  ]);
}

export function calculateTotalPrice(items: ChargeItem[]): number {
  return items.reduce((sum, item) => sum + (item.priceOverride?.value || 0), 0);
}
