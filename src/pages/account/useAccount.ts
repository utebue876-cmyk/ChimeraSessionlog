import type { WithId } from '@medplum/core';
import { formatCodeableConcept } from '@medplum/core';
import type {
  Appointment,
  ChargeItem,
  CodeableConcept,
  Encounter,
  EpisodeOfCare,
  Patient,
  Reference,
} from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useEffect, useMemo, useState } from 'react';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';
import { usePatient } from '../../hooks/usePatient';
import { getServiceTypeForAppointment } from '../../utils/appointmentUtils';
import { calculateTotalPrice, getChargeItemsForAccounts } from '../../utils/chargeitems';

export interface AccountChargeItemRow {
  id: string;
  appointmentDateTime: string;
  cptCode: string;
  modifiers: string;
  calculatedPrice: string;
}

export interface AccountEncounterSection {
  id: string;
  encounter: WithId<Encounter> | undefined;
  appointment: Appointment | undefined;
  isoStart: string;
  appointmentDateTime: string;
  serviceType: CodeableConcept | undefined;
  serviceTypeDisplay: string;
  practitioner: string;
  encounterStatus: Encounter['status'] | 'N/A';
  appointmentSummary: string;
  calculatedCost: string;
  rows: AccountChargeItemRow[];
}

export interface UseAccountResult {
  patient: WithId<Patient> | undefined;
  caseId: string;
  loading: boolean;
  error: string | undefined;
  sections: AccountEncounterSection[];
  totalBill: string;
}

const GBP_CURRENCY_FORMAT = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

function formatMoney(value: number | undefined): string {
  return GBP_CURRENCY_FORMAT.format(value ?? 0);
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTimeOnly(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(value).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getCptCode(chargeItem: ChargeItem): string {
  const codings = chargeItem.code?.coding ?? [];
  const coding = codings.find((c) => c.system === 'http://www.ama-assn.org/go/cpt') ?? codings[0];
  return coding?.display ?? coding?.code ?? chargeItem.code?.text ?? 'N/A';
}

interface ChargeGroup {
  key: string;
  appointmentRef: string | undefined;
  encounterRef: string | undefined;
  items: WithId<ChargeItem>[];
}

function findReference(references: Reference[] | undefined, resourceType: string): string | undefined {
  return references?.find((ref) => ref.reference?.startsWith(`${resourceType}/`))?.reference;
}

function getModifiers(chargeItem: ChargeItem): string {
  const modifiers = chargeItem.extension
    ?.filter((extension) => extension.url === 'http://hl7.org/fhir/StructureDefinition/chargeitem-modifier')
    .map((extension) => extension.valueCodeableConcept)
    .filter((modifier) => modifier !== undefined)
    .map((modifier) => modifier.coding?.[0]?.display ?? modifier.coding?.[0]?.code ?? modifier.text)
    .filter((modifier): modifier is string => Boolean(modifier))
    .join(', ');

  return modifiers || '—';
}

function getPractitionerFromAppointment(appointment: Appointment | undefined): string {
  const practitionerParticipant = appointment?.participant?.find((participant) => {
    const actorRef = participant.actor?.reference;
    return actorRef?.startsWith('Practitioner/') || actorRef?.startsWith('PractitionerRole/');
  });

  const actor = practitionerParticipant?.actor;
  if (!actor) {
    return '—';
  }

  if (actor.display) {
    return actor.display;
  }

  if (actor.reference) {
    const parts = actor.reference.split('/');
    return parts[parts.length - 1] || '—';
  }

  return '—';
}

function formatAppointmentSummary(
  appointment: Appointment | undefined,
  encounter: WithId<Encounter> | undefined
): string {
  const appointmentStatus = appointment?.status ? `Status: ${appointment.status}` : 'Status: N/A';
  const appointmentEnd = appointment?.end ? `Ends: ${formatDateTime(appointment.end)}` : undefined;
  const encounterId = encounter?.id ? `Encounter: ${encounter.id}` : 'Encounter: N/A';
  return [encounterId, appointmentStatus, appointmentEnd].filter(Boolean).join(' • ');
}

function sortEpisodesByStartDate(episodes: EpisodeOfCare[]): EpisodeOfCare[] {
  return [...episodes].sort((left, right) => {
    const leftStart = left.period?.start ?? '';
    const rightStart = right.period?.start ?? '';
    return leftStart.localeCompare(rightStart);
  });
}

export function useAccount(): UseAccountResult {
  const medplum = useMedplum();
  const patient = usePatient();
  const { activeEpisode } = useActiveEpisode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [caseId, setCaseId] = useState('');
  const [sections, setSections] = useState<AccountEncounterSection[]>([]);

  const totalBill = useMemo(() => {
    const total = sections.reduce((sum, section) => {
      return (
        sum +
        section.rows.reduce((sectionSum, row) => sectionSum + Number(row.calculatedPrice.replace(/[^\d.-]/g, '')), 0)
      );
    }, 0);

    return formatMoney(total);
  }, [sections]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(undefined);

      if (!patient?.id) {
        setCaseId('');
        setSections([]);
        setLoading(false);
        return;
      }

      try {
        let episode: EpisodeOfCare | undefined = activeEpisode;
        if (!episode) {
          const episodes = await medplum.searchResources('EpisodeOfCare', `patient=Patient/${patient.id}`);
          episode = sortEpisodesByStartDate(episodes)[0];
        }

        if (!episode?.id) {
          if (!cancelled) {
            setCaseId('');
            setSections([]);
          }
          return;
        }

        // The Account is the source of truth for what has been charged to this case.
        // Charges are found by ChargeItem.account, never by walking the patient's
        // encounters: a charge's context may be the EpisodeOfCare, and some charges
        // (a DNA fee, for example) have no Encounter at all...
        const accountRefs = (episode.account ?? [])
          .map((ref) => ref.reference)
          .filter((ref): ref is string => Boolean(ref));
        const chargeItems = await getChargeItemsForAccounts(medplum, accountRefs);

        // Group the charges into one section per appointment...
        //   1. ChargeItem.supportingInformation -> Appointment (charges raised by the charge Bots)
        //   2. ChargeItem.context -> Encounter -> its Appointment (charges added in the encounter chart)
        //   3. neither: the charge gets a section of its own
        const encounterCache = new Map<string, WithId<Encounter>>();
        const groups = new Map<string, ChargeGroup>();
        for (const chargeItem of chargeItems) {
          let appointmentRef = findReference(chargeItem.supportingInformation, 'Appointment');
          let encounterRef: string | undefined;

          const contextRef = chargeItem.context?.reference;
          if (contextRef?.startsWith('Encounter/')) {
            encounterRef = contextRef;
            if (!encounterCache.has(contextRef)) {
              const encounter = await medplum
                .readReference(chargeItem.context as Reference<Encounter>)
                .catch(() => undefined);
              if (encounter) {
                encounterCache.set(contextRef, encounter);
              }
            }
            appointmentRef = appointmentRef ?? encounterCache.get(contextRef)?.appointment?.at(-1)?.reference;
          }

          const key = appointmentRef ?? encounterRef ?? `ChargeItem/${chargeItem.id}`;
          const group = groups.get(key) ?? { key, appointmentRef, encounterRef, items: [] };
          group.encounterRef = group.encounterRef ?? encounterRef;
          group.items.push(chargeItem);
          groups.set(key, group);
        }

        // One search finds the Encounter for every appointment that does not have one yet.
        // The Encounter is only used for the status badge and the click through to the chart..
        const encounterByAppointment = new Map<string, WithId<Encounter>>();
        const appointmentRefsNeedingEncounter = [...groups.values()]
          .filter((group) => group.appointmentRef && !group.encounterRef)
          .map((group) => group.appointmentRef as string);
        if (appointmentRefsNeedingEncounter.length > 0) {
          const encounters = await medplum.searchResources('Encounter', [
            ['appointment', appointmentRefsNeedingEncounter.join(',')],
            ['_count', '1000'],
          ]);
          for (const encounter of encounters) {
            for (const ref of encounter.appointment ?? []) {
              // If an appointment has more than one Encounter, show the finished one.
              if (ref.reference && (!encounterByAppointment.has(ref.reference) || encounter.status === 'finished')) {
                encounterByAppointment.set(ref.reference, encounter);
              }
            }
          }
        }

        const resolvedSections = await Promise.all(
          [...groups.values()].map(async (group): Promise<AccountEncounterSection> => {
            const { items } = group;
            const appointment = group.appointmentRef
              ? await medplum
                  .readReference({ reference: group.appointmentRef } as Reference<Appointment>)
                  .catch(() => undefined)
              : undefined;
            const encounter =
              (group.encounterRef ? encounterCache.get(group.encounterRef) : undefined) ??
              (group.appointmentRef ? encounterByAppointment.get(group.appointmentRef) : undefined);

            // No appointment and no encounter: date the section from the charge itself...
            const isoStart = appointment?.start ?? encounter?.period?.start ?? items[0]?.occurrenceDateTime ?? '';
            const isoEnd = appointment?.end ?? encounter?.period?.end;
            const startFormatted = isoStart ? formatDateTime(isoStart) : 'N/A';
            const endFormatted = formatTimeOnly(isoEnd);
            const appointmentDateTime = endFormatted ? `${startFormatted}-${endFormatted}` : startFormatted;
            const serviceType = appointment
              ? await getServiceTypeForAppointment(medplum, appointment, encounter?.serviceType).catch(() => undefined)
              : encounter?.serviceType;

            const rows = items.map((chargeItem) => ({
              id: chargeItem.id,
              appointmentDateTime,
              cptCode: getCptCode(chargeItem),
              modifiers: getModifiers(chargeItem),
              calculatedPrice: formatMoney(chargeItem.priceOverride?.value),
            }));

            return {
              id: group.key,
              encounter,
              appointment,
              appointmentDateTime,
              isoStart,
              serviceType,
              serviceTypeDisplay: formatCodeableConcept(serviceType) || '—',
              practitioner: getPractitionerFromAppointment(appointment),
              encounterStatus: encounter?.status ?? 'N/A',
              appointmentSummary: formatAppointmentSummary(appointment, encounter),
              calculatedCost: formatMoney(calculateTotalPrice(items)),
              rows,
            };
          })
        );

        const filteredSections = resolvedSections.sort((a, b) => a.isoStart.localeCompare(b.isoStart));

        if (!cancelled) {
          setCaseId(episode.identifier?.[0]?.value ?? episode.id ?? '');
          setSections(filteredSections);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load account');
          setCaseId('');
          setSections([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load().catch((loadError) => {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load account');
        setCaseId('');
        setSections([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeEpisode, medplum, patient?.id]);

  return {
    patient: patient?.id ? (patient as WithId<typeof patient>) : undefined,
    caseId,
    loading,
    error,
    sections,
    totalBill,
  };
}
